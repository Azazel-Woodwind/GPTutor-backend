import { Socket } from "socket.io";
import ChatGPTConversation from "../../lib/ChatGPTConversation";
import {
    generateAnalysisMessage,
    generateAnalysisSystemPrompt,
    generateWrittenFeedbackMessage,
    generateFeedbackSystemPrompt,
    generateHintsSystemPrompt,
    generateQuizQuestionImageSystemPrompt,
    generateQuizQuestionsSystemPrompt,
    multipleChoiceQuestionSystemPrompt,
    generateMultipleChoiceFeedbackMessage,
    solveWrittenQuestionSystemPrompt,
} from "../../prompts/quiz.prompts";
import { eventEmitterSetup } from "../../lib/socketSetup";
import {
    MAXIMUM_WRITTEN_QUESTION_MARKS,
    MINIMUM_WRITTEN_QUESTION_MARKS,
    STREAM_END_MESSAGE,
    STREAM_SPEED,
} from "../../lib/constants";
import DelayedBuffer from "../../lib/DelayedBuffer";
import { streamString } from "../../lib/XUtils";

type ChannelData = {
    lesson: Lesson;
};

const QUESTIONS_PER_LEARNING_OBJECTIVE = 2;

type GenerateQuestionReturnType = {
    question: string;
    type: "written" | "multiple";
    marks: number;
};

const getRandomNumberBetween = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

const generateQuestion = async (
    socket: Socket,
    questionNumber: number,
    questionGenerator: ChatGPTConversation,
    lesson: Lesson
): Promise<GenerateQuestionReturnType> => {
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

    let message = type;
    let marks = 1;
    if (type === "written") {
        marks = getRandomNumberBetween(
            MINIMUM_WRITTEN_QUESTION_MARKS,
            MAXIMUM_WRITTEN_QUESTION_MARKS
        );
        message += ` ${marks}`;
    }

    const question = await questionGenerator!.generateResponse({
        message,
        silent: true,
    });
    console.log("GENERATED QUESTION:", question);

    const final =
        questionNumber ===
        QUESTIONS_PER_LEARNING_OBJECTIVE * lesson.learning_objectives.length -
            1;
    const questionData =
        type === "written"
            ? {}
            : {
                  title: question.split("\n")[0],
                  choices: question
                      .split("\n")
                      .slice(1)
                      .map(choice => choice.trim())
                      .filter(Boolean),
              };

    const imageGenerator = new ChatGPTConversation({
        systemPrompt: generateQuizQuestionImageSystemPrompt(question),
        socket,
    });

    imageGenerator.messageEmitter.on("data", async ({ data }) => {
        console.log("GENERATED IMAGE FOR QUESTION", questionNumber);
        console.log("IMAGE HTML:", data);
        socket.emit("quiz_question_image", {
            imageHTML: data,
            questionNumber,
        });
        imageGenerator.cleanUp();
    });

    console.log("GENERATING QUESTION IMAGE");
    imageGenerator!.generateResponse({
        initialDataSeparator: ["```", "html"],
        terminalDataSeparator: ["``", "`"],
    });

    // console.log("GENERATED QUESTION IMAGE:", image);
    socket.emit("quiz_next_question", {
        questionString: question,
        ...questionData,
        type,
        questionNumber,
        final,
        marks,
    });

    return {
        question,
        type,
        marks,
    };
};

// const addNumbersToMultipleChoiceQuestion = (question: string) => {
//     const lines = question.split("\n");
//     const title = lines[0];
//     const choices = lines.slice(1).filter(Boolean);
//     const numberedChoices = choices.map((choice, index) => {
//         return `${index + 1}. ${choice}`;
//     });
//     return `${title}\n\n${numberedChoices.join("\n")}`;
// }

const solveQuestion = async ({
    socket,
    question,
    lesson,
}: {
    socket: Socket;
    question: Question;
    lesson: Lesson;
}): Promise<string> => {
    let systemPrompt = "";
    if (question.type === "multiple") {
        systemPrompt = multipleChoiceQuestionSystemPrompt;
    } else {
        systemPrompt = solveWrittenQuestionSystemPrompt({
            lesson,
            question: question.question,
            marks: question.marks,
        });
    }

    console.log("SOLVING QUESTION:", question);

    const solutionGenerator = new ChatGPTConversation({
        systemPrompt,
        socket,
    });

    const solution = await solutionGenerator.generateResponse({
        temperature: question.type === "multiple" ? 0 : 0.7,
    });

    console.log("ANSWER:", solution);

    return solution.trim();
};

const generateAnalysis = async ({
    question,
    solution,
    studentSolution,
    socket,
    lesson,
    marks,
}: {
    question: string;
    solution: string;
    studentSolution: string;
    socket: Socket;
    lesson: Lesson;
    marks: number;
}) => {
    console.log("GENERATING ANALYSIS");

    const analysisGenerator = new ChatGPTConversation({
        socket,
        systemPrompt: generateAnalysisSystemPrompt({
            lesson,
            marks,
        }),
    });

    const analysis = await analysisGenerator.generateResponse({
        message: generateAnalysisMessage({
            question,
            solution,
            studentSolution,
        }),
        temperature: 0,
    });

    console.log("GENERATED ANALYSIS:", analysis);

    return analysis;
};

