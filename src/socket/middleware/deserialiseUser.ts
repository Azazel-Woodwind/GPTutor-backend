import supabase from "../../config/supa";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Socket } from "socket.io";
import { updateSocketUser } from "../utils/general";
dotenv.config();

const deserialiseUser = async (socket: Socket, next: any) => {
    // console.log(socket);

    const token = socket.handshake?.auth?.token;
    if (!token) return next(new Error("missing token"));

    //Fetch the user here using the token provided

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // console.log("decoded:", decoded);
        const userID = decoded.sub;

        if (!userID) {
            return next(new Error("User not found"));
        }

        // console.log("userID:", userID);

        await updateSocketUser(socket, userID as string);

        socket.emit("authenticated", true);
        // console.log(`Authentication successful with user: ${user.email}`);
        next();
    } catch (error) {
        console.log(error);
        return next(new Error("JWT Expired"));
    }
};

export default deserialiseUser;
