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
