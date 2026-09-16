// backend/controllers/inventarioCiclicoPlanController.js
//
// Motor de priorización + calendario del Inventario Cíclico. Adaptado del
// segundo script VBA del usuario ("Motor de Inventario Cíclico + WTW"):
// calcula un score por SKU (ABC + XYZ a 3 bandas + dispersión + zonas + CDs),
// lo traduce en prioridad P1-P4 y frecuencia, y arma un calendario de
// conteo por turno/CD que cubre todos los SKU dentro de un horizonte de
// días (por defecto 60, ajustable).
//
// A propósito usa su PROPIO XYZ a 3 bandas (ROT_X/ROT_Y), distinto del XYZ
// simple de 2 bandas que ya expone /abc-xyz (fase 1) -- son dos scripts VBA
// del usuario con propósitos distintos, no se deben mezclar.
import pool from "../db.js";

// --- Constantes del VBA fuente, portadas tal cual ---
const CORTE_A = 0.8;
const CORTE_B = 0.95;
const ROT_X = 1;
const ROT_Y = 0.25;
const FREQ_DIAS = { SEMANAL: 7, QUINCENAL: 14, MENSUAL: 30, TRIMESTRAL: 90 };
const CAPACIDAD_DEFAULT = 20;
const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const scoreAbc = (abc) => (abc === "A" ? 40 : abc === "B" ? 25 : 10);
const bonusXyz = (xyz) => (xyz === "X" ? 20 : xyz === "Y" ? 12 : 5);

const scoreDispersion = (nUb) => {
  if (nUb >= 10) return 25;
  if (nUb >= 5) return 20;
  if (nUb >= 3) return 15;
  if (nUb === 2) return 8;
  return 0;
};

const clasificarSku = ({ ventasTotal, ventas, stock, nUbicaciones, nCds, nZonas }) => {
  const pctAcumulado = ventasTotal > 0 ? (ventas.acumulado / ventasTotal) : 1;
  const abc = pctAcumulado <= CORTE_A ? "A" : pctAcumulado <= CORTE_B ? "B" : "C";

  const rot = stock > 0 ? ventas.propia / stock : 0;
  let xyz;
  if (ventas.propia <= 0 || rot === 0) xyz = "Z";
  else if (rot >= ROT_X) xyz = "X";
  else if (rot >= ROT_Y) xyz = "Y";
  else xyz = "Z";

  let score = scoreAbc(abc) + bonusXyz(xyz) + scoreDispersion(nUbicaciones);
  if (nZonas >= 4) score += 10;
  else if (nZonas >= 2) score += 5;
  if (nCds >= 2) score += 5;
  score = Math.min(100, score);

  const prioridad = score >= 75 ? "P1" : score >= 55 ? "P2" : score >= 35 ? "P3" : "P4";
  const frecuencia =
    prioridad === "P1" ? "SEMANAL" : prioridad === "P2" ? "QUINCENAL" : prioridad === "P3" ? "MENSUAL" : "TRIMESTRAL";

  return { abc, xyz, score, prioridad, frecuencia };
};

// Días hábiles (lun-vie) entre fechaInicio y fechaInicio+horizonteDias.
const generarDiasHabiles = (fechaInicio, horizonteDias) => {
  const dias = [];
  const cursor = new Date(fechaInicio + "T00:00:00");
  const limite = new Date(cursor);
  limite.setDate(limite.getDate() + horizonteDias);

  while (cursor < limite) {
    const diaSemana = cursor.getDay(); // 0=domingo .. 6=sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      dias.push({
        fecha: cursor.toISOString().slice(0, 10),
        diaSemana: DIAS_SEMANA[diaSemana],
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
};

/**
 * GET /api/inventario-ciclico/:uploadId/capacidad
 */
export const obtenerCapacidadCd = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { uploadId } = req.params;

    const cdsRes = await pool.query(
      `SELECT DISTINCT cd FROM ciclico_stock WHERE upload_id = $1 AND empresa_id = $2 AND cd IS NOT NULL ORDER BY cd`,
      [uploadId, empresaId]
    );
    const capRes = await pool.query(
      `SELECT cd, capacidad_por_turno, turnos_por_dia FROM ciclico_capacidad_cd WHERE empresa_id = $1`,
      [empresaId]
    );
    const capPorCd = Object.fromEntries(capRes.rows.map((r) => [r.cd, r]));

    const capacidad = cdsRes.rows.map((r) => ({
      cd: r.cd,
      capacidad_por_turno: capPorCd[r.cd]?.capacidad_por_turno ?? CAPACIDAD_DEFAULT,
      turnos_por_dia: capPorCd[r.cd]?.turnos_por_dia ?? 3,
      configurado: Boolean(capPorCd[r.cd]),
    }));

    res.json({ ok: true, capacidad });
  } catch (error) {
    console.error("❌ Error obteniendo capacidad por CD:", error);
    res.status(500).json({ ok: false, message: "Error obteniendo capacidad por CD" });
  }
};

