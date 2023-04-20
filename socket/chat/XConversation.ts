// @ts-nocheck
import { conversation } from "../../lib/prompts.utils";
import ChatGPTConversation from "../../lib/ChatGPTConversation";
const { systemPrompt, dataPrompt } = conversation;
import checkUserMessageGuidelines from "../message.handler";

interface ChatData {
    user: any;
    chatHistory: { role: string; content: string }[];
}

class XConversation {
    private heavyPrompt: string;
    private chat: ChatGPTConversation;

    constructor({ user, chatHistory, context, socket }: ChatData) {
        this.user = user;
        this.chat = new ChatGPTConversation({
            chatHistory: chatHistory && chatHistory,
            heavyPrompt: systemPrompt(this.user, context),
            socket,
        });

        this.socket = socket;

        this.chat.messageEmitter.on(
            "message",
            message => message && socket.emit("chat_response_stream", message)
        );

        //this.continueConversation({ first: true });
        this.socket.on("chat_message_x", ({ message, context }) => {
            if (context) this.updateContext(context);
            if (message) this.continueConversation({ message });
        });

        if (context) this.updateContext(context);
    }

    async continueConversation({ message, first }) {
        const { valid, reason } = await checkUserMessageGuidelines(
            this.socket,
            message
        );

        if (valid)
            this.chat
                .generateResponse(message)
                .then(async response => {
                    this.socket.emit("chat_response_data", {
                        response,
                    });

                    const data = await this.chat.getData(dataPrompt);
                    if (data.navigateTo)
                        this.socket.emit("navigate", data.navigateTo);
                })
                .catch(err => {
                    console.log(err);
                });
        else {
            this.socket.emit(
                "chat_error",
                `We were unable to process your message, as it was flagged for violating our usage guidelines.
                WARNING: X will remember this decision.$

                - ${reason}

                Learn more about our *guidelines*
            `
            );
        }
    }

    updateContext(context) {
        this.chat.heavyPrompt = systemPrompt(this.user, context);
    }
}

export default XConversation;
