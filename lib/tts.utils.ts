// @ts-nocheck
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

export const ttsClient = new TextToSpeechClient();

export const SsmlVoiceGender = {
    NEUTRAL: "NEUTRAL",
    SSML_VOICE_GENDER_UNSPECIFIED: "SSML_VOICE_GENDER_UNSPECIFIED",
    MALE: "MALE",
    FEMALE: "FEMALE",
};

export const AudioEncoding = {
    AUDIO_ENCODING_UNSPECIFIED: "AUDIO_ENCODING_UNSPECIFIED",
    LINEAR16: "LINEAR16",
    MP3: "MP3",
    OGG_OPUS: "OGG_OPUS",
};

export async function getAudioData(text: string) {
    const request = {
        audioConfig: {
            audioEncoding: "LINEAR16",
            effectsProfileId: ["small-bluetooth-speaker-class-device"],
            pitch: 0,
            speakingRate: 1,
        },
        input: {
            text,
        },
        voice: {
            languageCode: "en-GB",
            name: "en-GB-Neural2-D",
        },
    };

    // console.log("CONVERTING TO SPEECH DATA:", text);

    const [response] = await ttsClient.synthesizeSpeech(request);
    // console.log("response:", response);
    const base64 = response.audioContent.toString("base64");

    return base64;
}
