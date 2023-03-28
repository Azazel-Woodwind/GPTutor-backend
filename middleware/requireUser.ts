// @ts-nocheck

import { NextFunction, Request, Response } from "express";

export default function requireUser(
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (!req.user) {
        return res.status(401).json("Unauthorised. No user found.");
    }

    return next();
}
