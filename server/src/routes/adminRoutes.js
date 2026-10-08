import { Router } from "express";
import User from "../models/User.js";
import Listing from "../models/Listing.js";
import PurchaseRequest from "../models/PurchaseRequest.js";
import { authorizeRoles, protect } from "../middleware/auth.js";

const router = Router();
router.use(protect, authorizeRoles("ADMIN"));

router.get("/overview", async (req, res, next) => {
  try {
    const [farmers, industries, listings, availableListings, pendingRequests, completedOrders] = await Promise.all([
      User.countDocuments({ role: "FARMER" }),
      User.countDocuments({ role: "INDUSTRY" }),
      Listing.countDocuments(),
      Listing.countDocuments({ status: "AVAILABLE" }),
      PurchaseRequest.countDocuments({ status: { $in: ["PENDING", "COUNTERED"] } }),
      PurchaseRequest.countDocuments({ status: "COMPLETED" }),
    ]);
    res.json({
      success: true,
      overview: {
        farmers,
        industries,
        listings,
        availableListings,
        pendingRequests,
        completedOrders,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find().select("name email role location companyName isVerified createdAt").sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:id/verify", async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: Boolean(req.body.isVerified) }, { returnDocument: "after" })
      .select("name email role location companyName isVerified");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

export default router;
