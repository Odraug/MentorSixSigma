// backend/routes/yardRoutes.js
import express from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  getDocks, createDock, getYardBoard,
  checkIn, asignarMuelle, checkOut,
} from "../controllers/yardController.js";

const router = express.Router();

router.get("/docks", verifyToken, getDocks);
router.post("/docks", verifyToken, createDock);

router.get("/board", verifyToken, getYardBoard);

router.post("/check-in", verifyToken, checkIn);
router.post("/visits/:id/asignar-muelle", verifyToken, asignarMuelle);
router.post("/visits/:id/check-out", verifyToken, checkOut);

export default router;

/*
  En backend/server.js agrega:
    import yardRoutes from "./routes/yardRoutes.js";
    app.use("/api/yard", yardRoutes);
*/
