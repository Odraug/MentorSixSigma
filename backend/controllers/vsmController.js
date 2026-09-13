// backend/controllers/vsmController.js
//
// VSM interactivo: un solo grafo (nodes + edges, estilo React Flow) por
// mapa, guardado en la columna `layout`. Reemplaza el modelo viejo de
// `procesos` (tabla) + `layout.elements/connections` (canvas libre), que
// eran dos fuentes de datos desincronizadas. `procesos` queda sin usar
// (no se borra la columna, solo deja de escribirse).

import pool from "../db.js";

// Minutos por turno de trabajo, usados para poder comparar tiempo de
// procesamiento (minutos) contra inventario entre procesos (días) en una
// sola unidad y calcular el Lead Time y el PCE (Process Cycle Efficiency).
const MIN_POR_DIA = 480; // turno de 8 horas

// Calcula las métricas del VSM a partir del grafo actual. Se recalcula
// siempre en el servidor (nunca se guarda un valor "cacheado") para que
// nunca quede desincronizado de los nodos/edges reales.
// Los nodos llegan en el formato nativo de React Flow: { id, type, position, data }.
// El tipo semántico (proceso/inventario/proveedor/cliente) vive en `type`, y los
// campos editables (ct, co, dias, etc.) viven dentro de `data`.
const calcularMetricas = (layout) => {
  const nodes = Array.isArray(layout?.nodes) ? layout.nodes : [];

  const procesos = nodes.filter((n) => n.type === "proceso");
  const inventarios = nodes.filter((n) => n.type === "inventario");

  const tiempoProcesamientoTotalMin = procesos.reduce((acc, n) => acc + (Number(n.data?.ct) || 0), 0);
  const tiempoValorAgregadoMin = procesos.reduce(
    (acc, n) => acc + (n.data?.valorAgregado !== false ? Number(n.data?.ct) || 0 : 0),
    0
  );
  const diasInventarioTotal = inventarios.reduce((acc, n) => acc + (Number(n.data?.dias) || 0), 0);

  const leadTimeMin = diasInventarioTotal * MIN_POR_DIA + tiempoProcesamientoTotalMin;
  const leadTimeDias = leadTimeMin / MIN_POR_DIA;
  const pce = leadTimeMin > 0 ? (tiempoValorAgregadoMin / leadTimeMin) * 100 : 0;

  return {
    minPorDia: MIN_POR_DIA,
    tiempoProcesamientoTotalMin: Math.round(tiempoProcesamientoTotalMin * 100) / 100,
    tiempoValorAgregadoMin: Math.round(tiempoValorAgregadoMin * 100) / 100,
    diasInventarioTotal: Math.round(diasInventarioTotal * 100) / 100,
    leadTimeDias: Math.round(leadTimeDias * 100) / 100,
    pce: Math.round(pce * 100) / 100,
  };
};

const layoutVacio = () => ({ nodes: [], edges: [] });

// 🔹 Obtiene (o crea) el único mapa VSM de la empresa
export const obtenerMapaVsm = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const usuarioId = req.user?.id;

    if (!empresaId) {
      return res.status(400).json({ ok: false, message: "Falta empresa en el token" });
    }

    const { rows } = await pool.query(
      `SELECT * FROM public.vsm_mapas WHERE empresa_id = $1 ORDER BY id LIMIT 1`,
      [empresaId]
    );

    let mapa;
    if (rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO public.vsm_mapas (empresa_id, creado_por, layout)
         VALUES ($1, $2, $3::jsonb)
         RETURNING *`,
        [empresaId, usuarioId || null, JSON.stringify(layoutVacio())]
      );
      mapa = insert.rows[0];
    } else {
      mapa = rows[0];
    }

    const layout = mapa.layout && mapa.layout.nodes ? mapa.layout : layoutVacio();

    return res.json({ ok: true, mapa: { ...mapa, layout }, metrics: calcularMetricas(layout) });
  } catch (error) {
    console.error("❌ Error en obtenerMapaVsm:", error);
    return res.status(500).json({ ok: false, message: "Error obteniendo mapa VSM" });
  }
};

// 🔹 Actualiza metadatos del mapa (nombre/descripción)
export const actualizarMapaVsm = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const usuarioId = req.user?.id;
    const { id } = req.params;

    if (!empresaId) {
      return res.status(400).json({ ok: false, message: "Falta empresa en el token" });
    }

    const { nombre, descripcion } = req.body;

    const { rows } = await pool.query(
      `UPDATE public.vsm_mapas
       SET nombre        = COALESCE($1, nombre),
           descripcion   = COALESCE($2, descripcion),
           actualizado_en = now(),
           creado_por    = COALESCE(creado_por, $3)
       WHERE id = $4 AND empresa_id = $5
       RETURNING *`,
      [nombre || null, descripcion || null, usuarioId || null, id, empresaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Mapa VSM no encontrado" });
    }

    const layout = rows[0].layout && rows[0].layout.nodes ? rows[0].layout : layoutVacio();

    return res.json({ ok: true, mapa: { ...rows[0], layout }, metrics: calcularMetricas(layout) });
  } catch (error) {
    console.error("❌ Error en actualizarMapaVsm:", error);
    return res.status(500).json({ ok: false, message: "Error actualizando mapa VSM" });
  }
};

// 🔹 Actualiza el grafo (nodes + edges) del VSM interactivo
export const actualizarLayoutVsm = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { id } = req.params;
    const { nodes, edges } = req.body;

    if (!empresaId) {
      return res.status(400).json({ ok: false, message: "Falta empresa en el token" });
    }

    const layout = { nodes: Array.isArray(nodes) ? nodes : [], edges: Array.isArray(edges) ? edges : [] };

    const { rows } = await pool.query(
      `UPDATE public.vsm_mapas
       SET layout = $1::jsonb,
           actualizado_en = now()
       WHERE id = $2 AND empresa_id = $3
       RETURNING *`,
      [JSON.stringify(layout), id, empresaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Mapa VSM no encontrado" });
    }

    return res.json({ ok: true, mapa: { ...rows[0], layout }, metrics: calcularMetricas(layout) });
  } catch (error) {
    console.error("❌ Error en actualizarLayoutVsm:", error);
    return res.status(500).json({ ok: false, message: "Error actualizando layout VSM" });
  }
};
