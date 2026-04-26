import express from "express";

import {
getRolesPermisosMatrix,
togglePermiso
} from "../controllers/rolesPermisosController.js";

import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/matrix",
verifyToken,
requireRole(["SuperAdmin"]),
getRolesPermisosMatrix
);

router.post("/toggle",
verifyToken,
requireRole(["SuperAdmin"]),
togglePermiso
);

export default router;