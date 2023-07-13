import supabase from "../../config/supa";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Socket } from "socket.io";
dotenv.config();

export const updateSocketUser = async (socket: Socket, userID?: string) => {
    if (!userID) {
        userID = socket.user?.id;
    }

    const {
        data: { user },
        error,
    } = await supabase.auth.admin.getUserById(userID as string);

    if (error) {
        console.log("error:", error);
        throw new Error("User could not be fetched");
    }

    const { data: user_data, error: user_error } = await supabase
        .from("users")
        .select("*, usage_plans (max_daily_tokens)")
        .eq("id", userID)
        .single();

    if (user_error) {
        console.log("error:", user_error);
        throw new Error("User could not be updated");
    }

    if (!user) {
        throw new Error("User not found");
    }

    // console.log("user:", user);
    const { usage_plans, ...rest } = user_data;
    socket.user = {
        ...user,
        ...rest,
        usage_plans: usage_plans as { max_daily_tokens: number },
    } as User;

    // console.log("socket.user:", socket.user);
};

const handleAuthenticate = async (socket: Socket, next: any) => {
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

export default handleAuthenticate;
