// backend/routes/layoutDesignRoutes.js
import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { enforceTenantScope } from "../middleware/tenantScope.js";
import { upload } from "../middleware/upload.js";
import {
  getLayoutDesign,
  saveLayoutDesign,
  importarUbicacionesExcel,
  getStockPorUbicacion,
  cargarStockExcel,
} from "../controllers/layoutDesignController.js";

const router = express.Router();

// Ruta específica ANTES de la genérica /:warehouseId para que Express no la
// confunda con un warehouseId literal llamado "importar-ubicaciones".
router.post(
  "/layout-design/importar-ubicaciones",
  verifyToken,
  upload.single("file"),
  importarUbicacionesExcel
);

router.get("/layout-design/:warehouseId", verifyToken, enforceTenantScope, getLayoutDesign);
router.post("/layout-design/:warehouseId", verifyToken, enforceTenantScope, saveLayoutDesign);
router.get("/layout-design/:warehouseId/stock", verifyToken, enforceTenantScope, getStockPorUbicacion);
router.post(
  "/layout-design/:warehouseId/cargar-stock",
  verifyToken,
  enforceTenantScope,
  upload.single("file"),
  cargarStockExcel
);

export default router;

/*
  En backend/server.js agrega:

    import layoutDesignRoutes from "./routes/layoutDesignRoutes.js";
    ...
    app.use("/api/wms", layoutDesignRoutes);

  Quedaría expuesto en:
    GET  /api/wms/layout-design/:warehouseId?companyId=1
    POST /api/wms/layout-design/:warehouseId   body: { companyId, nombre, layout }
*/
