import { Server } from "socket.io";
import deserialiseUser from "./middleware/deserialiseUser";
import http from "http";
import { ORIGIN } from "./utils/constants";
import connectionHandler from "./connectionHandler";

const createServer = (httpServer: http.Server) => {
    const io = new Server(httpServer, {
        cors: { origin: ORIGIN, methods: ["GET", "POST"] },
    });

    io.use(deserialiseUser);

    io.on("connection", connectionHandler);

    return io;
};

export default createServer;
