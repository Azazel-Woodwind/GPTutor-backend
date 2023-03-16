const {heavyPromptIntroduction, heavyPromptDescription, heavyPromptEnding} = require("./data/prompts")

const generateUserPrompt = (user) => {
    return JSON.stringify({
        firstName: user.firstName,
        gender: user.gender ? "male" : null,
        interests: user.interests
    })
};

const generateLessonPrompt = (lesson) => {
    lesson = {...lesson};
    // console.log(lesson);
    const lessonObjectiveData = lesson.LessonObjectives
        .map(objective => {
            delete objective.Image.link;
            return objective;
        })
        .map((objective, index) => `\nLesson Objective #${index}: ${JSON.stringify(objective)}`)
        .join("\n")
        
    delete lesson.LessonObjectives;
    delete lesson.LessonId;
    delete lesson.Teacher;
    return `
        Lesson information:
        ${JSON.stringify(lesson)}
        Lesson objectives:
        ${lessonObjectiveData}
    `
};

const generateHeavyPrompt = (user, lesson) => {
    const userPrompt = generateUserPrompt(user)
    const lessonPrompt = generateLessonPrompt(lesson)

    const finalPrompt = `
    ${heavyPromptIntroduction}
    ${userPrompt}
    ${lessonPrompt}
    ${heavyPromptDescription}
    ${heavyPromptEnding}
    `;
    // console.log(finalPrompt);
    return finalPrompt;
};

module.exports = {
    generateUserPrompt,
    generateLessonPrompt,
    generateHeavyPrompt,
};
