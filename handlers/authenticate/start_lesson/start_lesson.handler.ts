import fs from "fs";
import mockLesson from "../../../mock_data/mockLessons.json";
import mockUser from "../../../mock_data/mockuser.json";
import { XLesson } from "../../../lib/XLesson";
import lesson_message_xHandler from "./lesson_message_x.handler";

const start_lessonHandler = (data, socket) => {
    const { lessonID } = data;
    console.log("Received connection to start_lesson");
    console.log("Lesson ID:", lessonID);
    // let lessons;
    // try {
    //     const jsonString = fs.readFileSync(
    //         require.resolve("../../../temp_data/lessons.json"),
    //         "utf8"
    //     );
    //     lessons = JSON.parse(jsonString);
    // } catch (error) {
    //     console.log("Error:", error);
    // }
    // console.log(lessons);
    // const current_lesson = lessons[lessonID];
    // console.log(current_lesson);

    const current_lesson = mockLesson["l2c3qu4js5rdbxuptoazk"];
    const current_user = mockUser;

    const lesson = new XLesson({
        lesson: current_lesson,
        student: current_user,
    });

    console.log(current_lesson.learningObjectives);
    socket.emit("lesson_info", current_lesson);
    lesson.chat.messageEmitter.on(
        "message",
        message => message && socket.emit("lesson_response_stream", message)
    );

    const completeChat = async ({ message, first }) => {
        const { learningObjectiveNumber, finished, content } =
            await lesson.continueConversation(message);

        socket.emit("lesson_response_data", {
            learningObjectiveNumber: first ? -1 : learningObjectiveNumber,
            response: content,
        });

        if (finished) socket.emit("lesson_finished", true);
    };

    completeChat({ first: true });

    socket.on("lesson_message_x", async message => {
        await lesson_message_xHandler({ message, completeChat }, socket);
    });
};

export default start_lessonHandler;
