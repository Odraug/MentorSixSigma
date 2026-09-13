// backend/routes/a3Routes.js
import express from "express";
import pool from "../db.js";

import { verifyToken } from "../middleware/auth.js";


const router = express.Router();

/**
 * ==========================================
 * 📄 1️⃣ Crear un nuevo A3
 * ==========================================
 * Crea el proyecto base y sus secciones iniciales vacías
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { id_empresa, titulo, descripcion } = req.body;
    const { id: id_usuario, rol } = req.user;

    // 🔎 Validar campos mínimos
    if (!titulo) {
      return res.status(400).json({ message: "Falta el título del A3." });
    }

    // 👇 Si es SuperAdmin, permitir guardar sin empresa
    const empresaFinal = rol === "SuperAdmin" ? null : id_empresa;

    // 🧩 Crear el proyecto A3 principal
    const result = await pool.query(
      `INSERT INTO a3_proyectos (id_empresa, id_usuario, titulo, descripcion, estado)
       VALUES ($1, $2, $3, $4, 'En progreso')
       RETURNING id;`,
      [empresaFinal, id_usuario, titulo, descripcion]
    );

    const id_a3 = result.rows[0].id;

    // 🧱 Crear secciones base automáticamente (una por una)
    await pool.query(`INSERT INTO a3_problemas (id_a3) VALUES ($1)`, [id_a3]);
    await pool.query(`INSERT INTO a3_ishikawa (id_a3) VALUES ($1)`, [id_a3]);
    await pool.query(`INSERT INTO a3_contramedidas (id_a3) VALUES ($1)`, [id_a3]);
    await pool.query(`INSERT INTO a3_seguimiento (id_a3) VALUES ($1)`, [id_a3]);

    console.log(`✅ Nuevo A3 creado correctamente (ID: ${id_a3})`);
    res.status(201).json({ message: "✅ A3 creado correctamente", id_a3 });

  } catch (error) {
    console.error("❌ Error creando A3:", error);
    res.status(500).json({ message: "Error creando el A3" });
  }
});



/**
 * ==========================================
 * 📄 2️⃣ Obtener todos los A3 de una empresa
 * ==========================================
 */
router.get("/empresa/:id_empresa", verifyToken, async (req, res) => {
  try {
    const { id_empresa } = req.params;
    const result = await pool.query(
      `SELECT * FROM a3_proyectos WHERE id_empresa = $1 ORDER BY fecha_creacion DESC;`,
      [id_empresa]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error obteniendo A3:", error);
    res.status(500).json({ message: "Error al listar los A3" });
  }
});

/**
 * ==========================================
 * 📄 3️⃣ Obtener un A3 completo (con JOINs)
 * ==========================================
 */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const proyecto = await pool.query(
      "SELECT * FROM a3_proyectos WHERE id = $1",
      [id]
    );
    if (proyecto.rowCount === 0)
      return res.status(404).json({ message: "A3 no encontrado" });

    const problema = await pool.query(
      "SELECT * FROM a3_problemas WHERE id_a3 = $1",
      [id]
    );
    const ishikawa = await pool.query(
      "SELECT * FROM a3_ishikawa WHERE id_a3 = $1",
      [id]
    );
    const causas = await pool.query(
      `SELECT * FROM a3_ishikawa_causas WHERE id_ishikawa IN 
       (SELECT id FROM a3_ishikawa WHERE id_a3 = $1)`,
      [id]
    );
    const contramedidas = await pool.query(
      "SELECT * FROM a3_contramedidas WHERE id_a3 = $1",
      [id]
    );
    const acciones = await pool.query(
      "SELECT * FROM a3_acciones WHERE id_a3 = $1",
      [id]
    );
    const seguimiento = await pool.query(
      "SELECT * FROM a3_seguimiento WHERE id_a3 = $1",
      [id]
    );

    res.json({
      proyecto: proyecto.rows[0],
      problema: problema.rows[0],
      ishikawa: ishikawa.rows[0],
      causas: causas.rows,
      contramedidas: contramedidas.rows,
      acciones: acciones.rows,
      seguimiento: seguimiento.rows[0],
    });
  } catch (error) {
    console.error("❌ Error obteniendo A3 por ID:", error);
    res.status(500).json({ message: "Error al obtener el A3" });
  }
});

