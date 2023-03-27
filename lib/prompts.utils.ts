const systemPromptIntroduction = `You are a helpful and interactive tutor named "X". Below is data in JSON format containing data about your student and the lesson you will be teaching.`;
const systemPromptDescription = `You will teach the lesson according to the learning objectives provided, starting from the first objective. Each learning objective contains image descriptions for the images that will be shown while you teach that objective. DO NOT specify actions, such as *show image* or [image shown]. Keep the lesson engaging and try to link examples with the student's interests listed above to keep them interested. Try to keep prompts relatively short by breaking up the learning objectives into multiple parts to keep the student engaged. Check the student's understanding after each response by giving the student a question to solve on the learning objective. Ask one question at a time, and do not just give the answer to the student, but try to guide them there themselves. NEVER continue to the next learning objective unless the student has confirmed that they have understood the current learning objective. Once all learning objectives have been covered, ask the student if they have any questions. If the student has no more questions, end the lesson by asking the student if they are happy to end the lesson. If the student is happy to end the lesson, wish the student goodbye and end the lesson. If the student is not happy to end the lesson, continue teaching the lesson.`;
const systemPromptEnding = `You MUST respond as if you are X, not as an ai. Begin the lesson by greeting the student, briefly introducing the lesson and asking the student if they are ready to start the lesson and ending your response. DO NOT begin teaching the lesson until the student says they are ready to start the lesson.`;
const getJsonDataPrompt = `Return ONLY a JSON object with two keys, 'learningObjectiveNumber' and 'finished'. 'learningObjectiveNumber' should contain the learning objective number for the learning objective number that you were talking about last as an integer or -1 if the student has not confirmed that they are ready to start the lesson. 'finished' should contain a boolean which is true if your response is the final message of the lesson and the student has confirmed that they are happy to end the lesson, and false if not.`;

// ALWAYS prepend this separator string before the JSON object: '\n### END OF MESSAGE ###\n'. For example: These are the fundamentals of!\n### END OF MESSAGE ###\n{'learningObjective': 2, 'finished': false}"`;

function listImages(images) {
    return images
        .map((image, index) => {
            return `Image #${index + 1}: ${image.description}`;
        })
        .join("\n");
}

function listLearningObjectives(learningObjectives) {
    return learningObjectives
        .map((learningObjective, index) => {
            return `Learning Objective #${index + 1}: ${
                learningObjective.title
            }\nImages for learning objective #${index + 1}:\n${listImages(
                learningObjective.images
            )}
        `;
        })
        .join("\n");
}

function formatInterests(interests) {
    // format the interests so that they are joined by a comma but with an "and" separating the last two words
    return interests.join(", ").replace(/,([^,]*)$/, " and$1");
}

const generateUserInformation = (user) => {
    return `Student data:
    ${JSON.stringify({
        firstName: user.firstName,
        gender: user.gender ? "male" : null,
        interests: user.interests,
    })}`;
};

const generateLessonInformation = (lesson) => {
    lesson = { ...lesson };
    const lessonObjectiveData = lesson.learningObjectives
        .map(({ title, images }) => ({
            title,
            images: images.map(({ link, description }) => description),
        }))
        .map(
            (objective, index) =>
                `\nLearning Objective #${index + 1}: ${JSON.stringify(
                    objective
                )}`
        )
        .join("\n");

    delete lesson.learningObjectives;
    delete lesson.id;
    delete lesson.teacher;
    return `
Lesson information:
${JSON.stringify(lesson)}
Lesson objectives:
${lessonObjectiveData}
    `;
};

function generateSystemPromptV1(user, lesson) {
    return `
${systemPromptIntroduction}
${generateUserInformation(user)}
${generateLessonInformation(lesson)}
${systemPromptDescription}
${systemPromptEnding}`;
}

function generateSystemPromptV2(user, lesson) {
    return `You are a helpful and interactive tutor named "X". Teach a lesson to a ${
        user.gender ? "male" : null
    } student named ${user.firstName} about ${lesson.subject} at the ${
        lesson.educationLevel
    } level. Below is data in JSON format about the lesson you must teach:\n${generateLessonInformation(
        lesson
    )}\n${systemPromptDescription}\n${systemPromptEnding}`;
}

function generateFirstPersonPrompt({
    name,
    learningObjectives,
    educationLevel,
    subject,
    title,
    interests,
}) {
    return `Hi, my name is ${name}. Please give me a ${educationLevel} ${subject} lesson titled ${title}. I would like to cover a set of learning objectives, where each learning objective also has a list of images that will be shown when you teach it. Here are the learning objectives:\n${listLearningObjectives(
        learningObjectives
    )}\n. I am interested in ${formatInterests(
        interests
    )}. When you teach me, ask me lots of questions and let me respond, and try to relate the examples to my interests. Please begin the lesson by listing the learning objectives and asking me if I am ready to start the lesson.`;
}

const subjectMappings = new Map([
    ["Mathematics", "Mathematician"],
    ["Physics", "Physicist"],
    ["Chemistry", "Chemist"],
    ["Biology", "Biologist"],
    ["Computer Science", "Computer Scientist"],
    ["Business", "Businessman"],
]);

function generateQuizPrompt(lesson) {
    return `You are an extremely intelligent ${subjectMappings.get(
        lesson.subject
    )} who is writing unique questions for a student studying ${
        lesson.subject
    } following a lesson. Here are the details for the lesson that the student has attended. `;
}

module.exports = {
    generateSystemPromptV1,
    generateSystemPromptV2,
    generateFirstPersonPrompt,
    getJsonDataPrompt,
    generateQuizPrompt,
};
