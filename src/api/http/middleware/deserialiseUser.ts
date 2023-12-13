import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import supabase from "../../../config/supa";

export default async function deserialiseUser(
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ")
    ) {
        return next();
    }

    const accessToken = req.headers.authorization.split(" ")[1];

    try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        const userID = decoded.sub;
        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", userID)
            .single();
        if (error) {
            throw error;
        }

        req.user = {
            id: user.id,
            access_level: user.access_level,
        };
    } catch (error) {
        return next();
    }

    return next();
}
