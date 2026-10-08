import { Router } from "express";
import { z } from "zod";
import Listing from "../models/Listing.js";
import PurchaseRequest from "../models/PurchaseRequest.js";
import User from "../models/User.js";
import { authorizeRoles, protect } from "../middleware/auth.js";

const router = Router();
const listingSchema = z.object({
  wasteType: z.string().trim().min(2),
  cropType: z.string().trim().min(2),
  quantity: z.coerce.number().positive(),
  unit: z.enum(["tons", "kg", "bales"]),
  quality: z.string().trim().min(1).max(80),
  location: z.string().trim().min(2),
  availableFrom: z.coerce.date(),
  pricePerUnit: z.coerce.number().nonnegative(),
  description: z.string().trim().max(1000).optional().default(""),
  imageUrl: z.string().trim().url().or(z.literal("")).optional().default(""),
});

const escapeRegex = (value) => [...value].map((character) =>
  "\\^$.*+?()[]{}|".includes(character) ? `\\${character}` : character
).join("");
const withFarmer = (query) => query.populate("farmer", "name location isVerified");

router.get("/", async (req, res, next) => {
  try {
    const { q, wasteType, location, minQuantity, maxPrice, status } = req.query;
    const filter = { status: status === "PAUSED" || status === "SOLD" ? status : "AVAILABLE" };
    if (q) {
      const pattern = new RegExp(escapeRegex(String(q).slice(0, 80)), "i");
      filter.$or = [{ wasteType: pattern }, { cropType: pattern }, { location: pattern }];
    }
    if (wasteType) filter.wasteType = new RegExp(`^${escapeRegex(String(wasteType))}$`, "i");
    if (location) filter.location = new RegExp(escapeRegex(String(location).slice(0, 80)), "i");
    if (minQuantity) filter.quantity = { $gte: Math.max(0, Number(minQuantity)) };
    if (maxPrice) filter.pricePerUnit = { $lte: Math.max(0, Number(maxPrice)) };

    const listings = await withFarmer(Listing.find(filter)).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, listings });
  } catch (err) {
    next(err);
  }
});

router.get("/mine", protect, authorizeRoles("FARMER"), async (req, res, next) => {
  try {
    const listings = await withFarmer(Listing.find({ farmer: req.user._id })).sort({ createdAt: -1 });
    res.json({ success: true, listings });
  } catch (err) {
    next(err);
  }
});

router.get("/saved", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("savedListings");
    const listings = await withFarmer(Listing.find({
      _id: { $in: user?.savedListings || [] },
      status: "AVAILABLE",
    })).sort({ updatedAt: -1 });
    res.json({ success: true, listings });
  } catch (err) {
    next(err);
  }
});

router.post("/", protect, authorizeRoles("FARMER"), async (req, res, next) => {
  try {
    const parsed = listingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Check the listing details", errors: parsed.error.issues });
    const listing = await Listing.create({ ...parsed.data, farmer: req.user._id });
    res.status(201).json({ success: true, listing });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", protect, authorizeRoles("FARMER"), async (req, res, next) => {
  try {
    const changes = {};
    if (req.body.status !== undefined) {
      if (!["AVAILABLE", "PAUSED"].includes(req.body.status)) return res.status(400).json({ success: false, message: "Invalid listing status" });
      changes.status = req.body.status;
    }
    const parsed = listingSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Check the listing details" });
    Object.assign(changes, parsed.data);
    const listing = await Listing.findOneAndUpdate(
      { _id: req.params.id, farmer: req.user._id, status: { $ne: "SOLD" } },
      changes,
      { returnDocument: "after", runValidators: true }
    );
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });
    res.json({ success: true, listing });
  } catch (err) {
    next(err);
  }
});

router.put("/:id/saved", protect, async (req, res, next) => {
  try {
    if (typeof req.body.saved !== "boolean") return res.status(400).json({ success: false, message: "Choose whether to save or remove this listing" });
    const listing = await Listing.findOne({ _id: req.params.id, status: "AVAILABLE" });
    if (!listing) return res.status(404).json({ success: false, message: "Listing is no longer available" });
    if (String(listing.farmer) === String(req.user._id)) return res.status(400).json({ success: false, message: "You cannot save your own listing" });
    await User.updateOne(
      { _id: req.user._id },
      req.body.saved
        ? { $addToSet: { savedListings: listing._id } }
        : { $pull: { savedListings: listing._id } }
    );
    res.json({ success: true, saved: req.body.saved });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", protect, authorizeRoles("FARMER"), async (req, res, next) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, farmer: req.user._id });
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });
    const hasOrder = await PurchaseRequest.exists({ listing: listing._id, status: { $in: ["ACCEPTED", "COMPLETED"] } });
    if (hasOrder) return res.status(409).json({ success: false, message: "Listings with accepted orders cannot be deleted" });
    await listing.deleteOne();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
