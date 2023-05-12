import deserialiseUser from "./middleware/deserialiseUser";
import connectionHandler from "./connection.handler";
import { Server } from "socket.io";

const socketHandler = (io: Server) => {
    io.use(deserialiseUser);

    io.on("connection", connectionHandler);
};

export default socketHandler;
