// @ts-nocheck
import { regsiterAdmin } from "../controllers/auth/adminAuthController";
import { Router } from "express";
const router = Router();

//Auth Sign Up
router.post("/", regsiterAdmin);

export default router;
