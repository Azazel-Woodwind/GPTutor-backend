import supabase from "../../config/supa";
import startLessonSchema from "../schema/start_lesson.schema";
import { XLesson } from "./XLesson";

const start_lessonHandler = async (data, socket) => {
    // try {
    //     startLessonSchema.parse(data);
    // } catch (error) {
    //     socket.emit("start_lesson_error", error.issues);
    //     return;
    // }

    const { current_lesson } = data;
    console.log("Received connection to start_lesson");
    // console.log("Lesson ID:", lessonID);

    // const { data: current_lesson, error } = await supabase
    //     .from("lessons")
    //     .select("*, learning_objectives(title, images(link, description))")
    //     .eq("id", lessonID)
    //     .single();

    // if (error) {
    //     console.log(error);
    //     socket.emit("start_lesson_error", error);
    //     return;
    // }

    console.log("Current lesson:", current_lesson);

    const current_user = socket.user;

    const lesson = new XLesson({
        lesson: current_lesson,
        student: current_user,
        socket,
    });
};

export default start_lessonHandler;
