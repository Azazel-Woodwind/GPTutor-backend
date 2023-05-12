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
        const { data, error } = await supabase.from("lessons").select();

        if (error) {
            throw error;
        }
        return res.status(200).json(data);
    } catch (error: any) {
        console.log(JSON.stringify(error, null, 2));
        return res.status(500).json(error.message);
    }
}

export async function createLessonHandler(
    req: Request<{}, {}, Omit<Lesson, "id">>,
    res: Response
): Promise<Response> {
    try {
        const { learningObjectives, ...lessonData } = req.body;
        const { data, error } = await supabase
            .from("lessons")
            .insert({
                ...lessonData,
                is_published: false,
                author_id: req.user!.id,
            })
            .select();

        if (error) {
            throw error;
        }

        for (let learningObjective of learningObjectives) {
            await createLearningObjective(learningObjective, data[0].id);
        }

        return res.status(201).json(data);
    } catch (error: any) {
        console.log(JSON.stringify(error, null, 2));
        return res.status(500).json(error.message);
    }
}

async function createLearningObjective(
    learningObjective: LearningObjective,
    lesson_id: string
) {
    const { images, title } = learningObjective;
    const { data, error } = await supabase
        .from("learning_objectives")
        .insert({
            title,
            lesson_id,
        })
        .select();

    if (error) {
        throw error;
    }

    for (let image of images) {
        await createImage(image, data[0].id);
    }
}

async function createImage(image: Image, learning_objective_id: string) {
    const { error } = await supabase.from("images").insert({
        ...image,
        learning_objective_id,
    });

    if (error) {
        throw error;
    }
}
