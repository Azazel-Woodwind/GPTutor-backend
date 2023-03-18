const { ChatGPTConversation } = require("./chatgpt.utils.");

const {
    INSTRUCTIONS,
    context,
    learningObjectives,
    getJsonDataPrompt,
    RESPONSE_FORMAT,
    heavyPromptIntroduction,
    heavyPromptDescription,
    heavyPromptEnding,
} = require("./data/prompts");

function parseLearningObjectives(lesson) {
    const lessonObjectiveData = lesson.learningObjectives
        .map((objective) => {
            delete objective.image.link;
            return objective;
        })
        .map(
            (objective, index) =>
                `\nLesson Objective #${index + 1}: ${JSON.stringify(objective)}`
        )
        .join("\n");

    return lessonObjectiveData;
}

const generateUserPrompt = (user) => {
    return `Student data:
    ${JSON.stringify({
        firstName: user.firstName,
        gender: user.gender ? "male" : null,
        interests: user.interests,
    })}`;
};

const generateLessonPrompt = (lesson) => {
    lesson = { ...lesson };
    // console.log(lesson);
    const lessonObjectiveData = lesson.learningObjectives
        .map((objective) => {
            delete objective.image.link;
            return objective;
        })
        .map(
            (objective, index) =>
                `\nLesson Objective #${index + 1}: ${JSON.stringify(objective)}`
        )
        .join("\n");

    delete lesson.learningObjectives;
    delete lesson.lessonID;
    delete lesson.teacher;
    return `
        Lesson information:
        ${JSON.stringify(lesson)}
        Lesson objectives:
        ${lessonObjectiveData}
    `;
};

const generateHeavyPrompt = (user, lesson) => {
    // const finalPrompt = `
    // ${context(lesson.subject, user.firstName, lesson.level, lesson.title)}\n
    // ${learningObjectives(parseLearningObjectives(lesson))}\n
    // ${INSTRUCTIONS}\n
    // `;
    const finalPrompt = `
    ${heavyPromptIntroduction}
    ${generateUserPrompt(user)}
    ${generateLessonPrompt(lesson)}
    ${heavyPromptDescription}
    ${heavyPromptEnding}
    `;
    // console.log(finalPrompt);
    return finalPrompt;
};

class XLesson {
    constructor({ student, lesson, chatHistory }) {
        console.log(student, lesson);
        this.heavyPrompt = generateHeavyPrompt(student, lesson);
        this.chat = new ChatGPTConversation({
            chatHistory,
            heavyPrompt: this.heavyPrompt,
        });
    }

    async continueConversation(message) {
        message &&
            this.chat.chatHistory.push({ role: "user", content: message });
        const response = await this.chat.generateChatCompletion();
        this.chat.chatHistory.push(response);
        const json = await this.getJsonData();

        return {
            ...json,
            content: response.content,
        };
    }

    async getJsonData() {
        if (this.chat.chatHistory.length == 1)
            return { finished: false, learningObjective: -1 };

        var { content } = await this.chat.generateChatCompletion(
            { role: "user", content: getJsonDataPrompt },
            { silent: true }
        );
        let dataString = content;
        console.log("Json data:", dataString, "end of json data");

        while (dataString.charAt(0) !== "{") {
            dataString = dataString.slice(1);
        }
        while (dataString.charAt(dataString.length - 1) !== "}") {
            dataString = dataString.slice(0, dataString.length - 1);
        }

        return JSON.parse(dataString.replaceAll("'", '"'));
    }
}

module.exports = XLesson;
