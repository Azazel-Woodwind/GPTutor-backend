// @ts-nocheck
import { supabase } from "../config/supa";

const handleAuthenticate = async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("missing token"));

    const response = await supabase.auth.getUser(token);
    if (!response?.data?.user) return next(new Error("not authorized"));

    socket.user = response?.data?.user;
    next();
};

export default handleAuthenticate;
