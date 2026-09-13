// backend/controllers/abcXyzController.js
//
// Motor de clasificación ABC/XYZ.
// - ABC: clasifica los SKU por su aporte acumulado a la demanda total (Pareto 80/15/5),
//        usando unidades despachadas (erp_core.order_items). Si más adelante agregas
//        un costo/precio unitario a `products`, cambia SUM(oi.quantity) por
//        SUM(oi.quantity * p.unit_cost) para que sea ABC por valor (más preciso).
// - XYZ: clasifica por variabilidad de la demanda mensual (coeficiente de variación).
//        X = estable, Y = variable, Z = errática/esporádica.
//
// Sigue el mismo patrón que dashboardController.js (companyId por query/param,
// pool.query directo). Ver nota de seguridad al final del archivo.

import pool from "../db.js";

const CLASSIFY_QUERY = `
  WITH filtered_items AS (
    SELECT
      oi.product_id,
      p.sku_code,
      p.name AS product_name,
      date_trunc('month', o.created_at) AS periodo,
      SUM(oi.quantity) AS qty_mes
    FROM erp_core.order_items oi
    JOIN erp_core.orders o    ON o.id = oi.order_id
    JOIN erp_core.products p  ON p.id = oi.product_id
    WHERE o.company_id = $1
      AND o.created_at >= $2
      AND o.created_at <  $3
      AND o.status NOT IN ('cancelled', 'draft')
    GROUP BY oi.product_id, p.sku_code, p.name, date_trunc('month', o.created_at)
  ),
  totales AS (
    SELECT
      product_id,
      sku_code,
      product_name,
      SUM(qty_mes)                    AS qty_total,
      AVG(qty_mes)                    AS qty_promedio,
      COALESCE(STDDEV_POP(qty_mes),0) AS qty_stddev,
      COUNT(*)                        AS meses_con_movimiento
    FROM filtered_items
    GROUP BY product_id, sku_code, product_name
  ),
  ranked AS (
    SELECT
      *,
      SUM(qty_total) OVER (ORDER BY qty_total DESC)              AS acumulado,
      SUM(qty_total) OVER ()                                     AS total_general,
      ROW_NUMBER() OVER (ORDER BY qty_total DESC)                AS posicion
    FROM totales
  ),
  clasificado AS (
    SELECT
      *,
      ROUND(100.0 * acumulado / NULLIF(total_general, 0), 2) AS pct_acumulado,
      CASE
        WHEN qty_promedio > 0
        THEN ROUND((qty_stddev / NULLIF(qty_promedio, 0))::numeric, 3)
        ELSE NULL
      END AS coef_variacion
    FROM ranked
  )
  SELECT
    product_id,
    sku_code,
    product_name,
    qty_total,
    meses_con_movimiento,
    pct_acumulado,
    coef_variacion,
    CASE
      WHEN pct_acumulado <= 80 THEN 'A'
      WHEN pct_acumulado <= 95 THEN 'B'
      ELSE 'C'
    END AS clase_abc,
    CASE
      WHEN coef_variacion IS NULL THEN 'Z'
      WHEN coef_variacion <= 0.5  THEN 'X'
      WHEN coef_variacion <= 1.0  THEN 'Y'
      ELSE 'Z'
    END AS clase_xyz
  FROM clasificado
  ORDER BY qty_total DESC;
`;

/**
 * GET /api/analisis/abc-xyz?companyId=1&meses=6
 * Calcula la clasificación en caliente (sin guardar) y la devuelve
 * junto con un resumen por celda de la matriz A/B/C x X/Y/Z.
 */
export const calcularAbcXyz = async (req, res) => {
  try {
    const companyId = req.query.companyId || req.params.companyId;
    const meses = Number(req.query.meses) || 6;

    if (!companyId) {
      return res.status(400).json({ error: "companyId es obligatorio" });
    }

    const fechaHasta = new Date();
    const fechaDesde = new Date();
    fechaDesde.setMonth(fechaDesde.getMonth() - meses);

    const { rows } = await pool.query(CLASSIFY_QUERY, [
      companyId,
      fechaDesde.toISOString(),
      fechaHasta.toISOString(),
    ]);

    const data = rows.map((r) => ({
      ...r,
      matriz: `${r.clase_abc}${r.clase_xyz}`,
    }));

    // Resumen por celda de la matriz, útil para el dashboard/heatmap
    const resumen = {};
    for (const abc of ["A", "B", "C"]) {
      for (const xyz of ["X", "Y", "Z"]) {
        resumen[`${abc}${xyz}`] = { skus: 0, qty_total: 0 };
      }
    }
    for (const row of data) {
      resumen[row.matriz].skus += 1;
      resumen[row.matriz].qty_total += Number(row.qty_total);
    }

    res.json({
      ok: true,
      periodo_meses: meses,
      total_skus: data.length,
      resumen,
      data,
    });
  } catch (error) {
    console.error("❌ Error calculando ABC/XYZ:", error);
    res.status(500).json({ error: "Error calculando clasificación ABC/XYZ" });
  }
};

/**
 * POST /api/analisis/abc-xyz/guardar  { companyId, meses }
 * Igual que arriba, pero además persiste el resultado en
 * sku_logistics_profile para que otros módulos (DRP, layout) lo consuman
 * sin recalcular cada vez.
 */
export const guardarAbcXyz = async (req, res) => {
  const client = await pool.connect();
  try {
    const { companyId, meses = 6 } = req.body;
    if (!companyId) {
      return res.status(400).json({ error: "companyId es obligatorio" });
    }

    const fechaHasta = new Date();
    const fechaDesde = new Date();
    fechaDesde.setMonth(fechaDesde.getMonth() - Number(meses));

    const { rows } = await client.query(CLASSIFY_QUERY, [
      companyId,
      fechaDesde.toISOString(),
      fechaHasta.toISOString(),
    ]);

    await client.query("BEGIN");

    let actualizados = 0;
    for (const row of rows) {
      const abc = row.pct_acumulado <= 80 ? "A" : row.pct_acumulado <= 95 ? "B" : "C";
      const cv = row.coef_variacion;
      const xyz = cv === null ? "Z" : cv <= 0.5 ? "X" : cv <= 1.0 ? "Y" : "Z";

      const result = await client.query(
        `UPDATE sku_logistics_profile
         SET segmento_abc = $1,
             segmento_xyz = $2,
             matriz_abc_xyz = $3,
             coef_variacion = $4,
             abc_xyz_actualizado_en = NOW()
         WHERE sku_id = $5`,
        [abc, xyz, `${abc}${xyz}`, cv, row.product_id]
      );
      actualizados += result.rowCount;
    }

    await client.query("COMMIT");
    res.json({ ok: true, skus_procesados: rows.length, skus_actualizados: actualizados });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error guardando ABC/XYZ:", error);
    res.status(500).json({ error: "Error guardando clasificación ABC/XYZ" });
  } finally {
    client.release();
  }
};

/*
  NOTA DE SEGURIDAD (aplica también a dashboardController.js y otros):
  companyId viene del query/body del cliente, no del token JWT (req.user.empresa_id).
  Cualquier usuario autenticado de OTRA empresa podría pasar un companyId ajeno
  y ver sus datos. Recomiendo, cuando tengas tiempo, validar en el middleware:
    if (String(req.user.empresa_id) !== String(companyId)) return res.status(403)...
  o directamente ignorar el companyId del cliente y usar siempre req.user.empresa_id.
*/
