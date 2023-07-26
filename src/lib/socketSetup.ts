import { Socket } from "socket.io";
import ChatGPTConversation from "./ChatGPTConversation";
import DelayedBuffer from "./DelayedBuffer";
import OrderMaintainer from "./OrderMaintainer";
import { getAudioData } from "./tts.utils";
import { STREAM_END_MESSAGE, STREAM_SPEED } from "./constants";

export async function eventEmitterSetup({
    chat,
    socket,
    streamChannel,
    onResponseData,
    onReceiveAudioData,
    onMessage,
    delay = 0,
    sendEndMessage,
    generateAudio = true,
}: {
    chat: ChatGPTConversation;
    socket: Socket;
    streamChannel: string;
    onResponseData?: (data: any) => void;
    dataChannel?: string;
    sendEndMessage?: boolean;
    onReceiveAudioData?: (data: any) => void;
    onMessage?: (message: string) => void;
    delay?: number;
    generateAudio?: boolean;
}) {
    const buffer = new DelayedBuffer(
        async (data: any) => {
            if (typeof data !== "string") {
                onResponseData && onResponseData(data);
                return;
            }

            onMessage ? onMessage(data) : socket.emit(streamChannel, data);
        },
        delay,
        STREAM_SPEED
    );

    chat.messageEmitter.on("sentence", data => {
        if (!socket.user?.req_audio_data) return;
        getAudioData(data.text)
            .then(audioData => {
                onReceiveAudioData &&
                    onReceiveAudioData({
                        ...audioData,
                        ...data,
                        type: "sentence",
                    });
            })
            .catch(err => console.log(err));
    });

    chat.messageEmitter.on("delta", data => {
        onReceiveAudioData && onReceiveAudioData({ ...data, type: "delta" });
    });

    chat.messageEmitter.on("data", data => {
        onReceiveAudioData && onReceiveAudioData({ ...data, type: "data" });
    });

    chat.messageEmitter.on("end", data => {
        onReceiveAudioData && onReceiveAudioData({ ...data, type: "end" });
    });
}

type ContinueConversationParams = {
    message?: string;
    first?: boolean;
    chat: ChatGPTConversation;
    socket: Socket;
    onResponse: (response: string, first?: boolean) => void;
    channel: string;
    handleError?: (reason: string) => string;
    currentResponseId?: string;
    delay?: number;
};

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
    onResponse: (response: string, first?: boolean) => void;
    handleError?: (reason: string) => string;
    start?: boolean;
    onResponseData?: (data: any) => void;
};

export async function XSetup(params: XSetupParams) {
    const { chat, socket, channel, onMessageX, start, onResponseData } = params;
    const delay = 0;

    let currentResponseId: undefined | string = undefined;

    const orderMaintainer = new OrderMaintainer({
        callback: (data: any) => {
            // socket.emit(`${channel}_audio_data`, data);
            socket.emit(`${channel}_instruction`, data);
        },
    });

    eventEmitterSetup({
        chat,
        socket,
        streamChannel: `${channel}_response_stream`,
        dataChannel: `${channel}_data`,
        sendEndMessage: true,
        onResponseData,
        onReceiveAudioData: data => {
            if (!data.first && data.id !== currentResponseId) return;

            // console.log("CONVERTED TO SPEECH DATA:", text);
            orderMaintainer.addData(data, data.order);
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
    onResponse,
    currentResponseId,
}: ContinueConversationParams) {
    try {
        const response = await chat.generateResponse({
            message,
            id: currentResponseId,
            first,
            temperature: 1,
            audio: true,
        });
        onResponse && onResponse(response, first);
    } catch (error) {
        console.log(error);
    }
}
