const express = require("express");
const app = express();
const handleConnection = require("./handlers/connection.handler.");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

require("dotenv").config();

app.use(express.json());
app.use(cors());

app.post("/api/lessons", async (req, res) => {
    try {
        if (fs.existsSync("temp_data/lessons.json")) {
            console.log(JSON.stringify(req.body, null, 2));
            const lessons = JSON.parse(
                fs.readFileSync("temp_data/lessons.json", "utf8")
            );
            const lessonID = uuidv4();
            req.body.id = lessonID;
            lessons[lessonID] = req.body;
            fs.writeFileSync("temp_data/lessons.json", JSON.stringify(lessons));
            res.status(201).json("Lesson created");
        } else {
            fs.mkdirSync("temp_data");
            const lessons = {};
            const lessonID = uuidv4();
            req.body.id = lessonID;
            lessons[lessonID] = req.body;
            fs.writeFileSync("temp_data/lessons.json", JSON.stringify(lessons));

            res.status(201).json("Lesson created");
        }
    } catch {
        res.status(500).json("Error creating lesson");
    }
});

app.get("/api/lessons", async (req, res) => {
    try {
        const lessons = JSON.parse(
            fs.readFileSync("temp_data/lessons.json", "utf8")
        );
        console.log(lessons);
        res.status(200).json(lessons);
    } catch {
        res.status(500).json("Error getting lessons");
    }
});

app.delete("/api/lessons/:id", async (req, res) => {
    try {
        const lessons = JSON.parse(
            fs.readFileSync("temp_data/lessons.json", "utf8")
        );
        delete lessons[req.params.id];
        fs.writeFileSync("temp_data/lessons.json", JSON.stringify(lessons));
        res.status(200).json("Lesson deleted");
    } catch {
        res.status(500).json("Error deleting lesson");
    }
});

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

try {
    io.on("connection", (socket) => {
        handleConnection(socket);
    });
} catch (error) {
    console.log(error);
}

server.listen(3001, () => {
    console.log("Started listening on port 3001");
});
