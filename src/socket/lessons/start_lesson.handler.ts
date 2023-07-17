import supabase from "../../config/supa";
import { getConversationData } from "../../lib/XUtils";
import startLessonSchema from "../schema/start_lesson.schema";
import ChatGPTConversation from "../../lib/ChatGPTConversation";
import { Socket } from "socket.io";
import {
    generateLessonSystemPrompt,
    lesson,
} from "../../prompts/lessons.prompts";
import { XSetup } from "../../lib/socketSetup";

type ChannelData = {
    current_lesson: Lesson;
};

type LessonResponseData = {
    learningObjectiveNumber: number;
    finished: boolean;
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
        socket.emit("lesson_response_data", {
            response: response,
        });
    };

    const onResponseData = (data: any) => {
        console.log("DATA:", data);
        socket.emit(
            "lesson_learning_objective_change",
            data.learningObjectiveNumber
        );

        if (data.finished === true || data.finished === "true") {
            socket.emit("lesson_finished", true);
        }
    };

    XSetup({
        chat,
        socket,
        channel: "lesson",
        onResponse,
        start: true,
        onResponseData,
    });
};

export default start_lessonHandler;
