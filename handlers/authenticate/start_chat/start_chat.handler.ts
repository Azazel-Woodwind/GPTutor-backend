// @ts-nocheck

import fs from "fs";
import mockUser from "../../../mock_data/mockuser.json";

const start_chatHandler = (data, socket) => {
    console.log("Received connection to start_x_chat");

    const current_user = socket.user;

    chat.chat.messageEmitter.on(
        "message",
        message => message && socket.emit("chat_response_stream", message)
    );

    const completeChat = async ({ message, first }) => {
        socket.emit("chat_response_data", {
            learningObjectiveNumber: first ? -1 : learningObjectiveNumber,
            response: content,
        });
    };

    completeChat({ first: true });

    socket.on("chat_message_x", async message => {
        await chat_message_xHandler({ message, completeChat }, socket);
    });
};

export default start_chatHandler;
