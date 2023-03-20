const { TextToSpeechClient } = require("@google-cloud/text-to-speech");

const ttsClient = new TextToSpeechClient();

const SsmlVoiceGender = {
    NEUTRAL: "NEUTRAL",
    SSML_VOICE_GENDER_UNSPECIFIED: "SSML_VOICE_GENDER_UNSPECIFIED",
    MALE: "MALE",
    FEMALE: "FEMALE",
};

const AudioEncoding = {
    AUDIO_ENCODING_UNSPECIFIED: "AUDIO_ENCODING_UNSPECIFIED",
    LINEAR16: "LINEAR16",
    MP3: "MP3",
    OGG_OPUS: "OGG_OPUS",
};

module.exports = {
    ttsClient,
    SsmlVoiceGender,
    AudioEncoding,
}