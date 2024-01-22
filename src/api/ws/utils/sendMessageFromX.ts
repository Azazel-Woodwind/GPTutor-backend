import { Socket } from "socket.io";
import { STREAM_SPEED } from "../lib/constants";
import { io } from "../../server";
import OrderMaintainer from "../lib/OrderMaintainer";
import { getAudioData } from "./tts";
import { containsSentenceEnder } from "../../../utils/general";

export async function sendMessageFromX({
    channel,
    socket,
    message,
    messageData,
    endData,
    audio = true,
}: {
    channel: string;
    socket: Socket;
    message: string;
    messageData?: any;
    endData?: any;
    audio?: boolean;
}) {
    console.log("SENDING MESSAGE:", message);
    const emitter = socket.sessionID ? io.to(socket.sessionID) : socket;
    return new Promise<void>(async resolve => {
        if (!audio) {
            for (const char of message) {
                emitter.emit(`${channel}_instruction`, {
                    delta: char,
                    type: "delta",
                    ...messageData,
                });
                await new Promise(resolve => setTimeout(resolve, STREAM_SPEED));
            }
            emitter.emit(`${channel}_instruction`, {
                type: "end",
                response: message,
                ...endData,
            });
            return resolve();
        }

        const orderMaintainer = new OrderMaintainer({
            callback: (data: any) => {
                emitter.emit(`${channel}_instruction`, data);
                if (data.type === "end") {
                    console.log("RESOLVING");
                    resolve();
                }
            },
        });

        let front = 0;
        let rear = 0;
        let order = 0;
        for (let char of message) {
            // console.log(char);
            if (containsSentenceEnder(char)) {
                const substring = message.slice(front, rear + 1);
                console.log("SUBSTRING:", substring);
                if (substring.trim()) {
                    let substringOrder = order++;
                    getAudioData(substring).then(audioData => {
                        orderMaintainer.addData(
                            {
                                ...audioData,
                                text: substring,
                                type: "sentence",
                                ...messageData,
                            },
                            substringOrder
                        );
                    });

                    front = rear + 1;
                }
            }

            rear++;
        }

        orderMaintainer.addData(
            {
                type: "end",
                response: message,
                ...endData,
            },
            order++
        );
    });
}
