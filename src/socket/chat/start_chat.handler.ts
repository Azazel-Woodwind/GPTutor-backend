import { conversation } from "../../lib/GPT4prompts.utils";
import { XSetup, getJsonData } from "../../lib/XUtils";
import ChatGPTConversation from "../../lib/ChatGPTConversation";
import { Socket } from "socket.io";

const start_chatHandler = (data: undefined, socket: Socket) => {
    console.log("Received connection to start_chat");

    const current_user = socket.user;

    const chat = new ChatGPTConversation({
        systemPrompt: conversation.systemPrompt(current_user!),
        socket,
    });

    const onResponse = async (response: string) => {
        socket.emit("chat_response_data", {
            response,
        });

        // const data = await chat.getData(conversation.dataPrompt);

        const data = await getJsonData(conversation.dataPrompt, chat, socket);
        if (data.navigateTo) {
            socket.emit("navigate", data.navigateTo);
        }
    };

    const updateContext = (context: Context) => {
        chat.chatHistory[0].content = conversation.systemPrompt(
            current_user!,
            context
        );
    };

    const onMessageX = async ({
        message,
        context,
    }: {
        message: string;
        context?: Context;
    }) => {
        if (context) updateContext(context);
    };

    const handleError = (reason: string) =>
        `We were unable to process your message, as it was flagged for violating our usage guidelines.
            WARNING: X will remember this decision.

                - ${reason}

            Learn more about our *guidelines*
    `;

    XSetup({
        chat,
        socket,
        channel: "chat",
        onResponse,
        onMessageX,
        handleError,
    });
};

export default start_chatHandler;
