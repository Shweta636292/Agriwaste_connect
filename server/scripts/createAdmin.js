import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../src/models/User.js";

dotenv.config();

const required = ["MONGO_URI", "ADMIN_NAME", "ADMIN_EMAIL", "ADMIN_PHONE", "ADMIN_PASSWORD", "ADMIN_LOCATION"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment values: ${missing.join(", ")}`);
  process.exit(1);
}
if (process.env.ADMIN_PASSWORD.length < 12) {
  console.error("ADMIN_PASSWORD must contain at least 12 characters.");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new Error("That email is already registered. Choose a new admin email.");

  const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  await User.create({
    name: process.env.ADMIN_NAME.trim(),
    username: email,
    email,
    phone: process.env.ADMIN_PHONE.trim(),
    password,
    role: "ADMIN",
    location: process.env.ADMIN_LOCATION.trim(),
    isVerified: true,
  });
  console.log("Admin account created.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
