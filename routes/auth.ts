// @ts-nocheck
import { Request, Response, Router } from "express";
import { supabase } from "../config/supa";
import { validateUser } from "../models/auth";

const router = Router();

interface User {
    name: string;
    email: string;
    password: string;
    phone_number: string;
    educational_level: string;
    main_subjects: string[];
}

// Auth Sign Up
router.post("/", async (req: Request, resp: Response) => {
    console.log("registering user");

    const { error } = validateUser(req.body);
    if (error)
        return resp.status(400).send({ error: error.details[0].message });

    const {
        name,
        email,
        password,
        phone_number,
        educational_level,
        main_subjects,
    } = req.body as User;

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
                    const { data, error } = await supabase.auth.signUp({
                        email,
                        password,
                    });

                    if (error) resp.status(400).json(error.message);

                    if (data) {
                        const { error } = await supabase.from("users").insert({
                            name: name,
                            email: email,
                            password: password,
                            phone_number: phone_number,
                            educational_level: educational_level,
                            main_subjects: main_subjects,
                            uuid: data?.user?.id,
                        });
                        if (error) {
                            resp.status(400).json(error.message);
                        }
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
});

export default router;
