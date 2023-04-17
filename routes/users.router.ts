import { Router } from "express";
import {
    deleteUserByIdHandler,
    getUsersHandler,
    updateUserByIdHandler,
} from "../controllers/users.controller";
import requireAccessLevel, {
    ADMIN_ACCESS_LEVEL,
} from "../middleware/requireAccessLevel";

const router = Router();
router.route("/").get(requireAccessLevel(ADMIN_ACCESS_LEVEL), getUsersHandler);
router
    .route("/:id")
    .put(requireAccessLevel(ADMIN_ACCESS_LEVEL), updateUserByIdHandler)
    .delete(requireAccessLevel(ADMIN_ACCESS_LEVEL), deleteUserByIdHandler);

export default router;