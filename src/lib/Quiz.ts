import { Socket } from "socket.io";
import ChatGPTConversation from "./ChatGPTConversation";
import {
    generateAnalysisMessage,
    generateAnalysisSystemPrompt,
    generateFeedbackSystemPrompt,
    generateMultipleChoiceFeedbackMessage,
    generateQuizQuestionImageSystemPrompt,
    generateQuizQuestionsSystemPrompt,
    generateWrittenFeedbackMessage,
    multipleChoiceQuestionSystemPrompt,
    solveWrittenQuestionSystemPrompt,
} from "../prompts/quiz.prompts";
import {
    MAXIMUM_WRITTEN_QUESTION_MARKS,
    MINIMUM_WRITTEN_QUESTION_MARKS,
    STREAM_END_MESSAGE,
    STREAM_SPEED,
} from "./constants";
import { getRandomNumberBetween } from "./misc";
import DelayedBuffer from "./DelayedBuffer";
import { number } from "zod";

export default class Quiz {
    public numQuestionsGenerated: number;
    private lastFeedbackQuestionIndex: number;
    private questionGenerator: ChatGPTConversation;
    private currentFeedbackGenerator: ChatGPTConversation | undefined;
    private currentQuestionAttempts: number;
    public questions: Question[];
    private currentLearningObjectiveIndex: number;

    constructor(public lesson: Lesson, private socket: Socket) {
        this.numQuestionsGenerated = 0;
        this.lastFeedbackQuestionIndex = 0;
        this.questionGenerator = new ChatGPTConversation({
            socket,
        });
        this.currentFeedbackGenerator = undefined;
        this.currentQuestionAttempts = 0;
        this.questions = [];
        this.currentLearningObjectiveIndex = -1;
    }

    public reset() {
        this.questionGenerator.cleanUp();
        this.currentFeedbackGenerator?.cleanUp();
    }

    public changeQuestion(questionIndex: number) {
        this.currentFeedbackGenerator?.cleanUp();
        // this.lastFeedbackQuestionIndex++;
    }

    public async generateNextQuestion({
        type,
        learningObjectiveIndex,
        hasImage,
        onImage,
        onQuestion,
        final = false,
    }: {
        type: "written" | "multiple";
        learningObjectiveIndex: number;
        hasImage: boolean;
        onImage?: ({
            imageHTML,
            questionIndex,
        }: {
            imageHTML: string;
            questionIndex: number;
        }) => void;
        onQuestion?: (question: Question) => void;
        final?: boolean;
    }) {
        // console.log("GENERATING NEXT QUESTION");
        const questionIndex = this.numQuestionsGenerated++;
        const questionData = await this.generateQuestion({
            type,
            learningObjectiveIndex,
            hasImage,
            onImage,
            questionIndex,
        });

        this.questions[questionIndex] = {
            ...questionData,
            solvingQuestion: true,
            final,
            questionIndex,
        };

        console.log("GENERATED QUESTION:", questionIndex, questionData);

        if (onQuestion) {
            onQuestion(this.questions[questionIndex]);
        }

        const solution = await this.generateSolution(
            this.questions[questionIndex]
        );

        this.questions[questionIndex].solvingQuestion = false;
        this.questions[questionIndex].solution = solution;

        return this.questions[questionIndex];
    }

