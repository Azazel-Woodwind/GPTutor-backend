import cors from "cors";
import express, { Express } from "express";
import deserialiseUser from "./middleware/deserialiseUser";
import apiRouter from "./routes/api.router";
import socketHandler from "./socket/socket.handler";
import { Server } from "socket.io";

const app: Express = express();

app.use(deserialiseUser);

app.use(express.json());

const origin =
    process.env.NODE_ENV === "development"
        ? process.env.FRONTEND_DEVELOPMENT_ORIGIN
        : process.env.FRONTEND_PRODUCTION_ORIGIN;
app.use(cors({ origin }));

app.use("/", apiRouter);

const server = require("http").createServer(app);
export const io = new Server(server, {
    cors: { origin, methods: ["GET", "POST"] },
});

socketHandler(io);

export default server;
