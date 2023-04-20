import { CheckUserGuidelines } from "../lib/prompts.utils";
import ChatGPTConversation from "../lib/ChatGPTConversation";

export async function checkUserMessageGuidelines(socket, message) {
    const chat = new ChatGPTConversation({
        socket,
        heavyPrompt: `Student message: ${message}`,
    });

    const guidelines = await chat.getData(CheckUserGuidelines);
    // console.log(guidelines);
    return guidelines;
}

export default checkUserMessageGuidelines;
