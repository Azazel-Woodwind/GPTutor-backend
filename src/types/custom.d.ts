declare global {
    namespace Express {
        interface Request {
            user?: Partial<User>;
        }
    }
}

declare module "socket.io" {
    interface Socket {
        user?: User;
        currentUsage?: number;
        sessionID?: string;
    }
}

export {};
