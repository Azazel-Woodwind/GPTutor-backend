import ChatGPTConversation from "../../../lib/ChatGPTConversation";
import * as introductionPrompts from "../../../prompts/introduction.prompts";

export default function updateChatHistory({
    chat,
    response,
    name,
}: {
    chat: ChatGPTConversation;
    response: string;
    name: string;
}) {
    chat.chatHistory.push(
        {
            role: "assistant",
            content: introductionPrompts.introduction(name),
        },
        {
            role: "user",
            content: response,
        },
        {
            role: "assistant",
            content: introductionPrompts.response1(name),
        }
    );
}
