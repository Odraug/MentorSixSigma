// backend/routes/diagnosticoRoutes.js
import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  generarDiagnostico,
  listarDiagnosticos,
  obtenerDiagnostico,
  eliminarDiagnostico,
} from "../controllers/diagnosticoController.js";

const router = Router();

// /api/diagnostico
router.get("/", verifyToken, listarDiagnosticos);
router.get("/:id", verifyToken, obtenerDiagnostico);
router.post("/generar", verifyToken, generarDiagnostico);
router.delete("/:id", verifyToken, eliminarDiagnostico);

export default router;
