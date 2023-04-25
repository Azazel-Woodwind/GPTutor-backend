// @ts-nocheck

import { CheckUserGuidelines } from "../lib/prompts.utils";
import ChatGPTConversation from "../lib/ChatGPTConversation";

export async function checkUserMessageGuidelines(socket, message) {
    const chat = new ChatGPTConversation({
        socket,
        heavyPrompt: `Student message: "${message}"`,
    });

    try {
        const guidelines = await chat.getData(CheckUserGuidelines);
        return guidelines;
    } catch (error) {
        console.log(error);
        return Promise.reject(error);
    }

    // console.log(guidelines);

    // return chat.getData(CheckUserGuidelines);
}

export default checkUserMessageGuidelines;
