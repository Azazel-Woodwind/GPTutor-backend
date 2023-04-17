import { Request, Response, NextFunction } from "express";

export const STUDENT_ACCESS_LEVEL = 1;
export const TEACHER_ACCESS_LEVEL = 2;
export const ADMIN_ACCESS_LEVEL = 3;
export const SUPER_ADMIN_ACCESS_LEVEL = 4;

export default (access_level: number) =>
    (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json("Unauthorised. No user found.");
        }
        if (req.user.access_level < access_level) {
            return res
                .status(403)
                .json("Forbidden. Insufficient access level.");
        }
        return next();
    };
