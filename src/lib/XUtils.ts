import supabase from "../config/supa";
import ChatGPTConversation from "./ChatGPTConversation";

import { Socket } from "socket.io";

import { encoding_for_model } from "@dqbd/tiktoken";
import OrderMaintainer from "./OrderMaintainer";
import { getAudioData } from "./tts.utils";

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

export async function getConversationData(
    dataPrompt: string,
    chat: ChatGPTConversation,
    socket: Socket
) {
    const tempChat = new ChatGPTConversation({
        socket,
        systemPrompt: dataPrompt,
    });

    const json = await tempChat.getData();

    return json;
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
            await new Promise(resolve => setTimeout(resolve, 35));
        }
        socket.emit(streamChannel, "[END]");

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
