import transcribeAudioHandler from "./application-handlers/transcribeAudioHandler";
import startLessonHandler from "./application-handlers/startLessonHandler";
import startChatHandler from "./application-handlers/startChatHandler";
import { Socket } from "socket.io";
import startQuizHandler from "./application-handlers/startQuizHandler";
import { updateSocketUser } from "./utils/updateSocketUser";
import supabase from "../../config/supa";
import subscribeToUserUpdates from "./utils/subscribeToUserUpdates";

type DataHandler = (data: any, socket: Socket) => void;

const connectionHandler = async (socket: Socket) => {
    console.log("Socket connected");
    socket.currentUsage = 0;
    // console.log("Socket user id", socket.user?.id);

    const unsubscribeFromUserUpdates = subscribeToUserUpdates(
        socket,
        payload => {
            updateSocketUser(socket);
        }
    );

    try {
        const route = (handler: DataHandler) => (data: any) =>
            handler(data, socket);

        // Whisper streaming api
        socket.on("transcribe_audio", route(transcribeAudioHandler));
        // X Conversation API
        socket.on("start_chat", route(startChatHandler));
        // Lessons API
        socket.on("start_lesson", route(startLessonHandler));
        // Quiz API
        socket.on("start_quiz", route(startQuizHandler));

        // On disconnect
        socket.on("disconnect", async reason => {
            console.log("Socket disconnected.", reason);
            unsubscribeFromUserUpdates();
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

export default connectionHandler;
