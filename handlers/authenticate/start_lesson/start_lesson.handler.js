const start_lessonHandler = (data, socket) => {
    console.log("Received connection to start_lesson");

    const current_lesson = require("../../../mock_data/lesson.json");
    const current_user = require("../../../mock_data/user.json");
    const {XLesson} = require("../../../utils/lesson.utils");

    const lesson = new XLesson({
        lesson: current_lesson,
        student: current_user,
    });
    console.log(current_lesson.learningObjectives);
    socket.emit("lesson_info", current_lesson);
    lesson.chat.messageEmitter.on(
        "message",
        (message) => message && socket.emit("lesson_response_stream", message)
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

    socket.on("lesson_message_x", async (message) => {
        await require("./lesson_message_x.handler")(
            { message, completeChat },
            socket
        );
    });
};

module.exports = start_lessonHandler;
