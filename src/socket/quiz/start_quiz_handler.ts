import { Socket } from "socket.io";
import ChatGPTConversation from "../../lib/ChatGPTConversation";
import {
    generateAnalysisMessage,
    generateAnalysisSystemPrompt,
    generateFeedbackMessage,
    generateFeedbackSystemPrompt,
    generateHintsSystemPrompt,
    generateQuizAnswerSystemPrompt,
    generateQuizQuestionsSystemPrompt,
} from "../../prompts/quiz.prompts";
import { getAudioData } from "../../lib/tts.utils";
import OrderMaintainer from "../../lib/OrderMaintainer";
import { streamString } from "../../lib/XUtils";
import { eventEmitterSetup } from "../../lib/socketSetup";
import { STREAM_END_MESSAGE, STREAM_SPEED } from "../../lib/constants";
import DelayedBuffer from "../../lib/DelayedBuffer";

type ChannelData = {
    lesson: Lesson;
};

const QUESTIONS_PER_LEARNING_OBJECTIVE = 2;

const generateQuestion = async (
    socket: Socket,
    questionNumber: number,
    questionGenerator: ChatGPTConversation,
    lesson: Lesson
) => {
    console.log("GENERATING QUESTION", questionNumber);
    if (
        questionNumber >=
        QUESTIONS_PER_LEARNING_OBJECTIVE * lesson.learning_objectives.length
    ) {
        throw new Error("Question number out of bounds");
    }

    const learningObjective = Math.floor(
        questionNumber / QUESTIONS_PER_LEARNING_OBJECTIVE
    );
    const learningObjectiveQuestion =
        questionNumber % QUESTIONS_PER_LEARNING_OBJECTIVE;
    const type = learningObjectiveQuestion === 1 ? "written" : "multiple";
    if (learningObjectiveQuestion === 0) {
        questionGenerator.reset(
            generateQuizQuestionsSystemPrompt(lesson, learningObjective)
        );
    }

    const question = await questionGenerator!.generateResponse({
        message: type,
        silent: true,
    });
    console.log("GENERATED QUESTION:", question);

    const final =
        questionNumber ===
        QUESTIONS_PER_LEARNING_OBJECTIVE * lesson.learning_objectives.length -
            1;
    const questionData =
        type === "written"
            ? question
            : {
                  title: question.split("\n")[0],
                  choices: question
                      .split("\n")
                      .slice(1)
                      .map(choice => choice.trim())
                      .filter(Boolean),
              };

    socket.emit("quiz_next_question", {
        raw: question,
        question: questionData,
        type,
        questionNumber,
        final,
    });

    return question;
};

const solveQuestion = async ({
    socket,
    question,
}: {
    socket: Socket;
    question: string;
}): Promise<string> => {
    console.log("SOLVING QUESTION");

    const solutionGenerator = new ChatGPTConversation({
        systemPrompt: "",
        socket,
    });

    const solution = await solutionGenerator.generateResponse({
        message: question,
    });

    console.log("SOLVED QUESTION:", solution);

    return solution;
};

const generateAnalysis = async ({
    question,
    solution,
    studentSolution,
    socket,
}: {
    question: string;
    solution: string;
    studentSolution: string;
    socket: Socket;
}) => {
    console.log("GENERATING ANALYSIS");

    const analysisGenerator = new ChatGPTConversation({
        socket,
        systemPrompt: generateAnalysisSystemPrompt,
    });

    const analysis = await analysisGenerator.generateResponse({
        message: generateAnalysisMessage({
            question,
            solution,
            studentSolution,
        }),
    });

    console.log("GENERATED ANALYSIS:", analysis);

    return analysis;
};

type Question = {
    question: string;
    solution?: string;
    solvingQuestion: boolean;
};

