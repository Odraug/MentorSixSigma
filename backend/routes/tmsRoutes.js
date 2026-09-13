// backend/routes/tmsRoutes.js
import express from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  getCarriers, createCarrier,
  getVehicles, createVehicle,
  getDrivers, createDriver,
  getShipmentsPendientes,
  getLoads, getLoadDetail, createLoad,
  dispatchLoad, addTrackingEvent, deliverLoad,
} from "../controllers/tmsController.js";

const router = express.Router();

// Maestros
router.get("/carriers", verifyToken, getCarriers);
router.post("/carriers", verifyToken, createCarrier);
router.get("/vehicles", verifyToken, getVehicles);
router.post("/vehicles", verifyToken, createVehicle);
router.get("/drivers", verifyToken, getDrivers);
router.post("/drivers", verifyToken, createDriver);

// Shipments listos para asignar a una carga
router.get("/shipments-pendientes", verifyToken, getShipmentsPendientes);

// Cargas (loads)
router.get("/loads", verifyToken, getLoads);
router.get("/loads/:id", verifyToken, getLoadDetail);
router.post("/loads", verifyToken, createLoad);
router.post("/loads/:id/dispatch", verifyToken, dispatchLoad);
router.post("/loads/:id/tracking", verifyToken, addTrackingEvent);
router.post("/loads/:id/deliver", verifyToken, deliverLoad);

export default router;

/*
  En backend/server.js agrega:
    import tmsRoutes from "./routes/tmsRoutes.js";
    app.use("/api/tms", tmsRoutes);

  Nota: aquí NO se usa enforceTenantScope porque ya no se recibe companyId
  del cliente en ningún endpoint — todo se resuelve desde req.user.empresa_id
  (el token JWT), que es el patrón correcto. Si más adelante migras los demás
  módulos (dashboard, control tower, etc.) al mismo patrón, ya no van a
  necesitar el middleware tampoco.
*/
