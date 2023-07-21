import { EventEmitter } from "events";
import { fetchSSE } from "./fetch-sse/fetch-sse";
import { findJsonInString } from "./XUtils";
import supabase from "../config/supa";
import { exceededTokenQuota, incrementUsage } from "./XUtils";
import { Socket } from "socket.io";
import { encoding_for_model } from "@dqbd/tiktoken";
import { generateDataPrompt } from "../prompts/data.prompts";

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

class ChatGPTConversation {
    tokenUsage: boolean;
    messageEmitter: EventEmitter;
    socket: Socket;
    systemPrompt: string | undefined;
    chatHistory: Message[];
    abortController: AbortController | undefined;
    first: boolean = true;

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
        this.first = true;
    }

    cleanUp() {
        this.messageEmitter.removeAllListeners();
        this.abortController?.abort();
    }

    reset(newSystemPrompt: string) {
        this.chatHistory = [{ role: "system", content: newSystemPrompt }];
        this.systemPrompt = newSystemPrompt;
        // this.socket.currentUsage = this.socket.currentUsage
        //     ? this.socket.currentUsage +
        //       tokenizer.encode(newSystemPrompt).text.length
        //     : tokenizer.encode(newSystemPrompt).text.length;
    }

    async getData(dataPrompt?: string) {
        await this.checkExceededTokenQuota();
        console.log("GETTING JSON DATA");
        let count = 0;
        let json;
        do {
            const response = await this.generateChatCompletion({
                message: dataPrompt,
                silent: true,
                temperature: 0,
            });
            console.log("Json data:", response, "end of json data");
            json = findJsonInString(response.content);

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
        // dataPrompt,
        ...opts
    }: {
        message?: string;
        // dataPrompt?: {
        //     definitions: { [key: string]: string };
        //     start?: boolean;
        // };
        [key: string]: any;
    } = {}): Promise<string> {
        await this.checkExceededTokenQuota();

        if (message) this.chatHistory.push({ role: "user", content: message });

        const response = await this.generateChatCompletion({
            message,
            // dataPrompt,
            ...defaultOps,
            ...opts,
        });

        this.chatHistory.push({
            role: response.role,
            content: response.rawContent!,
        });
        // console.log(JSON.stringify(this.chatHistory, null, 2));

        return response.content;
    }

    private async generateChatCompletion({
        message,
        // dataPrompt,
        ...opts
    }: {
        message?: string;
        // dataPrompt?: {
        //     definitions: { [key: string]: string };
        //     start?: boolean;
        // };
        [key: string]: any;
    }): Promise<Message> {
        if (this.systemPrompt === undefined) {
            throw new Error("System prompt not set");
        }

        const encoding = encoding_for_model("gpt-3.5-turbo");

        if (this.first) {
            this.socket.currentUsage = this.socket.currentUsage
                ? this.socket.currentUsage +
                  encoding.encode(this.systemPrompt).length
                : encoding.encode(this.systemPrompt).length;

            this.first = false;
        }

        if (message?.length && this.socket.currentUsage)
            this.socket.currentUsage += encoding.encode(message).length;

        encoding.free();

        return new Promise(async (resolve, reject) => {
            const result = {
                role: "assistant",
                content: "",
                rawContent: "",
            };

            const body = {
                model: "gpt-4",
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
                temperature: opts.temperature || 1,
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
            let first = true;
            let responseData = "";
            let fullResponse = "";
            fetchSSE(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                signal: this.abortController.signal,
                onMessage: async (data: any) => {
                    if (data === "[DONE]") {
                        this.messageEmitter.emit("end");
                        result.content = result.content.trim();
                        result.rawContent = fullResponse;
                        if (this.tokenUsage) {
                            // console.log(
                            //     "SOCKET USAGE:",
                            //     this.socket.currentUsage
                            // );
                            await incrementUsage(
                                this.socket.user!.id,
                                this.socket.currentUsage!
                            );
                            this.socket.currentUsage = 0;
                        }
                        console.log("RESPONSE:", result);
                        console.log("FULL RESPONSE:", fullResponse);
                        return resolve(result);
                    }

                    this.socket.currentUsage! += 1;
                    try {
                        const response = JSON.parse(data);
                        if (!response?.choices?.length) return;

                        const delta = response.choices[0].delta;

                        if (!delta?.content) return;

                        fullResponse += delta.content;

                        // console.log("DELTA:", delta.content);

                        if (delta.content.trim() === '"""') {
                            if (!inData) {
                                inData = true;
                            } else {
                                inData = false;
                                console.log("DATA:", responseData);
                                this.messageEmitter.emit(
                                    "data",
                                    JSON.parse(responseData)
                                );
                                responseData = "";
                            }

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

                            this.messageEmitter.emit("message", {
                                delta: delta.content,
                                first,
                            });
                            first = false;
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
    }
}

export default ChatGPTConversation;
