// @ts-nocheck
import EventEmitter from "events";
import { fetchSSE } from "./fetch-sse/fetch-sse";
import GPT3Tokenizer from "gpt3-tokenizer";
import { findJsonInString } from "./XUtils";
import supabase from "../config/supa";
import { ttsClient, SsmlVoicegender, AudioEncoding } from "./tts.utils";

const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
import { exceededTokenQuota, incrementUsage } from "./XUtils";

class ChatGPTConversation {
    constructor({ heavyPrompt, chatHistory = [], socket, tokenUsage = true }) {
        this.chatHistory = chatHistory;
        this.tokenUsage = tokenUsage;
        this.heavyPrompt = heavyPrompt;
        this.messageEmitter = new EventEmitter();
        this.socket = socket;
        socket.currentUsage = tokenizer.encode(heavyPrompt).text.length;
    }

    async getData(dataPrompt) {
        await this.checkExceededTokenQuota();

        // tries to get json data a maximum of 5 times
        let count = 0,
            json;
        do {
            const { content } = await this.generateChatCompletion(dataPrompt, {
                system: true,
                silent: true,
            });
            json = findJsonInString(content);
            count++;
        } while (!json && count < 5);

        if (!json) return false;

        return json;
    }

    async checkExceededTokenQuota() {
        const exceeded = await exceededTokenQuota(
            this.socket.user.id,
            this.socket.user.usage_plans.max_daily_tokens
        );

        if (this.tokenUsage && exceeded) {
            const { data, error } = await supabase
                .from("usage_plans")
                .select("max_daily_tokens")
                .eq("plan", this.socket.user.usage_plan)
                .single();

            this.socket.emit("token_quota", {
                usage: this.socket.user.daily_token_usage,
                plan: this.socket.user.usage_plan,
                limit: data.max_daily_tokens,
            });

            throw new Error("token quota");
        }
    }

    async generateResponse(message) {
        await this.checkExceededTokenQuota();

        if (message) this.chatHistory.push({ role: "user", content: message });

        var response = await this.generateChatCompletion(undefined, {
            system: false,
            silent: false,
        });

        this.chatHistory.push(response);

        return response.content;
    }

    generateChatCompletion = async (message: string | undefined, opts) => {
        if (message?.length)
            this.socket.currentUsage += tokenizer.encode(message).text.length;

        return new Promise(async (resolve, reject) => {
            const result = {
                role: "assistant",
                content: "",
            };

            const systemMessage = { role: "system", content: this.heavyPrompt };
            const userMessage = {
                role: opts?.system ? "system" : "user",
                content: message,
            };
            var messages = message
                ? [systemMessage, ...this.chatHistory, userMessage]
                : [systemMessage, ...this.chatHistory];

            const body = {
                model: "gpt-3.5-turbo",
                messages,
                stream: true,
            };

            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            };

            const url = "https://api.openai.com/v1/chat/completions";

            let currentSentence = "";

            fetchSSE(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                // signal: abortSignal,
                onMessage: async data => {
                    // console.log("data:", data);
                    if (data === "[DONE]") {
                        result.content = result.content.trim();
                        if (this.tokenUsage) {
                            await incrementUsage(
                                this.socket.user.id,
                                this.socket.currentUsage
                            );
                            this.socket.currentUsage = 0;
                        }

                        if (currentSentence.length > 0) {
                            const audio = await this.getAudioData(
                                currentSentence
                            );
                            this.messageEmitter.emit("message", {
                                text: currentSentence,
                                audio,
                            });
                        }

                        return resolve({
                            role: result.role,
                            content: result.content,
                        });
                    }

                    this.socket.currentUsage += 1;
                    try {
                        const response = JSON.parse(data);

                        if (response.id) result.id = response.id;

                        if (response?.choices?.length) {
                            const delta = response.choices[0].delta;
                            result.delta = delta.content;
                            if (delta?.content) {
                                result.content += delta.content;
                            }
                            result.detail = response;

                            if (delta.role) {
                                result.role = delta.role;
                            }

                            opts?.onProgress?.(result);

                            if (!opts?.silent) {
                                if (!delta.content) return;

                                currentSentence += delta.content;
                                // console.log(
                                //     "currentSentence:",
                                //     currentSentence
                                // );

                                if (
                                    delta.content.includes(".") ||
                                    delta.content.includes("?") ||
                                    delta.content.includes("!")
                                ) {
                                    const temp = currentSentence;
                                    currentSentence = "";
                                    this.getAudioData(temp);
                                }
                                // console.log("delta.content:", delta.contents);

                                this.messageEmitter.emit(
                                    "message",
                                    delta.content
                                );
                            }
                        }
                    } catch (err) {
                        console.warn(
                            "OpenAI stream SEE event unexpected error",
                            err
                        );

                        return reject(err);
                    }
                },
            }).catch(err => console.log("err:", err));
        });
    };

    async getAudioData(text) {
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

        try {
            console.log("CONVERTING TO SPEECH DATA:", text);

            const [response] = await ttsClient.synthesizeSpeech(request);
            // console.log("response:", response);
            const base64 = response.audioContent.toString("base64");

            this.messageEmitter.emit("audioData", base64);
        } catch (error) {
            console.log(error);
        }
    }
}

export default ChatGPTConversation;
