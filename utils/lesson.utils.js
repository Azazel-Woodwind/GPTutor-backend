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
                `\nLearning Objective #${index + 1}: ${JSON.stringify(
                    objective
                )}`
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
        // console.log(student, lesson);
        this.heavyPrompt = generateHeavyPrompt(student, lesson);
        this.chat = new ChatGPTConversation({
            chatHistory,
            heavyPrompt: this.heavyPrompt,
        });
    }

    async continueConversation(message) {
        message &&
            this.chat.chatHistory.push({ role: "user", content: message });
        console.log("continueConversation");
        const response = await this.chat.generateChatCompletion();
        this.chat.chatHistory.push(response);
        let json;
        do {
            json = await this.getJsonData();
            // console.log("json:", json);
        } while (json === null);

        return {
            ...json,
            content: response.content,
        };
    }

    async getJsonData() {
        console.log("Getting json data");
        var { content } = await this.chat.generateChatCompletion(
            { role: "system", content: getJsonDataPrompt },
            { silent: true }
        );
        let dataString = content;
        console.log("Json data:", dataString, "end of json data");

        let startingIndex = 0;
        let endingIndex = dataString.length;
        while (
            startingIndex < endingIndex &&
            dataString.charAt(startingIndex) !== "{"
        ) {
            startingIndex++;
        }
        while (
            startingIndex < endingIndex &&
            dataString.charAt(endingIndex - 1) !== "}"
        ) {
            endingIndex--;
        }
        const jsonString = dataString.substring(startingIndex, endingIndex);
        if (jsonString.length == 0) return null;

        return JSON.parse(jsonString.replaceAll("'", '"'));
    }
}

module.exports = {XLesson, generateLessonPrompt};