/**
 * ==========================================
 * 📄 4️⃣ Actualizar secciones del A3
 * ==========================================
 */
router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { section, data } = req.body;

    if (!section || !data)
      return res.status(400).json({ message: "Faltan datos" });

    switch (section) {
      case "problema":
        await pool.query(
          `UPDATE a3_problemas 
           SET descripcion=$1, condicion_actual=$2, acciones_contencion=$3,
               meta=$4, cumplimiento=$5, brecha=$6,
               resumen_5w2h=$7, resumen_5w2h_ia=$8
           WHERE id_a3=$9`,
          [
            data.descripcion,
            data.condicion_actual,
            data.acciones_contencion,
            data.meta,
            data.cumplimiento,
            data.brecha,
            data.resumen_5w2h,
            data.resumen_5w2h_ia,
            id,
          ]
        );
        break;

      case "ishikawa":
        await pool.query(
          `UPDATE a3_ishikawa 
           SET problema=$1, analisis_ia=$2, imagen_url=$3
           WHERE id_a3=$4`,
          [data.problema, data.analisis_ia, data.imagen_url, id]
        );

        // eliminar y volver a insertar causas (simplificado)
        await pool.query(
          `DELETE FROM a3_ishikawa_causas 
           WHERE id_ishikawa IN (SELECT id FROM a3_ishikawa WHERE id_a3=$1)`,
          [id]
        );

        for (const causa of data.causas || []) {
          await pool.query(
            `INSERT INTO a3_ishikawa_causas (id_ishikawa, categoria, texto)
             VALUES ((SELECT id FROM a3_ishikawa WHERE id_a3=$1), $2, $3)`,
            [id, causa.categoria, causa.texto]
          );
        }
        break;

      case "contramedidas":
        await pool.query(
          `UPDATE a3_contramedidas SET descripcion=$1 WHERE id_a3=$2`,
          [data.descripcion, id]
        );
        break;

      case "acciones":
        // reemplazar completamente lista de acciones
        await pool.query(`DELETE FROM a3_acciones WHERE id_a3=$1`, [id]);
        for (const a of data) {
          await pool.query(
            `INSERT INTO a3_acciones (id_a3, accion, responsable, fecha, estado)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, a.accion, a.responsable, a.fecha, a.estado]
          );
        }
        break;

      case "seguimiento":
        await pool.query(
          `UPDATE a3_seguimiento SET resultados=$1, lecciones=$2 WHERE id_a3=$3`,
          [data.resultados, data.lecciones, id]
        );
        break;

      default:
        return res.status(400).json({ message: "Sección desconocida" });
    }

    res.json({ message: `✅ Sección ${section} actualizada correctamente` });
  } catch (error) {
    console.error("❌ Error actualizando A3:", error);
    res.status(500).json({ message: "Error al actualizar el A3" });
  }
});

/**
 * ==========================================
 * 📄 5️⃣ Eliminar un A3 completo
 * ==========================================
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM a3_proyectos WHERE id=$1", [id]);
    res.json({ message: "🗑️ A3 eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error eliminando A3:", error);
    res.status(500).json({ message: "Error al eliminar el A3" });
  }
});

/**
 * ==========================================
 * 🤖 6️⃣ Generar resumen 5W2H con IA (Gemini)
 * ==========================================
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

// ⚙️ Cliente Gemini (usa tu API key del backend)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/ia", async (req, res) => {
  try {
    const { engine, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "Falta el prompt" });
    }

    let suggestion = "";

    // 🚀 Usa Gemini real
    if (engine === "gemini" || !engine) {
      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
      const result = await model.generateContent(prompt);
      suggestion = result.response.text();
    }

    res.json({ sugerencia: suggestion });
  } catch (error) {
    console.error("❌ Error al generar propuesta IA (Gemini):", error.message);
    res
      .status(500)
      .json({ message: "Error generando propuesta IA con Gemini" });
  }
});




export default router;
