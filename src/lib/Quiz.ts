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
    generateMarkScheme,
} from "../prompts/quiz.prompts";
import {
    MAXIMUM_WRITTEN_QUESTION_MARKS,
    MINIMUM_WRITTEN_QUESTION_MARKS,
    QUESTIONS_PER_LEARNING_OBJECTIVE,
} from "./constants";
import { getRandomNumberBetween } from "../utils/general";

/**
 * A class that manages a quiz for a given lesson.
 *
 * The current way a quiz works, is that for each learning objective in the lesson,
 * a multiple choice question is generated, followed by a written question.
 *
 * For a multiple choice question, users cannot proceed to the next question until
 * they have selected the correct answer. If they select the wrong answer, they are
 * given feedback on why their answer is wrong. If they select the correct answer,
 * they are given feedback and allowed to proceed to the next question.
 *
 * For a written question, users cannot proceed to the next question until they have
 * written a solution that scores full marks or until they have run out of attempts.
 * If they run out of attempts, they are given a modal solution with feedback. If they
 * score full marks, they are given feedback and allowed to proceed to the next question.
 *
 * Currently, all quiz questions have an image generated with them.
 */
export default class Quiz {
    private lastFeedbackQuestionIndex: number;
    private questionGenerator: ChatGPTConversation; // instance for generating questions for the current learning objective
    private currentFeedbackGenerator: ChatGPTConversation | undefined;
    private currentQuestionAttempts: number;
    private questions: Question[]; // stores the questions that have been generated so far
    private currentLearningObjectiveIndex: number;

