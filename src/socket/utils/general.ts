import supabase from "../../config/supa";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Socket } from "socket.io";

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
