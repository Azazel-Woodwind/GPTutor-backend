import { Socket } from "socket.io";
import { setUpConversationWithX } from "../utils/setUpConversationWithX";
import * as introductionPrompts from "../../../prompts/introduction.prompts";
import ChatGPTConversation from "../../../lib/ChatGPTConversation";
import { conversation } from "../../../prompts/conversation.prompts";
import { sendMessageFromX } from "../utils/sendMessageFromX";
import updateChatHistory from "../utils/updateChatHistory";

const startChatHandler = (data: any, socket: Socket) => {
    console.log("Received connection to start_chat");

    const current_user = socket.user;
    const newUser = data.new;

    const chat = new ChatGPTConversation({
        systemPrompt: conversation.systemPrompt(current_user!),
        socket,
    });

    const handleError = (reason: string) =>
        `We were unable to process your message, as it was flagged for violating our usage guidelines.
            WARNING: X will remember this decision.

                - ${reason}

            Learn more about our *guidelines*
    `;

    if (newUser) {
        console.log("New user, sending introduction");

        let response: string | undefined;
        socket.on(`chat_message_x`, ({ message }) => {
            console.log("Received message from user, continuing introduction");

            response = message;
            sendMessageFromX({
                channel: "chat",
                socket,
                message: introductionPrompts
                    .response1(current_user!.first_name)
                    .trim(),
            });
        });

        socket.on(`chat_moved_to_lessons`, async () => {
            console.log("User moved to hub, continuing introduction");
            sendMessageFromX({
                channel: "chat",
                socket,
                message: introductionPrompts
                    .response1Continuation(current_user!.first_name)
                    .trim(),
            });
            updateChatHistory({
                chat,
                response: response!,
                name: current_user!.first_name,
            });

            socket.removeAllListeners(`chat_message_x`);
            socket.removeAllListeners(`chat_moved_to_lessons`);
            setUpConversationWithX({
                chat,
                socket,
                channel: "chat",
                handleError,
                start: process.env.KAI !== "true",
            });
        });
        sendMessageFromX({
            channel: "chat",
            socket,
            message: introductionPrompts
                .introduction(current_user!.first_name)
                .trim(),
        });
    } else {
        setUpConversationWithX({
            chat,
            socket,
            channel: "chat",
            handleError,
            // start: process.env.KAI !== "true",
            start: true,
        });
    }
};

export default startChatHandler;
