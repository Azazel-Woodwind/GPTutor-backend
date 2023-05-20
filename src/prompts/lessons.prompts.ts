import { formatChat } from "../lib/XUtils";

const generateLessonInformation = (lesson: Partial<Lesson>) => {
    lesson = structuredClone(lesson);
    lesson.learning_objectives = lesson.learning_objectives?.sort((a, b) =>
        a.number && b.number ? a.number - b.number : 0
    );

    const lessonObjectiveData = lesson
        .learning_objectives!.map(
            ({ description }, index) => `#${index + 1}: ${description}`
        )
        .join("\n");

    delete lesson.learning_objectives;
    delete lesson.is_published;
    delete lesson.author_id;
    delete lesson.is_verified;
    delete lesson.caption;
    delete lesson.created_at;
    delete lesson.id;
    delete lesson.exam_boards;

    return `
Lesson information:
${JSON.stringify(lesson, null, 2)}
Learning objectives:
${lessonObjectiveData}
    `;
};

const lessonSystemPromptIntroduction = `Below is JSON data about your student and the lesson.`;

const lessonSystemPromptDescription = `Teach lesson according to provided learning objectives in order. Engage student with helpful examples linked to learning objectives. Check understanding after each response with at least one question. Ensure student demonstrates thorough understanding of the learning objective before proceeding. Transition between each learning objective in a natural manner without directly referencing them. After all objectives have been covered, ask if the student has any questions and if not, wish goodbye to the student in a friendly manner. End lesson only after student has no more questions and confirms that they are happy to end the lesson.`;

const lessonSystemPromptEnding = `Greet the student, introduce the lesson, and ask if they're ready to start. Do not under any circumstance respond with what the student would say. Respond as if you are the tutor, not the student`;
const getJsonDataPrompt = (lesson: Lesson, history: Message[]) => `
Here is information about a lesson that a teacher is teaching to the student:
${generateLessonInformation(lesson)}
Here is the conversation history between the student and teacher:
START
${formatChat(history)}
END
You must respond with ONLY a JSON object with two keys: 'learningObjectiveNumber' and 'finished'.
'learningObjectiveNumber' is the number of the learning objective that the teacher is most recently teaching to the student. If the student has not confirmed that they are ready to start the lesson or no learning objective is being taught, you must assume that the learning objective number is -1.
'finished' is true if and only if the teacher has ended the lesson and wished goodbye to the student, else false. It is not true under any other circumstances. Ensure to review the last message of the conversation carefully before providing this value.
`;

const generateLessonSystemPrompt = (user: User, lesson: Lesson) => `
    ${XIntroduction}
    ${lessonSystemPromptIntroduction}
    ${generateUserInformation(user)}
    ${generateLessonInformation(lesson)}
    ${lessonSystemPromptDescription}
    ${lessonSystemPromptEnding}
`;

export const lesson = {
    systemPrompt: generateLessonSystemPrompt,
    dataPrompt: getJsonDataPrompt,
};