    public async generateQuestion({
        type,
        learningObjectiveIndex,
        hasImage,
        onImage,
        questionIndex,
    }: {
        type: "written" | "multiple";
        learningObjectiveIndex: number;
        hasImage: boolean;
        onImage?: ({
            imageHTML,
            questionIndex,
        }: {
            imageHTML: string;
            questionIndex: number;
        }) => void;
        questionIndex: number;
    }) {
        if (learningObjectiveIndex !== this.currentLearningObjectiveIndex) {
            this.questionGenerator.reset(
                generateQuizQuestionsSystemPrompt(
                    this.lesson,
                    learningObjectiveIndex
                )
            );
            this.currentLearningObjectiveIndex = learningObjectiveIndex;
        }

        let message = type;
        let marks = 1;
        if (type === "written") {
            marks = getRandomNumberBetween(
                MINIMUM_WRITTEN_QUESTION_MARKS,
                MAXIMUM_WRITTEN_QUESTION_MARKS
            );
            message += ` ${marks}`;

            console.log("GENERATING WRITTEN QUESTION WITH MARKS:", marks);
        }

        const question = await this.questionGenerator!.generateResponse({
            message,
            silent: true,
        });
        // console.log("GENERATED QUESTION:", question);

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

        if (hasImage && onImage) {
            const imageGenerator = new ChatGPTConversation({
                systemPrompt: generateQuizQuestionImageSystemPrompt(question),
                socket: this.socket,
            });

            imageGenerator.messageEmitter.on("data", async ({ data }) => {
                onImage({
                    imageHTML: data,
                    questionIndex,
                });

                imageGenerator.cleanUp();
            });

            console.log("GENERATING QUESTION IMAGE");
            imageGenerator!.generateResponse({
                initialDataSeparator: ["```", "html"],
                terminalDataSeparator: ["``", "`"],
            });
        }

        return {
            question,
            ...questionData,
            type,
            marks,
        };
    }

    public async generateSolution(question: Question) {
        let systemPrompt = "";
        if (question.type === "multiple") {
            systemPrompt = multipleChoiceQuestionSystemPrompt;
        } else {
            systemPrompt = solveWrittenQuestionSystemPrompt({
                lesson: this.lesson,
                question: question.question,
                marks: question.marks,
            });
        }

        console.log("SOLVING QUESTION:", question.question);

        const solutionGenerator = new ChatGPTConversation({
            systemPrompt,
            socket: this.socket,
        });

        const solution = await solutionGenerator.generateResponse({
            message:
                question.type === "multiple" ? question.question : undefined,
            temperature: question.type === "multiple" ? 0 : 0.7,
        });

        console.log("ANSWER:", solution);

        return solution.trim();
    }

