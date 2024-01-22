import { Socket } from "socket.io";
import supabase from "../../../config/supa";
import { RealtimePostgresUpdatePayload } from "@supabase/supabase-js";

export default function subscribeToUserUpdates(
    socket: Socket,
    callback: (
        payload: RealtimePostgresUpdatePayload<{
            [key: string]: any;
        }>
    ) => void
) {
    const userInfoChannel = supabase
        .channel(`user-info-${socket.user?.id}`)
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: "users",
                filter: `id=eq.${socket.user?.id}`,
            },
            callback
        )
        .subscribe();

    const authInfoChannel = supabase
        .channel(`auth-info-${socket.user?.id}`)
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "auth",
                table: "users",
                filter: `id=eq.${socket.user?.id}`,
            },
            callback
        )
        .subscribe();

    return () => {
        userInfoChannel.unsubscribe();
        authInfoChannel.unsubscribe();
    };
}
