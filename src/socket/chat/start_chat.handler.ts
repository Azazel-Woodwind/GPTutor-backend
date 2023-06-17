import { XSetup } from "../../lib/XUtils";
import ChatGPTConversation, {
    ChatResponse,
} from "../../lib/ChatGPTConversation";
import { Socket } from "socket.io";
import { conversation } from "../../prompts/conversation.prompts";

const start_chatHandler = (data: undefined, socket: Socket) => {
    console.log("Received connection to start_chat");

    const current_user = socket.user;

    const chat = new ChatGPTConversation({
        systemPrompt: conversation.systemPrompt(current_user!),
        socket,
    });

    const onResponse = async ({ content, data }: ChatResponse) => {
        socket.emit("chat_response_data", {
            response: content,
        });

        // const data = await chat.getData(conversation.dataPrompt);

        // const data = await getJsonData(
        //     conversation.dataPrompt(chat.chatHistory.slice(1)),
        //     chat,
        //     socket
        // );
        // if (data.navigateTo) {
        //     socket.emit("navigate", data.navigateTo);
        // }
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
        start: true,
    });
};

export default start_chatHandler;