    public async waitForQuestionToBeSolved(questionIndex: number) {
        return new Promise<void>(resolve => {
            const interval = setInterval(() => {
                if (
                    this.questions[questionIndex].solvingQuestion === false &&
                    this.questions[questionIndex].solution
                ) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    public async prepareForFeedback({
        isMultipleChoice,
        questionIndex,
    }: {
        isMultipleChoice: boolean;
        questionIndex: number;
    }) {
        await this.waitForQuestionToBeSolved(questionIndex);
        if (
            !this.currentFeedbackGenerator ||
            questionIndex !== this.lastFeedbackQuestionIndex
        ) {
            this.currentQuestionAttempts = 0;
            const systemPrompt = generateFeedbackSystemPrompt(
                this.lesson,
                this.questions[questionIndex].question!,
                this.questions[questionIndex].solution!,
                isMultipleChoice
            );
            if (!this.currentFeedbackGenerator) {
                this.currentFeedbackGenerator = new ChatGPTConversation({
                    socket: this.socket,
                    systemPrompt,
                });
            } else {
                this.currentFeedbackGenerator.reset(systemPrompt);
            }
            this.lastFeedbackQuestionIndex = questionIndex;
        }

        this.currentQuestionAttempts++;
    }

    private async setupCurrentFeedbackGenerator(buffer: DelayedBuffer) {
        if (!this.currentFeedbackGenerator) {
            return;
        }

        this.currentFeedbackGenerator.messageEmitter.on("end", () => {
            buffer.addData(STREAM_END_MESSAGE);
        });

        this.currentFeedbackGenerator.messageEmitter.on(
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
    }

    public async generateWrittenQuestionFeedback({
        studentSolution,
        questionIndex,
        onFeedbackStream,
    }: {
        studentSolution: string;
        questionIndex: number;
        onFeedbackStream: ({
            delta,
            marksScored,
            first,
        }: {
            delta: string;
            marksScored: number;
            first: boolean;
        }) => void;
    }) {
        await this.prepareForFeedback({
            isMultipleChoice: false,
            questionIndex,
        });

        return new Promise<{
            feedback: string;
            marksScored: number;
            attempts: number;
        }>(async resolve => {
            if (this.currentFeedbackGenerator === undefined) {
                return;
            }

            let response = "";
            let marksScored: undefined | number = undefined;
            let first = true;
            const buffer = new DelayedBuffer(
                async (delta: string) => {
                    if (delta === STREAM_END_MESSAGE) {
                        this.currentFeedbackGenerator!.messageEmitter.removeAllListeners();
                        return resolve({
                            feedback: response,
                            marksScored: marksScored!,
                            attempts: this.currentQuestionAttempts,
                        });
                    }

                    onFeedbackStream({
                        delta,
                        marksScored: marksScored!,
                        first,
                    });

                    first = false;
                },
                0,
                STREAM_SPEED
            );

            this.setupCurrentFeedbackGenerator(buffer);

            // console.log(this.currentFeedbackGenerator.systemPrompt);

            let analysis = await this.generateAnswerAnalysis({
                question: this.questions[questionIndex],
                studentSolution,
            });

            const analysisData = analysis.split("\n");
            marksScored = parseFloat(analysisData[0]);
            analysis =
                `The solution scores ${marksScored}/${this.questions[questionIndex].marks}. ` +
                analysisData[1];

            console.log("ANALYSIS:", analysis);
            response = await this.currentFeedbackGenerator.generateResponse({
                message: generateWrittenFeedbackMessage(
                    studentSolution,
                    analysis
                ),
            });

            console.log("GENERATED FEEDBACK:", response);
            console.log("QUESTION NUMBER IS:", questionIndex);
        });
    }

    public async generateMultipleChoiceQuestionFeedback({
        studentChoiceIndex,
        questionIndex,
        onFeedbackStream,
    }: {
        studentChoiceIndex: number;
        questionIndex: number;
        onFeedbackStream: ({
            delta,
            isCorrect,
            first,
        }: {
            delta: string;
            isCorrect: boolean;
            first: boolean;
        }) => void;
    }) {
        await this.prepareForFeedback({
            isMultipleChoice: false,
            questionIndex,
        });

        return new Promise<{ feedback: string; isCorrect: boolean }>(
            async resolve => {
                if (this.currentFeedbackGenerator === undefined) {
                    return;
                }

                let response = "";
                let first = true;
                const buffer = new DelayedBuffer(
                    async (delta: string) => {
                        const isCorrect =
                            "" + (studentChoiceIndex + 1) ===
                            this.questions[questionIndex].solution!.trim();
                        if (delta === STREAM_END_MESSAGE) {
                            this.currentFeedbackGenerator!.messageEmitter.removeAllListeners();
                            return resolve({
                                feedback: response,
                                isCorrect,
                            });
                        }

                        onFeedbackStream({
                            delta,
                            isCorrect,
                            first,
                        });

                        first = false;
                    },
                    0,
                    STREAM_SPEED
                );

                this.setupCurrentFeedbackGenerator(buffer);

                // console.log(this.currentFeedbackGenerator.systemPrompt);

                response = await this.currentFeedbackGenerator.generateResponse(
                    {
                        message: generateMultipleChoiceFeedbackMessage(
                            studentChoiceIndex + 1
                        ),
                    }
                );

                console.log("GENERATED FEEDBACK:", response);
                console.log("QUESTION NUMBER IS:", questionIndex);
            }
        );
    }

    public async generateAnswerAnalysis({
        question,
        studentSolution,
    }: {
        question: Question;
        studentSolution: string;
    }) {
        console.log("GENERATING ANALYSIS");

        const analysisGenerator = new ChatGPTConversation({
            socket: this.socket,
            systemPrompt: generateAnalysisSystemPrompt({
                lesson: this.lesson,
                marks: question.marks,
            }),
        });

        const analysis = await analysisGenerator.generateResponse({
            message: generateAnalysisMessage({
                question: question.question!,
                solution: question.solution!,
                studentSolution,
            }),
            temperature: 0,
        });

        // console.log("GENERATED ANALYSIS:", analysis);

        return analysis;
    }
}
