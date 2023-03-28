// @ts-nocheck

import { supabase } from "../config/supa";
import { Router } from "express";
import { createWaitList } from "../controllers/waitingList/waitingListController";
const router = Router();

//Create Wait List

router.post("/", createWaitList);

export default router;
