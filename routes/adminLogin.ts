import { loginAdmin } from "../controllers/auth/adminAuthController";
import { Router } from "express";
const router = Router();

//Auth Login
router.post("/", loginAdmin);

export default router;
