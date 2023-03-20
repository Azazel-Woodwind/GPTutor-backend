const handleAuthenticate = (data, socket) => {
    console.log("Socket authenticated");
    socket.emit("authenticated", true);

    /*
                Whisper streaming api
                */

    socket.on("transcribe_audio", (data) => {
        require("./transcribe_audio.handler")(data, socket);
    });

    /*
                Google speech to text
                */

    socket.on("text_data", async (data) => {
        await require("./text_data.handler")(data, socket);
    });

    /*
                Lessons API
                */

    socket.on("start_lesson", (data) => {
        require("./start_lesson/start_lesson.handler")(data, socket);
    });
};

module.exports = handleAuthenticate;
