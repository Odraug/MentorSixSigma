import express from "express";
import { verifyToken } from "../middleware/auth.js";

import {
  getPickingTasks,
  assignPickingTask,
  startPicking,
  finishPicking
} from "../controllers/operationsControllers.js";

const router = express.Router();

/* =========================
   WMS OPERATIONS
========================= */

router.get("/operations/picking", verifyToken, getPickingTasks);

router.post("/operations/picking/:id/assign", verifyToken, assignPickingTask);

router.post("/operations/picking/:id/start", verifyToken, startPicking);

router.post("/operations/picking/:id/finish", verifyToken, finishPicking);

export default router;