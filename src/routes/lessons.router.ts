import { Router } from "express";

import requireAccessLevel, {
    ADMIN_ACCESS_LEVEL,
    STUDENT_ACCESS_LEVEL,
    TEACHER_ACCESS_LEVEL,
} from "../middleware/requireAccessLevel";
import {
    getLessonsHandler,
    createLessonHandler,
    deleteLessonHandler,
    updateLessonHandler,
} from "../controllers/lessons.controller";

/***************************** For Form Data ******************************/

const router = Router();

router
    .route("/")
    .get(requireAccessLevel(ADMIN_ACCESS_LEVEL), getLessonsHandler)
    .post(requireAccessLevel(STUDENT_ACCESS_LEVEL), createLessonHandler);

router
    .route("/:id")
    .delete(requireAccessLevel(ADMIN_ACCESS_LEVEL), deleteLessonHandler)
    .put(requireAccessLevel(ADMIN_ACCESS_LEVEL), updateLessonHandler);

export default router;
