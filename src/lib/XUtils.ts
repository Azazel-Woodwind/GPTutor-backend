import supabase from "../config/supa";
import checkUserMessageGuidelines from "../socket/message.handler";
import ChatGPTConversation, { ChatResponse } from "./ChatGPTConversation";
import DelayedBuffer from "./DelayedBuffer";
import OrderMaintaier from "./OrderMaintainer";
import { getAudioData } from "./tts.utils";
import { Socket } from "socket.io";

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
    //     const systemPrompt = `
    // Here is an conversation between a teacher and a human:
    // ${formatChat(chat.chatHistory.slice(1))}
    // Your task is to return JSON data based on these instructions:
    // ${dataPrompt}
    // `;

    // console.log(dataPrompt);

    const tempChat = new ChatGPTConversation({
        socket,
        systemPrompt: dataPrompt,
    });

    const json = await tempChat.getData();

    return json;
}

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
    onResponse: (response: ChatResponse, first?: boolean) => void;
    handleError?: (reason: string) => string;
    start?: boolean;
};

export async function eventEmitterSetup({
    chat,
    socket,
    streamChannel,
    onReceiveAudioData,
    onMessage,
    delay,
    sendEndMessage,
    generateAudio = true,
}: {
    chat: ChatGPTConversation;
    socket: Socket;
    streamChannel: string;
    sendEndMessage?: boolean;
    onReceiveAudioData?: (data: any) => void;
    onMessage?: (message: string) => void;
    delay?: number;
    generateAudio?: boolean;
}) {
    let buffer: DelayedBuffer | undefined = undefined;
    if (delay) {
        buffer = new DelayedBuffer(async (delta: string) => {
            onMessage ? onMessage(delta) : socket.emit(streamChannel, delta);
        }, delay);
    }

    chat.messageEmitter.on("message", ({ delta, first }) => {
        if (delta) {
            if (buffer) {
                if (first) {
                    buffer.reset();
                }
                buffer.addData(delta);
                return;
            }
            onMessage ? onMessage(delta) : socket.emit(streamChannel, delta);
        }
    });

    if (sendEndMessage) {
        chat.messageEmitter.on("end", () => {
            const endString = "[END]";
            if (buffer) {
                buffer.addData(endString);
            } else {
                onMessage
                    ? onMessage(endString)
                    : socket.emit(streamChannel, endString);
            }
        });
    }

    if (generateAudio) {
        chat.messageEmitter.on(
            "generate_audio",
            ({ text, order, id, first }) => {
                if (!socket.user?.req_audio_data) return;
                getAudioData(text)
                    .then(base64 => {
                        onReceiveAudioData &&
                            onReceiveAudioData({ base64, order, id, first });
                    })
                    .catch(err => console.log(err));
            }
        );
    }
}

type ContinueConversationParams = {
    message?: string;
    first?: boolean;
    chat: ChatGPTConversation;
    socket: Socket;
    onResponse: (response: ChatResponse, first?: boolean) => void;
    channel: string;
    handleError?: (reason: string) => string;
    currentResponseId?: string;
    delay?: number;
};

export async function XSetup(params: XSetupParams) {
    const { chat, socket, channel, onMessageX, start } = params;

    let currentResponseId: undefined | string = undefined;

    const orderMaintainer = new OrderMaintaier({
        callback: (data: any) => {
            socket.emit(`${channel}_audio_data`, data);
        },
    });

    eventEmitterSetup({
        chat,
        socket,
        streamChannel: `${channel}_response_stream`,
        sendEndMessage: true,
        onReceiveAudioData: ({ base64, order, id, first }) => {
            if (!first && id !== currentResponseId) return;

            // console.log("CONVERTED TO SPEECH DATA:", text);
            orderMaintainer.addData(
                {
                    audio: base64,
                    first,
                    id,
                    order,
                },
                order
            );
        },
        delay: 800,
    });

    socket.on(`${channel}_message_x`, ({ message, context, id }) => {
        orderMaintainer.reset();
        currentResponseId = id;

        console.log("received message: ", message);

        onMessageX && onMessageX({ message, context });
        continueConversation({
            message,
            currentResponseId,
            delay: 600,
            ...params,
        });
    });

    socket.on(`${channel}_exit`, () => {
        console.log(`${channel}_exit`);

        chat.cleanUp();
        socket.removeAllListeners(`${channel}_message_x`);
        socket.removeAllListeners(`${channel}_exit`);
    });

    if (start) {
        continueConversation({
            ...params,
            first: true,
            delay: 600,
        });
    }
}

export async function continueConversation({
    message,
    first,
    chat,
    socket,
    onResponse,
    channel,
    handleError,
    currentResponseId,
    delay,
}: ContinueConversationParams) {
    try {
        // let valid, reason;
        // if (!first) {
        //     ({ valid, reason } = await checkUserMessageGuidelines(
        //         socket,
        //         message as string
        //     ));
        // }

        // if (valid || first) {
        const response = await chat.generateResponse({
            message,
            id: currentResponseId,
            first,
            temperature: 1,
        });
        onResponse && onResponse(response, first);
        // if (delay) {
        //     setTimeout(() => {
        //         onResponse && onResponse(response, first);
        //     }, delay);
        // } else {
        //     onResponse && onResponse(response, first);
        // }
        // } else {
        //     socket.emit(
        //         `${channel}_error`,
        //         handleError ? handleError(reason) : reason
        //     );
        // }
    } catch (error) {
        console.log(error);
    }
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

// function that separates list by commas with and separating last two words
export const commaSeparate = (list: string[]) => {
    if (list.length === 1) return list[0];

    const last = list.pop()!;
    return `${list.join(", ")} and ${last}`;
};
