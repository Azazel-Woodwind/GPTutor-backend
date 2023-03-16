const express = require("express");
const app = express();
const next = require('next');
require("dotenv").config()

const cors = require("cors");
const dev = true;

app.use(express.json());
app.use(cors());

const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: '*', methods: ["GET", "POST"]}});

const { generateChatCompletion } = require("./utils/chatgpt.utils.");
const { generateHeavyPrompt } = require("./utils/prompts.utils.js");

const mock_user = require("./mock_data/user.json");
const mock_lesson = require("./mock_data/lesson.json");

//Serve next.js
// const handle = next({ dev }).getRequestHandler();
// app.use('*', handle);

io.on('connection', socket => {

    var user;
    console.log("Socket connected")
    socket.on('authenticate', data => {
        
        console.log("Socket authenticated");

        socket.on('startLesson', async data => {
            console.log("Received connection to start_lesson")
            const chatHistory = [];
            const { lesson } = { lesson: mock_lesson};
            const heavyPrompt = generateHeavyPrompt(mock_user, mock_lesson);
            // const heavyPrompt = "You are a helpful assistant"

            const sendIntroduction = async () => {
                const data = await generateChatCompletion(chatHistory, heavyPrompt);
                console.log(data)
                socket.emit("x_response",{ response: data.response, learningObjective: -1});
            }

            sendIntroduction();
            socket.emit("lesson_info", lesson);
        
            socket.on("message_x", async (message) => {
                console.log("Message:", message)
                chatHistory.push({
                    role: "user",
                    content: message,
                });
        
                const { response, learningObjective, finished } =
                   await generateChatCompletion(chatHistory, heavyPrompt);
                
                // const { response, learningObjective, finished } = { response: 'ez?', learningObjective: 1, finished: false};
                socket.emit("x_response", { response, learningObjective});
                
                // console.log(chatHistory);
                if (finished) {
                    socket.emit("finished_lesson")
                }
            });
        })

    })

})

/*
At the end of your response return a JSON object containing these values:
Return a json message containing two keys: "Finished" which describes whether or not the lesson is done, and "LearningObjective" which contains a number corresponding to theLearningObjective the student will be on from now on.
*/

server.listen(3001, () => {
    console.log("Started listening on port 3001")
})