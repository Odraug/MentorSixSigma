// backend/routes/abcXyzRoutes.js
import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { enforceTenantScope } from "../middleware/tenantScope.js";
import { calcularAbcXyz, guardarAbcXyz } from "../controllers/abcXyzController.js";

const router = express.Router();

router.get("/abc-xyz", verifyToken, enforceTenantScope, calcularAbcXyz);
router.post("/abc-xyz/guardar", verifyToken, enforceTenantScope, guardarAbcXyz);

export default router;

/*
  En backend/server.js agrega, junto a las demás rutas:

    import abcXyzRoutes from "./routes/abcXyzRoutes.js";
    ...
    app.use("/api/analisis", abcXyzRoutes);

  Quedaría expuesto en:
    GET  /api/analisis/abc-xyz?companyId=1&meses=6
    POST /api/analisis/abc-xyz/guardar   body: { companyId, meses }
*/
