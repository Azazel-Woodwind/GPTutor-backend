import { Socket } from "socket.io";
import ChatGPTConversation, { ChatResponse } from "./ChatGPTConversation";
import DelayedBuffer from "./DelayedBuffer";
import OrderMaintainer from "./OrderMaintainer";
import { getAudioData } from "./tts.utils";

type XSetupParams = {
    chat: ChatGPTConversation;
    socket: Socket;
    channel: string;
    onMessageX?: ({
        message,
        context,
    }: {
        message: string;
        context: Context;
    }) => void;
    onResponse: (response: ChatResponse, first?: boolean) => void;
    handleError?: (reason: string) => string;
    start?: boolean;
};

export async function eventEmitterSetup({
    chat,
    socket,
    streamChannel,
    onReceiveAudioData,
    onMessage,
    delay = 0,
    sendEndMessage,
    generateAudio = true,
}: {
    chat: ChatGPTConversation;
    socket: Socket;
    streamChannel: string;
    sendEndMessage?: boolean;
    onReceiveAudioData?: (data: any) => void;
    onMessage?: (message: string) => void;
    delay?: number;
    generateAudio?: boolean;
}) {
    const speed = 35;
    const buffer = new DelayedBuffer(
        async (delta: string) => {
            onMessage ? onMessage(delta) : socket.emit(streamChannel, delta);
        },
        delay,
        speed
    );

    chat.messageEmitter.on("message", ({ delta, first }) => {
        if (delta) {
            if (first) {
                buffer.reset();
            }
            // buffer.addData(delta);
            for (const char of delta) {
                buffer.addData(char);
            }
        }
    });

    if (sendEndMessage) {
        chat.messageEmitter.on("end", () => {
            const endString = "[END]";
            buffer.addData(endString);
        });
    }

    if (generateAudio) {
        chat.messageEmitter.on(
            "generate_audio",
            ({ text, order, id, first }) => {
                if (!socket.user?.req_audio_data) return;
                getAudioData(text)
                    .then(base64 => {
                        onReceiveAudioData &&
                            onReceiveAudioData({ base64, order, id, first });
                    })
                    .catch(err => console.log(err));
            }
        );
    }
}

type ContinueConversationParams = {
    message?: string;
    first?: boolean;
    chat: ChatGPTConversation;
    socket: Socket;
    onResponse: (response: ChatResponse, first?: boolean) => void;
    channel: string;
    handleError?: (reason: string) => string;
    currentResponseId?: string;
    delay?: number;
};

export async function XSetup(params: XSetupParams) {
    const { chat, socket, channel, onMessageX, start } = params;
    const delay = 700;

    let currentResponseId: undefined | string = undefined;

    const orderMaintainer = new OrderMaintainer({
        callback: (data: any) => {
            socket.emit(`${channel}_audio_data`, data);
        },
    });

    eventEmitterSetup({
        chat,
        socket,
        streamChannel: `${channel}_response_stream`,
        sendEndMessage: true,
        onReceiveAudioData: ({ base64, order, id, first }) => {
            if (!first && id !== currentResponseId) return;

            // console.log("CONVERTED TO SPEECH DATA:", text);
            orderMaintainer.addData(
                {
                    audio: base64,
                    first,
                    id,
                    order,
                },
                order
            );
        },
        delay,
    });

    socket.on(`${channel}_message_x`, ({ message, context, id }) => {
        orderMaintainer.reset();
        currentResponseId = id;

        console.log("received message: ", message);

        onMessageX && onMessageX({ message, context });
        continueConversation({
            message,
            currentResponseId,
            ...params,
        });
    });

    socket.on(`${channel}_exit`, () => {
        console.log(`${channel}_exit`);

        chat.cleanUp();
        socket.removeAllListeners(`${channel}_message_x`);
        socket.removeAllListeners(`${channel}_exit`);
    });

    if (start) {
        continueConversation({
            ...params,
            first: true,
        });
    }
}

export async function continueConversation({
    message,
    first,
    chat,
    socket,
    onResponse,
    channel,
    handleError,
    currentResponseId,
    delay,
}: ContinueConversationParams) {
    try {
        // let valid, reason;
        // if (!first) {
        //     ({ valid, reason } = await checkUserMessageGuidelines(
        //         socket,
        //         message as string
        //     ));
        // }

        // if (valid || first) {
        const response = await chat.generateResponse({
            message,
            id: currentResponseId,
            first,
            temperature: 1,
        });
        onResponse && onResponse(response, first);
        // if (delay) {
        //     setTimeout(() => {
        //         onResponse && onResponse(response, first);
        //     }, delay);
        // } else {
        //     onResponse && onResponse(response, first);
        // }
        // } else {
        //     socket.emit(
        //         `${channel}_error`,
        //         handleError ? handleError(reason) : reason
        //     );
        // }
    } catch (error) {
        console.log(error);
    }
}
