import { supabase } from "../..config/supa.js";
import transcribeAudioHandler from "./transcribe_audio.handler";
import textDataHandler from "./text_data.handler";
import startLessonHandler from "./start_lesson/start_lesson.handler";
import generateQuizHandler from "./generate_quiz.handler";

const handleAuthenticate = async (data, socket) => {
    const { token } = data;
    console.log("Socket authenticated");
    console.log(token);

    await supabase.auth.getUser(token).then(async response => {
        console.log(response.data);
        if (!response?.data?.user) return socket.emit("authenticated", false);
        socket.user = response?.data?.user;
        socket.emit("authenticated", true);
        console.log(socket.user);
        /*
            Whisper streaming api
        */

        socket.on("transcribe_audio", data =>
            transcribeAudioHandler(data, socket)
        );

        /*
            Google speech to text
        */

        socket.on(
            "text_data",
            async data => await textDataHandler(data, socket)
        );
        /*
            Lessons API
        */

        socket.on("start_lesson", data => startLessonHandler(data, socket));

        socket.on("generate_quiz", data => generateQuizHandler(data, socket));
    });
};

export default handleAuthenticate;
