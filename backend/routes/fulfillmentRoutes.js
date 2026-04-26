import express from "express";

import {
  getFulfillmentQueue,
  getFulfillmentStats,
  getWaves,
  allocateOrder,
  createWave,
  getPickingMonitor,
  getOptimizedPicking,
  createAutoWave
} from "../controllers/fulfillmentController.js";

const router = express.Router();

router.get("/queue", getFulfillmentQueue);
router.get("/stats", getFulfillmentStats);
router.get("/waves", getWaves);
router.get("/picking-monitor", getPickingMonitor);
router.post("/allocate/:id", allocateOrder);
router.post("/create-wave", createWave);
router.get("/optimized-picking/:waveId", getOptimizedPicking);
router.post("/auto-wave", createAutoWave);

export default router;

