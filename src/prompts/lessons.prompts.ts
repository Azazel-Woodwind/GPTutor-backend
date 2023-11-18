import { formatChat } from "../lib/XUtils";
import { emotionInstructions, generalIntroduction } from "./general.prompts";

const formatLearningObjective = (
    learningObjective: LearningObjective,
    index: number
) =>
    `
#${index + 1}: ${learningObjective.description}
\tINSTRUCTIONS:
${learningObjective.instructions
    .sort((a, b) => (a.number && b.number ? a.number - b.number : 0))
    .map(
        ({ instruction }, instructionIndex) => `
\t${index + 1}.${instructionIndex + 1}: ${instruction}
`
    )
    .join("\n")}
`;

const formatLearningObjectives = (learningObjectives: LearningObjective[]) =>
    learningObjectives
        .sort((a, b) => (a.number && b.number ? a.number - b.number : 0))
        .map((learningObjective, index) =>
            formatLearningObjective(learningObjective, index)
        )
        .join("\n");

const generateLessonInformation = (lesson: Partial<Lesson>) => {
    console.log(JSON.stringify(lesson, null, 4));
    const lessonData = `
Title: ${lesson.title}
Subject: ${lesson.subject}
Education Level: ${lesson.education_level}
    `;

    return `
You are teaching me this lesson:
${lessonData}
Learning objectives:
${formatLearningObjectives(lesson.learning_objectives!)}
`;
};

const lessonInstructions = `
Teach each learning objective by following each of its instructions in order, starting from #1. Your responses should follow multiple instructions where appropriate. Only proceed to the next learning objective after I confirm understanding of the current objective and I have no more questions about the current objective. Transition between each learning objective in a natural manner without directly mentioning them. When you are done teaching the lesson, ask me if I have any questions and when I no longer have any questions, wish me goodbye and end the lesson.

${emotionInstructions}

When transitioning between instructions, you must indicate this with valid JSON enclosed in triple quotations marks ("""), with the key "instruction". For example:
"""
{
    "instruction": "1.1"
}
"""
This can be anywhere in a response and can appear multiple times in one prompt.

When the current learning objective has been fully covered and I have no more questions, you must indicate this by responding with ONLY valid JSON enclosed in triple quotations marks ("""), with the key "finishedLearningObjective". This response must be this JSON and nothing more (no other words). Then, in your next response, continue with the lesson as normal. For example:
You: "(...) Do you have any questions?"
Me: "No, I understand."
You: 
"""
{
    "finishedLearningObjective": 1
}
"""
You in next response: "(continue from where you left off)"
You must never transition to the next learning objective without sending this JSON first.

When the lesson has ended, you must indicate this with valid JSON enclosed in triple quotations marks ("""), with the key "finished". For example:
"""
{
    "finished": true
}
"""

Greet me, briefly introduce the lesson, and ask if I'm ready to start. Do not start the lesson unless I have confirmed that I am ready.
`;

export const generateLessonSystemPrompt = (user: User, lesson: Lesson) => `
${generalIntroduction(user.first_name)}
${generateLessonInformation(lesson)}
${lessonInstructions}
`;

export const lesson = {
    systemPrompt: generateLessonSystemPrompt,
};
