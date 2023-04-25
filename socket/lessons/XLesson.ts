// @ts-nocheck

import ChatGPTConversation from "../../lib/ChatGPTConversation";
import { lesson } from "../../lib/GPT4prompts.utils";
import { getAudioData } from "../../lib/tts.utils";
import { getJsonData } from "../../lib/XUtils";

import checkUserMessageGuidelines from "../message.handler";

const { systemPrompt, dataPrompt } = lesson;

class XLesson {
    private heavyPrompt: string;
    private chat: ChatGPTConversation;

    constructor({ student, lesson, chatHistory, socket }: any) {
        this.student = student;
        this.lesson = lesson;
        this.socket = socket;

        this.heavyPrompt = systemPrompt(student, lesson);
        this.chat = new ChatGPTConversation({
            chatHistory,
            heavyPrompt: this.heavyPrompt,
            socket,
        });

        this.chat.messageEmitter.on(
            "message",
            message => message && socket.emit("lesson_response_stream", message)
        );

        let nextSentenceNumber = 0;
        const audioData = new Map();

        this.chat.messageEmitter.on("generate_audio", ({ text, order }) => {
            text = text.trim();
            if (text) {
                getAudioData(text)
                    .then(base64 => {
                        console.log("CONVERTED TO SPEECH DATA:", text);
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

        this.continueConversation = this.continueConversation.bind(this);

        this.socket.on("lesson_message_x", ({ message, context }) => {
            nextSentenceNumber = 0;
            audioData.clear();

            console.log("received message: ", message);
            this.continueConversation({ message });
        });

        this.socket.on("lesson_exit", () => {
            this.chat.abortController && this.chat.abortController.abort();
            this.chat.messageEmitter.removeAllListeners();
        });

        this.socket.emit("lesson_info", lesson);
        this.continueConversation({ first: true });
    }

    async continueConversation({ message, first }) {
        try {
            let valid, reason;
            if (!first) {
                ({ valid, reason } = await checkUserMessageGuidelines(
                    this.socket,
                    message
                ));
            }

            if (valid || first)
                this.chat
                    .generateResponse(message)

                    .then(async response => {
                        // const { learningObjectiveNumber, finished } =
                        //     await this.chat.getData(dataPrompt);
                        const data = await getJsonData(
                            dataPrompt(this.lesson),
                            this.chat,
                            this.socket
                        );
                        console.log("DATA:", data);

                        this.socket.emit("lesson_response_data", {
                            learningObjectiveNumber:
                                first || !data
                                    ? -1
                                    : data.learningObjectiveNumber,
                            response,
                        });

                        if (data.finished)
                            this.socket.emit("lesson_finished", true);
                    })
                    .catch(err => console.log(err));
            else {
                this.socket.emit("lesson_error", reason);
            }
        } catch (error) {
            console.log(error);
        }
    }
}

export { XLesson };
