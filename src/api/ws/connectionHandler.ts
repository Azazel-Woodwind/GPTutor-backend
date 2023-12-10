import transcribeAudioHandler from "./application-handlers/transcribeAudioHandler";
import startLessonHandler from "./application-handlers/startLessonHandler";
import startChatHandler from "./application-handlers/startChatHandler";
import { Socket } from "socket.io";
import start_quiz_handler from "./application-handlers/startQuizHandler";
import { updateSocketUser } from "./utils/updateSocketUser";
import supabase from "../../config/supa";

type DataHandler = (data: any, socket: Socket) => void;

const connectionHandler = async (socket: Socket) => {
    console.log("Socket connected");
    socket.currentUsage = 0;
    // console.log("Socket user id", socket.user?.id);
    const userInfoChannel = supabase
        .channel(`user-info-${socket.user?.id}`)
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: "users",
                filter: `id=eq.${socket.user?.id}`,
            },
            payload => {
                // console.log("Change received in public.users", payload);
                updateSocketUser(socket);
            }
        )
        .subscribe();

    const authInfoChannel = supabase
        .channel(`auth-info-${socket.user?.id}`)
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "auth",
                table: "users",
                filter: `id=eq.${socket.user?.id}`,
            },
            payload => {
                // console.log("Change received in auth.users", payload);
                updateSocketUser(socket);
            }
        )
        .subscribe();

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
        socket.on("start_quiz", route(start_quiz_handler));

        // On disconnect
        socket.on("disconnect", async reason => {
            console.log("Socket disconnected.", reason);
            supabase.removeChannel(userInfoChannel);
            supabase.removeChannel(authInfoChannel);
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
