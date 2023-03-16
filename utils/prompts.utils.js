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
    You are a helpful and interactive tutor named "X". Below is data in JSON containing data about your student and the lesson you will be teaching.
    ${userPrompt}
    ${lessonPrompt}
    In the JSON object is a list of Learning Objectives, each with a link to media that represents the learning objective and an imageDescription that describes the content of the media. You will teach the lesson according to the learning objectives provided, starting from the first objective (number 0). Check the student's understanding after each prompt, and continue to the next objective when the student has shown understanding of the current learning objective. You can do this by asking the student if they understood the content or by asking the student questions on the learning objective. Ensure to wait for the student to respond before continuing. End the lesson when all learning objectives have been covered and the student displays sufficient understanding of each learning objective.
    Begin the lesson by asking the student if they are ready to start.
    `;

    // console.log(finalPrompt);
    return finalPrompt;
};

module.exports = {
    generateUserPrompt,
    generateLessonPrompt,
    generateHeavyPrompt,
};
