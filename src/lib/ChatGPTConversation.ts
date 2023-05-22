import { EventEmitter } from "events";
import { fetchSSE } from "./fetch-sse/fetch-sse";
import GPT3Tokenizer from "gpt3-tokenizer";
import { findJsonInString } from "./XUtils";
import supabase from "../config/supa";
import { exceededTokenQuota, incrementUsage } from "./XUtils";
import { Socket } from "socket.io";
import { dataSeparator } from "../prompts/lessons.prompts";

const tokenizer = new GPT3Tokenizer({ type: "gpt3" });

interface ConstructorParams {
    systemPrompt?: string;
    chatHistory?: Message[];
    socket: any;
    tokenUsage?: boolean;
}

const defaultOps = {
    system: false,
    silent: false,
};

export type ChatResponse = {
    content: string;
    data: string[];
};

export type ChatCompletion = {
    response: Message;
    data: string[];
};

class ChatGPTConversation {
    tokenUsage: boolean;
    messageEmitter: EventEmitter;
    socket: Socket;
    systemPrompt: string | undefined;
    chatHistory: Message[];
    abortController: AbortController | undefined;

    constructor({
        systemPrompt,
        chatHistory,
        socket,
        tokenUsage = true,
    }: ConstructorParams) {
        this.chatHistory =
            chatHistory ||
            (systemPrompt ? [{ role: "system", content: systemPrompt! }] : []);
        this.tokenUsage = tokenUsage;
        this.systemPrompt = systemPrompt;
        this.messageEmitter = new EventEmitter();
        this.socket = socket;
        if (systemPrompt)
            socket.currentUsage = socket.currentUsage
                ? socket.currentUsage +
                  tokenizer.encode(systemPrompt).text.length
                : tokenizer.encode(systemPrompt).text.length;
    }

    cleanUp() {
        this.messageEmitter.removeAllListeners();
        this.abortController?.abort();
    }

    reset(newSystemPrompt: string) {
        this.chatHistory = [{ role: "system", content: newSystemPrompt }];
        this.systemPrompt = newSystemPrompt;
        this.socket.currentUsage = this.socket.currentUsage
            ? this.socket.currentUsage +
              tokenizer.encode(newSystemPrompt).text.length
            : tokenizer.encode(newSystemPrompt).text.length;
    }

    async getData(dataPrompt?: string) {
        await this.checkExceededTokenQuota();
        console.log("GETTING JSON DATA");
        let count = 0;
        let json;
        do {
            const {
                response: { content },
            } = await this.generateChatCompletion(dataPrompt, {
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
            this.socket.user!.id,
            this.socket.user!.usage_plans!.max_daily_tokens
        );

        if (this.tokenUsage && exceeded) {
            const { data, error } = await supabase
                .from("usage_plans")
                .select("max_daily_tokens")
                .eq("plan", this.socket.user!.usage_plan)
                .single();

            this.socket.emit("token_quota", {
                usage: this.socket.user!.daily_token_usage,
                plan: this.socket.user!.usage_plan,
                limit: data?.max_daily_tokens,
            });

            throw new Error("token quota");
        }
    }

    async generateResponse({
        message,
        ...opts
    }: {
        message?: string;
        [key: string]: any;
    }): Promise<ChatResponse> {
        await this.checkExceededTokenQuota();

        if (message) this.chatHistory.push({ role: "user", content: message });

        const { response, data } = await this.generateChatCompletion(
            undefined,
            {
                ...defaultOps,
                ...opts,
            }
        );

        this.chatHistory.push(response);

        return {
            content: response.content,
            data,
        };
    }

    generateChatCompletion = async (
        message: string | undefined,
        opts: any
    ): Promise<ChatCompletion> => {
        if (!this.systemPrompt) {
            throw new Error("System prompt not set");
        }

        if (message?.length && this.socket.currentUsage)
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
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            };

            const url = "https://api.openai.com/v1/chat/completions";

            this.abortController = new AbortController();

            let currentSentence = "";

            let counter = 0;

            let inData = false;
            let responseData = "";
            // console.log("HISTORY:", this.chatHistory);
            fetchSSE(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                signal: this.abortController.signal,
                onMessage: async (data: any) => {
                    if (data === "[DONE]") {
                        result.content = result.content.trim();
                        if (this.tokenUsage) {
                            await incrementUsage(
                                this.socket.user!.id,
                                this.socket.currentUsage!
                            );
                            this.socket.currentUsage = 0;
                        }
                        console.log("RESPONSE:", result);
                        console.log("DATA:", responseData);
                        return resolve({
                            response: result,
                            data: responseData.split("\n").filter(Boolean),
                        });
                    }

                    this.socket.currentUsage! += 1;
                    try {
                        const response = JSON.parse(data);
                        if (!response?.choices?.length) return;

                        const delta = response.choices[0].delta;

                        if (!delta?.content) return;

                        if (delta.content === dataSeparator) {
                            inData = true;
                            return;
                        }

                        if (inData) {
                            responseData += delta.content;
                            return;
                        }

                        result.content += delta.content;

                        if (delta.role) {
                            result.role = delta.role;
                        }

                        opts?.onProgress?.(result);

                        if (!opts?.silent) {
                            if (!delta.content) return;

                            currentSentence += delta.content;

                            if (
                                delta.content.includes(".") ||
                                delta.content.includes("?") ||
                                delta.content.includes("!") ||
                                delta.content.includes("\n")
                            ) {
                                currentSentence = currentSentence.trim();
                                if (currentSentence) {
                                    this.messageEmitter.emit("generate_audio", {
                                        text: currentSentence,
                                        order: counter++,
                                        id: opts.id,
                                        first: opts.first,
                                    });
                                }

                                currentSentence = "";
                            }

                            this.messageEmitter.emit("message", delta.content);
                        }
                    } catch (err) {
                        console.warn(
                            "OpenAI stream SEE event unexpected error",
                            err
                        );

                        return reject(err);
                    }
                },
            }).catch((err: any) => console.log("err:", err));
        });
    };
}

export default ChatGPTConversation;
