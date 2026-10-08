import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(10),
  password: z.string().min(8),
  role: z.enum(["FARMER", "INDUSTRY"]), // ADMIN can never self-register
  location: z.string().trim().min(2),
  companyName: z.string().trim().optional(),
  businessType: z.string().trim().max(100).optional(),
  farmDetails: z.string().trim().max(300).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  location: user.location,
  companyName: user.companyName,
  businessType: user.businessType,
  farmDetails: user.farmDetails,
  isVerified: user.isVerified,
});

export const register = async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }
    const data = parsed.data;

    if (data.role === "INDUSTRY" && !data.companyName) {
      return res
        .status(400)
        .json({ success: false, message: "Company name is required for industries" });
    }

    const exists = await User.findOne({ email: data.email });
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(data.password, 12);
    const user = await User.create({ ...data, username: data.email, password: hashed });

    res.status(201).json({
      success: true,
      token: signToken(user),
      user: formatUser(user),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Email or username already registered" });
    }
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }
    const { email, password } = parsed.data;

    const user = await User.findOne({ email }).select("+password");
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) {
      // same message for both cases, so attackers can't tell which emails exist
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    res.json({ success: true, token: signToken(user), user: formatUser(user) });
  } catch (err) {
    next(err);
  }
};

export const getMe = (req, res) => {
  res.json({ success: true, user: formatUser(req.user) });
};