const {
    ttsClient,
    SsmlVoiceGender,
    AudioEncoding,
} = require("../../utils/tts.utils");

const text_dataHandler = async (data, socket) => {
    console.log("Received text data");
    console.log(data);
    const request = {
        input: {
            text: data,
        },
        voice: {
            languageCode: "en-GB",
            ssmlGender: SsmlVoiceGender.NEUTRAL,
        },
        audioConfig: {
            audioEncoding: AudioEncoding.MP3,
            // speakingRate: 0.5,
        },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    // console.log("response:", response);
    const base64 = response.audioContent.toString("base64");

    socket.emit("audio_data", base64);
};

module.exports = text_dataHandler;
