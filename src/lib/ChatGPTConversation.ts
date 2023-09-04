import { EventEmitter } from "events";
import { fetchSSE } from "./fetch-sse/fetch-sse";
import { findJsonInString } from "./XUtils";
import supabase from "../config/supa";
import { exceededTokenQuota, incrementUsage } from "./XUtils";
import { Socket } from "socket.io";
import { encoding_for_model } from "@dqbd/tiktoken";
import { generateDataPrompt } from "../prompts/data.prompts";
import { reduceEachTrailingCommentRange } from "typescript";

interface ConstructorParams {
    systemPrompt?: string;
    chatHistory?: Message[];
    socket: any;
    tokenUsage?: boolean;
}

type GenerateResponseProps = {
    message?: string;
    initialDataSeparator?: string[];
    terminalDataSeparator?: string[];
    system?: boolean;
    silent?: boolean;
    temperature?: number;
    stopOnData?: boolean;
};

type GenerateChatCompletionProps = {
    message?: string;
    initialDataSeparator: string[];
    terminalDataSeparator: string[];
    system: boolean;
    silent: boolean;
    temperature: number;
    stopOnData: boolean;
};

const defaultOps = {
    initialDataSeparator: [`"""`],
    terminalDataSeparator: [`"""`],
    system: false,
    silent: false,
    audio: false,
    temperature: 0.7,
    stopOnData: false,
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
    }: GenerateResponseProps = {}): Promise<string> {
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
        ...opts
    }: GenerateChatCompletionProps): Promise<Message> {
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
                messages: this.chatHistory,
                stream: true,
                temperature: opts.temperature || 1,
            };

            // console.log("BODY MESSAGES:", body.messages);

            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            };

            const url = "https://api.openai.com/v1/chat/completions";

            this.abortController = new AbortController();

            let currentSentence = "";
            let inData = false;
            let first = true;
            let responseData = "";
            let fullResponse = "";
            let tempBuffer = "";
            let initialDataSeparatorIndex = 0;
            let terminalDataSeparatorIndex = 0;
            fetchSSE(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                signal: this.abortController.signal,
                updateAbortController: fetchOptions => {
                    if (fetchOptions) {
                        this.abortController = new AbortController();
                        fetchOptions.signal = this.abortController!.signal;
                    }
                },
                abort: reason => {
                    this.abortController!.abort(reason);
                },
                onMessage: async (data: any) => {
                    if (data === "[DONE]") {
                        result.content = result.content.trim();
                        result.rawContent = fullResponse;
                        this.messageEmitter.emit("end", {
                            response: result.content,
                        });
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
                        // console.log("RESPONSE:", result);
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

                        if (
                            !inData &&
                            delta.content.trim() ===
                                opts.initialDataSeparator[
                                    initialDataSeparatorIndex
                                ]
                        ) {
                            if (
                                initialDataSeparatorIndex ===
                                opts.initialDataSeparator.length - 1
                            ) {
                                console.log("INITIAL DATA SEPARATOR MATCHED");
                                inData = true;
                                initialDataSeparatorIndex = 0;
                                tempBuffer = "";
                            } else {
                                console.log(
                                    "INITIAL DATA SEPARATOR MATCHING:",
                                    initialDataSeparatorIndex
                                );
                                tempBuffer += delta.content;
                                initialDataSeparatorIndex++;
                            }

                            return;
                        } else if (initialDataSeparatorIndex > 0) {
                            console.log(
                                "Fake initial separator match:",
                                tempBuffer
                            );
                            console.log(
                                `Should be ${opts.initialDataSeparator[initialDataSeparatorIndex]} but is ${delta.content}`
                            );
                            delta.content = tempBuffer + delta.content;
                            initialDataSeparatorIndex = 0;
                            tempBuffer = "";
                        }

                        if (
                            inData &&
                            delta.content.trim() ===
                                opts.terminalDataSeparator[
                                    terminalDataSeparatorIndex
                                ]
                        ) {
                            if (
                                terminalDataSeparatorIndex ===
                                opts.terminalDataSeparator.length - 1
                            ) {
                                console.log("TERMINAL DATA SEPARATOR MATCHED");
                                inData = false;
                                terminalDataSeparatorIndex = 0;
                                tempBuffer = "";
                                // console.log("DATA:", responseData);
                                try {
                                    const data = JSON.parse(responseData);
                                    this.messageEmitter.emit("data", {
                                        ...data,
                                    });
                                } catch (error) {
                                    this.messageEmitter.emit("data", {
                                        data: responseData,
                                    });
                                }
                                responseData = "";
                            } else {
                                console.log(
                                    "INITIAL DATA SEPARATOR MATCHING:",
                                    terminalDataSeparatorIndex
                                );
                                tempBuffer += delta.content;
                                terminalDataSeparatorIndex++;
                            }
                            return;
                        } else if (terminalDataSeparatorIndex > 0) {
                            delta.content = tempBuffer + delta.content;
                            console.log(
                                "Fake terminal separator match:",
                                tempBuffer
                            );
                            console.log(
                                `Should be ${opts.terminalDataSeparator[terminalDataSeparatorIndex]} but is ${delta.content}`
                            );
                            terminalDataSeparatorIndex = 0;
                            tempBuffer = "";
                        }

                        if (inData) {
                            responseData += delta.content;
                            return;
                        }

                        result.content += delta.content;

                        if (delta.role) {
                            result.role = delta.role;
                        }

                        if (!opts?.silent) {
                            this.messageEmitter.emit("delta", {
                                delta: delta.content,
                                first,
                            });

                            currentSentence += delta.content;
                            if (
                                currentSentence.trim() &&
                                (delta.content.includes(".") ||
                                    delta.content.includes("?") ||
                                    delta.content.includes("!") ||
                                    delta.content.includes("\n"))
                            ) {
                                this.messageEmitter.emit("sentence", {
                                    text: currentSentence,
                                });
                                currentSentence = "";
                            }
                        }
                        first = false;
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
