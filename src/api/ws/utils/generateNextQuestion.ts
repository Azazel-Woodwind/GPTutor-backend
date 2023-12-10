import { Socket } from "socket.io";
import Quiz from "../../../lib/Quiz";
import { io } from "../../server";
import { QUESTIONS_PER_LEARNING_OBJECTIVE } from "./constants";

export default async function generateNextQuestion({
    quiz,
    socket,
}: {
    quiz: Quiz;
    socket: Socket;
}) {
    const questionIndex = quiz.numQuestionsGenerated;
    console.log("GENERATING QUESTION", questionIndex);
    if (
        questionIndex >=
        QUESTIONS_PER_LEARNING_OBJECTIVE *
            quiz.lesson.learning_objectives.length
    ) {
        throw new Error("Question number out of bounds");
    }

    const learningObjectiveIndex = Math.floor(
        questionIndex / QUESTIONS_PER_LEARNING_OBJECTIVE
    );
    const learningObjectiveQuestionIndex =
        questionIndex % QUESTIONS_PER_LEARNING_OBJECTIVE;
    const questionType =
        learningObjectiveQuestionIndex === 1 ? "written" : "multiple";
    const final =
        questionIndex ===
        QUESTIONS_PER_LEARNING_OBJECTIVE *
            quiz.lesson.learning_objectives.length -
            1;

    quiz.generateNextQuestion({
        questionType,
        learningObjectiveIndex,
        hasImage: true,
        onImage({
            imageHTML,
            questionIndex,
        }: {
            imageHTML: string;
            questionIndex: number;
        }) {
            console.log("GENERATED IMAGE FOR QUESTION", questionIndex);
            // console.log("IMAGE HTML:", data);
            io.to(socket.sessionID!).emit("quiz_question_image", {
                imageHTML,
                questionIndex,
            });
        },
        onQuestion(question: Question) {
            console.log("GENERATED QUESTION:", question);
            io.to(socket.sessionID!).emit("quiz_next_question", {
                ...question,
                questionString: question.question,
                questionIndex,
            });
        },
        final,
    });
}
