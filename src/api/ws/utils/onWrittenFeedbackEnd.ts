import { Socket } from "socket.io";
import { sendMessageFromX } from "./sendMessageFromX";
import { OUT_OF_ATTEMPTS_MESSAGE } from "../../../prompts/quiz.prompts";
import { io } from "../../server";

export async function onWrittenFeedbackEnd({
    channel,
    socket,
    attempts,
    marksScored,
    feedback,
    questionIndex,
    maxMarks,
    solution,
    audio,
}: {
    channel: string;
    socket: Socket;
    attempts: number;
    marksScored: number;
    feedback: string;
    questionIndex: number;
    maxMarks: number;
    solution: string;
    audio: boolean;
}) {
    if (attempts === 4 && marksScored! < maxMarks) {
        const message = OUT_OF_ATTEMPTS_MESSAGE;
        await sendMessageFromX({
            channel: "quiz",
            socket,
            message,
            messageData: {
                questionIndex,
                marksScored,
                questionType: "written",
                context: "feedback_stream",
            },
            endData: {
                feedback: feedback + message,
                questionIndex,
                marksScored,
                type: "end",
                questionType: "written",
                context: "new_feedback",
            },
            audio,
        });
        await sendMessageFromX({
            channel: "quiz",
            socket,
            message: solution,
            messageData: {
                questionIndex,
                context: "answer_stream",
            },
            endData: {
                answer: solution,
                questionIndex,
                context: "new_answer",
            },
            audio,
        });
    } else {
        io.to(socket.sessionID!).emit(`${channel}_instruction`, {
            feedback,
            questionIndex,
            marksScored,
            questionType: "written",
            type: "end",
            context: "new_feedback",
        });
    }
}
