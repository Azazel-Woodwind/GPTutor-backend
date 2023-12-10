import { Router } from "express";
import lessonsRouter from "./lessons.router";
import waitListRouter from "./waitingList.router";
import usersRouter from "./users.router";

const router = Router();

router.use("/lessons", lessonsRouter);
router.use("/waiting-list", waitListRouter);
router.use("/users", usersRouter);

export default router;
