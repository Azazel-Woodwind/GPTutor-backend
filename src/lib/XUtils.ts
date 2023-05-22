import supabase from "../config/supa";
import checkUserMessageGuidelines from "../socket/message.handler";
import ChatGPTConversation, { ChatResponse } from "./ChatGPTConversation";
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

type ContinueConversationParams = {
    message?: string;
    first?: boolean;
    chat: ChatGPTConversation;
    socket: Socket;
    onResponse: (response: ChatResponse, first?: boolean) => void;
    channel: string;
    handleError?: (reason: string) => string;
    currentResponseId?: string;
};

export async function XSetup(params: XSetupParams) {
    const { chat, socket, channel, onMessageX, start } = params;

    chat.messageEmitter.on(
        "message",
        message => message && socket.emit(`${channel}_response_stream`, message)
    );

    // let nextSentenceNumber = 0;
    // const audioData = new Map();
    let currentResponseId: undefined | string = undefined;

    const orderMaintainer = new OrderMaintaier({
        callback: (data: any) => {
            socket.emit(`${channel}_audio_data`, data);
        },
    });
    chat.messageEmitter.on("generate_audio", ({ text, order, id, first }) => {
        getAudioData(text)
            .then(base64 => {
                if (!first && id !== currentResponseId) return;

                console.log("CONVERTED TO SPEECH DATA:", text);
                orderMaintainer.addData(
                    {
                        audio: base64,
                        first,
                        id,
                    },
                    order
                );
                // if (order === nextSentenceNumber) {
                //     socket.emit(`${channel}_audio_data`, {
                //         audio: base64,
                //         first,
                //         id,
                //     });
                //     nextSentenceNumber++;
                //     while (audioData.has(nextSentenceNumber)) {
                //         socket.emit(`${channel}_audio_data`, {
                //             audio: audioData.get(nextSentenceNumber),
                //             first,
                //             id,
                //         });
                //         nextSentenceNumber++;
                //     }
                // } else {
                //     audioData.set(order, base64);
                // }
            })
            .catch(err => console.log(err));
    });

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
    socket,
    onResponse,
    channel,
    handleError,
    currentResponseId,
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
