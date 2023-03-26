const {supabase} = require("../../config/supa.js")

const handleAuthenticate = async (data, socket) => {
    const { token } = data;
    console.log("Socket authenticated");
    console.log(token)
        
    await supabase.auth
    .getUser(token)
    .then(async (response) => {
        console.log(response.data)
        if(!response?.data?.user) return socket.emit("authenticated", false);
        socket.user = response?.data?.user
        socket.emit("authenticated", true); 
        console.log(socket.user);
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
    
        socket.on("generate_quiz", (data) => {
            require("./generate_quiz.handler")(data, socket);
        });

    })
    
}

module.exports = handleAuthenticate;