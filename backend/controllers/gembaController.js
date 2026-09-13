// backend/controllers/gembaController.js
import pool from "../db.js";

/**
 * POST /api/gemba/plan
 * Guarda un plan de Gemba con sus participantes
 */
export const crearPlanGemba = async (req, res) => {
  const { area, fecha, responsable, proposito, participantes = [] } = req.body;

  if (!area || !fecha || !responsable) {
    return res.status(400).json({
      ok: false,
      message: "Área, fecha y responsable son obligatorios",
    });
  }

  const empresaId = req.user?.empresa_id;
  const usuarioId = req.user?.id;

  if (!empresaId || !usuarioId) {
    return res.status(400).json({
      ok: false,
      message: "Faltan datos de empresa / usuario en el token",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Insertar plan en gemba_planes
    const insertPlan = await client.query(
      `
      INSERT INTO public.gemba_planes
        (empresa_id, usuario_id, area, fecha, responsable, proposito)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
      [empresaId, usuarioId, area, fecha, responsable, proposito || null]
    );

    const gembaId = insertPlan.rows[0].id;

    // 2) Insertar participantes (si hay) en gemba_participantes (columna gemba_id)
    if (Array.isArray(participantes) && participantes.length > 0) {
      const values = [];
      const params = [];
      let i = 1;

      participantes.forEach((p) => {
        if (!p) return;
        values.push(`($${i++}, $${i++}, $${i++}, $${i++})`);
        params.push(
          gembaId,
          p.area || null,
          p.nombre || null,
          p.cargo || null
        );
      });

      if (values.length > 0) {
        await client.query(
          `
          INSERT INTO public.gemba_participantes
            (gemba_id, area, nombre, cargo)
          VALUES ${values.join(",")}
        `,
          params
        );
      }
    }

    await client.query("COMMIT");

    return res.json({
      ok: true,
      id: gembaId,
      message: "Plan Gemba guardado correctamente",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error creando plan Gemba:", error);
    return res
      .status(500)
      .json({ ok: false, message: "Error creando plan Gemba" });
  } finally {
    client.release();
  }
};

/**
 * GET /api/gemba/planes
 * Lista planes de la empresa del usuario
 */
export const listarGembasEmpresa = async (req, res) => {
  const empresaIdFromToken = req.user?.empresa_id;
  const empresaIdFromParam = req.params?.empresaId
    ? Number(req.params.empresaId)
    : null;

  const empresaId = empresaIdFromToken || empresaIdFromParam;

  if (!empresaId) {
    return res.status(400).json({
      ok: false,
      message: "No se encontró empresa asociada",
    });
  }

  try {
    // Se agregan conteos de observaciones y acciones derivadas pendientes
    // por plan, para que el listado pueda mostrar un estado real sin tener
    // que pedir el detalle completo de cada Gemba (N+1).
    const result = await pool.query(
      `
      SELECT
        gp.*,
        COUNT(go.id) AS observaciones_count,
        COUNT(go.id) FILTER (WHERE go.accion_derivada = true) AS acciones_derivadas_count
      FROM public.gemba_planes gp
      LEFT JOIN public.gemba_observaciones go ON go.gemba_id = gp.id
      WHERE gp.empresa_id = $1
      GROUP BY gp.id
      ORDER BY gp.fecha DESC, gp.created_at DESC
    `,
      [empresaId]
    );

    res.json({ ok: true, planes: result.rows });
  } catch (error) {
    console.error("❌ Error listando planes Gemba:", error);
    res.status(500).json({
      ok: false,
      message: "Error listando planes Gemba",
    });
  }
};

/**
 * GET /api/gemba/:id
 * Devuelve un gemba completo: plan + participantes + observaciones
 */
export const obtenerGembaPorId = async (req, res) => {
  const { id } = req.params;
  const empresaId = req.user?.empresa_id;

  try {
    // 1) Plan
    const planRes = await pool.query(
      `
      SELECT *
      FROM public.gemba_planes
      WHERE id = $1 AND empresa_id = $2
    `,
      [id, empresaId]
    );

    if (planRes.rowCount === 0) {
      return res
        .status(404)
        .json({ ok: false, message: "Plan Gemba no encontrado" });
    }

    // 2) Participantes
    const partRes = await pool.query(
      `
      SELECT id, area, nombre, cargo
      FROM public.gemba_participantes
      WHERE gemba_id = $1
      ORDER BY id
    `,
      [id]
    );

    // 3) Observaciones
    const obsRes = await pool.query(
      `
      SELECT id, tipo, descripcion, responsable, accion_derivada, evidencias, fecha_registro
      FROM public.gemba_observaciones
      WHERE gemba_id = $1
      ORDER BY fecha_registro ASC, id ASC
    `,
      [id]
    );

    res.json({
      ok: true,
      gemba: {
        ...planRes.rows[0],
        participantes: partRes.rows,
        observaciones: obsRes.rows,
      },
    });
  } catch (error) {
    console.error("❌ Error obteniendo Gemba:", error);
    res.status(500).json({
      ok: false,
      message: "Error obteniendo Gemba",
    });
  }
};

/**
 * POST /api/gemba/:id/ejecucion
 * Guarda la ejecución del Gemba (sobrescribe observaciones)
 * Body esperado:
 * { observaciones: [ { tipo, descripcion, responsable, accion_derivada, evidencias } ] }
 */
export const guardarEjecucionGemba = async (req, res) => {
  const { id } = req.params; // gemba_id
  const empresaId = req.user?.empresa_id;
  const { observaciones = [] } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verificar que el plan existe y pertenece a la empresa
    const planRes = await client.query(
      `
      SELECT id
      FROM public.gemba_planes
      WHERE id = $1 AND empresa_id = $2
    `,
      [id, empresaId]
    );

    if (planRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ ok: false, message: "Plan Gemba no encontrado" });
    }

    // Borrar observaciones previas (sobrescritura)
    await client.query(
      `DELETE FROM public.gemba_observaciones WHERE gemba_id = $1`,
      [id]
    );

    // Insertar nuevas observaciones
    if (Array.isArray(observaciones) && observaciones.length > 0) {
      const values = [];
      const params = [];
      let i = 1;

      observaciones.forEach((o) => {
        if (!o) return;
        values.push(
          `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`
        );
        params.push(
          id,
          o.tipo || null,
          o.descripcion || null,
          o.responsable || null,
          o.accion_derivada ?? false,
          o.evidencias ? JSON.stringify(o.evidencias) : "[]" // jsonb
        );
      });

      if (values.length > 0) {
        await client.query(
          `
          INSERT INTO public.gemba_observaciones
            (gemba_id, tipo, descripcion, responsable, accion_derivada, evidencias)
          VALUES ${values.join(",")}
        `,
          params
        );
      }
    }

    await client.query("COMMIT");

    res.json({
      ok: true,
      message: "Ejecución Gemba guardada correctamente",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error guardando ejecución Gemba:", error);
    res.status(500).json({
      ok: false,
      message: "Error guardando ejecución Gemba",
    });
  } finally {
    client.release();
  }
};
