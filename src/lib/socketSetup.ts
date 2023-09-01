import { Socket } from "socket.io";
import ChatGPTConversation from "./ChatGPTConversation";
import DelayedBuffer from "./DelayedBuffer";
import OrderMaintainer from "./OrderMaintainer";
import { getAudioData } from "./tts.utils";
import { STREAM_END_MESSAGE, STREAM_SPEED } from "./constants";
import Quiz from "./Quiz";
import { OUT_OF_ATTEMPTS_MESSAGE } from "../prompts/quiz.prompts";
import { streamString } from "./XUtils";

type ContinueConversationParams = {
    message?: string;
    first?: boolean;
    chat: ChatGPTConversation;
    socket: Socket;
    onResponse: (response: string, first?: boolean) => void;
    channel: string;
    handleError?: (reason: string) => string;
    currentResponseId?: string;
    delay?: number;
};

type XSetupParams = {
    chat: ChatGPTConversation;
    socket: Socket;
    channel: string;
    onMessageX?: ({
        message,
        context,
    }: {
        message: string;
        context: Context;
    }) => void;
    onResponse: (response: string, first?: boolean) => void;
    handleError?: (reason: string) => string;
    start?: boolean;
    onInstruction?: (data: any) => void;
    onExit?: () => void;
};

export async function XSetup(params: XSetupParams) {
    const { chat, socket, channel, onMessageX, start, onInstruction, onExit } =
        params;

    let currentResponseId: undefined | string = undefined;

    const orderMaintainer = new OrderMaintainer({
        callback:
            onInstruction ||
            ((data: any) => {
                // socket.emit(`${channel}_audio_data`, data);
                socket.emit(`${channel}_instruction`, data);
            }),
    });

    function addToOrderMaintainer(data: any, type: string) {
        if (!data.first && data.id !== currentResponseId) return;

        // console.log("CONVERTED TO SPEECH DATA:", text);
        orderMaintainer.addData({ ...data, type }, data.order);
    }

    chat.messageEmitter.on("sentence", async data => {
        getAudioData(data.text)
            .then(audioData => {
                data = {
                    ...audioData,
                    ...data,
                };

                addToOrderMaintainer(data, "sentence");
            })
            .catch(error => {
                console.log(error);
            });
        // try {
        //     const audioData = await getAudioData(data.text);
        //     data = {
        //         ...audioData,
        //         ...data,
        //     };
        // } catch (error) {
        //     console.log(error);
        // }

        // addToOrderMaintainer(data, "sentence");
    });

    for (let instructionType of ["data", "delta", "end"]) {
        chat.messageEmitter.on(instructionType, async data => {
            addToOrderMaintainer(data, instructionType);
        });
    }

    socket.on(`${channel}_message_x`, ({ message, context, id }) => {
        orderMaintainer.reset();
        currentResponseId = id;

        console.log("received message: ", message);

        onMessageX && onMessageX({ message, context });
        continueConversation({
            message,
            currentResponseId,
            ...params,
        });
    });

    socket.on(`${channel}_exit`, () => {
        onExit && onExit();
        console.log(`${channel}_exit`);

        chat.cleanUp();
        socket.removeAllListeners(`${channel}_message_x`);
        socket.removeAllListeners(`${channel}_exit`);
    });

    if (start) {
        continueConversation({
            ...params,
            first: true,
        });
    }
}

export async function continueConversation({
    message,
    first,
    chat,
    onResponse,
    currentResponseId,
}: ContinueConversationParams) {
    try {
        const response = await chat.generateResponse({
            message,
            id: currentResponseId,
            first,
            temperature: 1,
            audio: true,
        });
        onResponse && onResponse(response, first);
    } catch (error) {
        console.log(error);
    }
}

export async function onFeedbackRequest({
    studentAnswer,
    questionIndex,
    quiz, // quiz object
    socket,
    channel,
    audio = false,
}: {
    studentAnswer: string | number;
    questionIndex: number;
    quiz: Quiz;
    socket: Socket;
    channel: string;
    audio?: boolean;
}) {
    console.log("RECEIVED STUDENT ANSWER:", studentAnswer);
    console.log("QUESTION INDEX:", questionIndex);
    console.log("FOR QUESTION:", quiz.questions[questionIndex].question);
    if (quiz.questions[questionIndex].type === "multiple") {
        const { feedback, isCorrect } =
            await quiz.generateMultipleChoiceQuestionFeedback({
                studentChoiceIndex: studentAnswer as number,
                questionIndex,
                onFeedbackStream({ delta, isCorrect, first }) {
                    socket.emit(`${channel}_feedback_stream`, {
                        delta,
                        questionIndex,
                        choiceIndex: studentAnswer,
                        isCorrect,
                        type: "multiple",
                        first,
                    });
                },
            });
        socket.emit(`${channel}_new_feedback`, {
            feedback,
            questionIndex,
            choiceIndex: studentAnswer,
            isCorrect,
            type: "multiple",
        });
    } else {
        const { feedback, marksScored, attempts } =
            await quiz.generateWrittenQuestionFeedback({
                studentSolution: studentAnswer as string,
                questionIndex,
                onFeedbackStream({ delta, marksScored, first }) {
                    socket.emit(`${channel}_feedback_stream`, {
                        delta,
                        questionIndex,
                        marksScored,
                        type: "written",
                        first,
                    });
                },
            });

        if (
            attempts === 4 &&
            marksScored! < quiz.questions[questionIndex].marks
        ) {
            const message = OUT_OF_ATTEMPTS_MESSAGE;
            await streamString(message, socket, `${channel}_feedback_stream`, {
                questionIndex,
                marksScored,
                type: "written",
            });
            socket.emit(`${channel}_new_feedback`, {
                feedback: feedback + message,
                questionIndex,
                final: true,
                marksScored,
                type: "written",
            });
            await streamString(
                quiz.questions[questionIndex].solution!,
                socket,
                `${channel}_answer_stream`,
                {
                    questionIndex,
                }
            );
            socket.emit(`${channel}_answer`, {
                answer: quiz.questions[questionIndex].solution!,
                questionIndex,
            });
        } else {
            socket.emit(`${channel}_new_feedback`, {
                feedback,
                questionIndex,
                final: false,
                marksScored,
                type: "written",
            });
        }
    }
}
