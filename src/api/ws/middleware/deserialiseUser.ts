import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Socket } from "socket.io";
import { updateSocketUser } from "../utils/updateSocketUser";
dotenv.config();

/**
 * Middleware to deserialise the user ID from the socket using
 * the JWT token provided in the socket handshake.
 *
 * @param socket - The socket.io socket instance
 * @param next - The next function to call
 */
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

        socket.emit("authenticated", true); // tell the client they are authenticated
        // console.log(`Authentication successful with user: ${user.email}`);
        next();
    } catch (error) {
        console.log(error);
        return next(new Error("JWT Expired"));
    }
};

export default deserialiseUser;
