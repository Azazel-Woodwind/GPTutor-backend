export async function getAudioData(text: string) {
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
            "xi-api-key": process.env.ELEVEN_LABS_API_KEY,
        },
        body: JSON.stringify({
            model_id: "eleven_multilingual_v2",
            text,
            voice_settings: {
                similarity_boost: 0.75,
                stability: 0.5,
                style: 0,
            },
        }),
    };

    const res = await fetch(
        "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb",
        options
    );
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    return { audioContent: base64 };
}
