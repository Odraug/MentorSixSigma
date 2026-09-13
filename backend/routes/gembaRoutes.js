// backend/routes/gembaRoutes.js
import { Router } from "express";
import multer from "multer";
import {
  crearPlanGemba,
  listarGembasEmpresa,
  obtenerGembaPorId,
  guardarEjecucionGemba,
  subirEvidenciaGemba,
} from "../controllers/gembaController.js";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleMiddleware.js"; // si no lo usas, lo puedes borrar

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Crear planificación
router.post("/plan", verifyToken, crearPlanGemba);

// Listar gembas por empresa (usa empresa del token, o param si lo envías)
router.get("/empresa/:empresaId?", verifyToken, listarGembasEmpresa);

// Obtener gemba completo (plan + participantes + observaciones)
router.get("/:id", verifyToken, obtenerGembaPorId);

// Guardar ejecución (sobrescribe observaciones)
router.post("/:id/ejecucion", verifyToken, guardarEjecucionGemba);

// Subir foto de evidencia a Supabase Storage (devuelve la URL pública)
router.post("/:id/evidencias", verifyToken, upload.single("file"), subirEvidenciaGemba);

export default router;
