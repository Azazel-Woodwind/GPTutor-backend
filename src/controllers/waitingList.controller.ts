import { Request, Response } from "express";
import supabase from "../config/supa";
import ejs from "ejs";
import sendEmail from "../lib/sendEmail";

export async function getWaitingListUsersHandler(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        const { data, error } = await supabase
            .from("waiting_list_users")
            .select();

        if (error) {
            throw error;
        }
        return res.status(200).json(data);
    } catch (error: any) {
        console.log(JSON.stringify(error, null, 2));
        return res.status(500).json(error.message);
    }
}

export async function addUserToWaitingListHandler(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        const { data, error } = await supabase
            .from("waiting_list_users")
            .select()
            .eq("email", req.body.email);

        if (error) {
            throw error;
        }

        if (data.length > 0) {
            return res.status(409).json("User already exists");
        }

        const { data: data2, error: error2 } = await supabase
            .from("waiting_list_users")
            .insert(req.body);

        if (error2) {
            throw error2;
        }

        await ejs.renderFile(
            "./src/emailTemplates/xtutor_wait.ejs",
            {
                firstName: req.body.first_name,
                sharelink: "https://app.xtutor.ai",
                emailTo: req.body.email,
                unsubscribeLink: "https://app.xtutor.ai",
            },
            async (error, str) => {
                if (error) {
                    console.log(JSON.stringify(error, null, 2));
                    return res.status(500).json("Something went wrong?");
                } else {
                    const response = await sendEmail({
                        from: "contact@xtutor.ai",
                        to: req.body.email,
                        subject: "Your Future of Education Begins Here.",
                        html: str,
                    });
                }
            }
        );

        return res.status(201).json(data2);
    } catch (error: any) {
        console.log(JSON.stringify(error, null, 2));
        return res.status(500).json(error.message);
    }
}

async function linkSubjects(subject_name: string, user_id: string) {
    const { error } = await supabase
        .from("waiting_list_users_on_subjects")
        .insert({
            subject_name,
            user_id,
        });

    if (error) {
        throw error;
    }
}
