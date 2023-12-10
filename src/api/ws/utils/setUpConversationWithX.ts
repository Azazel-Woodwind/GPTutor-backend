import { Socket } from "socket.io";
import { io } from "../../server";
import OrderMaintainer from "../../../lib/OrderMaintainer";
import ChatGPTConversation from "../../../lib/ChatGPTConversation";
import { getAudioData } from "./tts";

export async function setUpConversationWithX({
    chat,
    socket,
    channel,
    onMessageX,
    start,
    onInstruction,
    onExit,
}: {
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
    handleError?: (reason: string) => string;
    start?: boolean;
    onInstruction?: (data: any) => void;
    onExit?: () => void;
}) {
    const orderMaintainer = new OrderMaintainer({
        callback:
            onInstruction ||
            ((data: any) => {
                // socket.emit(`${channel}_audio_data`, data);
                if (socket.sessionID) {
                    io.to(socket.sessionID).emit(
                        `${channel}_instruction`,
                        data
                    );
                } else {
                    console.log("EMITTING INSTRUCTION:", data);
                    socket.emit(`${channel}_instruction`, data);
                }
            }),
    });

    let order = 0;

    chat.messageEmitter.on("sentence", async data => {
        if (!socket.user?.req_audio_data) return;
        const currentOrder = order++;

        getAudioData(data.text)
            .then(audioData => {
                data = {
                    ...audioData,
                    ...data,
                };
                orderMaintainer.addData(
                    { ...data, type: "sentence" },
                    currentOrder
                );
            })
            .catch(error => {
                console.log(error);
            });
    });

    chat.messageEmitter.on("delta", async data => {
        if (socket.user?.req_audio_data) return;

        orderMaintainer.addData({ ...data, type: "delta" }, order++);
    });

    for (let instructionType of ["data", "end"]) {
        chat.messageEmitter.on(instructionType, async data => {
            orderMaintainer.addData(
                { ...data, type: instructionType },
                order++
            );
        });
    }

    socket.on(`${channel}_message_x`, async data => {
        order = 0;
        const { message } = data;
        orderMaintainer.reset();

        console.log("received message: ", message);

        await chat.generateResponse({
            message,
        });

        onMessageX && onMessageX(data);
    });

    socket.on(`${channel}_exit`, () => {
        onExit?.();
        console.log(`${channel}_exit`);

        chat.cleanUp();
        socket.removeAllListeners(`${channel}_message_x`);
        socket.removeAllListeners(`${channel}_exit`);
    });

    if (start) {
        await chat.generateResponse();
    }
}