const start_quiz_handler = async (data: ChannelData, socket: Socket) => {
    console.log("received connection to start_quiz");

    data.lesson.learning_objectives.sort((a, b) => a.number - b.number);

    // console.log("lesson: ", data.lesson);
    let currentQuestionNumber = 0;
    let currentQuestion = "";
    let questionGenerator = new ChatGPTConversation({
        socket,
    });
    let currentFeedbackGenerator: ChatGPTConversation | undefined;
    // let nextFeedbackGenerator: ChatGPTConversation | undefined;
    let currentHintGenerator: ChatGPTConversation | undefined;
    // let nextHintGenerator: ChatGPTConversation | undefined;
    let attempts = 0;
    const questions: Question[] = [];

    socket.on("quiz_change_question", async () => {
        console.log("CHANGING QUESTION");
        currentFeedbackGenerator?.cleanUp();
        currentHintGenerator?.cleanUp();
        // currentFeedbackGenerator = undefined;
        // currentHintGenerator = undefined;
    });

    socket.on("quiz_generate_next_question", async () => {
        console.log("GENERATING NEXT QUESTION");
        const questionNumber = currentQuestionNumber++;
        const question = await generateQuestion(
            socket,
            questionNumber,
            questionGenerator,
            data.lesson
        );

        questions[questionNumber] = {
            question,
            solvingQuestion: true,
        };

        const solution = await solveQuestion({
            socket,
            question,
        });

        questions[questionNumber].solvingQuestion = false;
        questions[questionNumber].solution = solution;
    });

    socket.on("quiz_exit", () => {
        console.log("EXITING QUIZ");
        questionGenerator.cleanUp();
        currentFeedbackGenerator?.cleanUp();
        currentHintGenerator?.cleanUp();
        // nextFeedbackGenerator?.cleanUp();
        // nextHintGenerator?.cleanUp();
        socket.removeAllListeners("quiz_exit");
        socket.removeAllListeners("quiz_change_question");
        socket.removeAllListeners("quiz_request_hint");
        socket.removeAllListeners("quiz_request_feedback");
        socket.removeAllListeners("quiz_generate_next_question");
    });

    socket.on("quiz_request_hint", async ({ questionIndex, id, question }) => {
        console.log("GENERATING HINT");
        if (!currentHintGenerator || question !== currentQuestion) {
            if (!currentHintGenerator) {
                currentHintGenerator = new ChatGPTConversation({
                    socket,
                    systemPrompt: generateHintsSystemPrompt(
                        data.lesson,
                        question
                    ),
                });
            } else {
                currentHintGenerator.reset(
                    generateHintsSystemPrompt(data.lesson, question)
                );
            }
            currentQuestion = question;
        }

        // const audioOrderMaintainer = new OrderMaintainer({
        //     callback: data =>
        //         socket.emit("quiz_audio_data", { audio: data, id }),
        // });

        eventEmitterSetup({
            generateAudio: false,
            chat: currentHintGenerator,
            socket,
            streamChannel: `quiz_hint_stream`,
            // onReceiveAudioData: ({ base64, order }) => {
            //     audioOrderMaintainer.addData(base64, order);
            // },
            onMessage: message =>
                socket.emit("quiz_hint_stream", {
                    delta: message,
                    questionIndex,
                }),
        });

        const response = await currentHintGenerator.generateResponse({
            message: "hint",
        });

        // currentHintGenerator.messageEmitter.removeAllListeners(
        //     "generate_audio"
        // );
        console.log("GENERATED HINT:", response);

        socket.emit("quiz_new_hint", {
            hint: response,
            questionIndex,
        });
    });

    socket.on(
        "quiz_request_feedback",
        async ({ message, questionIndex, choiceIndex, id, question }) => {
            console.log("GENERATING FEEDBACK FOR QUESTION:", question);

            // only generate feedback if the question has been solved by GPT-4
            await new Promise<void>(resolve => {
                const interval = setInterval(() => {
                    if (
                        questions[questionIndex].solvingQuestion === false &&
                        questions[questionIndex].solution
                    ) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });

            if (!currentFeedbackGenerator || question !== currentQuestion) {
                attempts = 0;
                if (!currentFeedbackGenerator) {
                    currentFeedbackGenerator = new ChatGPTConversation({
                        socket,
                        systemPrompt: generateFeedbackSystemPrompt(
                            data.lesson,
                            question,
                            questions[questionIndex].solution!,
                            choiceIndex !== undefined
                        ),
                    });
                } else {
                    currentFeedbackGenerator.reset(
                        generateFeedbackSystemPrompt(
                            data.lesson,
                            question,
                            questions[questionIndex].solution!,
                            choiceIndex !== undefined
                        )
                    );
                }
                currentQuestion = question;
            }
            attempts++;
            // const audioOrderMaintainer = new OrderMaintainer({
            //     callback: data =>
            //         socket.emit("quiz_audio_data", { audio: data, id }),
            // });
            let temp = "";
            let isCorrect: undefined | boolean = undefined;
            let response = "";
            const buffer = new DelayedBuffer(
                async (delta: string) => {
                    if (delta === STREAM_END_MESSAGE) {
                        if (response.startsWith("CORRECT")) {
                            socket.emit("quiz_new_feedback", {
                                isCorrect: true,
                                feedback: response.slice(8),
                                questionIndex,
                                choiceIndex,
                            });
                        } else {
                            if (attempts === 4) {
                                // const message =
                                //     " Unfortunately, you have no remaining attempts. A modal answer will be provided in the answer box.";
                                // await streamString(
                                //     message,
                                //     socket,
                                //     `quiz_feedback_stream`,
                                //     {
                                //         questionIndex,
                                //         choiceIndex,
                                //         isCorrect,
                                //     }
                                // );
                                socket.emit("quiz_new_feedback", {
                                    isCorrect: false,
                                    feedback: response.slice(10),
                                    questionIndex,
                                    choiceIndex,
                                    final: true,
                                });
                                const answerGenerator = new ChatGPTConversation(
                                    {
                                        socket,
                                        systemPrompt:
                                            generateQuizAnswerSystemPrompt(
                                                data.lesson,
                                                question
                                            ),
                                    }
                                );

                                let answer = "";
                                eventEmitterSetup({
                                    chat: answerGenerator,
                                    socket,
                                    streamChannel: `quiz_answer_stream`,
                                    sendEndMessage: true,
                                    onMessage: async delta => {
                                        if (delta === STREAM_END_MESSAGE) {
                                            socket.emit("quiz_answer", {
                                                answer,
                                                questionIndex,
                                            });
                                            return;
                                        }

                                        socket.emit("quiz_answer_stream", {
                                            delta,
                                            questionIndex,
                                        });
                                    },
                                });

                                answer =
                                    await answerGenerator.generateResponse();
                            } else {
                                socket.emit("quiz_new_feedback", {
                                    isCorrect: false,
                                    feedback: response.slice(10),
                                    questionIndex,
                                    choiceIndex,
                                });
                            }
                        }

                        currentFeedbackGenerator!.messageEmitter.removeAllListeners();
                        return;
                    }

                    if (isCorrect === undefined) {
                        temp += delta;
                        if (temp.startsWith("CORRECT")) {
                            isCorrect = true;
                        } else if (temp.startsWith("INCORRECT")) {
                            isCorrect = false;
                        }
                        return;
                    }

                    socket.emit("quiz_feedback_stream", {
                        delta,
                        questionIndex,
                        choiceIndex,
                        isCorrect,
                    });
                },
                0,
                STREAM_SPEED
            );

            currentFeedbackGenerator.messageEmitter.on("end", () => {
                buffer.addData(STREAM_END_MESSAGE);
            });

            currentFeedbackGenerator.messageEmitter.on(
                "delta",
                ({ delta, first }) => {
                    if (delta) {
                        if (first) {
                            buffer.reset();
                        }
                        // buffer.addData(delta);
                        for (const char of delta) {
                            buffer.addData(char);
                        }
                    }
                }
            );

            // eventEmitterSetup({
            //     generateAudio: false,
            //     chat: currentFeedbackGenerator,
            //     socket,
            //     streamChannel: `quiz_feedback_stream`,
            //     sendEndMessage: true,
            //     // onReceiveAudioData: ({ base64, order }) => {
            //     //     audioOrderMaintainer.addData(base64, order);
            //     // },
            //     onMessage: async delta => {

            //     },
            // });

            const analysis = await generateAnalysis({
                question,
                solution: questions[questionIndex].solution!,
                studentSolution: message,
                socket,
            });

            console.log(currentFeedbackGenerator.systemPrompt);

            response = await currentFeedbackGenerator.generateResponse({
                message: generateFeedbackMessage(message, analysis),
            });

            console.log("GENERATED FEEDBACK:", response);
            console.log("QUESTION NUMBER IS:", questionIndex);
            console.log("CHOICE NUMBER IS:", choiceIndex);
        }
    );
};

export default start_quiz_handler;
