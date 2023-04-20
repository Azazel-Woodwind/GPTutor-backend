// @ts-nocheck
import { ttsClient, SsmlVoicegender, AudioEncoding } from "../../lib/tts.utils";

const text_dataHandler = async (data, socket) => {
    const request = {
        audioConfig: {
            audioEncoding: "LINEAR16",
            effectsProfileId: ["small-bluetooth-speaker-class-device"],
            pitch: 0,
            speakingRate: 1,
        },
        input: {
            text: data,
        },
        voice: {
            languageCode: "en-GB",
            name: "en-GB-Neural2-D",
        },
    };

    try {
        const [response] = await ttsClient.synthesizeSpeech(request);
        // console.log("response:", response);
        const base64 = response.audioContent.toString("base64");

        socket.emit("audio_data", base64);
    } catch (error) {
        console.log(error);
    }
};

export default text_dataHandler;
