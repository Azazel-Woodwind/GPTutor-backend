import supabase from "../config/supa";
import ChatGPTConversation from "./ChatGPTConversation";

import { Socket } from "socket.io";

import { encoding_for_model } from "@dqbd/tiktoken";
import OrderMaintainer from "./OrderMaintainer";
import { getAudioData } from "./tts.utils";
import { STREAM_END_MESSAGE, STREAM_SPEED } from "./constants";

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

export async function streamString(
    string: string,
    socket: Socket,
    channel: string,
    data: any
): Promise<void> {
    return new Promise(async resolve => {
        for (const char of string) {
            socket.emit(channel, { delta: char, ...data });
            await new Promise(resolve => setTimeout(resolve, 35));
        }
        resolve();
    });
}

type streamStringProps = {
    string: string;
    socket: Socket;
    streamChannel: string;
    data?: any;
    audioChannel?: string;
};

export async function sendXMessage({
    channel,
    socket,
    message,
}: {
    channel: string;
    socket: Socket;
    message: string;
}) {
    console.log("SENDING MESSAGE:", message);
    return new Promise<void>(resolve => {
        const orderMaintainer = new OrderMaintainer({
            callback: (data: any) => {
                // console.log("SENDING INSTRUCTION:", data);
                // socket.emit(`${channel}_audio_data`, data);
                socket.emit(`${channel}_instruction`, data);
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
                                first: true, // bypass ID check
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
                first: true,
            },
            order++
        );

        socket.emit(`${channel}_response_data`, {
            response: message,
        });
    });
}

export async function streamChatResponse({
    string,
    socket,
    streamChannel,
    audioChannel,
}: streamStringProps): Promise<void> {
    const encoding = encoding_for_model("gpt-3.5-turbo");

    let currentSentence = "";
    let orderMaintainer: undefined | OrderMaintainer = undefined;

    if (audioChannel) {
        orderMaintainer = new OrderMaintainer({
            callback: (data: any) => {
                console.log("sending audio data to channel", audioChannel);
                socket.emit(audioChannel, data);
            },
        });
    }

    const tokens = encoding.encode(string);
    let sentenceNumber = 0;
    return new Promise(async resolve => {
        for (let i = 0; i < tokens.length; i++) {
            const tokenEncoding = tokens[i];
            const bytes = encoding.decode_single_token_bytes(tokenEncoding);
            const token = Buffer.from(bytes).toString("ascii");

            currentSentence += token;

            if (audioChannel && tokenContainsStopper(token)) {
                currentSentence = currentSentence.trim();
                if (currentSentence) {
                    getAudioData(currentSentence).then(base64 => {
                        console.log("here");
                        orderMaintainer!.addData(
                            {
                                audio: base64,
                                first: true,
                                order: sentenceNumber,
                            },
                            sentenceNumber
                        );
                        sentenceNumber++;
                    });
                }

                currentSentence = "";
            }
            socket.emit(streamChannel, token);
            await new Promise(resolve => setTimeout(resolve, STREAM_SPEED));
        }
        socket.emit(streamChannel, STREAM_END_MESSAGE);

        socket.emit("chat_response_data", {
            response: string,
        });

        encoding.free();
        resolve();
    });
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
