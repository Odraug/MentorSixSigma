// backend/controllers/diagnosticoController.js
//
// "Diagnóstico Rápido": el usuario describe con sus propias palabras qué
// quiere analizar o mejorar de sus procesos (sin necesidad de saber de
// antemano qué herramienta Lean Six Sigma aplicar). La IA devuelve un
// informe gerencial y un roadmap de qué módulos de MentorSuites usar,
// en qué orden y por qué.

import pool from "../db.js";
import { generarConGemini } from "../api/geminiIA.js";

// Catálogo de módulos que la IA puede recomendar. Se mantiene curado a mano
// (en vez de leerlo directo de `modulos`) para no recomendar módulos rotos
// o sin ruta (ej. DRP, Análisis ABC/XYZ).
const MODULOS_DISPONIBLES = [
  { modulo: "SIPOC", ruta: "/sipoc/builder", descripcion: "Mapear proveedores, entradas, proceso, salidas y clientes de un proceso." },
  { modulo: "VSM", ruta: "/vsm/intro", descripcion: "Mapear el flujo de valor y detectar desperdicios." },
  { modulo: "Gemba Walk", ruta: "/gemba/plan", descripcion: "Observar el proceso en el lugar real de trabajo." },
  { modulo: "5S", ruta: "/5s/intro", descripcion: "Ordenar y estandarizar el puesto/área de trabajo." },
  { modulo: "A3", ruta: "/a3/intro", descripcion: "Resolver un problema puntual: causa raíz, contramedidas y plan de acción." },
  { modulo: "KPI", ruta: "/kpi/dashboard", descripcion: "Monitorear indicadores clave del negocio." },
  { modulo: "OEE", ruta: "/oee/dashboard", descripcion: "Medir eficiencia global de equipos." },
  { modulo: "OOE", ruta: "/ooe/dashboard", descripcion: "Medir eficiencia operacional global." },
  { modulo: "TEEP", ruta: "/teep/dashboard", descripcion: "Medir eficiencia total del equipo (incluye tiempo no programado)." },
  { modulo: "TMS - Cargas y Despacho", ruta: "/core/tms", descripcion: "Gestionar despachos y cargas de transporte." },
  { modulo: "Yard Management", ruta: "/core/yard", descripcion: "Gestionar patio, andenes y citas de camiones." },
  { modulo: "Diseñador de Layout", ruta: "/core/wms/layout-designer", descripcion: "Diseñar el layout físico de racks/bodega." },
];

const construirPrompt = (descripcion) => {
  const catalogo = MODULOS_DISPONIBLES
    .map((m) => `- ${m.modulo} (${m.ruta}): ${m.descripcion}`)
    .join("\n");

  return `Sos un consultor experto en Lean Six Sigma. Un usuario de la plataforma MentorSuites describió, con sus propias palabras, qué quiere analizar o mejorar de sus procesos.

Tu tarea:
1. Generar un informe gerencial breve y profesional (3 a 5 párrafos, en español): síntesis del problema, riesgos u oportunidades detectadas, y recomendaciones generales.
2. Sugerir un roadmap de 2 a 4 pasos concretos, usando SOLO módulos de esta lista (no inventes otros, copiá el nombre y la ruta exactos):
${catalogo}

Descripción del usuario:
"""
${descripcion}
"""

Respondé ÚNICAMENTE con un objeto JSON válido (sin texto adicional antes o después, sin bloques de código markdown), con esta forma exacta:
{
  "informe": "texto del informe gerencial en español",
  "roadmap": [
    { "modulo": "nombre exacto de la lista", "ruta": "ruta exacta de la lista", "motivo": "por qué se recomienda este paso, 1-2 frases" }
  ]
}`;
};

