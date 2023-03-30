// @ts-nocheck

import fs from "fs";
import mockLesson from "../../mock_data/mockLessons.json";
import mockUser from "../../mock_data/mockuser.json";
import { XLesson } from "../../lib/XLesson";
import lesson_message_xHandler from "./lesson_message_x.handler";

const start_lessonHandler = (data, socket) => {
    const { lessonID } = data;
    console.log("Received connection to start_lesson");
    console.log("Lesson ID:", lessonID);

    const current_lesson = mockLesson["l2c3qu4js5rdbxuptoazk"];
    const current_user = socket.user;

    const lesson = new XLesson({
        lesson: current_lesson,
        student: current_user,
    });

    socket.emit("lesson_info", current_lesson);

    lesson.chat.messageEmitter.on(
        "message",
        message => message && socket.emit("lesson_response_stream", message)
    );

    const completeChat = async ({ message, first }) => {
        const { learningObjectiveNumber, finished, content } =
            await lesson.continueConversation(message);

        //Update the token amount on the users account
        socket.emit("lesson_response_data", {
            learningObjectiveNumber: first ? -1 : learningObjectiveNumber,
            response: content,
        });

        if (finished) socket.emit("lesson_finished", true);
    };

    completeChat({ first: true });

    socket.on("lesson_message_x", async message => {
        await completeChat({ message });
    });
};

export default start_lessonHandler;
