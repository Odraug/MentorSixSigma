// backend/routes/warehouseLayoutRoutes.js

import express from "express";
import { generateLayout } from "../controllers/warehouseLayoutController.js";
import { getWarehouseLayout } from "../controllers/getWarehouseLayout.js";

const router = express.Router();

router.post("/layout/generate", generateLayout);
router.get("/layout/:warehouse_id", getWarehouseLayout);

export default router;