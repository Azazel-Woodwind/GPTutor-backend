// @ts-nocheck

import fs from "fs";
import mockUser from "../../mock_data/mockuser.json";
import XConversation from "../../lib/XConversation";

import {
    systemPromptIntroduction,
    systemPromptEnding,
} from "../../lib/prompts.utils";

const start_chatHandler = (data, socket) => {
    console.log("Received connection to start_chat");

    const current_user = socket.user;

    //This isn't the correct user fix this shit

    const XChat = new XConversation({ user: current_user });

    XChat.chat.messageEmitter.on(
        "message",
        message => message && socket.emit("chat_response_stream", message)
    );

    const completeChat = async ({ message }) => {
        const { content } = await XChat.continueConversation(message);
        socket.emit("chat_response_data", {
            response: content,
        });

        //Update the token amount on the users account
    };

    completeChat({ message: undefined });
    socket.on("chat_message_x", async message => {
        if (!message) return;
        completeChat({ message });
    });
};

export default start_chatHandler;
