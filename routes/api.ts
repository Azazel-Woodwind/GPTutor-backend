// @ts-nocheck
import { Router } from "express";
import routeProtection, {
    TEACHER_ACCESS_LEVEL,
} from "../middleware/routeProtection";
import authRouter from "./auth";
import loginRouter from "./login";
import resetPasswordRouter from "./resetPassword";
import lessonsRouter from "./lessons";
import waitListRouter from "./waitList";
import quizRouter from "./quiz";
import superAdminSignupRouter from "./superAdminSignUp";
import superAdminLoginRouter from "./superAdminLogin";
import adminLoginRouter from "./adminLogin";
import adminSignUpRouter from "./adminSignUp";
import deserialiseUser from "../middleware/deserialiseUser";

const router = Router();

router.use("/register", authRouter);
router.use("/login", loginRouter);

router.use("/super-admin-sign-up", superAdminSignupRouter);
router.use("/super-admin-login", superAdminLoginRouter);
router.use("/admin-sign-up", adminSignUpRouter);
router.use("/admin-login", adminLoginRouter);
router.use("/reset-password", resetPasswordRouter);
router.use("/lessons", lessonsRouter);
router.use("/wait-list", waitListRouter);
router.use("/quiz", quizRouter);

export default router;
