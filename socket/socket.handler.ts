import authenticationHandler from "./authenticate.handler";
import connectionHandler from "./connection.handler";

const socketHandler = io => {
    io.use(authenticationHandler);

    io.on("connection", connectionHandler);
};

export default socketHandler;
