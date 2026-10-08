import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, select: false },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["FARMER", "INDUSTRY", "ADMIN"],
      required: true,
    },
    location: { type: String, required: true },
    companyName: { type: String, trim: true }, // for INDUSTRY users
    businessType: { type: String, trim: true },
    farmDetails: { type: String, trim: true },
    savedListings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }],
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);