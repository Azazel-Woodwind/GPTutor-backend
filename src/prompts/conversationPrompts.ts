import { emotionInstructions, generalIntroduction } from "./generalPrompts";

const chatDescription = `
You are here to help me with anything related to education.
`;

const chatInstructions = `
Greet me kindly and ask if I need any help with anything.
`;

const generateConversationSystemPrompt = (user: User): string => `
${generalIntroduction(user.first_name)}
${chatDescription}
${emotionInstructions}
${chatInstructions}
`;

export const conversation = {
    systemPrompt: generateConversationSystemPrompt,
};
