// @ts-nocheck

import { CheckUserGuidelines } from "../lib/prompts.utils";
import ChatGPTConversation from "../lib/ChatGPTConversation";

export async function checkUserMessageGuidelines(socket, message) {
    const chat = new ChatGPTConversation({
        socket,
        systemPrompt: `Student message: "${message}"`,
    });

    const guidelines = await chat.getData(CheckUserGuidelines);
    if (guidelines === false) {
        return { valid: true, reason: "" };
    }
    return guidelines;
}

export default checkUserMessageGuidelines;
