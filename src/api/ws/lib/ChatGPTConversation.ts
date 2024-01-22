import { EventEmitter } from "events";
import { fetchSSE } from "./fetchServerSentEvent";
import supabase from "../../../config/supa";
import { Socket } from "socket.io";
import { encoding_for_model } from "@dqbd/tiktoken";
import { exceededTokenQuota, incrementUsage } from "../../../utils/service";
import { containsSentenceEnder } from "../../../utils/general";

const defaultChatCompletionOptions = {
    initialDataSeparator: [`"""`],
    terminalDataSeparator: [`"""`],
    silent: false,
    audio: false,
    temperature: 0.7,
    stopOnData: false,
};

/**
 * Represents a conversation session with ChatGPT.
 *
 * This class provides methods to start, manage, and reset conversations. It also takes into account
 * the user's token quota and usage and throws an error if the user has exceeded their token quota.
 *
 * It contains a message emitter that emits events for tokens, sentences and data.
 */
class ChatGPTConversation {
    useTokenUsage: boolean;
    messageEmitter: EventEmitter;
    socket: Socket;
    systemPrompt: string | undefined;
    chatHistory: Message[];
    abortController: AbortController | undefined;
    first: boolean = true;

    /**
     * Creates an instance of ChatGPTConversation.
     * @param {Object} config - The configuration object for ChatGPTConversation.
     * @param {string} [config.systemPrompt] - The system prompt to be used for the conversation session.
     * @param {Message[]} [config.chatHistory] - The initial chat history for the conversation session.
     * @param {Socket} config.socket - The socket instance for the user's current session.
     * @param {boolean} [config.useTokenUsage=true] - A boolean value indicating whether to increment the user's token usage.
     */
    constructor({
        systemPrompt,
        chatHistory,
        socket,
        useTokenUsage = true,
    }: {
        systemPrompt?: string;
        chatHistory?: Message[];
        socket: any;
        useTokenUsage?: boolean;
    }) {
        this.chatHistory =
            chatHistory ||
            (systemPrompt ? [{ role: "system", content: systemPrompt! }] : []);
        this.useTokenUsage = useTokenUsage;
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

    /**
     * Checks if the user has exceeded their token quota.
     *
     * If the user has exceeded their token quota, an error is thrown.
     */
    async checkExceededTokenQuota() {
        const exceeded = await exceededTokenQuota(
            this.socket.user!.id,
            this.socket.user!.usage_plans!.max_daily_tokens
        );

        if (this.useTokenUsage && exceeded) {
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

    /**
     * Generates a response for a given message.
     *
     * @param {Object} config - The options object for ChatGPTConversation::generateResponse
     * @param {string} [opts.message] - The message to be sent to the GPT model in the current conversation session.
     * @param {string[]} [opts.initialDataSeparator=['"""']] - An array of tokens that, when received by the GPT model consecutively,
     * mark the beginning of data being sent by the model.
     * @param {string[]} [opts.terminalDataSeparator=['"""']] - An array of tokens that, when received by the GPT model consecutively,
     * mark the end of data being sent by the model.
     * @param {boolean} [opts.silent=false] - A boolean value indicating whether to emit events for tokens, sentences and data.
     * @param {number} [opts.temperature=0.7] - The temperature to be used for the next GPT request.
     * @param {boolean} [opts.stopOnData=false] - A boolean value indicating whether to stop the conversation session when data is received.
     * @returns {Promise<string>} - A promise that resolves to the generated response.
     */
    async generateResponse({
        message,
        ...opts
    }: {
        message?: string;
        initialDataSeparator?: string[];
        terminalDataSeparator?: string[];
        silent?: boolean;
        temperature?: number;
        stopOnData?: boolean;
    } = {}): Promise<string> {
        await this.checkExceededTokenQuota();

        if (message) this.chatHistory.push({ role: "user", content: message });

        const response = await this.generateChatCompletion({
            message,
            ...defaultChatCompletionOptions,
            ...opts,
        });

        this.chatHistory.push({
            role: response.role,
            content: response.rawContent!,
        });

        return response.content;
    }

    /**
     * Generates a response for a given message and sends it to the user.
     * See https://platform.openai.com/docs/api-reference/chat for information on the request and response formats.
     *
     * Paramaters are the same as ChatGPTConversation::generateResponse
     * @returns {Promise<void>}
     */
    private async generateChatCompletion({
        message,
        ...opts
    }: {
        message?: string;
        initialDataSeparator: string[];
        terminalDataSeparator: string[];
        silent: boolean;
        temperature: number;
        stopOnData: boolean;
    }): Promise<Message> {
        if (this.systemPrompt === undefined) {
            throw new Error("System prompt not set");
        }

        const encoding = encoding_for_model("gpt-4");

        if (this.first) {
            // if this is the first message, add the number of tokens in the system prompt to the user's current usage
            this.socket.currentUsage = this.socket.currentUsage
                ? this.socket.currentUsage +
                  encoding.encode(this.systemPrompt).length
                : encoding.encode(this.systemPrompt).length;

            this.first = false;
        }

        if (message?.length && this.socket.currentUsage)
            // adds number of tokens in message to user's current usage
            this.socket.currentUsage += encoding.encode(message).length;

        encoding.free();

        return new Promise(async (resolve, reject) => {
            const result = {
                role: "assistant",
                content: "",
                rawContent: "",
            };

            const body = {
                model: process.env.MODEL_NAME,
                messages: this.chatHistory,
                stream: true,
                temperature: opts.temperature,
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
            let initialDataSeparatorIndex = 0; // index of the next token to be matched in the initial data separator array.
            // This marks how far we are in matching the initial data separator.
            let terminalDataSeparatorIndex = 0; // same as above but for terminal data separator

            fetchSSE(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                updateAbortController: fetchOptions => {
                    if (fetchOptions) {
                        this.abortController = new AbortController();
                        fetchOptions.signal = this.abortController.signal;
                    }
                },
                abort: reason => {
                    this.abortController!.abort(reason);
                },
                onMessage: async (data: any) => {
                    if (data === "[DONE]") {
                        // if the model is done generating the response
                        result.content = result.content.trim();
                        result.rawContent = fullResponse;
                        this.messageEmitter.emit("end", {
                            response: result.content,
                        });
                        if (this.useTokenUsage) {
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
                        // delta.content contains the next token in the response

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
                            // if the current token matches the next token in the initial data separator array
                            if (
                                initialDataSeparatorIndex ===
                                opts.initialDataSeparator.length - 1
                            ) {
                                // if the current token is the last token in the initial data separator array
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
                                // store the current token in a temporary buffer as it may be a false match
                                initialDataSeparatorIndex++;
                            }

                            return;
                        } else if (initialDataSeparatorIndex > 0) {
                            // if there was a false match
                            console.log(
                                "Fake initial separator match:",
                                tempBuffer
                            );
                            console.log(
                                `Should be ${opts.initialDataSeparator[initialDataSeparatorIndex]} but is ${delta.content}`
                            );
                            delta.content = tempBuffer + delta.content; // correct the delta content to include the false match
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
                                // if the current token is the last token in the terminal data separator array (end of data)
                                console.log("TERMINAL DATA SEPARATOR MATCHED");
                                inData = false;
                                terminalDataSeparatorIndex = 0;
                                tempBuffer = "";
                                // console.log("DATA:", responseData);
                                try {
                                    // try to parse the data as JSON and emit the data event
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

                        if (!opts?.silent) {
                            this.messageEmitter.emit("delta", {
                                delta: delta.content,
                                first,
                            });

                            currentSentence += delta.content;
                            if (
                                currentSentence.trim() &&
                                containsSentenceEnder(delta.content)
                            ) {
                                // if we have reached the end of a sentence
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
