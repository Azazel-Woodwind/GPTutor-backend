import { TextToSpeechClient } from "@google-cloud/text-to-speech";

export const ttsClient = new TextToSpeechClient();

type AudioEncoding =
    | "LINEAR16"
    | "AUDIO_ENCODING_UNSPECIFIED"
    | "MP3"
    | "OGG_OPUS"
    | "MULAW"
    | "ALAW"
    | null
    | undefined;

type Request = {
    audioConfig: {
        audioEncoding: AudioEncoding;
        effectsProfileId: string[];
        pitch: number;
        speakingRate: number;
    };
    input: {
        text: string;
    };
    voice: {
        languageCode: string;
        name: string;
    };
};

const sampleRate = 24000; // Replace this with your actual sample rate
const bitDepth = 16; // Replace this with your actual bit depth
const bytesPerSample = bitDepth / 8;

const request: Request = {
    audioConfig: {
        audioEncoding: "LINEAR16",
        effectsProfileId: ["small-bluetooth-speaker-class-device"],
        pitch: 0,
        speakingRate: 1,
    },
    input: {
        text: "",
    },
    voice: {
        languageCode: "en-GB",
        name: "en-GB-Neural2-D",
    },
};

export async function getAudioData(text: string) {
    console.log("CONVERTING TO SPEECH DATA:", text);
    request.input.text = text;
    const [response] = await ttsClient.synthesizeSpeech(request);
    // console.log("response:", response);
    if (!response.audioContent) {
        throw new Error("No audio content found");
    }

    if (typeof response.audioContent === "string") {
        throw new Error("Audio content is a string");
    }

    const totalSamples = response.audioContent.length / bytesPerSample;
    const durationInSeconds = totalSamples / sampleRate;

    // console.log(typeof response.audioContent === "string");

    // @ts-ignore
    // the "base64" argument causes a compilation error but it is needed and works.
    // no idea why its not a valid argument
    const base64 = response.audioContent.toString("base64");

    return { audioContent: base64, duration: durationInSeconds };
}
