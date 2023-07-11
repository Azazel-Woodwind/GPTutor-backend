import ChatGPTConversation, {
    ChatResponse,
} from "../../lib/ChatGPTConversation";
import { Socket } from "socket.io";
import { conversation } from "../../prompts/conversation.prompts";
import { XSetup } from "../../lib/socketSetup";
import * as introductionPrompts from "../../prompts/introduction.prompts";
import { streamChatResponse, streamString } from "../../lib/XUtils";

const start_chatHandler = (data: any, socket: Socket) => {
    console.log("Received connection to start_chat");

    const current_user = socket.user;
    const newUser = data.new;

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

    if (newUser) {
        console.log("New user, sending introduction");

        let response: string | undefined;
        socket.on(`chat_message_x`, ({ message }) => {
            console.log("Received message from user, continuing introduction");

            response = message;
            streamChatResponse({
                string: introductionPrompts
                    .response1(current_user!.first_name)
                    .trim(),
                socket,
                streamChannel: "chat_response_stream",
                audioChannel: "chat_audio_data",
            });
        });

        socket.on(`chat_moved_to_lessons`, async () => {
            console.log("User moved to hub, continuing introduction");

            streamChatResponse({
                string: introductionPrompts
                    .response1Continuation(current_user!.first_name)
                    .trim(),
                socket,
                streamChannel: "chat_response_stream",
                audioChannel: "chat_audio_data",
            });

            updateChatHistory({
                chat,
                response: response!,
                name: current_user!.first_name,
            });

            socket.removeAllListeners(`chat_message_x`);
            socket.removeAllListeners(`chat_moved_to_lessons`);

            XSetup({
                chat,
                socket,
                channel: "chat",
                onResponse,
                onMessageX,
                handleError,
                start: false,
            });
        });

        streamChatResponse({
            string: introductionPrompts
                .introduction(current_user!.first_name)
                .trim(),
            socket,
            streamChannel: "chat_response_stream",
            audioChannel: "chat_audio_data",
        });
    } else {
        XSetup({
            chat,
            socket,
            channel: "chat",
            onResponse,
            onMessageX,
            handleError,
            start: true,
        });
    }
};

function updateChatHistory({
    chat,
    response,
    name,
}: {
    chat: ChatGPTConversation;
    response: string;
    name: string;
}) {
    chat.chatHistory.push(
        {
            role: "assistant",
            content: introductionPrompts.introduction(name),
        },
        {
            role: "user",
            content: response,
        },
        {
            role: "assistant",
            content: introductionPrompts.response1(name),
        }
    );
}

export default start_chatHandler;
