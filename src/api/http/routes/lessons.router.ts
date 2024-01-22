import { Router } from "express";

import {
    getLessonsHandler,
    deleteLessonHandler,
    updateLessonHandler,
    getLessonHandler,
    createLessonHandler,
    patchLessonHandler,
} from "../controllers/lessons.controller";
import requireAccessLevel from "../middleware/requireAccessLevel";
import { ADMIN_ACCESS_LEVEL } from "../utils/constants";

const router = Router();

router
    .route("/")
    .get(requireAccessLevel(ADMIN_ACCESS_LEVEL), getLessonsHandler)
    .post(requireAccessLevel(ADMIN_ACCESS_LEVEL), createLessonHandler);

router
    .route("/:id")
    .get(requireAccessLevel(ADMIN_ACCESS_LEVEL), getLessonHandler)
    .delete(requireAccessLevel(ADMIN_ACCESS_LEVEL), deleteLessonHandler)
    .put(requireAccessLevel(ADMIN_ACCESS_LEVEL), updateLessonHandler)
    .patch(requireAccessLevel(ADMIN_ACCESS_LEVEL), patchLessonHandler);

export default router;
