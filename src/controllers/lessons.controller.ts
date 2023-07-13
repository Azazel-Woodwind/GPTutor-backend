import { Request, Response } from "express";
import supabase from "../config/supa";

export async function deleteLessonHandler(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        const { error } = await supabase
            .from("lessons")
            .delete()
            .eq("id", req.params.id);

        if (error) {
            throw error;
        }

        return res.sendStatus(204);
    } catch (error: any) {
        console.log(JSON.stringify(error, null, 2));
        return res.status(500).json(error.message);
    }
}

export async function updateLessonHandler(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        const { data, error } = await supabase
            .from("lessons")
            .update(req.body)
            .eq("id", req.params.id)
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

export async function getLessonsHandler(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        const { data, error } = await supabase
            .from("lessons")
            .select(
                "*, learning_objectives (*), exam_boards (*), author:users (*)"
            );

        if (error) {
            throw error;
        }
        return res.status(200).json(data);
    } catch (error: any) {
        console.log(JSON.stringify(error, null, 2));
        return res.status(500).json(error.message);
    }
}
