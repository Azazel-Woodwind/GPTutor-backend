const { ChatGPTConversation } = require("./ChatGPTConversation");
const { generateQuizPrompt } = require("./prompts.utils");

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
