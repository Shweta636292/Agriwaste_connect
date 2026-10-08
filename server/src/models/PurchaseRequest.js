import mongoose from "mongoose";

const purchaseRequestSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    quantity: { type: Number, required: true, min: 0.01 },
    offeredPrice: { type: Number, required: true, min: 0 },
    preferredPickupDate: { type: Date },
    message: { type: String, trim: true, maxlength: 500, default: "" },
    responseMessage: { type: String, trim: true, maxlength: 500, default: "" },
    counterPrice: { type: Number, min: 0 },
    completedByFarmer: { type: Boolean, default: false },
    completedByBuyer: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["PENDING", "COUNTERED", "ACCEPTED", "REJECTED", "COMPLETED"],
      default: "PENDING",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PurchaseRequest", purchaseRequestSchema);
