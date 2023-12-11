import { Router } from "express";

import {
    getLessonsHandler,
    deleteLessonHandler,
    updateLessonHandler,
} from "../controllers/lessons.controller";
import requireAccessLevel from "../middleware/requireAccessLevel";
import { ADMIN_ACCESS_LEVEL } from "../utils/constants";

/***************************** For Form Data ******************************/

const router = Router();

router
    .route("/")
    .get(requireAccessLevel(ADMIN_ACCESS_LEVEL), getLessonsHandler);

router
    .route("/:id")
    .delete(requireAccessLevel(ADMIN_ACCESS_LEVEL), deleteLessonHandler)
    .put(requireAccessLevel(ADMIN_ACCESS_LEVEL), updateLessonHandler);

export default router;
