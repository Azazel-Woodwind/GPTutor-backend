// @ts-nocheck

import XConversation from "./XConversation";

const start_chatHandler = (data, socket) => {
    console.log("Received connection to start_chat");

    const current_user = socket.user;
    const XChat = new XConversation({ user: current_user, socket });
};

export default start_chatHandler;
