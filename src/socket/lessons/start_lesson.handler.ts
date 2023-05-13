import supabase from "../../config/supa";
import { XSetup, getJsonData } from "../../lib/XUtils";
import startLessonSchema from "../schema/start_lesson.schema";
import { lesson } from "../../lib/GPT4prompts.utils";
import ChatGPTConversation from "../../lib/ChatGPTConversation";
import { Socket } from "socket.io";

type ChannelData = {
    current_lesson: Lesson;
};

const start_lessonHandler = async (data: ChannelData, socket: Socket) => {
    // try {
    //     startLessonSchema.parse(data);
    // } catch (error: any) {
    //     socket.emit("start_lesson_error", error.issues);
    //     return;
    // }

    const { current_lesson } = data;
    console.log("Received connection to start_lesson");

    // console.log("Current lesson:", current_lesson);

    const chat = new ChatGPTConversation({
        systemPrompt: lesson.systemPrompt(socket.user!, current_lesson),
        socket,
    });

    const onResponse = async (response: string) => {
        const data = await getJsonData(
            lesson.dataPrompt(current_lesson),
            chat,
            socket
        );
        console.log("DATA:", data);

        socket.emit("lesson_response_data", {
            learningObjectiveNumber: !data ? -1 : data.learningObjectiveNumber,
            response,
        });

        if (data.finished) {
            socket.emit("lesson_finished", true);
        }
    };

    XSetup({
        chat,
        socket,
        channel: "lesson",
        onResponse,
        start: true,
    });
};

export default start_lessonHandler;
