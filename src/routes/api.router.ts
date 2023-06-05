import { Router } from "express";
import lessonsRouter from "./lessons.router";
import waitListRouter from "./waitingList.router";
import usersRouter from "./users.router";

const router = Router();

//health check
router.get("/", (req, res) => {
    res.status(200).send("Hello World!");
});

router.use("/lessons", lessonsRouter);
router.use("/waiting-list", waitListRouter);
router.use("/users", usersRouter);

export default router;
