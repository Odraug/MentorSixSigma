// backend/routes/modulosRoutes.js

import express from "express";
import pool from "../db.js";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();


// ============================================
// 📦 LISTAR TODOS LOS MÓDULOS
// ============================================

router.get("/", verifyToken, async (req,res)=>{

try{

const result = await pool.query(`
SELECT *
FROM modulos
ORDER BY nombre
`);

res.json(result.rows);

}catch(err){

console.error("❌ Error obteniendo módulos:",err);
res.status(500).json({message:"Error cargando módulos"});

}

});



// ============================================
// 📦 MÓDULOS PERMITIDOS PARA EL USUARIO
// ============================================

router.get(
"/roles-modulos/permitidos/usuario",
verifyToken,
async (req,res)=>{

try{

const { rol } = req.user;

const result = await pool.query(
`
SELECT
m.id,
m.nombre,
m.tipo,
m.categoria,
m.ruta,
m.orden
FROM roles_modulos rm
JOIN roles r ON r.id = rm.rol_id
JOIN modulos m ON m.id = rm.modulo_id
WHERE r.nombre = $1
AND m.activo = TRUE
AND rm.activo = TRUE
ORDER BY m.orden, m.id
`,
[rol]
);

res.json(result.rows);

}catch(err){

console.error("❌ Error módulos permitidos:",err);
res.status(500).json({message:"Error módulos permitidos"});

}

}
);



// ============================================
// ➕ CREAR MÓDULO
// ============================================

router.post(
"/",
verifyToken,
requireRole(["SuperAdmin"]),
async (req,res)=>{

const { nombre,tipo,categoria,descripcion } = req.body;

try{

const result = await pool.query(
`
INSERT INTO modulos
(nombre,tipo,categoria,descripcion,activo,fecha_creacion)
VALUES($1,$2,$3,$4,TRUE,NOW())
RETURNING *
`,
[nombre,tipo,categoria,descripcion]
);

res.status(201).json(result.rows[0]);

}catch(err){

console.error("❌ Error creando módulo:",err);
res.status(500).json({message:"Error creando módulo"});

}

}
);



// ============================================
// ✏️ ACTUALIZAR MÓDULO
// ============================================

router.put(
"/:id",
verifyToken,
requireRole(["SuperAdmin"]),
async (req,res)=>{

const { id } = req.params;
const { nombre,tipo,categoria,descripcion } = req.body;

try{

const result = await pool.query(
`
UPDATE modulos
SET nombre=$1,tipo=$2,categoria=$3,descripcion=$4
WHERE id=$5
RETURNING *
`,
[nombre,tipo,categoria,descripcion,id]
);

res.json(result.rows[0]);

}catch(err){

console.error("❌ Error actualizando módulo:",err);
res.status(500).json({message:"Error actualizando módulo"});

}

}
);



// ============================================
// ❌ ELIMINAR MÓDULO
// ============================================

router.delete(
"/:id",
verifyToken,
requireRole(["SuperAdmin"]),
async (req,res)=>{

const { id } = req.params;

try{

await pool.query(`
DELETE FROM modulos
WHERE id=$1
`,[id]);

res.json({message:"Módulo eliminado"});

}catch(err){

console.error("❌ Error eliminando módulo:",err);
res.status(500).json({message:"Error eliminando módulo"});

}

}
);



export default router;