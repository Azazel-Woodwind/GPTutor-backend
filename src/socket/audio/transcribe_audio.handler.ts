import FormData from "form-data";
import axios from "axios";
import { Socket } from "socket.io";

type ChannelData = {
    file: File;
    final: boolean;
    id: string;
};

const transcribe_audioHandler = (data: ChannelData, socket: Socket) => {
    const file = data.file;
    console.log("Received audio");
    if (data.final) {
        console.log("RECEIVED FINAL AUDIO");
    }
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
        body.append(key, whisperConfig[key as keyof typeof whisperConfig]);
    }

    const headers = {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    };

    // console.log("BODY:", body);

    axios
        .post(whisperApiEndpoint, body, {
            headers,
        })
        .then(response => {
            // console.log("TRANSCRIBED AUDIO:", response.data.text);
            socket.emit("transcribed_audio", {
                transcription: response.data.text,
                final: data.final,
                id: data.id,
            });
        })
        .catch(error => {
            console.log("error:", error.response);
            // console.log("error data:", error.data);
            socket.disconnect();
        });
};

export default transcribe_audioHandler;
