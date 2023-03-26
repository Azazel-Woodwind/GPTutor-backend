const express = require("express");
const app = express();
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

require("dotenv").config();

app.use(express.json());
app.use(cors());

const handleConnection = require("./handlers/connection.handler.");

const superAdminLogin = require("./routes/superAdminLogin");
const auth = require("./routes/auth");
const login = require("./routes/login");
const resetPassword = require("./routes/resetPassword");
const superAdminSignUp = require("./routes/superAdminSignUp");
const adminSignUp = require("./routes/adminSignUp");
const adminLogin = require("./routes/adminLogin");
const lessons = require("./routes/lessons");
const waitList = require("./routes/waitList");
const quiz = require("./routes/quiz");

// app.use("/api/admin-sign-up", superAdminAuth);
// app.use("/api/admin-login", superAdminLogin);
app.use("/api/register", auth);
app.use("/api/login", login);
app.use("/api/reset-password", resetPassword);
app.use("/api/super-admin-sign-up", superAdminSignUp);
app.use("/api/super-admin-login", superAdminLogin);
app.use("/api/admin-sign-up", adminSignUp);
app.use("/api/admin-login", adminLogin);
app.use("/api/reset-password", resetPassword);
app.use("/api/lessons", lessons);
app.use("/api/wait-list", waitList);
app.use("/api/quiz", quiz);

app.post("/api/test/lessons", async (req, res) => {
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

app.get("/api/test/lessons", async (req, res) => {
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

app.delete("/api/test/lessons/:id", async (req, res) => {
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
    io.on("connection", socket => {
        
        handleConnection(socket);
    });
} catch (error) {
    console.log(error);
}

server.listen(3001, () => {
    console.log("Started listening on port 3001");
});
