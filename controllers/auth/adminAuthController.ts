// @ts-nocheck

import { supabase } from "../../config/supa";
import HandleResponse from "../../models/auth/handleResponseAdmin";
import {
    validateAdminSignUp,
    validateAdminLogin,
} from "../../validations/adminValidate";
import { Request, Response } from "express";

/***************************** Register Admin ******************************/

const regsiterAdmin = async (req: Request, resp: Response) => {
    const { error } = validateAdminSignUp(req.body);
    if (error)
        return resp.status(400).send({ error: error?.details[0].message });

    const { email } = req.body;

    await supabase
        .from("users")
        .select("email")
        .eq("email", email)
        .then(async res => {
            if (res?.status === 200 && res?.data?.[0]?.email === email) {
                resp.status(409).send({
                    message: "The email is taken. Try another.",
                });
            } else {
                try {
                    const { data, error } = await supabase.auth.signUp(
                        HandleResponse.registerAdmin(req.body)
                    );

                    if (data) {
                        const { error } = await supabase
                            .from("users")
                            .insert(HandleResponse.createAdmin(req.body, data));
                    }
                    if (error) {
                        resp.status(400).send(error?.message);
                    }
                    resp.send({
                        message:
                            "Kindly check your email to activate your account.",
                    });
                } catch (error) {
                    resp.status(400).send(error);
                }
            }
        });
};

/***************************** Login Admin ******************************/

const loginAdmin = async (req: Request, resp: Response) => {
    const { error } = validateAdminLogin(req.body);
    if (error)
        return resp.status(400).send({ error: error?.details[0].message });

    await supabase.auth
        .signInWithPassword(HandleResponse.login(req.body))
        .then(response => {
            if (response?.data?.user === null) {
                resp.status(400).send(response?.error);
            } else {
                const email = response?.data?.user?.email;
                supabase
                    .from("users")
                    .select("*")
                    .eq("email", email)
                    .then(res => {
                        resp.send(HandleResponse.loginResponse(response, res));
                    });
            }
        });
};

export { regsiterAdmin, loginAdmin };
