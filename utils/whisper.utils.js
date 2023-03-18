const onWhispered = useMemoAsync(
    async (file: File) => {
        // Whisper only accept multipart/form-data currently
        const body = new FormData();
        body.append("file", file);
        body.append("model", "whisper-1");
        if (mode === "transcriptions") {
            body.append("language", whisperConfig?.language ?? "en");
        }
        if (whisperConfig?.prompt) {
            body.append("prompt", whisperConfig.prompt);
        }
        if (whisperConfig?.response_format) {
            body.append("response_format", whisperConfig.response_format);
        }
        if (whisperConfig?.temperature) {
            body.append("temperature", `${whisperConfig.temperature}`);
        }
        const headers: RawAxiosRequestHeaders = {};
        headers["Content-Type"] = "multipart/form-data";
        if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
        }
        const { default: axios } = await import("axios");
        const response = await axios.post(whisperApiEndpoint + mode, body, {
            headers,
        });
        return response.data.text;
    },
    [apiKey, mode, whisperConfig]
);

module.exports = {
    onWhispered,
};
