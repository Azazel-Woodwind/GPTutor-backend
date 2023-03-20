const handleConnection = (socket) => {
    console.log("Socket connected");

    socket.on("authenticate", (data) => {
        require("./authenticate/authenticate.handler")(data, socket);
    });
};

module.exports = handleConnection;
