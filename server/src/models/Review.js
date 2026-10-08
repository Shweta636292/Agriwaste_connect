import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseRequest", required: true, index: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

reviewSchema.index({ order: 1, reviewer: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
