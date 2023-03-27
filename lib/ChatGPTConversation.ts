const { getJsonDataPrompt } = require("./prompts.utils");
const EventEmitter = require("events");

const { fetchSSE } = require("./fetch-sse/fetch-sse");

class ChatGPTConversation {
    constructor({
        heavyPrompt,
        chatHistory = [{ role: "system", content: heavyPrompt }],
    }) {
        this.chatHistory = chatHistory;
        this.heavyPrompt = heavyPrompt;
        this.messageEmitter = new EventEmitter();
    }

    async generateChatCompletion(message, opts) {
        return new Promise((resolve, reject) => {
            const result = {
                role: "assistant",
                content: "",
            };

            const body = {
                model: "gpt-3.5-turbo",
                messages: message
                    ? [...this.chatHistory, message]
                    : this.chatHistory,
                stream: true,
            };

            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            };

            const url = "https://api.openai.com/v1/chat/completions";

            console.log(body);

            fetchSSE(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                // signal: abortSignal,
                onMessage: (data) => {
                    // console.log("data:", data);
                    if (data === "[DONE]") {
                        result.content = result.content.trim();
                        return resolve({
                            role: result.role,
                            content: result.content,
                        });
                    }

                    try {
                        const response = JSON.parse(data);

                        if (response.id) result.id = response.id;

                        if (response?.choices?.length) {
                            const delta = response.choices[0].delta;
                            result.delta = delta.content;
                            if (delta?.content) result.content += delta.content;
                            result.detail = response;

                            if (delta.role) {
                                result.role = delta.role;
                            }

                            if (!opts?.silent) {
                                this.messageEmitter.emit(
                                    "message",
                                    delta.content
                                );
                            }

                            opts?.onProgress?.(result);
                        }
                    } catch (err) {
                        console.warn(
                            "OpenAI stream SEE event unexpected error",
                            err
                        );
                        return reject(err);
                    }
                },
            });
        });
    }
}

module.exports = { ChatGPTConversation };
