// @ts-nocheck
import { registerSuperAdmin } from "../controllers/auth/superAdminAuthController";
import { Router } from "express";
const router = Router();

//Sign Up Super Admin
router.post("/", registerSuperAdmin);

export default router;
