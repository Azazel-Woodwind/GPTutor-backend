import { Request, Response } from "express";
import supabase from "../../../config/supa";

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
        const { data, error } = await supabase.rpc("update_lesson_by_id", {
            lesson_id: req.params.id,
            author_id: req.user?.id,
            ...req.body,
        });

        if (error) {
            throw error;
        }

        return res.sendStatus(204);
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
                "*, learning_objectives (*, instructions:learning_objective_instructions (*)), exam_boards (*), quiz_scores (*), author:users!lessons_author_id_fkey (*)"
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

export async function getLessonHandler(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        const { data: lesson, error } = await supabase
            .from("lessons")
            .select(
                "*, learning_objectives (*, instructions:learning_objective_instructions (*)), exam_boards (*), quiz_scores (*)"
            )
            .eq("id", req.params.id)
            .single();

        if (error) {
            throw error;
        }

        if (Array.isArray(lesson.learning_objectives)) {
            lesson.learning_objectives = lesson.learning_objectives.sort(
                (a, b) => a.number! - b.number!
            );
        }

        return res.status(200).json(lesson);
    } catch (error: any) {
        console.log(JSON.stringify(error, null, 2));
        return res.status(500).json(error.message);
    }
}

export async function createLessonHandler(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        req.body.author_id = req.user?.id;
        const { data, error } = await supabase.rpc("create_lesson", req.body);

        if (error) {
            throw error;
        }

        return res.status(201).json(data);
    } catch (error: any) {
        console.log(JSON.stringify(error, null, 2));
        return res.status(500).json(error.message);
    }
}

export async function patchLessonHandler(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        const { data, error } = await supabase
            .from("lessons")
            .update(req.body)
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
