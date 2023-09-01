import supabase from "../../config/supa";
import startLessonSchema from "../schema/start_lesson.schema";
import ChatGPTConversation from "../../lib/ChatGPTConversation";
import { Socket } from "socket.io";
import {
    generateLessonSystemPrompt,
    lesson,
} from "../../prompts/lessons.prompts";
import { XSetup, onFeedbackRequest } from "../../lib/socketSetup";
import Quiz from "../../lib/Quiz";
import { getAudioData } from "../../lib/tts.utils";
import { sendXMessage } from "../../lib/XUtils";

type ChannelData = {
    current_lesson: Lesson;
};

type LessonResponseData = {
    learningObjectiveNumber: number;
    finished: boolean;
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

    // console.log("SYSTEM PROMPT:", chat.systemPrompt);

    const onResponse = async (response: string) => {
        if (!response.trim()) return;

        socket.emit("lesson_response_data", {
            response,
        });
    };

    let lastLearningObjective = 0;

    const quiz = new Quiz(current_lesson, socket);
    const questionAudioData: any = [];

    const NUM_QUESTIONS = 2;
    const onInstruction = async (data: any) => {
        if (data.instruction) {
            const learningObjective = Math.round(data.instruction);
            if (learningObjective > lastLearningObjective) {
                lastLearningObjective = learningObjective;

                for (let i = 0; i < NUM_QUESTIONS; i++) {
                    quiz.generateNextQuestion({
                        type: "multiple",
                        learningObjectiveIndex: learningObjective - 1,
                        hasImage: false,
                        onQuestion(question: Question) {
                            socket.emit("lesson_next_question", {
                                ...question,
                                questionString: question.question,
                                questionIndex: question.questionIndex,
                                final: i === 1,
                            });
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
                                ] = audioData)
                        );
                }
            }
        }

        if (data.finishedLearningObjective) {
            console.log("FINISHED LEARNING OBJECTIVE:", data);
            const message =
                "Great! Let's test your understanding with some questions.";
            await sendXMessage({
                channel: "lesson",
                socket,
                message,
            });

            console.log("SENT MESSAGE:", message);
        }

        // console.log("SENDING DATA:", data);
        socket.emit("lesson_instruction", data);
    };

    socket.on("lesson_change_question", async questionIndex => {
        console.log("CHANGING TO QUESTION", questionIndex);
        quiz.changeQuestion(questionIndex);
        if (quiz.questions.length > questionIndex) {
            socket.emit("lesson_instruction", {
                type: "audio",
                first: true,
                audioContent: questionAudioData[questionIndex % NUM_QUESTIONS],
            });
        }
    });

    socket.on("lesson_request_feedback", async ({ message, questionIndex }) => {
        // console.log("REQUESTING FEEDBACK FOR QUESTION", questionIndex);
        onFeedbackRequest({
            studentAnswer: message,
            questionIndex,
            quiz,
            socket,
            channel: "lesson",
        });
    });

    XSetup({
        chat,
        socket,
        channel: "lesson",
        onResponse,
        start: true,
        onInstruction,
        onExit: () => {
            socket.removeAllListeners("lesson_request_feedback");
            socket.removeAllListeners("lesson_change_question");
        },
    });
};

export default start_lessonHandler;
