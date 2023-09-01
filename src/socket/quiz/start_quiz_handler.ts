import { Socket } from "socket.io";
import Quiz from "../../lib/Quiz";
import { onFeedbackRequest } from "../../lib/socketSetup";

type ChannelData = {
    lesson: Lesson;
};

const QUESTIONS_PER_LEARNING_OBJECTIVE = 2;

async function generateNextQuestion({
    quiz,
    socket,
}: {
    quiz: Quiz;
    socket: Socket;
}) {
    const questionIndex = quiz.numQuestionsGenerated;
    console.log("GENERATING QUESTION", questionIndex);
    if (
        questionIndex >=
        QUESTIONS_PER_LEARNING_OBJECTIVE *
            quiz.lesson.learning_objectives.length
    ) {
        throw new Error("Question number out of bounds");
    }

    const learningObjectiveIndex = Math.floor(
        questionIndex / QUESTIONS_PER_LEARNING_OBJECTIVE
    );
    const learningObjectiveQuestionIndex =
        questionIndex % QUESTIONS_PER_LEARNING_OBJECTIVE;
    const type = learningObjectiveQuestionIndex === 1 ? "written" : "multiple";
    const final =
        questionIndex ===
        QUESTIONS_PER_LEARNING_OBJECTIVE *
            quiz.lesson.learning_objectives.length -
            1;

    quiz.generateNextQuestion({
        type,
        learningObjectiveIndex,
        hasImage: true,
        onImage({ imageHTML, questionIndex }) {
            console.log("GENERATED IMAGE FOR QUESTION", questionIndex);
            // console.log("IMAGE HTML:", data);
            socket.emit("quiz_question_image", {
                imageHTML,
                questionIndex,
            });
        },
        onQuestion(question: Question) {
            console.log("GENERATED QUESTION:", question);
            socket.emit("quiz_next_question", {
                ...question,
                questionString: question.question,
                questionIndex,
                final,
            });
        },
        final,
    });
}

const start_quiz_handler = async (data: ChannelData, socket: Socket) => {
    console.log("received connection to start_quiz");

    data.lesson.learning_objectives.sort((a, b) => a.number - b.number);

    console.log("LESSON:", data.lesson);

    const quiz = new Quiz(data.lesson, socket);

    socket.on("quiz_change_question", async questionIndex => {
        console.log("CHANGING TO QUESTION", questionIndex);
        quiz.changeQuestion(questionIndex);

        if (!quiz.questions[questionIndex]) {
            throw new Error("Question number out of bounds");
        } else if (!quiz.questions[questionIndex].final) {
            generateNextQuestion({ quiz, socket });
        }
    });

    socket.on("quiz_exit", () => {
        console.log("EXITING QUIZ");
        quiz.reset();
        socket.removeAllListeners("quiz_exit");
        socket.removeAllListeners("quiz_change_question");
        socket.removeAllListeners("quiz_request_feedback");
        socket.removeAllListeners("quiz_generate_next_question");
    });

    socket.on("quiz_request_feedback", async ({ message, questionIndex }) => {
        onFeedbackRequest({
            studentAnswer: message,
            questionIndex,
            quiz,
            socket,
            channel: "quiz",
        });
    });

    // send two questions
    generateNextQuestion({ quiz, socket });
    generateNextQuestion({ quiz, socket });
};

export default start_quiz_handler;
