import { Request, Response } from "express";
import supabase from "../../../config/supa";

export async function getUsersHandler(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        const {
            data: { users },
            error,
        } = await supabase.auth.admin.listUsers();

        if (error) {
            throw error;
        }
        return res.status(200).json(users);
    } catch (error: any) {
        console.log(JSON.stringify(error, null, 2));
        return res.status(500).json(error.message);
    }
}

export async function updateUserByIdHandler(
    req: Request<{ id: string }, {}, Partial<User>>,
    res: Response
): Promise<Response> {
    try {
        const {
            id,
            email,
            password,
            first_name,
            education_level,
            subjects,
            access_level,
        } = req.body;
        const {
            data: { user },
            error,
        } = await supabase.auth.admin.updateUserById(req.params.id, {
            ...(email && { email }),
            ...(password && { password }),
        });

        if (error) {
            throw error;
        }

        const { data, error: error2 } = await supabase
            .from("editable_user")
            .update({
                ...(first_name && { first_name }),
                ...(education_level && { education_level }),
                ...(access_level && { access_level }),
            })
            .eq("id", id);

        if (error2) {
            throw error2;
        }

        const { error: error3 } = await supabase
            .from("users_on_subjects")
            .delete()
            .eq("user_id", id);

        if (error3) {
            throw error3;
        }

        if (subjects?.length) {
            const { data: users_on_subjects, error: error4 } = await supabase
                .from("users_on_subjects")
                .insert(
                    subjects.map(subject_name => ({
                        user_id: id!,
                        subject_name,
                    }))
                );

            if (error4) {
                throw error4;
            }
        }

        return res.sendStatus(204);
    } catch (error: any) {
        console.log(JSON.stringify(error, null, 2));
        return res.status(500).json(error.message);
    }
}

export async function deleteUserByIdHandler(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        const { data, error } = await supabase.auth.admin.deleteUser(
            req.params.id
        );
        if (error) {
            throw error;
        }
        return res.sendStatus(204);
    } catch (error: any) {
        console.log(JSON.stringify(error, null, 2));
        return res.status(500).json(error.message);
    }
}
