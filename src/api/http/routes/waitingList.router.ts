import { Router } from "express";
import {
    addUserToWaitingListHandler,
    getWaitingListUsersHandler,
} from "../controllers/waitingList.controller";
import requireAccessLevel from "../middleware/requireAccessLevel";
import { ADMIN_ACCESS_LEVEL } from "../utils/constants";

const router = Router();

router
    .route("/")
    .post(addUserToWaitingListHandler)
    .get(requireAccessLevel(ADMIN_ACCESS_LEVEL), getWaitingListUsersHandler);

export default router;
