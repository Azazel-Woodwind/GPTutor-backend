import supabase from "../config/supa";
import { Socket } from "socket.io";
import OrderMaintainer from "./OrderMaintainer";
import { getAudioData } from "./tts.utils";
import { STREAM_END_MESSAGE, STREAM_SPEED } from "./constants";
import { io } from "../server";
import { OUT_OF_ATTEMPTS_MESSAGE } from "../prompts/quiz.prompts";

export async function exceededTokenQuota(id: string, limit: number) {
    const { data: user, error } = await supabase
        .from("users")
        .select("daily_token_usage")
        .eq("id", id)
        .single();
    if (error) throw new Error("Couldn't get student data");
    //This will use the students total quota
    return user.daily_token_usage >= limit;
}

export async function incrementUsage(id: string, delta: number) {
    const { error } = await supabase.rpc("increment_usage", {
        user_id: id,
        delta,
    });
    if (error) throw new Error("Couldn't update usage");
}

export function findJsonInString(content: string) {
    let dataString = content;
    // console.log("Json data:", dataString, "end of json data");

    let startingIndex = 0;
    let endingIndex = dataString.length;
    while (
        startingIndex < endingIndex &&
        dataString.charAt(startingIndex) !== "{"
    ) {
        startingIndex++;
    }

    while (
        startingIndex < endingIndex &&
        dataString.charAt(endingIndex - 1) !== "}"
    ) {
        endingIndex--;
    }

    const jsonString = dataString.substring(startingIndex, endingIndex);

    if (jsonString.length == 0) return null;
    let isValidJson = true,
        json;
    try {
        json = JSON.parse(jsonString);
    } catch (e) {
        isValidJson = false;
    }
    if (!isValidJson) return null;

    return json;
}

export function formatChat(chat: Message[]): string {
    let chatString = "\n";
    chat.forEach(message => {
        if (message.role === "assistant") {
            chatString += `Teacher: ${message.content}\n`;
        } else {
            chatString += `Student: ${message.content}\n`;
        }
    });
    return chatString;
}

export async function sendXMessage({
    channel,
    socket,
    message,
    messageData,
    endData,
    audio = true,
}: {
    channel: string;
    socket: Socket;
    message: string;
    messageData?: any;
    endData?: any;
    audio?: boolean;
}) {
    console.log("SENDING MESSAGE:", message);
    const emitter = socket.sessionID ? io.to(socket.sessionID) : socket;
    return new Promise<void>(async resolve => {
        if (!audio) {
            for (const char of message) {
                emitter.emit(`${channel}_instruction`, {
                    delta: char,
                    type: "delta",
                    ...messageData,
                });
                await new Promise(resolve => setTimeout(resolve, STREAM_SPEED));
            }
            emitter.emit(`${channel}_instruction`, {
                type: "end",
                response: message,
                ...endData,
            });
            return resolve();
        }

        const orderMaintainer = new OrderMaintainer({
            callback: (data: any) => {
                emitter.emit(`${channel}_instruction`, data);
                if (data.type === "end") {
                    console.log("RESOLVING");
                    resolve();
                }
            },
        });

        let front = 0;
        let rear = 0;
        let order = 0;
        for (let char of message) {
            // console.log(char);
            if (["\n", ".", "?", "!"].includes(char)) {
                const substring = message.slice(front, rear + 1);
                console.log("SUBSTRING:", substring);
                if (substring.trim()) {
                    let substringOrder = order++;
                    getAudioData(substring).then(audioData => {
                        orderMaintainer.addData(
                            {
                                ...audioData,
                                text: substring,
                                type: "sentence",
                                ...messageData,
                            },
                            substringOrder
                        );
                    });

                    front = rear + 1;
                }
            }

            rear++;
        }

        orderMaintainer.addData(
            {
                type: "end",
                response: message,
                ...endData,
            },
            order++
        );
    });
}

export async function onWrittenFeedbackEnd({
    channel,
    socket,
    attempts,
    marksScored,
    feedback,
    questionIndex,
    maxMarks,
    solution,
    audio,
}: {
    channel: string;
    socket: Socket;
    attempts: number;
    marksScored: number;
    feedback: string;
    questionIndex: number;
    maxMarks: number;
    solution: string;
    audio: boolean;
}) {
    if (attempts === 4 && marksScored! < maxMarks) {
        const message = OUT_OF_ATTEMPTS_MESSAGE;
        await sendXMessage({
            channel: "quiz",
            socket,
            message,
            messageData: {
                questionIndex,
                marksScored,
                questionType: "written",
                context: "feedback_stream",
            },
            endData: {
                feedback: feedback + message,
                questionIndex,
                marksScored,
                type: "end",
                questionType: "written",
                context: "new_feedback",
            },
            audio,
        });
        await sendXMessage({
            channel: "quiz",
            socket,
            message: solution,
            messageData: {
                questionIndex,
                context: "answer_stream",
            },
            endData: {
                answer: solution,
                questionIndex,
                context: "new_answer",
            },
            audio,
        });
    } else {
        io.to(socket.sessionID!).emit(`${channel}_instruction`, {
            feedback,
            questionIndex,
            marksScored,
            questionType: "written",
            type: "end",
            context: "new_feedback",
        });
    }
}

export function tokenContainsStopper(token: string) {
    return (
        token.includes(".") ||
        token.includes("?") ||
        token.includes("!") ||
        token.includes("\n")
    );
}

// function that separates list by commas with and separating last two words
export const commaSeparate = (list: string[]) => {
    if (list.length === 1) return list[0];

    const last = list.pop()!;
    return `${list.join(", ")} and ${last}`;
};
