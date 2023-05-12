import cors from "cors";
import express, { Express } from "express";
import deserialiseUser from "./middleware/deserialiseUser";
import apiRouter from "./routes/api.router";
import socketHandler from "./socket/socket.handler";
import { Server } from "socket.io";

const app: Express = express();

app.use(deserialiseUser);

app.use(express.json());

app.use(cors());

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
