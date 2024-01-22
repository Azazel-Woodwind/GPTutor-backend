import http from "http";
import app from "./http/app";
import createServer from "./ws/createServer";

const server = http.createServer(app);
export const io = createServer(server);

export default server;
