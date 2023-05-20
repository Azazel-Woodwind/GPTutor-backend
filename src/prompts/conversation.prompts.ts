import { formatChat } from "../lib/XUtils";

const getUserIntentionData = (history: Message[]) => `
Here is the conversation history between the student and teacher:
START
${formatChat(history)}
END
You must respond with ONLY a JSON object with the following keys.
'navigateTo' should either contain the route of a page the user has communicated wishing to navigate to in their last message or false.
If you do not have access to or none of this applies make sure to ALWAYS return false
`;

const generateConversationContext = (context?: Context) => {
    if (!context) return ``;

    return `
    THINGS YOU KNOW ABOUT THE USER ON THE APPLICATION:
    ${context.path && `Currently on page: ${context.path}`}
    `;
};

const conversationInstructions = `
Call the student by their name.
Introduce yourself, and ask if they need help.
Capable of navigating pages, say you're navigating when asked. 

Example:
"Hello student, my name is X and I will be your tutor for today. I'm capable of navigating the website and assisting with the website, answering any questions about your subjects you may have. Just let me know."
`;

const siteIndex = `
    XTutor application layout by route and functionality:
    Free zone, route: "/hub" - The hub, navigate to other pages and talk to X.
    Lessons menu, route: "/lessons" - List of lessons, sortable by subject, education level, etc.
`;

const generateConversationSystemPrompt = (
    user: User,
    context?: Context
): string => `
    ${XIntroduction}
    ${generateUserInformation(user)}
    ${siteIndex}
    ${generateConversationContext(context)}
    ${conversationInstructions}
`;

export const conversation = {
    systemPrompt: generateConversationSystemPrompt,
    dataPrompt: getUserIntentionData,
};
