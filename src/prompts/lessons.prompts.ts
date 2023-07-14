import { formatChat } from "../lib/XUtils";
import { generateDataPrompt } from "./data.prompts";

const formatLearningObjectives = (learningObjectives: LearningObjective[]) =>
    learningObjectives
        .map(({ description }, index) => `#${index + 1}: ${description}`)
        .join("\n");

const generateLessonInformation = (lesson: Partial<Lesson>) => {
    const lessonData = `
Title: ${lesson.title}
Subject: ${lesson.subject}
Education Level: ${lesson.education_level}
    `;

    return `
Lesson information:
${lessonData}
Learning objectives:
${formatLearningObjectives(
    lesson.learning_objectives!.sort((a, b) =>
        a.number && b.number ? a.number - b.number : 0
    )
)}
`;
};

// const lessonSystemPromptIntroduction = `Below is JSON data about your student and the lesson.`;

// const lessonSystemPromptDescription = `Teach lesson according to provided learning objectives in order. Engage student with helpful examples linked to learning objectives. Check understanding after each response with at least one question. Ensure student demonstrates thorough understanding of the learning objective before proceeding. Transition between each learning objective in a natural manner without directly referencing them. After all objectives have been covered, ask if the student has any questions and if not, wish goodbye to the student in a friendly manner. End lesson only after student has no more questions and confirms that they are happy to end the lesson.`;
export const dataSeparator = "█";

const lessonInstructions = `
Teach me the lesson according to the provided learning objectives, starting from #1. As you teach me, engage me with helpful examples and check my understanding after each response with at least one thought provoking question. Only proceed to the next learning objective after I confirm understanding of the current objective and I have no more questions about the current objective. Transition between each learning objective in a natural manner without directly mentioning them. When you are done teaching the lesson, ask me if I have any questions and when I no longer have any questions, wish me goodbye and end the lesson.

Greet me, introduce the lesson, and ask if I'm ready to start. Please do not begin teaching me unless I have confirmed that I am ready.`;

const dataInstructions = `
On the first two lines of every response, always include 2 values. The first value is the number of the learning objective you are teaching in the response. This should be -1 if the lesson has not started or no learning objective is being discussed. The second value is "true" if the lesson has finished, and "false" otherwise. Always enclose this data between this character: "${dataSeparator}". For example:
${dataSeparator}
2
false
${dataSeparator}
`;

const getJsonDataPrompt = (lesson: Lesson, history: Message[]) => `
Here is information about a lesson that a teacher is teaching to a student:
${generateLessonInformation(lesson)}
Here is the conversation history between the student and teacher:
START
"
${formatChat(history)}
"
END
You must respond with ONLY a JSON object with two keys: 'learningObjectiveNumber' and 'finished'.
'learningObjectiveNumber' is the number of the learning objective that the teacher is most recently teaching to the student. If the student has not confirmed that they are ready to start the lesson or no learning objective is being taught, you must assume that the learning objective number is -1.
'finished' is true if and only if the teacher has ended the lesson and wished goodbye to the student, else false. It is not true under any other circumstances. Ensure to review the last message of the conversation carefully before providing this value.
`;

// const getJsonDataPrompt = (lesson: Lesson, history: Message[]) => `
// A teacher is teaching a lesson to a student. Here are the learning objectives of the lesson:
// ${formatLearningObjectives(lesson.learning_objectives!)}
// Here is the conversation history between the teacher and student:
// START
// "
// ${formatChat(history)}
// "
// END
// You must respond with 2 values on new lines. The first value is the number of the learning objective that the teacher is most recently teaching to the student. If the student has not confirmed that they are ready to start the lesson or no learning objective is being taught, you must assume that the learning objective number is -1. The second value is "true" if and only if the teacher has ended the lesson and wished goodbye to the student, else "false".
// `;

export const lessonDataPrompt = generateDataPrompt({
    definitions: {
        learningObjectiveNumber:
            "The number of the learning objective you are teaching in the response. This should be -1 if the lesson has not started or no learning objective is being discussed.",
        finished: "'true' if the lesson has finished, and 'false' otherwise",
    },
    start: true,
});

const lessonIntroduction = (first_name: string) =>
    `Your name is "X", you are my tutor. I am your student named ${first_name}. Please teach me this lesson:`;

export const generateLessonSystemPrompt = (user: User, lesson: Lesson) => `
${lessonIntroduction(user.first_name)}
${generateLessonInformation(lesson)}
${lessonInstructions}
${lessonDataPrompt}
`;

export const lesson = {
    systemPrompt: generateLessonSystemPrompt,
    dataPrompt: getJsonDataPrompt,
};
