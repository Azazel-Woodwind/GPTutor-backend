import { Router } from "express";
import {
    addUserToWaitingListHandler,
    getWaitingListUsersHandler,
} from "../controllers/waitingList.controller";
import requireAccessLevel, {
    ADMIN_ACCESS_LEVEL,
} from "../middleware/requireAccessLevel";
const router = Router();

router
    .route("/")
    .post(addUserToWaitingListHandler)
    .get(requireAccessLevel(ADMIN_ACCESS_LEVEL), getWaitingListUsersHandler);

export default router;
