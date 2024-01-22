import { Socket } from "socket.io";
import crypto from "crypto";
import { io } from "../../server";
import Quiz from "../lib/Quiz";
import DelayedBuffer from "../lib/DelayedBuffer";
import { onWrittenFeedbackEnd } from "../utils/onWrittenFeedbackEnd";
import joinUniqueRoom from "../utils/joinUniqueRoom";

const startQuizHandler = async (
    data: {
        lesson: Lesson;
    },
    socket: Socket
) => {
    console.log("received connection to start_quiz");

    data.lesson.learning_objectives.sort((a, b) => a.number - b.number);

    const sessionID = joinUniqueRoom(socket, "quiz", data.lesson.id);

    console.log("LESSON:", data.lesson);

    const quiz = new Quiz(data.lesson, socket);

    const onImage = ({
        imageHTML,
        questionIndex,
    }: {
        imageHTML: string;
        questionIndex: number;
    }) => {
        console.log("GENERATED IMAGE FOR QUESTION", questionIndex);
        // console.log("IMAGE HTML:", data);
        io.to(socket.sessionID!).emit("quiz_question_image", {
            imageHTML,
            questionIndex,
        });
    };

    const onQuestion = (question: Question) => {
        // console.log("GENERATED QUESTION:", question);
        io.to(socket.sessionID!).emit("quiz_next_question", {
            ...question,
            questionString: question.question,
            questionIndex: question.questionIndex,
        });
    };

    socket.on("quiz_change_question", async questionIndex => {
        console.log("CHANGING TO QUESTION", questionIndex);
        quiz.changeQuestion();

        if (!quiz.hasGeneratedAllQuestions()) {
            console.log("GENERATING NEXT QUESTION AS QUIZ HAS NOT ENDED");
            quiz.generateNextQuestion({
                hasImage: true,
                onImage,
                onQuestion,
            });
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
        const buffer = new DelayedBuffer((callback: Function) => {
            callback();
        }, 0);

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
            onEnd({ feedback, marksScored, attempts, question }) {
                buffer.addData(() => {
                    onWrittenFeedbackEnd({
                        channel: "quiz",
                        socket,
                        feedback,
                        marksScored,
                        attempts,
                        questionIndex,
                        maxMarks: question.marks,
                        solution: question.solution!,
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
            console.log("FOR QUESTION:", questionIndex);

            const buffer = new DelayedBuffer((data: any) => {
                io.to(socket.sessionID!).emit(`quiz_instruction`, {
                    questionIndex,
                    choiceIndex: message,
                    questionType: "multiple",
                    ...data,
                });
            }, 0);

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
    for (let i = 0; i < 2; i++) {
        quiz.generateNextQuestion({
            hasImage: true,
            onImage,
            onQuestion,
        });
    }
};

export default startQuizHandler;
