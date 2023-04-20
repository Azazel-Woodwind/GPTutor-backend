// @ts-nocheck
import FormData from "form-data";
import axios from "axios";

const transcribe_audioHandler = ({ file }, socket) => {
    console.log("Received audio");
    // const file = data.file;
    const whisperApiEndpoint = `https://api.openai.com/v1/audio/transcriptions`;
    const whisperConfig = {
        model: "whisper-1",
        language: "en",
        temperature: 0,
    };
    // console.log("file:", file);

    const body = new FormData();
    body.append("file", file, "speech.webm");

    for (let key of Object.keys(whisperConfig)) {
        body.append(key, whisperConfig[key]);
    }

    const headers = {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    };

    console.log("BODY:", body);

    axios
        .post(whisperApiEndpoint, body, {
            headers,
        })
        .then(response => {
            socket.emit("transcribed_audio", response.data.text);
        })
        .catch(error => {
            console.log("error:", error.response);
            // console.log("error data:", error.data);
            socket.disconnect();
        });
};

export default transcribe_audioHandler;
