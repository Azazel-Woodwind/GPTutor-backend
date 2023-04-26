// @ts-nocheck

import supabase from "../../config/supa";
import { XSetup, continueConversation, getJsonData } from "../../lib/XUtils";
import startLessonSchema from "../schema/start_lesson.schema";
import { XLesson } from "./XLesson";
import { lesson } from "../../lib/GPT4prompts.utils";
import ChatGPTConversation from "../../lib/ChatGPTConversation";

const start_lessonHandler = async (data, socket) => {
    // try {
    //     startLessonSchema.parse(data);
    // } catch (error) {
    //     socket.emit("start_lesson_error", error.issues);
    //     return;
    // }

    const { current_lesson } = data;
    console.log("Received connection to start_lesson");

    // console.log("Current lesson:", current_lesson);

    const current_user = socket.user;

    // const lesson = new XLesson({
    //     lesson: current_lesson,
    //     student: current_user,
    //     socket,
    // });

    const chat = new ChatGPTConversation({
        systemPrompt: lesson.systemPrompt(current_user, current_lesson),
        socket,
    });

    const onResponse = async (response, first) => {
        const data = await getJsonData(
            lesson.dataPrompt(current_lesson),
            chat,
            socket
        );
        console.log("DATA:", data);

        socket.emit("lesson_response_data", {
            learningObjectiveNumber:
                first || !data ? -1 : data.learningObjectiveNumber,
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
