import express from "express";
import {
  confirmOrder,
  shipOrder,
  cancelOrder,
  getSalesOrders,
  getSalesOrderDetail
} from "../controllers/salesController.js";

const router = express.Router();

/* ================================
   SALES ORDERS
================================ */

router.get("/orders", getSalesOrders);
router.get("/orders/:id", getSalesOrderDetail);

router.post("/orders/:id/confirm", confirmOrder);
router.post("/orders/:id/ship", shipOrder);
router.post("/orders/:id/cancel", cancelOrder);

export default router;