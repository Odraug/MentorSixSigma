// backend/routes/inventarioCiclicoRoutes.js
import { Router } from "express";
import multer from "multer";
import { verifyToken } from "../middleware/auth.js";
import {
  subirArchivoCiclico,
  listarUploadsCiclico,
  obtenerEstadoCiclico,
  obtenerResumenCiclico,
  obtenerAbcXyzCiclico,
  obtenerDispersionCiclico,
  obtenerConsolidacionCiclico,
} from "../controllers/inventarioCiclicoController.js";
import {
  obtenerCapacidadCd,
  guardarCapacidadCd,
  generarPlanCiclico,
  listarPlanesCiclico,
  obtenerPlanCiclico,
} from "../controllers/inventarioCiclicoPlanController.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post("/upload", verifyToken, upload.single("file"), subirArchivoCiclico);
router.get("/uploads", verifyToken, listarUploadsCiclico);
router.get("/:uploadId/estado", verifyToken, obtenerEstadoCiclico);
router.get("/:uploadId/resumen", verifyToken, obtenerResumenCiclico);
router.get("/:uploadId/abc-xyz", verifyToken, obtenerAbcXyzCiclico);
router.get("/:uploadId/dispersion", verifyToken, obtenerDispersionCiclico);
router.get("/:uploadId/consolidacion", verifyToken, obtenerConsolidacionCiclico);

// Plan de inventario cíclico (priorización + calendario por turnos)
router.put("/capacidad", verifyToken, guardarCapacidadCd);
router.get("/:uploadId/capacidad", verifyToken, obtenerCapacidadCd);
router.post("/:uploadId/plan", verifyToken, generarPlanCiclico);
router.get("/:uploadId/planes", verifyToken, listarPlanesCiclico);
router.get("/plan/:planId", verifyToken, obtenerPlanCiclico);

export default router;
