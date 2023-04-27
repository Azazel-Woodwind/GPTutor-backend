// @ts-nocheck

import { nanoid } from "nanoid";
import supabase from "../config/supa";
import checkUserMessageGuidelines from "../socket/message.handler";
import ChatGPTConversation from "./ChatGPTConversation";
import { getAudioData } from "./tts.utils";

export async function exceededTokenQuota(id, limit) {
    const { data: user, error } = await supabase
        .from("users")
        .select("daily_token_usage")
        .eq("id", id)
        .single();
    if (error) throw new Error("Couldn't get student data");
    //This will use the students total quota
    return user.daily_token_usage >= limit;
}

export async function incrementUsage(id, delta) {
    const { error } = await supabase.rpc("increment_usage", {
        user_id: id,
        delta,
    });
    if (error) throw new Error("Couldn't update usage");
}

export function findJsonInString(content) {
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

export async function getJsonData(dataPrompt, chat, socket) {
    const systemPrompt = `
    Here is an interaction between a ChatGPT AI and a human:

    ${JSON.stringify(chat.chatHistory.slice(1))}

    Your task is to return JSON data based on these instructions:

    ${dataPrompt}
    `;

    // console.log(dataPrompt);

    const tempChat = new ChatGPTConversation({
        socket,
        systemPrompt,
    });

    const json = await tempChat.getData();

    return json;
}

export async function XSetup(params) {
    const { chat, socket, channel, onMessageX, start } = params;

    chat.messageEmitter.on(
        "message",
        message => message && socket.emit(`${channel}_response_stream`, message)
    );

    let nextSentenceNumber = 0;
    const audioData = new Map();
    let currentResponseId = undefined;

    chat.messageEmitter.on("generate_audio", ({ text, order, id, first }) => {
        getAudioData(text)
            .then(base64 => {
                if (!first && id !== currentResponseId) return;

                console.log("CONVERTED TO SPEECH DATA:", text);
                if (order === nextSentenceNumber) {
                    socket.emit(`${channel}_audio_data`, {
                        audio: base64,
                        first,
                        id,
                    });
                    nextSentenceNumber++;
                    while (audioData.has(nextSentenceNumber)) {
                        socket.emit(`${channel}_audio_data`, {
                            audio: audioData.get(nextSentenceNumber),
                            first,
                            id,
                        });
                        nextSentenceNumber++;
                    }
                } else {
                    audioData.set(order, base64);
                }
            })
            .catch(err => console.log(err));
    });

    socket.on(`${channel}_message_x`, ({ message, context, id }) => {
        nextSentenceNumber = 0;
        audioData.clear();
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
        chat.abortController && chat.abortController.abort();
        chat.messageEmitter.removeAllListeners();

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
}) {
    try {
        let valid, reason;
        if (!first) {
            ({ valid, reason } = await checkUserMessageGuidelines(
                socket,
                message
            ));
        }

        if (valid || first) {
            const response = await chat.generateResponse(
                message,
                currentResponseId,
                first
            );
            onResponse && onResponse(response, first);
        } else {
            socket.emit(
                `${channel}_error`,
                handleError ? handleError(reason) : reason
            );
        }
    } catch (error) {
        console.log(error);
    }
}
