const express = require("express");
const app = express();
const next = require("next");
const axios = require("axios");
const FormData = require("form-data");
const { Readable } = require("stream");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

require("dotenv").config();
const XLesson = require("./utils/lesson.utils.js");
const { Socket } = require("socket.io");

(async () => {
    const { ChatGPTAPI } = await import("chatgpt");
    global.api = new ChatGPTAPI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const cors = require("cors");
    const dev = true;

    app.use(express.json());
    app.use(cors());

    const server = require("http").createServer(app);
    const io = require("socket.io")(server, {
        cors: { origin: "*", methods: ["GET", "POST"] },
    });

    /*
    GLOBAL WHISPER CONFIG

    */
    const whisperConfig = {
        model: "whisper-1",
        language: 'en',
    };

    const whisperApiEndpoint = `https://api.openai.com/v1/audio/transcriptions`;

    const { generateChatCompletion } = require("./utils/chatgpt.utils.");
    const { generateHeavyPrompt } = require("./utils/prompts.utils.js");

    const mock_user = require("./mock_data/user.json");
    const mock_lesson = require("./mock_data/lesson.json");

    //Serve next.js
    // const handle = next({ dev }).getRequestHandler();
    // app.use('*', handle);

    try {
        io.on("connection", (socket) => {
            var current_user = mock_user;
            console.log("Socket connected");
            
            socket.on('error', () => {
                console.log("econreset");
            });
            
            socket.on("authenticate", (data) => {
                console.log("Socket authenticated");
    
                /*
                Whisper streaming api
                */
    
                socket.on("transcribe_audio", ({ file }) => {
                    console.log("Received audio");
                    // console.log("file:", file);
                    const body = new FormData();
                    body.append("file", file, "transcription.webm");
    
                    for (key of Object.keys(whisperConfig)) {
                        body.append(key, whisperConfig[key]);
                    }
    
                        const headers = {
                            "Content-Type": "multipart/form-data",
                            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                        };
                        
                        axios
                        .post(
                            whisperApiEndpoint,
                            body,
                            {
                                headers,
                            }
                        )
                        .then(response => {
                            // console.log(response);
                            socket.emit("transcribed_audio", response.data.text);
                        })
                        .catch(error => {
                            console.log("error:", error.response);
                            // console.log("error data:", error.data);
                            socket.disconnect();
                        })
                    
                });
    
                /*
                Lessons API
                */
    
                socket.on("start_lesson", async (data) => {
                    console.log("Received connection to start_lesson");
    
                    const current_lesson = mock_lesson;
                    const lesson = new XLesson({
                        lesson: current_lesson,
                        student: current_user,
                    });
                    socket.emit("lesson_info", current_lesson);
                    lesson.chat.messageEmitter.on(
                        "message",
                        (message) =>
                            message &&
                            socket.emit("lesson_response_stream", message)
                    );
    
                    const completeChat = async ({ message, first }) => {
                        const { learningObjective, finished, content } =
                            await lesson.continueConversation(message);
    
                        socket.emit("lesson_response_data", {
                            learningObjective: first ? -1 : learningObjective,
                            response: content,
                        });
    
                        if (finished) socket.emit("lesson_finished", true);
                    };
    
                    completeChat({ first: true });
    
                    socket.on("lesson_message_x", async (message) => {
                        completeChat({ message });
                        // lesson.continueConversation(message);
                    });
                });
            });
        });
    } catch (error) {
        console.log(error);
    }

    /*
At the end of your response return a JSON object containing these values:
Return a json message containing two keys: "Finished" which describes whether or not the lesson is done, and "LearningObjective" which contains a number corresponding to theLearningObjective the student will be on from now on.
*/

    server.listen(3001, () => {
        console.log("Started listening on port 3001");
    });
})();
