const fs = require("fs");

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
    const current_lesson = require("../../../mock_data/mockLessons.json")[
        "l2c3qu4js5rdbxuptoazk"
    ];
    const current_user = require("../../../mock_data/user.json");
    const { XLesson } = require("../../../lib/XLesson");

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
        await require("./lesson_message_x.handler")(
            { message, completeChat },
            socket
        );
    });
};

module.exports = start_lessonHandler;
