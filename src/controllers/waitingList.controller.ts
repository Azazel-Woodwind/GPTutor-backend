import { Request, Response } from "express";
import supabase from "../config/supa";

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
        const { subjects, ...rest } = req.body;
        const { data, error } = await supabase
            .from("waiting_list_users")
            .insert(rest)
            .select();

        if (error) {
            throw error;
        }

        for (let subject_name of subjects) {
            await linkSubjects(subject_name, data[0].id);
        }

        return res.status(200).json(data);
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
