// @ts-nocheck

import { Request, Response, NextFunction } from "express";

export const STUDENT_ACCESS_LEVEL = 1;
export const TEACHER_ACCESS_LEVEL = 2;
export const ADMIN_ACCESS_LEVEL = 3;
export const SUPER_ADMIN_ACCESS_LEVEL = 4;

export default (access_level: number) =>
    (req: Request, res: Response, next: NextFunction) => {
        if (req.user!.access_level < SUPER_ADMIN_ACCESS_LEVEL) res.status(403);
        else next();
    };
