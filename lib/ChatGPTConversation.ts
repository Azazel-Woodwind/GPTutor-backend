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
    constructor({ systemPrompt, chatHistory, socket, tokenUsage = true }) {
        this.chatHistory = chatHistory || [
            { role: "system", content: systemPrompt },
        ];
        this.tokenUsage = tokenUsage;
        this.systemPrompt = systemPrompt;
        this.messageEmitter = new EventEmitter();
        this.socket = socket;
        // console.log("SYSTEM PROMPT:", systemPrompt);
        socket.currentUsage = socket.currentUsage
            ? socket.currentUsage + tokenizer.encode(systemPrompt).text.length
            : tokenizer.encode(systemPrompt).text.length;
    }

    async getData(dataPrompt?) {
        await this.checkExceededTokenQuota();
        console.log("GETTING JSON DATA");
        // tries to get json data a maximum of 5 times
        let count = 0,
            json;
        do {
            const { content } = await this.generateChatCompletion(dataPrompt, {
                system: true,
                silent: true,
                temperature: 0,
            });
            console.log("Json data:", content, "end of json data");
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

    async generateResponse(message, id, first) {
        await this.checkExceededTokenQuota();

        if (message) this.chatHistory.push({ role: "user", content: message });

        var response = await this.generateChatCompletion(undefined, {
            system: false,
            silent: false,
            id,
            first,
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

            const body = {
                model: "gpt-3.5-turbo",
                messages: message
                    ? [
                          ...this.chatHistory,
                          {
                              role: opts.system ? "system" : "user",
                              content: message,
                          },
                      ]
                    : this.chatHistory,
                stream: true,
                temperature: opts.temperature || 0.7,
            };
            // console.log("body:", body.messages);

            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            };

            const url = "https://api.openai.com/v1/chat/completions";

            this.abortController = new AbortController();

            let currentSentence = "";

            let counter = 0;
            fetchSSE(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                signal: this.abortController.signal,
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
                                    delta.content.includes("!") ||
                                    delta.content.includes("\n")
                                ) {
                                    currentSentence = currentSentence.trim();
                                    if (currentSentence) {
                                        this.messageEmitter.emit(
                                            "generate_audio",
                                            {
                                                text: currentSentence,
                                                order: counter++,
                                                id: opts.id,
                                                first: opts.first,
                                            }
                                        );
                                    }

                                    currentSentence = "";
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
}

export default ChatGPTConversation;
