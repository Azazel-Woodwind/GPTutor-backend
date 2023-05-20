import { Socket } from "socket.io";
import ChatGPTConversation from "../../lib/ChatGPTConversation";
import {
    generateFeedbackSystemPrompt,
    generateHintsSystemPrompt,
    generateQuizQuestionsSystemPrompt,
} from "../../prompts/quiz.prompts";
import { getAudioData } from "../../lib/tts.utils";
import OrderMaintaier from "../../lib/OrderMaintainer";

type ChannelData = {
    lesson: Lesson;
};

const QUESTIONS_PER_LEARNING_OBJECTIVE = 3;

const generateHint = async (
    question: string,
    lesson: Lesson,
    hintGenerator: ChatGPTConversation
) => {
    const newHint = await hintGenerator.generateResponse({
        message: undefined,
        silent: true,
    });

    return newHint;
};

const generateQuestion = async (
    socket: Socket,
    questionNumber: number,
    questionGenerator: ChatGPTConversation,
    lesson: Lesson
) => {
    const learningObjective = Math.floor(
        questionNumber / QUESTIONS_PER_LEARNING_OBJECTIVE
    );
    const learningObjectiveQuestion =
        questionNumber % QUESTIONS_PER_LEARNING_OBJECTIVE;
    const type = learningObjectiveQuestion === 2 ? "written" : "multiple";
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
    const feedbackGenerator = new ChatGPTConversation({
        socket,
        systemPrompt: generateFeedbackSystemPrompt(lesson, question),
    });
    const hintGenerator = new ChatGPTConversation({
        socket,
        systemPrompt: generateHintsSystemPrompt(lesson, question),
    });
    const newHint = await hintGenerator.generateResponse({
        message: "hint",
        silent: true,
    });
    console.log("GENERATED HINT:", newHint);

    if (type === "written") {
        socket.emit("quiz_next_question", {
            question,
            newHint,
            type,
            questionNumber,
        });
    } else {
        const data = question.split("\n").filter(line => line.length > 0);
        socket.emit("quiz_next_question", {
            question: {
                title: data[0],
                choices: data.slice(1),
            },
            newHint,
            type,
            questionNumber,
        });
    }

    return { feedbackGenerator, hintGenerator };
};

const start_quiz_handler = async (data: ChannelData, socket: Socket) => {
    console.log("received connection to start_quiz");
    console.log("lesson: ", data.lesson);
    let currentQuestionNumber = 0;
    let currentQuestionGenerator = new ChatGPTConversation({
        socket,
    });
    let currentFeedbackGenerator: ChatGPTConversation | undefined;
    let nextFeedbackGenerator: ChatGPTConversation | undefined;
    let currentHintGenerator: ChatGPTConversation | undefined;
    let nextHintGenerator: ChatGPTConversation | undefined;

    socket.on("quiz_change_question", async questionIndex => {
        if (currentFeedbackGenerator) {
            currentFeedbackGenerator.messageEmitter.removeAllListeners(
                "generate_audio"
            );
        }
        currentFeedbackGenerator = nextFeedbackGenerator;
        currentHintGenerator = nextHintGenerator;
        ({
            feedbackGenerator: nextFeedbackGenerator,
            hintGenerator: nextHintGenerator,
        } = await generateQuestion(
            socket,
            questionIndex,
            currentQuestionGenerator,
            data.lesson
        ));
    });

    socket.on("quiz_exit", () => {
        console.log("quiz_exit");
        currentQuestionGenerator.cleanUp();
        currentFeedbackGenerator?.cleanUp();
        currentHintGenerator?.cleanUp();
        nextFeedbackGenerator?.cleanUp();
        nextHintGenerator?.cleanUp();
        socket.removeAllListeners("quiz_exit");
        socket.removeAllListeners("quiz_change_question");
        socket.removeAllListeners("quiz_message_x");
    });

    socket.on(
        "quiz_message_x",
        async ({
            message,
            questionIndex,
            choiceIndex,
            id,
        }: {
            message: string;
            questionIndex: number;
            choiceIndex: number | undefined;
            id: string;
        }) => {
            if (!currentFeedbackGenerator) {
                console.log("no grader found");
                return;
            }
            currentFeedbackGenerator.messageEmitter.on(
                "message",
                message =>
                    message &&
                    socket.emit("quiz_response_stream", {
                        message,
                        questionIndex,
                        choiceIndex,
                    })
            );
            const audioOrderMaintainer = new OrderMaintaier({
                callback: data =>
                    socket.emit("quiz_audio_data", { audio: data, id }),
            });

            currentFeedbackGenerator.messageEmitter.on(
                "generate_audio",
                ({ text, order }) => {
                    getAudioData(text)
                        .then(base64 => {
                            console.log("CONVERTED TO SPEECH DATA:", text);
                            audioOrderMaintainer.addData(base64, order);
                        })
                        .catch(err => console.log(err));
                }
            );

            const feedback = await currentFeedbackGenerator.generateResponse({
                message,
                silent: true,
            });

            currentFeedbackGenerator.messageEmitter.removeAllListeners(
                "generate_audio"
            );
            console.log("GENERATED FEEDBACK:", feedback);

            if (feedback.startsWith("CORRECT")) {
                socket.emit("quiz_response_data", {
                    correct: true,
                    response: feedback.slice(8),
                    questionIndex,
                    choiceIndex,
                });
            }
            if (feedback.startsWith("INCORRECT")) {
                socket.emit("quiz_response_data", {
                    correct: false,
                    response: feedback.slice(10),
                    questionIndex,
                    choiceIndex,
                });
            }
        }
    );

    ({
        feedbackGenerator: currentFeedbackGenerator,
        hintGenerator: currentHintGenerator,
    } = await generateQuestion(
        socket,
        currentQuestionNumber++,
        currentQuestionGenerator,
        data.lesson
    ));

    ({
        feedbackGenerator: nextFeedbackGenerator,
        hintGenerator: nextHintGenerator,
    } = await generateQuestion(
        socket,
        currentQuestionNumber++,
        currentQuestionGenerator,
        data.lesson
    ));

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