    /**
     * @constructor
     * @param lesson - The lesson for which the quiz is being generated.
     * @param socket - The socket of the user's current session.
     */
    constructor(public lesson: Lesson, private socket: Socket) {
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

    public changeQuestion() {
        this.currentFeedbackGenerator?.cleanUp();
        // this.lastFeedbackQuestionIndex++;
    }

    public hasGeneratedAllQuestions() {
        return (
            this.questions.length ===
            QUESTIONS_PER_LEARNING_OBJECTIVE *
                this.lesson.learning_objectives.length
        );
    }

    public length() {
        return this.questions.length;
    }

    /**
     * Generates the next question for the quiz.
     *
     * @param questionType - The type of question to generate (written or multiple choice).
     * @param learningObjectiveIndex - The index of the learning objective for which the question is being generated.
     * @param hasImage - Whether the question has an image.
     * @param onImage - A callback to execute when the question image is generated.
     * @param onQuestion - A callback to execute when the question is generated.
     * @param final - Whether the question is the final question in the quiz.
     * @returns The generated question.
     */
    public async generateNextQuestion({
        hasImage,
        onImage,
        onQuestion,
    }: {
        hasImage: boolean;
        onImage?: ({
            imageHTML,
            questionIndex,
        }: {
            imageHTML: string;
            questionIndex: number;
        }) => void;
        onQuestion?: (question: Question) => void;
    }) {
        const questionIndex = this.questions.length;
        console.log("GENERATING QUESTION", questionIndex);
        if (
            questionIndex >=
            QUESTIONS_PER_LEARNING_OBJECTIVE *
                this.lesson.learning_objectives.length
        ) {
            throw new Error("Question number out of bounds");
        }

        const learningObjectiveIndex = Math.floor(
            questionIndex / QUESTIONS_PER_LEARNING_OBJECTIVE
        );
        const learningObjectiveQuestionIndex =
            questionIndex % QUESTIONS_PER_LEARNING_OBJECTIVE; // 0 for multiple choice, 1 for written
        const questionType =
            learningObjectiveQuestionIndex === 1 ? "written" : "multiple";
        const final =
            questionIndex ===
            QUESTIONS_PER_LEARNING_OBJECTIVE *
                this.lesson.learning_objectives.length -
                1;

        const questionData = await this.generateQuestion({
            questionType,
            learningObjectiveIndex,
            hasImage,
            onImage: imageHTML => {
                if (onImage) {
                    onImage({ imageHTML, questionIndex });
                }
            },
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

    /**
     * Generates a question for the quiz.
     *
     * @param questionType - The type of question to generate (written or multiple choice).
     * @param learningObjectiveIndex - The index of the learning objective for which the question is being generated.
     * @param hasImage - Whether the question has an image.
     * @param onImage - A callback to execute when the question image is generated.
     * @returns The generated question.
     *
     * @remarks
     * This method is called by {@link Quiz.generateNextQuestion}.
     */
    public async generateQuestion({
        questionType,
        learningObjectiveIndex,
        hasImage,
        onImage,
    }: {
        questionType: "written" | "multiple";
        learningObjectiveIndex: number;
        hasImage: boolean;
        onImage: (imageHTML: string) => void;
    }) {
        if (learningObjectiveIndex !== this.currentLearningObjectiveIndex) {
            // if the multiple choice and written question for the previous learning objective have been generated
            // and the current learning objective is different from the previous one
            this.questionGenerator.reset(
                generateQuizQuestionsSystemPrompt(
                    this.lesson,
                    learningObjectiveIndex
                )
            );
            this.currentLearningObjectiveIndex = learningObjectiveIndex;
        }

        let message = questionType;
        let marks = 1;
        if (questionType === "written") {
            // randomly generate the number of marks for the written question
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
            questionType === "written"
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
                onImage(data);

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
            questionType,
            marks,
        };
    }

    /**
     * Generates a solution for a given question. This is in the form of a single number if
     * the question is a multiple choice question, or a mark scheme if the question is a written
     * question.
     *
     * @param question - The question for which the solution is being generated.
     * @returns The generated solution.
     */
    public async generateSolution(question: Question) {
        let systemPrompt = "";
        if (question.questionType === "multiple") {
            systemPrompt = multipleChoiceQuestionSystemPrompt;
        } else {
            systemPrompt = generateMarkScheme({
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
                question.questionType === "multiple"
                    ? question.question
                    : undefined,
            temperature: question.questionType === "multiple" ? 0 : 0.7,
        });

        console.log("ANSWER:", solution);

        return solution.trim();
    }

    /**
     * Waits for a question to be solved.
     *
     * @param questionIndex - The index of the question to wait for.
     */
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

    /**
     * Prepares for feedback for a given question.
     *
     *
     * @param isMultipleChoice - Whether the question is a multiple choice question.
     * @param questionIndex - The index of the question for which feedback is being prepared.
     */
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
            // if the feedback generator has not been initialised or if the question has changed
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

    /**
     * Generates feedback for a written question.
     *
     * @param studentSolution - The student's solution to the question.
     * @param questionIndex - The index of the question for which feedback is being generated.
     * @param onDelta - A callback to execute when a token is received.
     * @param onSentence - A callback to execute when a sentence is received.
     * @param onEnd - A callback to execute when the feedback generation is complete.
     */
    public async generateWrittenQuestionFeedback({
        studentSolution,
        questionIndex,
        onDelta,
        onSentence,
        onEnd,
    }: {
        studentSolution: string;
        questionIndex: number;
        onDelta?: ({
            delta,
            marksScored,
        }: {
            delta: string;
            marksScored: number;
        }) => void;
        onSentence?: ({
            sentence,
            marksScored,
        }: {
            sentence: string;
            marksScored: number;
        }) => void;
        onEnd: ({
            feedback,
            marksScored,
            attempts,
            question,
        }: {
            feedback: string;
            marksScored: number;
            attempts: number;
            question: Question;
        }) => void;
    }) {
        await this.prepareForFeedback({
            isMultipleChoice: false,
            questionIndex,
        });

        if (!this.currentFeedbackGenerator) {
            return;
        }

        let analysis = await this.generateAnswerAnalysis({
            question: this.questions[questionIndex],
            studentSolution,
        });

        const analysisData = analysis.split("\n");
        const marksScored = parseFloat(analysisData[0]);
        analysis =
            `The solution scores ${marksScored}/${this.questions[questionIndex].marks}. ` +
            analysisData[1];

        console.log("ANALYSIS:", analysis);

        if (onDelta) {
            this.currentFeedbackGenerator.messageEmitter.on(
                "delta",
                ({ delta }) => {
                    onDelta({
                        delta,
                        marksScored,
                    });
                }
            );
        }

        if (onSentence) {
            this.currentFeedbackGenerator.messageEmitter.on(
                "sentence",
                ({ text }) => {
                    onSentence({
                        sentence: text,
                        marksScored,
                    });
                }
            );
        }

        if (onEnd) {
            this.currentFeedbackGenerator.messageEmitter.on(
                "end",
                ({ response }) => {
                    this.currentFeedbackGenerator!.messageEmitter.removeAllListeners();
                    onEnd({
                        feedback: response,
                        marksScored,
                        attempts: this.currentQuestionAttempts,
                        question: this.questions[questionIndex],
                    });
                }
            );
        }

        await this.currentFeedbackGenerator.generateResponse({
            message: generateWrittenFeedbackMessage(studentSolution, analysis),
        });

        // console.log("GENERATED FEEDBACK:", response);
        console.log("QUESTION NUMBER IS:", questionIndex);
    }

    /**
     * Generates feedback for a multiple choice question.
     *
     * @param studentChoiceIndex - The index of the student's choice.
     * @param questionIndex - The index of the question for which feedback is being generated.
     * @param onDelta - A callback to execute when a delta is generated.
     * @param onSentence - A callback to execute when a sentence is generated.
     * @param onEnd - A callback to execute when the feedback generation is complete.
     */
    public async generateMultipleChoiceQuestionFeedback({
        studentChoiceIndex,
        questionIndex,
        onDelta,
        onSentence,
        onEnd,
    }: {
        studentChoiceIndex: number;
        questionIndex: number;
        onDelta?: ({
            delta,
            isCorrect,
        }: {
            delta: string;
            isCorrect: boolean;
        }) => void;
        onSentence?: ({
            sentence,
            isCorrect,
        }: {
            sentence: string;
            isCorrect: boolean;
        }) => void;
        onEnd: ({
            feedback,
            isCorrect,
        }: {
            feedback: string;
            isCorrect: boolean;
        }) => void;
    }) {
        await this.prepareForFeedback({
            isMultipleChoice: true,
            questionIndex,
        });

        if (!this.currentFeedbackGenerator) {
            return;
        }

        const isCorrect =
            studentChoiceIndex + 1 ===
            parseInt(this.questions[questionIndex].solution!.trim());

        if (onDelta) {
            this.currentFeedbackGenerator.messageEmitter.on(
                "delta",
                ({ delta }) => {
                    onDelta({
                        delta,
                        isCorrect,
                    });
                }
            );
        }

        if (onSentence) {
            this.currentFeedbackGenerator.messageEmitter.on(
                "sentence",
                ({ text }) => {
                    onSentence({
                        sentence: text,
                        isCorrect,
                    });
                }
            );
        }

        if (onEnd) {
            this.currentFeedbackGenerator.messageEmitter.on(
                "end",
                ({ response }) => {
                    this.currentFeedbackGenerator!.messageEmitter.removeAllListeners();
                    onEnd({
                        feedback: response,
                        isCorrect,
                    });
                }
            );
        }

        const response = await this.currentFeedbackGenerator.generateResponse({
            message: generateMultipleChoiceFeedbackMessage(
                studentChoiceIndex + 1
            ),
        });
    }

    /**
     * Generates critical analysis for a given answer to a question using the question's mark scheme.
     * This should come in the form of a number indicating the number of marks the student's solution
     * would be awarded in an exam, followed by comprehensive written analysis on a new line.
     *
     * @remarks
     * This method is and should only be called by {@link Quiz.generateWrittenQuestionFeedback}.
     *
     * @param question - The question for which the answer is being analysed.
     * @param studentSolution - The student's solution to the question.
     * @returns The generated analysis.
     */
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
