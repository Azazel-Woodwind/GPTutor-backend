import deserialiseUser from "./middleware/deserialiseUser";
import connectionHandler from "./connection.handler";

const socketHandler = io => {
    io.use(deserialiseUser);

    io.on("connection", connectionHandler);
};

export default socketHandler;
