import express from "express";
import { verifyToken } from "../middleware/auth.js";

import {
  getControlTower,
  getLiveOrders
} from "../controllers/controlTowerController.js";

const router = express.Router();

router.get("/control-tower", verifyToken, getControlTower);

router.get("/control-tower/orders", verifyToken, getLiveOrders);

export default router;