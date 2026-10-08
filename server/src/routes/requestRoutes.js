import { Router } from "express";
import { z } from "zod";
import Listing from "../models/Listing.js";
import PurchaseRequest from "../models/PurchaseRequest.js";
import { authorizeRoles, protect } from "../middleware/auth.js";

const router = Router();
const requestSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  offeredPrice: z.coerce.number().nonnegative(),
  preferredPickupDate: z.coerce.date().optional(),
  message: z.string().trim().max(500).optional().default(""),
});
const populateRequest = (query) => query
  .populate("listing")
  .populate("buyer", "name companyName location isVerified")
  .populate("farmer", "name location isVerified");

router.get("/orders", protect, async (req, res, next) => {
  try {
    const participant = req.user.role === "FARMER" ? { farmer: req.user._id } : { buyer: req.user._id };
    const orders = await populateRequest(PurchaseRequest.find({ ...participant, status: { $in: ["ACCEPTED", "COMPLETED"] } })).sort({ updatedAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
});

router.get("/", protect, async (req, res, next) => {
  try {
    const filter = req.user.role === "ADMIN"
      ? {}
      : req.user.role === "FARMER"
        ? { farmer: req.user._id }
        : { buyer: req.user._id };
    const requests = await populateRequest(PurchaseRequest.find(filter)).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
});

router.post("/", protect, authorizeRoles("INDUSTRY"), async (req, res, next) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Check the request details" });
    const listing = await Listing.findOne({ _id: parsed.data.listingId, status: "AVAILABLE" });
    if (!listing) return res.status(404).json({ success: false, message: "This listing is no longer available" });
    if (String(listing.farmer) === String(req.user._id)) return res.status(403).json({ success: false, message: "You cannot request your own listing" });
    if (parsed.data.quantity > listing.quantity) return res.status(400).json({ success: false, message: "Requested quantity exceeds the available amount" });
    const request = await PurchaseRequest.create({
      ...parsed.data,
      listing: listing._id,
      buyer: req.user._id,
      farmer: listing.farmer,
    });
    res.status(201).json({ success: true, request: await populateRequest(PurchaseRequest.findById(request._id)) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/order-status", protect, async (req, res, next) => {
  try {
    if (![
      "FARMER",
      "INDUSTRY",
    ].includes(req.user.role)) return res.status(403).json({ success: false, message: "Not allowed" });
    const request = await PurchaseRequest.findById(req.params.id);
    if (!request || request.status !== "ACCEPTED") return res.status(404).json({ success: false, message: "Active order not found" });
    const isFarmer = req.user.role === "FARMER" && String(request.farmer) === String(req.user._id);
    const isBuyer = req.user.role === "INDUSTRY" && String(request.buyer) === String(req.user._id);
    if (!isFarmer && !isBuyer) return res.status(403).json({ success: false, message: "Not allowed" });
    if (req.body.status !== "COMPLETED") return res.status(400).json({ success: false, message: "Only order completion can be updated" });
    const completionField = isFarmer ? "completedByFarmer" : "completedByBuyer";
    const updated = await PurchaseRequest.findOneAndUpdate(
      { _id: request._id, status: "ACCEPTED" },
      { $set: { [completionField]: true } },
      { returnDocument: "after" }
    );
    if (!updated) return res.status(409).json({ success: false, message: "This order is no longer active" });
    if (updated.completedByFarmer && updated.completedByBuyer) {
      await PurchaseRequest.updateOne(
        { _id: updated._id, status: "ACCEPTED", completedByFarmer: true, completedByBuyer: true },
        { $set: { status: "COMPLETED" } }
      );
    }
    res.json({ success: true, order: await populateRequest(PurchaseRequest.findById(updated._id)) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", protect, async (req, res, next) => {
  try {
    const actionSchema = z.object({
      action: z.enum(["ACCEPT", "REJECT", "COUNTER", "ACCEPT_COUNTER"]),
      counterPrice: z.coerce.number().nonnegative().optional(),
      responseMessage: z.string().trim().max(500).optional().default(""),
    });
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid response" });
    const request = await PurchaseRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    const isFarmer = String(request.farmer) === String(req.user._id) && req.user.role === "FARMER";
    const isBuyer = String(request.buyer) === String(req.user._id) && req.user.role === "INDUSTRY";
    const { action, counterPrice, responseMessage } = parsed.data;

    if (action === "ACCEPT_COUNTER") {
      if (!isBuyer || request.status !== "COUNTERED") return res.status(403).json({ success: false, message: "This counter-offer cannot be accepted" });
      request.offeredPrice = request.counterPrice;
    } else if (!isFarmer) {
      return res.status(403).json({ success: false, message: "Only the listing farmer can respond" });
    }

    if (["ACCEPT", "ACCEPT_COUNTER"].includes(action)) {
      if (!["PENDING", "COUNTERED"].includes(request.status)) return res.status(409).json({ success: false, message: "This request has already been resolved" });
      const acceptedFields = { status: "ACCEPTED", responseMessage };
      if (action === "ACCEPT_COUNTER") acceptedFields.offeredPrice = request.counterPrice;
      const claimedRequest = await PurchaseRequest.findOneAndUpdate(
        { _id: request._id, status: { $in: ["PENDING", "COUNTERED"] } },
        { $set: acceptedFields },
        { returnDocument: "after" }
      );
      if (!claimedRequest) return res.status(409).json({ success: false, message: "This request has already been resolved" });
      const updatedListing = await Listing.findOneAndUpdate(
        { _id: request.listing, status: "AVAILABLE", quantity: { $gte: request.quantity } },
        { $inc: { quantity: -request.quantity } },
        { returnDocument: "after" }
      );
      if (!updatedListing) {
        await PurchaseRequest.findOneAndUpdate(
          { _id: claimedRequest._id, status: "ACCEPTED" },
          { $set: { status: request.status, offeredPrice: request.offeredPrice, responseMessage: request.responseMessage } }
        );
        return res.status(409).json({ success: false, message: "There is no longer enough material available" });
      }
      if (updatedListing.quantity === 0) {
        updatedListing.status = "SOLD";
        await updatedListing.save();
      }
      return res.json({ success: true, request: await populateRequest(PurchaseRequest.findById(claimedRequest._id)) });
    }

    if (!["PENDING", "COUNTERED"].includes(request.status)) return res.status(409).json({ success: false, message: "This request has already been resolved" });
    if (action === "COUNTER" && counterPrice === undefined) return res.status(400).json({ success: false, message: "A counter price is required" });
    const changes = { status: action === "REJECT" ? "REJECTED" : "COUNTERED", responseMessage };
    if (action === "COUNTER") changes.counterPrice = counterPrice;
    const updatedRequest = await PurchaseRequest.findOneAndUpdate(
      { _id: request._id, status: { $in: ["PENDING", "COUNTERED"] } },
      { $set: changes },
      { returnDocument: "after", runValidators: true }
    );
    if (!updatedRequest) return res.status(409).json({ success: false, message: "This request has already been resolved" });
    res.json({ success: true, request: await populateRequest(PurchaseRequest.findById(updatedRequest._id)) });
  } catch (err) {
    next(err);
  }
});

export default router;