/**
 * PUT /api/inventario-ciclico/capacidad
 * Body: { capacidad: [{ cd, capacidad_por_turno, turnos_por_dia }] }
 */
export const guardarCapacidadCd = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { capacidad = [] } = req.body;

    for (const item of capacidad) {
      if (!item?.cd) continue;
      await pool.query(
        `INSERT INTO ciclico_capacidad_cd (empresa_id, cd, capacidad_por_turno, turnos_por_dia)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (empresa_id, cd) DO UPDATE SET
           capacidad_por_turno = EXCLUDED.capacidad_por_turno,
           turnos_por_dia = EXCLUDED.turnos_por_dia,
           actualizado_en = NOW()`,
        [empresaId, item.cd, Number(item.capacidad_por_turno) || CAPACIDAD_DEFAULT, Number(item.turnos_por_dia) || 3]
      );
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("❌ Error guardando capacidad por CD:", error);
    res.status(500).json({ ok: false, message: "Error guardando capacidad por CD" });
  }
};

/**
 * POST /api/inventario-ciclico/:uploadId/plan
 * Body: { horizonte_dias = 45 (máx. 45), fecha_inicio, capacidad? = [{cd, capacidad_por_turno}] }
 */
export const generarPlanCiclico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const usuarioId = req.user?.id;
    const { uploadId } = req.params;
    // Tope de 45 días acordado con el usuario: un ciclo mas largo pierde el
    // sentido de "cíclico" para la operación real.
    const horizonteDias = Math.min(45, Number(req.body?.horizonte_dias) || 45);
    const fechaInicio = req.body?.fecha_inicio || new Date().toISOString().slice(0, 10);

    const uploadRes = await pool.query(
      `SELECT id FROM ciclico_uploads WHERE id = $1 AND empresa_id = $2`,
      [uploadId, empresaId]
    );
    if (uploadRes.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Carga no encontrada" });
    }

    // Si vino capacidad nueva en el body, se guarda de paso (mismo upsert que /capacidad).
    if (Array.isArray(req.body?.capacidad)) {
      for (const item of req.body.capacidad) {
        if (!item?.cd) continue;
        await pool.query(
          `INSERT INTO ciclico_capacidad_cd (empresa_id, cd, capacidad_por_turno, turnos_por_dia)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (empresa_id, cd) DO UPDATE SET
             capacidad_por_turno = EXCLUDED.capacidad_por_turno,
             turnos_por_dia = EXCLUDED.turnos_por_dia,
             actualizado_en = NOW()`,
          [empresaId, item.cd, Number(item.capacidad_por_turno) || CAPACIDAD_DEFAULT, Number(item.turnos_por_dia) || 3]
        );
      }
    }

    // 1) Agregado por SKU (global, igual que el VBA: MAX de ventas/stock/costo
    //    entre todas las filas del SKU, sin importar el CD).
    const porSkuRes = await pool.query(
      `SELECT
         sku,
         MAX(descripcion) AS descripcion,
         MAX(ventas) AS ventas,
         MAX(stock_total) AS stock,
         COUNT(DISTINCT ubicacion) AS n_ubicaciones,
         COUNT(DISTINCT cd) AS n_cds,
         COUNT(DISTINCT zona) AS n_zonas
       FROM ciclico_stock
       WHERE upload_id = $1
       GROUP BY sku`,
      [uploadId]
    );

    const totalVentas = porSkuRes.rows.reduce((acc, r) => acc + Number(r.ventas || 0), 0) || 1;
    const filasOrdenadas = [...porSkuRes.rows].sort((a, b) => Number(b.ventas || 0) - Number(a.ventas || 0));

    let acumulado = 0;
    const clasificacionPorSku = {};
    for (const r of filasOrdenadas) {
      const ventasSku = Number(r.ventas || 0);
      acumulado += ventasSku;
      const clasif = clasificarSku({
        ventasTotal: totalVentas,
        ventas: { acumulado, propia: ventasSku },
        stock: Number(r.stock || 0),
        nUbicaciones: Number(r.n_ubicaciones || 0),
        nCds: Number(r.n_cds || 0),
        nZonas: Number(r.n_zonas || 0),
      });
      clasificacionPorSku[r.sku] = { ...clasif, descripcion: r.descripcion };
    }

    // 2) Tareas SKU x CD (una familia de tarea por cada CD donde el SKU tiene stock).
    const porSkuCdRes = await pool.query(
      `SELECT DISTINCT sku, cd FROM ciclico_stock WHERE upload_id = $1 AND cd IS NOT NULL`,
      [uploadId]
    );

    const tareasPorCd = {};
    for (const r of porSkuCdRes.rows) {
      const clasif = clasificacionPorSku[r.sku];
      if (!clasif) continue;
      if (!tareasPorCd[r.cd]) tareasPorCd[r.cd] = [];
      tareasPorCd[r.cd].push({
        sku: r.sku,
        descripcion: clasif.descripcion,
        prioridad: clasif.prioridad,
        frecuencia: clasif.frecuencia,
        score: clasif.score,
      });
    }

    // 3) Capacidad vigente por CD.
    const capRes = await pool.query(
      `SELECT cd, capacidad_por_turno, turnos_por_dia FROM ciclico_capacidad_cd WHERE empresa_id = $1`,
      [empresaId]
    );
    const capacidadPorCd = Object.fromEntries(capRes.rows.map((r) => [r.cd, r]));

    const diasHabiles = generarDiasHabiles(fechaInicio, horizonteDias);
    const fechaFin = diasHabiles.length ? diasHabiles[diasHabiles.length - 1].fecha : fechaInicio;

    // 4) Heurístico de agenda, por CD.
    const ordenPrioridad = { P1: 0, P2: 1, P3: 2, P4: 3 };
    const tareasParaInsertar = [];
    const resumenPorCd = [];

    for (const [cd, tareas] of Object.entries(tareasPorCd)) {
      const turnosPorDia = capacidadPorCd[cd]?.turnos_por_dia ?? 3;
      const capacidadTurno = capacidadPorCd[cd]?.capacidad_por_turno ?? CAPACIDAD_DEFAULT;

      // slots = [{fecha, diaSemana, turno, cupoRestante}]
      const slots = [];
      for (const d of diasHabiles) {
        for (let turno = 1; turno <= turnosPorDia; turno++) {
          slots.push({ fecha: d.fecha, diaSemana: d.diaSemana, turno, cupoRestante: capacidadTurno });
        }
      }
      const totalSlots = slots.length;

      const tareasOrdenadas = [...tareas].sort((a, b) => ordenPrioridad[a.prioridad] - ordenPrioridad[b.prioridad]);

      let tareasNecesarias = 0;
      let tareasAsignadas = 0;

      for (const tarea of tareasOrdenadas) {
        const frecDias = FREQ_DIAS[tarea.frecuencia] || 30;
        const ocurrencias = Math.max(1, Math.round(horizonteDias / frecDias));
        tareasNecesarias += ocurrencias;

        for (let i = 0; i < ocurrencias; i++) {
          if (totalSlots === 0) break;
          const objetivo = Math.min(totalSlots - 1, Math.round((i * totalSlots) / ocurrencias));

          // busca el próximo slot con cupo desde la posición objetivo (y si no
          // hay hacia adelante, intenta hacia atrás antes de darse por vencido).
          let asignado = false;
          for (let off = 0; off < totalSlots && !asignado; off++) {
            for (const pos of [objetivo + off, objetivo - off]) {
              if (pos < 0 || pos >= totalSlots) continue;
              if (slots[pos].cupoRestante > 0) {
                slots[pos].cupoRestante--;
                tareasParaInsertar.push({
                  sku: tarea.sku,
                  descripcion: tarea.descripcion,
                  cd,
                  prioridad: tarea.prioridad,
                  frecuencia: tarea.frecuencia,
                  score: tarea.score,
                  fecha: slots[pos].fecha,
                  diaSemana: slots[pos].diaSemana,
                  turno: slots[pos].turno,
                });
                tareasAsignadas++;
                asignado = true;
                break;
              }
            }
          }
        }
      }

      resumenPorCd.push({
        cd,
        skus: tareas.length,
        tareas_necesarias: tareasNecesarias,
        tareas_asignadas: tareasAsignadas,
        capacidad_por_turno: capacidadTurno,
        turnos_por_dia: turnosPorDia,
        slots_disponibles: totalSlots,
        capacidad_insuficiente: tareasAsignadas < tareasNecesarias,
      });
    }

    // 5) Persistir plan + tareas.
    const planRes = await pool.query(
      `INSERT INTO ciclico_planes (upload_id, empresa_id, horizonte_dias, fecha_inicio, fecha_fin, total_tareas, generado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [uploadId, empresaId, horizonteDias, fechaInicio, fechaFin, tareasParaInsertar.length, usuarioId]
    );
    const planId = planRes.rows[0].id;

    const BATCH = 1000;
    for (let i = 0; i < tareasParaInsertar.length; i += BATCH) {
      const lote = tareasParaInsertar.slice(i, i + BATCH);
      if (lote.length === 0) continue;
      const cols = ["plan_id", "sku", "descripcion", "cd", "prioridad", "frecuencia", "score_total", "fecha", "dia_semana", "turno"];
      const values = [];
      const params = [];
      let p = 1;
      for (const t of lote) {
        const fila = [planId, t.sku, t.descripcion, t.cd, t.prioridad, t.frecuencia, t.score, t.fecha, t.diaSemana, t.turno];
        values.push(`(${fila.map(() => `$${p++}`).join(",")})`);
        params.push(...fila);
      }
      await pool.query(`INSERT INTO ciclico_plan_tareas (${cols.join(",")}) VALUES ${values.join(",")}`, params);
    }

    res.status(201).json({
      ok: true,
      plan_id: planId,
      horizonte_dias: horizonteDias,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      total_tareas: tareasParaInsertar.length,
      resumen_por_cd: resumenPorCd,
    });
  } catch (error) {
    console.error("❌ Error generando plan Inventario Cíclico:", error);
    res.status(500).json({ ok: false, message: "Error generando el plan" });
  }
};

/**
 * GET /api/inventario-ciclico/:uploadId/planes
 */
export const listarPlanesCiclico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { uploadId } = req.params;
    const { rows } = await pool.query(
      `SELECT id, horizonte_dias, fecha_inicio, fecha_fin, total_tareas, creado_en
       FROM ciclico_planes WHERE upload_id = $1 AND empresa_id = $2
       ORDER BY creado_en DESC LIMIT 20`,
      [uploadId, empresaId]
    );
    res.json({ ok: true, planes: rows });
  } catch (error) {
    console.error("❌ Error listando planes Inventario Cíclico:", error);
    res.status(500).json({ ok: false, message: "Error listando planes" });
  }
};

/**
 * GET /api/inventario-ciclico/plan/:planId
 */
export const obtenerPlanCiclico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { planId } = req.params;

    const planRes = await pool.query(
      `SELECT * FROM ciclico_planes WHERE id = $1 AND empresa_id = $2`,
      [planId, empresaId]
    );
    if (planRes.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Plan no encontrado" });
    }

    // Una tarea es "contar el SKU X en el CD Y", pero para ejecutar el
    // conteo en piso hace falta saber EN QUÉ ubicaciones físicas está ese
    // SKU -- se expande cada tarea a una fila por ubicación (join contra el
    // snapshot de stock de la misma carga), agregando también el piso para
    // poder filtrar por piso en el frontend. `tarea_id` permite volver a
    // agrupar por tarea real (para el resumen semanal, que cuenta SKU, no
    // ubicaciones).
    const tareasRes = await pool.query(
      `SELECT
         pt.id AS tarea_id, pt.sku, pt.descripcion, pt.cd, pt.prioridad, pt.frecuencia,
         pt.score_total, pt.fecha, pt.dia_semana, pt.turno, pt.estado,
         cs.ubicacion, cs.piso, cs.qty
       FROM ciclico_plan_tareas pt
       JOIN ciclico_planes p ON p.id = pt.plan_id
       LEFT JOIN ciclico_stock cs
         ON cs.upload_id = p.upload_id AND cs.sku = pt.sku AND cs.cd = pt.cd
       WHERE pt.plan_id = $1
       ORDER BY pt.cd, pt.fecha, pt.turno, pt.sku, cs.ubicacion`,
      [planId]
    );

    res.json({ ok: true, plan: planRes.rows[0], tareas: tareasRes.rows });
  } catch (error) {
    console.error("❌ Error obteniendo plan Inventario Cíclico:", error);
    res.status(500).json({ ok: false, message: "Error obteniendo el plan" });
  }
};
