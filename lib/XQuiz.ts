import { generateQuizPrompt } from "./prompts.utils";
import { ChatGPTConversation } from "./ChatGPTConversation";
class XQuiz {
    constructor(lesson) {
        this.lesson = lesson;
        this.systemPrompt = generateQuizPrompt(lesson);
        this.chat = new ChatGPTConversation();
    }

    generateMultipleChoiceQuestion() {}

    generateWrittenQuestion() {}

    markWrittenQuestion() {}
}

export default XQuiz;
