import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getMe, login, register } from "../controllers/authControllers.js";
import { protect } from "../middleware/auth.js";

const router = Router();
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 30,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: "Too many authentication attempts. Try again later." },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", protect, getMe);

export default router;