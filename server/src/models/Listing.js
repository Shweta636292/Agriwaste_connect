import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    wasteType: { type: String, required: true, trim: true },
    cropType: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ["tons", "kg", "bales"], default: "tons" },
    quality: { type: String, trim: true, default: "Standard" },
    location: { type: String, required: true, trim: true },
    availableFrom: { type: Date, required: true },
    pricePerUnit: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    imageUrl: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["AVAILABLE", "PAUSED", "SOLD"], default: "AVAILABLE", index: true },
  },
  { timestamps: true }
);

listingSchema.index({ wasteType: "text", cropType: "text", location: "text" });

export default mongoose.model("Listing", listingSchema);
