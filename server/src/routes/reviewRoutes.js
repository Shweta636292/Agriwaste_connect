import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import PurchaseRequest from "../models/PurchaseRequest.js";
import Review from "../models/Review.js";
import { protect } from "../middleware/auth.js";

const router = Router();
const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().default(""),
});
const populated = (query) => query
  .populate("order", "listing status createdAt")
  .populate("reviewer", "name companyName role")
  .populate("reviewee", "name companyName role");

router.use(protect);

router.get("/mine", async (req, res, next) => {
  try {
    const reviews = await populated(Review.find({ reviewer: req.user._id })).sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
});

router.get("/received", async (req, res, next) => {
  try {
    const reviews = await populated(Review.find({ reviewee: req.user._id })).sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
});

router.post("/:orderId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(404).json({ success: false, message: "Completed order not found" });
    if (!["FARMER", "INDUSTRY"].includes(req.user.role)) return res.status(403).json({ success: false, message: "Only trade participants can leave a review" });
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Choose a rating from 1 to 5 stars" });
    const order = await PurchaseRequest.findOne({ _id: req.params.orderId, status: "COMPLETED" });
    if (!order) return res.status(404).json({ success: false, message: "Reviews are available after both sides complete the order" });

    const isFarmer = req.user.role === "FARMER" && String(order.farmer) === String(req.user._id);
    const isBuyer = req.user.role === "INDUSTRY" && String(order.buyer) === String(req.user._id);
    if (!isFarmer && !isBuyer) return res.status(403).json({ success: false, message: "Only this order's participants can leave a review" });

    const review = await Review.create({
      ...parsed.data,
      order: order._id,
      reviewer: req.user._id,
      reviewee: isFarmer ? order.buyer : order.farmer,
    });
    res.status(201).json({ success: true, review: await populated(Review.findById(review._id)) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: "You have already reviewed this order" });
    next(err);
  }
});

export default router;
