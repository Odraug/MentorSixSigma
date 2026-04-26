import express from "express";
import { verifyToken } from "../middleware/auth.js";

import {
getShipments,
startLoading,
confirmShipment
} from "../controllers/shippingController.js";

const router = express.Router();

router.get("/shipping", verifyToken, getShipments);

router.post("/shipping/:id/start-loading", verifyToken, startLoading);

router.post("/shipping/:id/confirm", verifyToken, confirmShipment);

export default router;