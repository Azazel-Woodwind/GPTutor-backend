import supabase from "../../config/supa";
import { getConversationData } from "../../lib/XUtils";
import startLessonSchema from "../schema/start_lesson.schema";
import ChatGPTConversation, {
    ChatResponse,
} from "../../lib/ChatGPTConversation";
import { Socket } from "socket.io";
import {
    generateLessonSystemPrompt,
    lesson,
} from "../../prompts/lessons.prompts";
import { XSetup } from "../../lib/socketSetup";

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

    chat.messageEmitter.on("data", data => {
        data = data.split("\n").filter(Boolean);
        console.log("DATA:", data);
        let [learningObjectiveNumber, finished] = data;
        learningObjectiveNumber = parseInt(learningObjectiveNumber) || -1;
        socket.emit(
            "lesson_learning_objective_change",
            learningObjectiveNumber
        );

        if (finished === "true") {
            socket.emit("lesson_finished", true);
        }
    });
    // console.log(chat.systemPrompt);

    const onResponse = async (response: ChatResponse) => {
        const data = await getConversationData(
            lesson.dataPrompt(current_lesson, chat.chatHistory.slice(1)),
            chat,
            socket
        );

        const { learningObjectiveNumber, finished } = data;
        // const systemPrompt = lesson.dataPrompt(
        //     current_lesson,
        //     chat.chatHistory.slice(1)
        // );
        // console.log("DATA SYSTEM PROMPT:", systemPrompt);

        // const dataFetcher = new ChatGPTConversation({
        //     systemPrompt,
        //     socket,
        // });

        // let {
        //     response: { content },
        // } = await dataFetcher.generateChatCompletion(undefined, {
        //     silent: true,
        //     temperature: 0,
        // });

        // console.log("DATA RESPONSE:", content);
        // const data = content.split("\n").filter(Boolean);
        // console.log("DATA:", data);
        // const [learningObjectiveNumber, finished] = data;

        socket.emit("lesson_response_data", {
            learningObjectiveNumber: parseInt(learningObjectiveNumber) || -1,
            response: response.content,
        });

        if (finished) {
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
