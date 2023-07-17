import { Socket } from "socket.io";
import ChatGPTConversation from "../../lib/ChatGPTConversation";
import {
    generateFeedbackSystemPrompt,
    generateHintsSystemPrompt,
    generateQuizAnswerSystemPrompt,
    generateQuizQuestionsSystemPrompt,
} from "../../prompts/quiz.prompts";
import { getAudioData } from "../../lib/tts.utils";
import OrderMaintainer from "../../lib/OrderMaintainer";
import { streamString } from "../../lib/XUtils";
import { eventEmitterSetup } from "../../lib/socketSetup";
import { STREAM_END_MESSAGE } from "../../lib/constants";

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

    socket.on("quiz_change_question", async () => {
        console.log("CHANGING QUESTION");
        currentFeedbackGenerator?.cleanUp();
        currentHintGenerator?.cleanUp();
        // currentFeedbackGenerator = undefined;
        // currentHintGenerator = undefined;
    });

    socket.on("quiz_generate_next_question", async () => {
        console.log("GENERATING NEXT QUESTION");
        await generateQuestion(
            socket,
            currentQuestionNumber++,
            questionGenerator,
            data.lesson
        );
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

            if (!currentFeedbackGenerator || question !== currentQuestion) {
                attempts = 0;
                if (!currentFeedbackGenerator) {
                    currentFeedbackGenerator = new ChatGPTConversation({
                        socket,
                        systemPrompt: generateFeedbackSystemPrompt(
                            data.lesson,
                            question
                        ),
                    });
                } else {
                    currentFeedbackGenerator.reset(
                        generateFeedbackSystemPrompt(data.lesson, question)
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
            eventEmitterSetup({
                generateAudio: false,
                chat: currentFeedbackGenerator,
                socket,
                streamChannel: `quiz_feedback_stream`,
                sendEndMessage: true,
                // onReceiveAudioData: ({ base64, order }) => {
                //     audioOrderMaintainer.addData(base64, order);
                // },
                onMessage: async delta => {
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

                                // answerGenerator.messageEmitter.on(
                                //     "message",
                                //     ({ delta }) => {
                                //         socket.emit("quiz_answer_stream", {
                                //             delta,
                                //             questionIndex,
                                //         });
                                //     }
                                // );

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
            });

            response = await currentFeedbackGenerator.generateResponse({
                message,
            });

            console.log("GENERATED FEEDBACK:", response);
            console.log("QUESTION NUMBER IS:", questionIndex);
            console.log("CHOICE NUMBER IS:", choiceIndex);
        }
    );

    // ({
    //     feedbackGenerator: currentFeedbackGenerator,
    //     hintGenerator: currentHintGenerator,
    // } = await generateQuestion(
    //     socket,
    //     currentQuestionNumber++,
    //     currentQuestionGenerator,
    //     data.lesson
    // ));

    // ({
    //     feedbackGenerator: nextFeedbackGenerator,
    //     hintGenerator: nextHintGenerator,
    // } = await generateQuestion(
    //     socket,
    //     currentQuestionNumber++,
    //     currentQuestionGenerator,
    //     data.lesson
    // ));

    // for (
    //     let index = 0;
    //     index < data.lesson.learning_objectives.length;
    //     index++
    // ) {
    //     const questionGenerator = new ChatGPTConversation({
    //         systemPrompt: generateQuizQuestionsSystemPrompt(data.lesson, index),
    //         socket,
    //     });
    //     for (let _ = 0; _ < 2; _++) {
    //         generateQuestion(
    //             "multiple",
    //             graders,
    //             socket,
    //             questionGenerator,
    //             data.lesson,
    //             currentQuestionNumber++
    //         );
    //     }
    //     generateQuestion(
    //         "written",
    //         graders,
    //         socket,
    //         questionGenerator,
    //         data.lesson,
    //         currentQuestionNumber++
    //     );
    // }
};

export default start_quiz_handler;
