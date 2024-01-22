import { Socket } from "socket.io";
import crypto from "crypto";

export default function joinUniqueRoom(
    socket: Socket,
    channelName: string,
    lessonID: string
) {
    const sessionID = `${channelName}-${socket.user!.id}-${lessonID}-${crypto
        .randomBytes(4)
        .toString("hex")}`;

    socket.join(sessionID);
    socket.sessionID = sessionID;

    return sessionID;
}
