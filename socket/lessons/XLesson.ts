// @ts-nocheck

import ChatGPTConversation from "../../lib/ChatGPTConversation";
import { lesson } from "../../lib/Oldprompts.utils";

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

        this.continueConversation = this.continueConversation.bind(this);

        this.socket.on("lesson_message_x", this.continueConversation);

        this.socket.emit("lesson_info", lesson);
        this.continueConversation({ first: true });
    }

    async continueConversation({ message, first }) {
        const { valid, reason } = await checkUserMessageGuidelines(
            socket,
            message
        );

        if (valid)
            this.chat
                .generateResponse(message)
                .catch(err => console.log(err))
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
                });
        else {
            this.socket.emit("lesson_error", reason);
        }
    }
}

export { XLesson };
