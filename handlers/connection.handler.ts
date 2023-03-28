// @ts-nocheck
import authenticateHandler from "./authenticate/authenticate.handler";

const handleConnection = socket => {
    console.log("Socket connected");

    socket.on("authenticate", data => {
        authenticateHandler(data, socket);
    });
};

export default handleConnection;
