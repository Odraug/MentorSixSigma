import express from "express";
import { verifyToken } from "../middleware/auth.js";

import {
  getPackingTasks,
  startPacking,
  finishPacking
} from "../controllers/packingController.js";

const router = express.Router();

router.get("/packing", verifyToken, getPackingTasks);

router.post("/packing/:id/start", verifyToken, startPacking);

router.post("/packing/:id/finish", verifyToken, finishPacking);

export default router;