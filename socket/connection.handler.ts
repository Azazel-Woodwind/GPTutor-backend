// @ts-nocheck

import transcribeAudioHandler from "./audio/transcribe_audio.handler";
import textDataHandler from "./audio/text_data.handler";
import startLessonHandler from "./lessons/start_lesson.handler";
import generateQuizHandler from "./assignments/generate_quiz.handler";
import startChatHandler from "./chat/start_chat.handler";
import next from "next";
import supabase from "../config/supa";

const handleConnection = async socket => {
    console.log("Socket connected");

    try {
        const route = handler => data => handler(data, socket);
        // Whisper streaming api
        socket.on("transcribe_audio", route(transcribeAudioHandler));
        // Google speech to text
        socket.on("text_data", route(textDataHandler));
        // X Conversation API
        socket.on("start_chat", route(startChatHandler));
        // Lessons API
        socket.on("start_lesson", route(startLessonHandler));
        // Assignments API
        socket.on("generate_quiz", route(generateQuizHandler));
        // On disconnect
        socket.on("disconnect", async reason => {
            console.log("Socket disconnected.", reason);
            const { data, error } = await supabase.rpc("increment_usage", {
                id: socket.user.id,
                delta: socket.currentUsage,
            });
        });
    } catch (err) {
        switch (err) {
            case "token quota":
                const { data, error } = await supabase
                    .from("usage_plans")
                    .select("max_daily_tokens")
                    .eq("plan", socket.user.usage_plan)
                    .single();

                socket.emit("token_quota", {
                    usage: socket.user.daily_token_usage,
                    plan: socket.user.usage_plan,
                    limit: data.max_daily_tokens,
                });
                break;
            default:
                console.log(err);
                break;
        }
    }
};

export default handleConnection;
