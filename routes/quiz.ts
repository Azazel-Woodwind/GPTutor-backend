// @ts-nocheck
import {
    getAllQuiz,
    addNewQuiz,
    updateQuiz,
    deleteQuiz,
} from "../controllers/quiz/quizController";
import { Router } from "express";
const router = Router();

/***************************** Get All Quiz ******************************/
router.get("/", getAllQuiz);

/***************************** Add New Quiz ******************************/

router.post("/", addNewQuiz);

/***************************** Update  Quiz ******************************/

router.put("/:id", updateQuiz);

/***************************** Delete Quiz ******************************/

router.delete("/:id", deleteQuiz);

export default router;
