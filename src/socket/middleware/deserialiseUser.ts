import supabase from "../../config/supa";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Socket } from "socket.io";
dotenv.config();

const handleAuthenticate = async (socket: Socket, next: any) => {
    // console.log(socket);

    const token = socket.handshake?.auth?.token;
    if (!token) return next(new Error("missing token"));

    //Fetch the user here using the token provided

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // console.log("decoded:", decoded);
        const userID = decoded.sub;
        // console.log("userID:", userID);

        const {
            data: { user },
            error,
        } = await supabase.auth.admin.getUserById(userID as string);

        if (error) {
            return next(new Error("Something went wrong"));
        }

        const { data: user_data, error: user_error } = await supabase
            .from("users")
            .select("*, usage_plans:usage_plan (max_daily_tokens)")
            .eq("id", userID)
            .single();

        if (user_error) {
            return next(new Error("Something went wrong"));
        }

        if (!user) {
            return next(new Error("User not found"));
        }

        // console.log("user:", user);

        socket.user = {
            ...user,
            ...user_data,
            ...user_data.usage_plans,
            usage_plans: undefined,
        };
        socket.emit("authenticated", true);
        // console.log(`Authentication successful with user: ${user.email}`);
        next();
    } catch (error) {
        console.log(error);
        return next(new Error("JWT Expired"));
    }
};

export default handleAuthenticate;