type Question = {
    question: string;
    solution?: string;
    solvingQuestion: boolean;
    type: "written" | "multiple";
    marks: number;
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
    let currentHintGenerator: ChatGPTConversation | undefined;
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
        const { question, type, marks } = await generateQuestion(
            socket,
            questionNumber,
            questionGenerator,
            data.lesson
        );

        questions[questionNumber] = {
            question,
            solvingQuestion: true,
            type,
            marks,
        };

        const solution = await solveQuestion({
            socket,
            question: questions[questionNumber],
            lesson: data.lesson,
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

    // socket.on("quiz_request_hint", async ({ questionIndex, id, question }) => {
    //     console.log("GENERATING HINT");
    //     if (!currentHintGenerator || question !== currentQuestion) {
    //         if (!currentHintGenerator) {
    //             currentHintGenerator = new ChatGPTConversation({
    //                 socket,
    //                 systemPrompt: generateHintsSystemPrompt(
    //                     data.lesson,
    //                     question
    //                 ),
    //             });
    //         } else {
    //             currentHintGenerator.reset(
    //                 generateHintsSystemPrompt(data.lesson, question)
    //             );
    //         }
    //         currentQuestion = question;
    //     }

    //     eventEmitterSetup({
    //         generateAudio: false,
    //         chat: currentHintGenerator,
    //         socket,
    //         streamChannel: `quiz_hint_stream`,
    //         onMessage: message =>
    //             socket.emit("quiz_hint_stream", {
    //                 delta: message,
    //                 questionIndex,
    //             }),
    //     });

    //     const response = await currentHintGenerator.generateResponse({
    //         message: "hint",
    //     });

    //     console.log("GENERATED HINT:", response);

    //     socket.emit("quiz_new_hint", {
    //         hint: response,
    //         questionIndex,
    //     });
    // });

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
            let marksScored: undefined | number = undefined;
            let first = true;
            const buffer = new DelayedBuffer(
                async (delta: string) => {
                    if (delta === STREAM_END_MESSAGE) {
                        if (questions[questionIndex].type === "multiple") {
                            socket.emit("quiz_new_feedback", {
                                feedback: response,
                                questionIndex,
                                choiceIndex,
                                isCorrect:
                                    choiceIndex ==
                                    questions[questionIndex].solution,
                                type: questions[questionIndex].type,
                            });
                        } else {
                            if (attempts === 4) {
                                const message =
                                    " Unfortunately, you have no remaining attempts. A modal answer will be provided in the answer box.";
                                await streamString(
                                    message,
                                    socket,
                                    `quiz_feedback_stream`,
                                    {
                                        questionIndex,
                                        choiceIndex,
                                        isCorrect: undefined,
                                        marksScored,
                                        type: "written",
                                    }
                                );
                                socket.emit("quiz_new_feedback", {
                                    isCorrect: undefined,
                                    feedback: response + message,
                                    questionIndex,
                                    choiceIndex,
                                    final: true,
                                    marksScored,
                                    type: "written",
                                });
                                await streamString(
                                    questions[questionIndex].solution!,
                                    socket,
                                    `quiz_answer_stream`,
                                    {
                                        questionIndex,
                                    }
                                );
                                socket.emit("quiz_answer", {
                                    answer: questions[questionIndex].solution!,
                                    questionIndex,
                                });
                            } else {
                                socket.emit("quiz_new_feedback", {
                                    isCorrect: undefined,
                                    feedback: response,
                                    questionIndex,
                                    choiceIndex,
                                    final: false,
                                    marksScored,
                                    type: "written",
                                });
                            }
                        }

                        currentFeedbackGenerator!.messageEmitter.removeAllListeners();
                        return;
                    }

                    socket.emit("quiz_feedback_stream", {
                        delta,
                        questionIndex,
                        choiceIndex,
                        isCorrect:
                            questions[questionIndex].type === "multiple" &&
                            choiceIndex == questions[questionIndex].solution,
                        marksScored,
                        type: questions[questionIndex].type,
                        first,
                    });

                    first = false;
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

            console.log(currentFeedbackGenerator.systemPrompt);
            if (questions[questionIndex].type === "multiple") {
                response = await currentFeedbackGenerator.generateResponse({
                    message: generateMultipleChoiceFeedbackMessage(
                        choiceIndex + 1
                    ),
                });
            } else {
                let analysis = await generateAnalysis({
                    question,
                    solution: questions[questionIndex].solution!,
                    studentSolution: message,
                    socket,
                    lesson: data.lesson,
                    marks: questions[questionIndex].marks,
                });

                const analysisData = analysis.split("\n");
                marksScored = parseInt(analysisData[0]);
                analysis = analysisData[1];

                response = await currentFeedbackGenerator.generateResponse({
                    message: generateWrittenFeedbackMessage(message, analysis),
                });
            }

            console.log("GENERATED FEEDBACK:", response);
            console.log("QUESTION NUMBER IS:", questionIndex);
            console.log("CHOICE NUMBER IS:", choiceIndex);
        }
    );
};

export default start_quiz_handler;
