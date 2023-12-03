import connectionHandler from "./connection.handler";
import { Server } from "socket.io";
import deserialiseUser from "./middleware/deserialiseUser";

const socketHandler = (io: Server) => {
    io.use(deserialiseUser);

    io.on("connection", connectionHandler);
};

export default socketHandler;
