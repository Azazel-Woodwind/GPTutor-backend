// @ts-nocheck

import { CheckUserGuidelines } from "../lib/GPT4prompts.utils";
import ChatGPTConversation from "../lib/ChatGPTConversation";

export async function checkUserMessageGuidelines(socket, message) {
    const systemPrompt = `
    Here is a message sent from a user to the AI system:
    User: "${message}"

    ${CheckUserGuidelines}
    `;

    // console.log("systemPrompt:", systemPrompt);

    const chat = new ChatGPTConversation({
        socket,
        systemPrompt,
    });

    const guidelines = await chat.getData();
    if (guidelines === false) {
        return { valid: true, reason: "" };
    }
    return guidelines;
}

export default checkUserMessageGuidelines;
