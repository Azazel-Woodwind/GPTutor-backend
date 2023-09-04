import { Socket } from "socket.io";
import Quiz from "../../lib/Quiz";
import crypto from "crypto";
import { io } from "../../server";
import { onWrittenFeedbackEnd, sendXMessage } from "../../lib/XUtils";
import { OUT_OF_ATTEMPTS_MESSAGE } from "../../prompts/quiz.prompts";
import DelayedBuffer from "../../lib/DelayedBuffer";
import { STREAM_SPEED } from "../../lib/constants";

type ChannelData = {
    lesson: Lesson;
};

const QUESTIONS_PER_LEARNING_OBJECTIVE = 2;

async function generateNextQuestion({
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
        onImage({ imageHTML, questionIndex }) {
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

const start_quiz_handler = async (data: ChannelData, socket: Socket) => {
    console.log("received connection to start_quiz");

    data.lesson.learning_objectives.sort((a, b) => a.number - b.number);

    const sessionID = `quiz-${socket.user!.id}-${data.lesson.id}-${crypto
        .randomBytes(4)
        .toString("hex")}`;
    socket.join(sessionID);
    socket.sessionID = sessionID;

    console.log("LESSON:", data.lesson);

    const quiz = new Quiz(data.lesson, socket);

    socket.on("quiz_change_question", async questionIndex => {
        console.log("CHANGING TO QUESTION", questionIndex);
        quiz.changeQuestion(questionIndex);

        if (!quiz.questions[questionIndex]) {
            throw new Error("Question number out of bounds");
        } else if (!quiz.questions[questionIndex].final) {
            generateNextQuestion({ quiz, socket });
        }
    });

    socket.on("quiz_exit", () => {
        console.log("EXITING QUIZ");
        socket.leave(sessionID);
        socket.sessionID = undefined;
        quiz.reset();
        socket.removeAllListeners("quiz_exit");
        socket.removeAllListeners("quiz_change_question");
        socket.removeAllListeners("quiz_request_feedback");
        socket.removeAllListeners("quiz_generate_next_question");
    });

    socket.on("quiz_request_written_feedback", ({ message, questionIndex }) => {
        const buffer = new DelayedBuffer(
            (callback: Function) => {
                callback();
            },
            0,
            STREAM_SPEED
        );

        quiz.generateWrittenQuestionFeedback({
            studentSolution: message,
            questionIndex,
            onDelta({ delta, marksScored }) {
                buffer.addData(() => {
                    io.to(socket.sessionID!).emit(`quiz_instruction`, {
                        delta,
                        questionIndex,
                        marksScored,
                        questionType: "written",
                        context: "feedback_stream",
                        type: "delta",
                    });
                });
            },
            onEnd({ feedback, marksScored, attempts }) {
                buffer.addData(() => {
                    onWrittenFeedbackEnd({
                        channel: "quiz",
                        socket,
                        feedback,
                        marksScored,
                        attempts,
                        questionIndex,
                        maxMarks: quiz.questions[questionIndex].marks,
                        solution: quiz.questions[questionIndex].solution!,
                        audio: false,
                    });
                });
            },
        });
    });

    socket.on(
        "quiz_request_multiple_choice_feedback",
        ({ message, questionIndex }) => {
            console.log("RECEIVED ANSWER:", message);
            console.log("FOR QUESTION:", quiz.questions[questionIndex]);

            const buffer = new DelayedBuffer(
                (data: any) => {
                    io.to(socket.sessionID!).emit(`quiz_instruction`, {
                        questionIndex,
                        choiceIndex: message,
                        questionType: "multiple",
                        ...data,
                    });
                },
                0,
                STREAM_SPEED
            );

            quiz.generateMultipleChoiceQuestionFeedback({
                studentChoiceIndex: message,
                questionIndex,
                onDelta({ delta, isCorrect }) {
                    buffer.addData({
                        delta,
                        isCorrect,
                        context: "feedback_stream",
                        type: "delta",
                    });
                },
                onEnd({ feedback, isCorrect }) {
                    buffer.addData({
                        feedback,
                        isCorrect,
                        type: "end",
                        context: "new_feedback",
                    });
                },
            });
        }
    );

    // send two questions
    generateNextQuestion({ quiz, socket });
    generateNextQuestion({ quiz, socket });
};

export default start_quiz_handler;
