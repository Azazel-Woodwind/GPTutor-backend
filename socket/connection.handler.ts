// @ts-nocheck

import transcribeAudioHandler from "./audio/transcribe_audio.handler";
import textDataHandler from "./audio/text_data.handler";
import startLessonHandler from "./lessons/start_lesson.handler";
import generateQuizHandler from "./assignments/generate_quiz.handler";
import startChatHandler from "./chat/start_chat.handler";

const handleConnection = socket => {
    console.log("Socket connected");

    const route = handler => data => handler(data, socket);

    try {
        //Whisper streaming api
        socket.on("transcribe_audio", route(transcribeAudioHandler));
        //Google speech to text
        socket.on("text_data", route(textDataHandler));
        //X Conversation API
        socket.on("start_chat", route(startChatHandler));
        //Lessons API
        socket.on("start_lesson", route(startLessonHandler));
        //Assignments API
        socket.on("generate_quiz", route(generateQuizHandler));
    } catch (err) {
        switch (err) {
            case "token quota":
                socket.emit("token_quota", {
                    usage: socket.user.usage,
                    limit: socket.user.limit,
                });
                break;
            default:
                console.log(err);
                break;
        }
    }
};

export default handleConnection;
