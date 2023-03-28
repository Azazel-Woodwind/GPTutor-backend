// @ts-nocheck
import {
    getAllLessons,
    createLesson,
    updateLesson,
    deleteLesson,
} from "../controllers/lessons/lessonsController";
import { Router } from "express";
const router = Router();
import formidableMiddleware from "express-formidable";

/***************************** For Form Data ******************************/
router.use(
    formidableMiddleware({
        encoding: "utf-8",
        multiples: true, // req.files to be arrays of files
    })
);

/***************************** Get All Lesson ******************************/

router.get("/", getAllLessons);

/***************************** Create Lesson ******************************/

router.post("/", createLesson);

/***************************** Update Single Lesson ******************************/

router.put("/:id", updateLesson);

/***************************** Update Single Lesson ******************************/

router.delete("/:id", deleteLesson);

export default router;
