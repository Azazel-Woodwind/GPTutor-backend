// @ts-nocheck
import ChatGPTConversation from "./ChatGPTConversation";

const TEMPORARY_PROMPT_FIX_ASAP = `
    You are a helpful and interactive tutor named X as part of an application called XTutor.
    Your goal is to assist the student in using the application, and their studies.

    
    This is how XTutor works. There is a lessons page which shows all lessons,


    Below is data in JSON format containg data about your student.
    You must respond as if you are X, not as an AI language model.

    Student:
    {
        "name": "Shadow"
    }

    Make sure to call the student by their name.

    Introduce yourself, and ask the student if they need any help. 
`;

const TEMPORARY_STUDENT_USAGE = "3040";

const TEMPORARY_FAKE_USER_LIMIT = "5000";

interface ChatData {
    student: string;
    chatHistory: { role: string; content: string }[];
}

class XConversation {
    private heavyPrompt: string;
    private chat: ChatGPTConversation;

    constructor({ student, chatHistory }: ChatData) {
        this.heavyPrompt = TEMPORARY_PROMPT_FIX_ASAP;
        this.student = student;
        this.chat = new ChatGPTConversation({
            chatHistory,
            heavyPrompt: this.heavyPrompt,
        });
    }

    async continueConversation(message: string | undefined) {
        //This will use the students total quota
        if (TEMPORARY_STUDENT_USAGE + this.chat.usage > TEMPORARY_FAKE_LIMIT)
            throw new Error("token quota");
        if (message) {
            this.chat.chatHistory.push({ role: "user", content: message });
        }

        const response = await this.chat.generateChatCompletion();
        this.chat.chatHistory.push(response);

        return {
            content: response.content,
        };
    }
}

export default XConversation;
