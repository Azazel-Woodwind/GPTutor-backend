import cors from "cors";
import express, { Express } from "express";
import deserialiseUser from "./middleware/deserialiseUser";
import apiRouter from "./routes/api.router";
import socketHandler from "./socket/socket.handler";
import { Server } from "socket.io";

const app: Express = express();

app.use(deserialiseUser);

app.use(express.json());

const corsOptions = {
    origin: "https://app.xtutor.ai",
    optionsSuccessStatus: 200,
};

if (process.env.NODE_ENV === "development") {
    app.use(cors());
} else {
    app.use(cors(corsOptions));
}

app.use("/", apiRouter);

const server = require("http").createServer(app);
const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents
>(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

socketHandler(io);

export default server;
