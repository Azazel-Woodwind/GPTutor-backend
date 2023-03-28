// @ts-nocheck
import { loginSuperAdmin } from "../controllers/auth/superAdminAuthController";
import { Router } from "express";
const router = Router();

//Login Super Admin
router.post("/", loginSuperAdmin);

export default router;
