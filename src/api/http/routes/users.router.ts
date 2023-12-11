import { Router } from "express";
import {
    createUserHandler,
    deleteUserByIdHandler,
    getUsersHandler,
    updateUserByIdHandler,
} from "../controllers/users.controller";
import requireAccessLevel from "../middleware/requireAccessLevel";
import { ADMIN_ACCESS_LEVEL } from "../utils/constants";

const router = Router();
router
    .route("/")
    .get(requireAccessLevel(ADMIN_ACCESS_LEVEL), getUsersHandler)
    .post(createUserHandler);
router
    .route("/:id")
    .put(requireAccessLevel(ADMIN_ACCESS_LEVEL), updateUserByIdHandler)
    .delete(requireAccessLevel(ADMIN_ACCESS_LEVEL), deleteUserByIdHandler);

export default router;
