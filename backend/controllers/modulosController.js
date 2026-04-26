import pool from "../db.js";

// ============================================
// 📦 OBTENER MÓDULOS
// ============================================

export const getModulos = async (req,res)=>{

try{

const { rows } = await pool.query(`
SELECT *
FROM core.modulos
ORDER BY nombre
`);

res.json(rows);

}catch(error){

console.error(error);
res.status(500).json({error:"error loading modules"});

}

};

// ============================================
// ➕ CREAR MÓDULO
// ============================================

export const createModulo = async (req,res)=>{

const { nombre,tipo,categoria,descripcion } = req.body;

try{

const { rows } = await pool.query(`
INSERT INTO core.modulos
(nombre,tipo,categoria,descripcion)
VALUES ($1,$2,$3,$4)
RETURNING *
`,
[nombre,tipo,categoria,descripcion]
);

res.json(rows[0]);

}catch(error){

console.error(error);
res.status(500).json({error:"create module error"});

}

};

// ============================================
// ✏️ ACTUALIZAR
// ============================================

export const updateModulo = async (req,res)=>{

const { id } = req.params;
const { nombre,tipo,categoria,descripcion } = req.body;

try{

await pool.query(`
UPDATE core.modulos
SET
nombre=$1,
tipo=$2,
categoria=$3,
descripcion=$4
WHERE id=$5
`,
[nombre,tipo,categoria,descripcion,id]
);

res.json({ok:true});

}catch(error){

console.error(error);
res.status(500).json({error:"update module error"});

}

};

// ============================================
// ❌ ELIMINAR
// ============================================

export const deleteModulo = async (req,res)=>{

const { id } = req.params;

try{

await pool.query(`
DELETE FROM core.modulos
WHERE id=$1
`,
[id]);

res.json({ok:true});

}catch(error){

console.error(error);
res.status(500).json({error:"delete module error"});

}

};