// Intenta parsear la respuesta de la IA como JSON, tolerando que venga
// envuelta en un bloque de código markdown (```json ... ```) o con texto
// alrededor. Si no se puede parsear, cae de vuelta a texto plano como
// informe, sin roadmap (mejor mostrar algo que romper la funcionalidad).
const parsearRespuestaIA = (texto) => {
  const limpio = String(texto || "").trim();
  const match = limpio.match(/\{[\s\S]*\}/);

  if (match) {
    try {
      const json = JSON.parse(match[0]);
      if (json && typeof json.informe === "string") {
        return {
          informe: json.informe,
          roadmap: Array.isArray(json.roadmap) ? json.roadmap : [],
        };
      }
    } catch {
      // sigue al fallback de abajo
    }
  }

  return { informe: limpio, roadmap: [] };
};

// POST /api/diagnostico/generar  body: { nombre, descripcion }
// Genera el informe + roadmap con IA y lo guarda en una sola operación.
export const generarDiagnostico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const usuarioId = req.user?.id || null;

    if (!empresaId) {
      return res.status(400).json({ ok: false, message: "Falta empresa en el token" });
    }

    const { nombre, descripcion } = req.body || {};

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ ok: false, message: "El nombre del diagnóstico es obligatorio" });
    }
    if (!descripcion || !descripcion.trim()) {
      return res.status(400).json({ ok: false, message: "Contanos qué querés analizar o mejorar" });
    }

    const respuestaIA = await generarConGemini({
      prompt: construirPrompt(descripcion.trim()),
      engine: "gemini",
      contexto: "Diagnostico Rapido",
    });

    const { informe, roadmap } = parsearRespuestaIA(respuestaIA);

    const { rows } = await pool.query(
      `INSERT INTO diagnosticos_rapidos (empresa_id, usuario_id, nombre, descripcion, informe, roadmap)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, descripcion, informe, roadmap, fecha_creacion`,
      [empresaId, usuarioId, nombre.trim(), descripcion.trim(), informe, JSON.stringify(roadmap)]
    );

    return res.status(201).json({ ok: true, diagnostico: rows[0] });
  } catch (error) {
    console.error("❌ Error generarDiagnostico:", error);
    return res.status(500).json({ ok: false, message: "Error generando el diagnóstico", detalle: error.message });
  }
};

// GET /api/diagnostico
export const listarDiagnosticos = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    if (!empresaId) {
      return res.status(400).json({ ok: false, message: "Falta empresa en el token" });
    }

    const { rows } = await pool.query(
      `SELECT id, nombre, fecha_creacion
       FROM diagnosticos_rapidos
       WHERE empresa_id = $1
       ORDER BY fecha_creacion DESC`,
      [empresaId]
    );

    return res.json({ ok: true, diagnosticos: rows });
  } catch (error) {
    console.error("❌ Error listarDiagnosticos:", error);
    return res.status(500).json({ ok: false, message: "Error listando diagnósticos" });
  }
};

// GET /api/diagnostico/:id
export const obtenerDiagnostico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { id } = req.params;

    if (!empresaId) {
      return res.status(400).json({ ok: false, message: "Falta empresa en el token" });
    }

    const { rows } = await pool.query(
      `SELECT id, nombre, descripcion, informe, roadmap, fecha_creacion
       FROM diagnosticos_rapidos
       WHERE empresa_id = $1 AND id = $2`,
      [empresaId, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Diagnóstico no encontrado" });
    }

    return res.json({ ok: true, diagnostico: rows[0] });
  } catch (error) {
    console.error("❌ Error obtenerDiagnostico:", error);
    return res.status(500).json({ ok: false, message: "Error obteniendo el diagnóstico" });
  }
};

// DELETE /api/diagnostico/:id
export const eliminarDiagnostico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { id } = req.params;

    if (!empresaId) {
      return res.status(400).json({ ok: false, message: "Falta empresa en el token" });
    }

    const { rowCount } = await pool.query(
      `DELETE FROM diagnosticos_rapidos WHERE empresa_id = $1 AND id = $2`,
      [empresaId, id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ ok: false, message: "Diagnóstico no encontrado para eliminar" });
    }

    return res.json({ ok: true, message: "Diagnóstico eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error eliminarDiagnostico:", error);
    return res.status(500).json({ ok: false, message: "Error eliminando el diagnóstico" });
  }
};
