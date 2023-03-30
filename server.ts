import cors from "cors";
import fs from "fs";
import express, { Express } from "express";
import apiRouter from "./routes/api";
import socketHandler from "./socket/socket.handler";

const app: Express = express();

app.use(express.json());
app.use(cors());
app.use("/api", apiRouter);

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

socketHandler(io);

export default server;
