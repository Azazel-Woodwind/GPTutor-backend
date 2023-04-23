// @ts-nocheck

import ChatGPTConversation from "../../lib/ChatGPTConversation";
import { lesson } from "../../lib/prompts.utils";

import checkUserMessageGuidelines from "../message.handler";

const { systemPrompt, dataPrompt } = lesson;

// interface LessonData {
//     student: string;
//     lesson: string;
//     chatHistory: { role: string; content: string }[];
// }

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

        this.chat.messageEmitter.on(
            "audioData",
            audioData =>
                audioData && socket.emit("lesson_audio_data", audioData)
        );

        this.continueConversation = this.continueConversation.bind(this);

        this.socket.on("lesson_message_x", this.continueConversation);

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
                        const { learningObjectiveNumber, finished } =
                            await this.chat.getData(dataPrompt);

                        this.socket.emit("lesson_response_data", {
                            learningObjectiveNumber: first
                                ? -1
                                : learningObjectiveNumber,
                            response,
                        });

                        if (finished) this.socket.emit("lesson_finished", true);
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
