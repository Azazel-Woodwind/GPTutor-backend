import transcribeAudioHandler from "./audio/transcribe_audio.handler";
import startLessonHandler from "./lessons/start_lesson.handler";
import startChatHandler from "./chat/start_chat.handler";
import supabase from "../config/supa";
import { Socket } from "socket.io";

type DataHandler = (data: any, socket: Socket) => void;

const handleConnection = async (socket: Socket) => {
    console.log("Socket connected");
    socket.currentUsage = 0;

    try {
        const route = (handler: DataHandler) => (data: any) =>
            handler(data, socket);
        // Whisper streaming api
        socket.on("transcribe_audio", route(transcribeAudioHandler));
        // X Conversation API
        socket.on("start_chat", route(startChatHandler));
        // Lessons API
        socket.on("start_lesson", route(startLessonHandler));

        // On disconnect
        socket.on("disconnect", async reason => {
            console.log("Socket disconnected.", reason);
            const { data, error } = await supabase.rpc("increment_usage", {
                user_id: socket.user?.id!,
                delta: socket.currentUsage!,
            });
        });
    } catch (err) {
        switch (err) {
            case "token quota":
                const { data, error } = await supabase
                    .from("usage_plans")
                    .select("max_daily_tokens")
                    .eq("plan", socket.user?.usage_plan)
                    .single();

                socket.emit("token_quota", {
                    usage: socket.user?.daily_token_usage,
                    plan: socket.user?.usage_plan,
                    limit: data?.max_daily_tokens,
                });
                break;
            default:
                console.log(err);
                break;
        }
    }
};

export default handleConnection;
