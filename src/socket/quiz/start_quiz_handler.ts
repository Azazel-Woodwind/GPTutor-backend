import { Socket } from "socket.io";
import ChatGPTConversation from "../../lib/ChatGPTConversation";
import {
    generateFeedbackSystemPrompt,
    generateHintsSystemPrompt,
    generateQuizQuestionsSystemPrompt,
} from "../../lib/GPT4prompts.utils";

type ChannelData = {
    lesson: Lesson;
};

const generateHints = async (
    question: string,
    lesson: Lesson,
    socket: Socket
) => {
    const hintGenerator = new ChatGPTConversation({
        systemPrompt: generateHintsSystemPrompt(lesson, question),
        socket,
    });

    const hintsJson = await hintGenerator.generateResponse({
        message: undefined,
        silent: true,
    });

    const hints = JSON.parse(hintsJson);
    return hints;
};

const generateQuestion = async (
    type: "multiple" | "written",
    graders: ChatGPTConversation[],
    socket: Socket,
    generator: ChatGPTConversation,
    lesson: Lesson
) => {
    const question = await generator.generateResponse({
        message: type,
        silent: true,
    });
    const grader = new ChatGPTConversation({
        systemPrompt: generateFeedbackSystemPrompt(lesson, question),
        socket,
    });
    graders.push(grader);
    const hints = await generateHints(question, lesson, socket);

    if (type === "written") {
        socket.emit("quiz_next_question", { question, hints, type });
        return;
    } else {
        const data = question.split("\n").filter(line => line.length > 0);
        socket.emit("quiz_next_question", {
            question: {
                question: data[0],
                choices: data.slice(1),
            },
            hints,
            type,
        });
    }
};

const start_quiz_handler = async (data: ChannelData, socket: Socket) => {
    console.log("received connection to start_quiz");
    const graders: ChatGPTConversation[] = [];

    socket.on("quiz_answer", async (answer: string, questionIndex: number) => {
        const grader = graders[questionIndex];
        if (!grader) {
            console.log("no grader found");
            return;
        }
        const feedback = await grader.generateResponse({
            message: answer,
            silent: true,
        });

        if (feedback.startsWith("CORRECT")) {
            socket.emit("quiz_feedback", {
                correct: true,
                feedback: feedback.slice(8),
            });
        }
        if (feedback.startsWith("INCORRECT")) {
            socket.emit("quiz_feedback", {
                correct: false,
                feedback: feedback.slice(10),
            });
        }
    });

    for (
        let index = 0;
        index < data.lesson.learning_objectives.length;
        index++
    ) {
        const questionGenerator = new ChatGPTConversation({
            systemPrompt: generateQuizQuestionsSystemPrompt(data.lesson, index),
            socket,
        });
        for (let _ = 0; _ < 2; _++) {
            generateQuestion(
                "multiple",
                graders,
                socket,
                questionGenerator,
                data.lesson
            );
        }
        generateQuestion(
            "written",
            graders,
            socket,
            questionGenerator,
            data.lesson
        );
    }
};

export default start_quiz_handler;
