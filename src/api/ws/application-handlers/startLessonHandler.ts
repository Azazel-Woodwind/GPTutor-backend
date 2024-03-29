import { Socket } from "socket.io";
import { io } from "../../server";
import ChatGPTConversation from "../lib/ChatGPTConversation";
import { lesson } from "../../../prompts/lessonsPrompts";
import Quiz from "../lib/Quiz";
import { getAudioData } from "../utils/tts";
import { sendMessageFromX } from "../utils/sendMessageFromX";
import OrderMaintainer from "../lib/OrderMaintainer";
import { onWrittenFeedbackEnd } from "../utils/onWrittenFeedbackEnd";
import { setUpConversationWithX } from "../utils/setUpConversationWithX";
import joinUniqueRoom from "../utils/joinUniqueRoom";

const startLessonHandler = async (
    data: {
        current_lesson: Lesson;
    },
    socket: Socket
) => {
    const { current_lesson } = data;

    const sessionID = joinUniqueRoom(socket, "quiz", current_lesson.id);

    console.log("Received connection to start_lesson");

    // console.log("Current lesson:", current_lesson);

    const chat = new ChatGPTConversation({
        systemPrompt: lesson.systemPrompt(socket.user!, current_lesson),
        socket,
    });

    // console.log("SYSTEM PROMPT:", chat.systemPrompt);

    let lastLearningObjective = 0;

    const quiz = new Quiz(current_lesson, socket);
    const questionAudioData: any = [];

    const NUM_QUESTIONS = 2;
    const onInstruction = async (data: any) => {
        if (data.instruction) {
            const learningObjective = Math.floor(data.instruction);
            if (learningObjective > lastLearningObjective) {
                lastLearningObjective = learningObjective;

                for (let i = 0; i < NUM_QUESTIONS; i++) {
                    quiz.generateNextQuestion({
                        hasImage: false,
                        onQuestion(question: Question) {
                            io.to(socket.sessionID!).emit(
                                "lesson_next_question",
                                {
                                    ...question,
                                    questionString: question.question,
                                    questionIndex: question.questionIndex,
                                    final: i === 1,
                                }
                            );
                        },
                    })
                        .then((question: Question) =>
                            getAudioData(question.title!).then(
                                (audioData: any) => ({
                                    audioData,
                                    questionIndex: question.questionIndex,
                                })
                            )
                        )
                        .then(
                            ({ audioData, questionIndex }) =>
                                (questionAudioData[
                                    questionIndex % NUM_QUESTIONS
                                ] = audioData.audioContent)
                        );
                }
            }
        }

        if (data.finishedLearningObjective) {
            console.log("FINISHED LEARNING OBJECTIVE:", data);
            const message =
                "Great! Let's test your understanding with some questions.";
            await sendMessageFromX({
                channel: "lesson",
                socket,
                message,
            });

            console.log("SENT MESSAGE:", message);
        }

        // console.log("SENDING DATA:", data);
        io.to(socket.sessionID!).emit("lesson_instruction", data);
    };

    socket.on("lesson_change_question", async questionIndex => {
        console.log("CHANGING TO QUESTION", questionIndex);
        quiz.changeQuestion();
    });

    socket.on("lesson_get_audio_for_question", questionIndex => {
        if (quiz.length() > questionIndex) {
            io.to(socket.sessionID!).emit("lesson_instruction", {
                type: "audio",
                audioContent: questionAudioData[questionIndex % NUM_QUESTIONS],
            });
        }
    });

    socket.on(
        "lesson_request_written_feedback",
        async ({ message, questionIndex }) => {
            const orderMaintainer = new OrderMaintainer({
                callback: (callback: Function) => {
                    callback();
                },
            });

            let order = 0;
            await quiz.generateWrittenQuestionFeedback({
                studentSolution: message,
                questionIndex,
                onSentence({ sentence, marksScored }) {
                    const sentenceOrder = order++;
                    getAudioData(sentence)
                        .then(audioData => {
                            orderMaintainer.addData(() => {
                                io.to(socket.sessionID!).emit(
                                    `lesson_instruction`,
                                    {
                                        ...audioData,
                                        text: sentence,
                                        marksScored,
                                        type: "sentence",
                                        context: "feedback_stream",
                                        questionIndex,
                                        questionType: "written",
                                    }
                                );
                            }, sentenceOrder);
                        })
                        .catch(error => {
                            console.error(error);
                        });
                },
                async onEnd({ feedback, marksScored, attempts, question }) {
                    orderMaintainer.addData(() => {
                        onWrittenFeedbackEnd({
                            channel: "lesson",
                            socket,
                            feedback,
                            marksScored,
                            attempts,
                            questionIndex,
                            maxMarks: question.marks,
                            solution: question.solution!,
                            audio: true,
                        });
                    }, order);
                },
            });
        }
    );

    socket.on(
        "lesson_request_multiple_choice_feedback",
        ({ message, questionIndex }) => {
            const orderMaintainer = new OrderMaintainer({
                callback: (callback: Function) => {
                    callback();
                },
            });

            let order = 0;
            quiz.generateMultipleChoiceQuestionFeedback({
                studentChoiceIndex: message,
                questionIndex,
                onSentence({ sentence, isCorrect }) {
                    const currentOrder = order++;
                    getAudioData(sentence)
                        .then(audioData => {
                            orderMaintainer.addData(() => {
                                io.to(socket.sessionID!).emit(
                                    `lesson_instruction`,
                                    {
                                        ...audioData,
                                        text: sentence,
                                        isCorrect,
                                        type: "sentence",
                                        context: "feedback_stream",
                                        questionIndex,
                                        questionType: "multiple",
                                        choiceIndex: message,
                                    }
                                );
                            }, currentOrder);
                        })
                        .catch(error => {
                            console.error(error);
                        });
                },
                onEnd({ feedback, isCorrect }) {
                    orderMaintainer.addData(() => {
                        io.to(socket.sessionID!).emit(`lesson_instruction`, {
                            feedback,
                            questionIndex,
                            choiceIndex: message,
                            isCorrect,
                            questionType: "multiple",
                            type: "end",
                            context: "new_feedback",
                        });
                    }, order);
                },
            });
        }
    );

    setUpConversationWithX({
        chat,
        socket,
        channel: "lesson",
        start: true,
        onInstruction,
        onExit: () => {
            socket.leave(sessionID);
            socket.sessionID = undefined;
            socket.removeAllListeners("lesson_request_feedback");
            socket.removeAllListeners("lesson_change_question");
        },
    });
};

export default startLessonHandler;
