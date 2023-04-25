// @ts-nocheck
import { conversation } from "../../lib/prompts.utils";
import ChatGPTConversation from "../../lib/ChatGPTConversation";
const { systemPrompt, dataPrompt } = conversation;
import checkUserMessageGuidelines from "../message.handler";
import { getAudioData } from "../../lib/tts.utils";

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
            chatHistory: chatHistory,
            heavyPrompt: systemPrompt(this.user, context),
            socket,
        });

        this.socket = socket;

        this.chat.messageEmitter.on(
            "message",
            message => message && socket.emit("chat_response_stream", message)
        );

        let nextSentenceNumber = 0;
        const audioData = new Map();

        this.chat.messageEmitter.on("generate_audio", ({ text, order }) => {
            if (text) {
                getAudioData(text)
                    .then(base64 => {
                        if (order === nextSentenceNumber) {
                            socket.emit("chat_audio_data", base64);
                            nextSentenceNumber++;
                            while (audioData.has(nextSentenceNumber)) {
                                socket.emit(
                                    "chat_audio_data",
                                    audioData.get(nextSentenceNumber)
                                );
                                nextSentenceNumber++;
                            }
                        } else {
                            audioData.set(order, base64);
                        }
                    })
                    .catch(err => console.log(err));
            }
        });

        //this.continueConversation({ first: true });
        this.socket.on("chat_message_x", ({ message, context }) => {
            nextSentenceNumber = 0;
            audioData.clear();

            if (context) this.updateContext(context);
            if (message) this.continueConversation({ message });
        });

        if (context) this.updateContext(context);
    }

    async continueConversation({ message, first }) {
        checkUserMessageGuidelines(this.socket, message)
            .then(({ valid, reason }) => {
                if (valid)
                    this.chat.generateResponse(message).then(async response => {
                        this.socket.emit("chat_response_data", {
                            response,
                        });

                        const data = await this.chat.getData(dataPrompt);
                        // const data = await getJsonData(
                        //     dataPrompt,
                        //     this.chat,
                        //     this.socket
                        // );
                        if (data.navigateTo)
                            this.socket.emit("navigate", data.navigateTo);
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
            })
            .catch(console.log);
    }

    updateContext(context) {
        this.chat.chatHistory[0].content = systemPrompt(this.user, context);
    }
}

export default XConversation;
