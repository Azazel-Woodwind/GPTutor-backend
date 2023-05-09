import cors from "cors";
import express, { Express } from "express";
import deserialiseUser from "./middleware/deserialiseUser";
import apiRouter from "./routes/api.router";
import socketHandler from "./socket/socket.handler";
import formidableMiddleware from "express-formidable";
import path from "path";

const app: Express = express();

app.use(deserialiseUser);

app.use(express.json());
app.use(
    formidableMiddleware({
        encoding: "utf-8",
        multiples: true, // req.files to be an array of files
    })
);

app.use(cors());

app.use(express.static("public"));

app.use("/api", apiRouter);

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

socketHandler(io);

export default server;
