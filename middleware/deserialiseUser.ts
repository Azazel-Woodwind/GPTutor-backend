import { NextFunction, Request, Response } from "express";
import { UserData, verifyJWT } from "../lib/jwt.utils";
import { reIssueAccessToken } from "../services/session.service";

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

    const { decoded, expired } = verifyJWT(accessToken);

    if (decoded) {
        req.user = decoded;
        return next();
    }

    const refreshToken = req.get("x-refresh");

    if (expired && refreshToken) {
        const newAccessToken = await reIssueAccessToken(refreshToken);

        if (!newAccessToken) {
            return next();
        }

        res.setHeader("x-access-token", newAccessToken);
        const { decoded } = verifyJWT(newAccessToken);
        req.user = decoded as UserData;
        return next();
    }

    return next();
}
