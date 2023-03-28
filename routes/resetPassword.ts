// @ts-nocheck
import { supabase } from "../config/supa";
import { Router } from "express";

export const router = Router();

//Reset Password For Admin And Super Admin

router.post("/", async (req, resp) => {
    const { email } = req.body;

    await supabase.auth.resetPasswordForEmail(email).then(response => {
        resp.send({ message: "Kindly check your email for reset password." });
    });
});

export default router;
