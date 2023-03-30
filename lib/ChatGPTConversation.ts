// @ts-nocheck
import EventEmitter from "events";
import { fetchSSE } from "./fetch-sse/fetch-sse";
import GPT3Tokenizer from "gpt3-tokenizer";

const tokenizer = new GPT3Tokenizer({ type: "gpt3" });

class ChatGPTConversation {
    constructor({
        heavyPrompt,
        chatHistory = [{ role: "system", content: heavyPrompt }],
    }) {
        this.chatHistory = chatHistory;
        this.heavyPrompt = heavyPrompt;
        this.usage = tokenizer.encode(heavyPrompt).text.length;
        this.messageEmitter = new EventEmitter();
    }

    generateChatCompletion = async (message: string | undefined, opts) => {
        console.log("Generating chat completion: ", message, opts);
        if (message?.length)
            this.usage += tokenizer.encode(message).text.length;

        return new Promise(async (resolve, reject) => {
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

            fetchSSE(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                // signal: abortSignal,
                onMessage: data => {
                    // console.log("data:", data);
                    if (data === "[DONE]") {
                        result.content = result.content.trim();
                        return resolve({
                            role: result.role,
                            content: result.content,
                        });
                    }

                    this.usage += 1;
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
    };
}

export default ChatGPTConversation;
