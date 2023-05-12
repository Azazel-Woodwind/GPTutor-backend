import { CheckUserGuidelines } from "../lib/GPT4prompts.utils";
import ChatGPTConversation from "../lib/ChatGPTConversation";
import { Socket } from "socket.io";

export async function checkUserMessageGuidelines(
    socket: Socket,
    message: string
) {
    if (message.length > 1024)
        return {
            valid: false,
            reason: "Message exceeded allowed length of 1024 characters.",
        };

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
