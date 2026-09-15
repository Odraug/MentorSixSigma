// backend/controllers/inventarioCiclicoController.js
//
// Módulo Inventario Cíclico (Fase 1): carga de un archivo de ubicaciones
// (SKU x ubicación x CD) y motor de análisis ABC/XYZ + dispersión +
// sugerencia de consolidación. Adaptado de una macro VBA que el usuario ya
// usa en Excel para el mismo propósito.
//
// A propósito NO depende de un catálogo de SKU/ubicación: cada carga
// (`ciclico_uploads`) es un snapshot auto-contenido en `ciclico_stock`.
import pool from "../db.js";
import XLSX from "xlsx";

// Umbral de rotación (ventas / stock_total) para separar X de Y en la
// clasificación XYZ — mismo criterio que la macro (constante ROT_X).
// Ajustable si con datos reales conviene otro corte.
const ROT_X = 1.0;
// Cortes de Pareto para ABC (mismos que ya usa el módulo de ABC/XYZ por ventas).
const CORTE_A = 80;
const CORTE_B = 95;

const norm = (row) => {
  const out = {};
  for (const k in row) {
    if (Object.prototype.hasOwnProperty.call(row, k) && k != null) {
      out[String(k).trim().toUpperCase()] = row[k];
    }
  }
  return out;
};

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const numOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const strOrNull = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

/**
 * POST /api/inventario-ciclico/upload
 * Body (form-data): file
 */
export const subirArchivoCiclico = async (req, res) => {
  const client = await pool.connect();
  try {
    const empresaId = req.user?.empresa_id;
    const usuarioId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "Archivo requerido" });
    }
    if (!empresaId) {
      return res.status(400).json({ ok: false, message: "Falta empresa en el token" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (!filas.length) {
      return res.status(400).json({ ok: false, message: "El archivo no tiene filas" });
    }

    await client.query("BEGIN");

    const uploadRes = await client.query(
      `INSERT INTO ciclico_uploads (empresa_id, nombre_archivo, filas_totales, subido_por)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [empresaId, req.file.originalname, filas.length, usuarioId]
    );
    const uploadId = uploadRes.rows[0].id;

    const COLS = [
      "upload_id", "empresa_id", "sku", "descripcion", "marca",
      "depto", "desc_depto", "subdepto", "desc_subdepto", "familia", "desc_familia",
      "cd", "whse", "ubicacion", "zona", "pasillo", "bahia", "nivel", "piso",
      "qty", "stock_total", "stock_en_osr", "costo", "retail_price", "ventas",
      "logistica_osr", "sugerencia_osr", "full_qty", "half_qty", "quarter_qty", "raw",
    ];

    let procesadas = 0;
    const BATCH = 500;

    for (let i = 0; i < filas.length; i += BATCH) {
      const lote = filas.slice(i, i + BATCH);
      const values = [];
      const params = [];
      let p = 1;

      for (const filaOriginal of lote) {
        const f = norm(filaOriginal);
        const sku = strOrNull(f["SKU"]);
        if (!sku) continue; // fila sin SKU: no aporta al análisis, se ignora

        const fila = [
          uploadId,
          empresaId,
          sku,
          strOrNull(f["DESCRIPCION"]),
          strOrNull(f["MARCA"]),
          strOrNull(f["DEPTO"]),
          strOrNull(f["DESC_DEPTO"]),
          strOrNull(f["SUBDEPTO"]),
          strOrNull(f["DESC_SUBDEPTO"]),
          strOrNull(f["FAMILIA"]),
          strOrNull(f["DESC_FAMILIA"]),
          strOrNull(f["CD"]),
          strOrNull(f["WHSE"]),
          strOrNull(f["UBICACION"]),
          strOrNull(f["ZONA"]),
          strOrNull(f["PASILLO"]),
          strOrNull(f["BAHIA"]),
          strOrNull(f["LVL"]),
          strOrNull(f["PISO"]),
          num(f["QTY"], 0),
          num(f["STOCK_TOTAL"], 0),
          num(f["STOCK_EN_OSR"], 0),
          numOrNull(f["COSTO"]),
          numOrNull(f["RETAIL_PRICE"]),
          num(f["VENTAS"], 0),
          strOrNull(f["LOGISTICA_OSR"]),
          strOrNull(f["SUGERENCIA_OSR"]),
          numOrNull(f["FULL"]),
          numOrNull(f["HALF"]),
          numOrNull(f["QUARTER"]),
          JSON.stringify(filaOriginal),
        ];

        values.push(`(${fila.map(() => `$${p++}`).join(",")})`);
        params.push(...fila);
        procesadas++;
      }

      if (values.length > 0) {
        await client.query(
          `INSERT INTO ciclico_stock (${COLS.join(",")}) VALUES ${values.join(",")}`,
          params
        );
      }
    }

    await client.query(
      `UPDATE ciclico_uploads SET filas_procesadas = $1 WHERE id = $2`,
      [procesadas, uploadId]
    );

    await client.query("COMMIT");

    res.status(201).json({
      ok: true,
      upload_id: uploadId,
      filas_totales: filas.length,
      filas_procesadas: procesadas,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error subiendo archivo Inventario Cíclico:", error);
    res.status(500).json({ ok: false, message: "Error procesando el archivo" });
  } finally {
    client.release();
  }
};

/**
 * GET /api/inventario-ciclico/uploads
 */
export const listarUploadsCiclico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { rows } = await pool.query(
      `SELECT id, nombre_archivo, filas_totales, filas_procesadas, creado_en
       FROM ciclico_uploads
       WHERE empresa_id = $1
       ORDER BY creado_en DESC
       LIMIT 50`,
      [empresaId]
    );
    res.json({ ok: true, uploads: rows });
  } catch (error) {
    console.error("❌ Error listando uploads Inventario Cíclico:", error);
    res.status(500).json({ ok: false, message: "Error listando cargas" });
  }
};

// Confirma que el upload pedido pertenece a la empresa del token (nunca se
// confía en un upload_id de otra empresa, aunque el usuario lo adivine).
const verificarUpload = async (uploadId, empresaId) => {
  const { rows } = await pool.query(
    `SELECT id FROM ciclico_uploads WHERE id = $1 AND empresa_id = $2`,
    [uploadId, empresaId]
  );
  return rows.length > 0;
};

/**
 * GET /api/inventario-ciclico/:uploadId/resumen
 */
export const obtenerResumenCiclico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { uploadId } = req.params;

    if (!(await verificarUpload(uploadId, empresaId))) {
      return res.status(404).json({ ok: false, message: "Carga no encontrada" });
    }

    const generalRes = await pool.query(
      `SELECT
         COUNT(*) AS ubicaciones,
         COUNT(DISTINCT sku) AS skus,
         COALESCE(SUM(qty), 0) AS unidades
       FROM ciclico_stock WHERE upload_id = $1`,
      [uploadId]
    );

    // "Optimizable" = ubicaciones que se podrían liberar si cada SKU quedara
    // consolidado en su ubicación de mayor qty dentro de cada CD: es decir,
    // todas las ubicaciones de ese SKU en ese CD menos una (la ancla).
    const porCdRes = await pool.query(
      `WITH por_sku_cd AS (
         SELECT cd, sku, COUNT(*) AS n_ubic
         FROM ciclico_stock
         WHERE upload_id = $1
         GROUP BY cd, sku
       )
       SELECT
         cd,
         SUM(n_ubic) AS ubicaciones,
         SUM(GREATEST(n_ubic - 1, 0)) AS optimizables
       FROM por_sku_cd
       GROUP BY cd
       ORDER BY ubicaciones DESC`,
      [uploadId]
    );

    const general = generalRes.rows[0];
    const ubicaciones = Number(general.ubicaciones);
    const skus = Number(general.skus);

    const porCd = porCdRes.rows.map((r) => ({
      cd: r.cd || "(sin CD)",
      ubicaciones: Number(r.ubicaciones),
      optimizables: Number(r.optimizables),
      porcentaje: Number(r.ubicaciones) > 0
        ? Number(((Number(r.optimizables) / Number(r.ubicaciones)) * 100).toFixed(1))
        : 0,
    }));

    const totalOptimizables = porCd.reduce((acc, r) => acc + r.optimizables, 0);

    res.json({
      ok: true,
      resumen: {
        unidades: Number(general.unidades),
        ubicaciones,
        skus,
        ubicaciones_por_sku: skus > 0 ? Number((ubicaciones / skus).toFixed(2)) : 0,
        ubicaciones_optimizables: totalOptimizables,
        porcentaje_optimizable: ubicaciones > 0
          ? Number(((totalOptimizables / ubicaciones) * 100).toFixed(1))
          : 0,
      },
      por_cd: porCd,
    });
  } catch (error) {
    console.error("❌ Error en resumen Inventario Cíclico:", error);
    res.status(500).json({ ok: false, message: "Error calculando el resumen" });
  }
};

/**
 * GET /api/inventario-ciclico/:uploadId/abc-xyz
 * ABC por Pareto acumulado de ventas (80/95). XYZ por rotación
 * (ventas / stock_total): sin ventas -> Z, rotación >= ROT_X -> X, si no -> Y.
 */
export const obtenerAbcXyzCiclico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { uploadId } = req.params;

    if (!(await verificarUpload(uploadId, empresaId))) {
      return res.status(404).json({ ok: false, message: "Carga no encontrada" });
    }

    const { rows } = await pool.query(
      `WITH por_sku AS (
         SELECT
           sku,
           MAX(descripcion) AS descripcion,
           MAX(marca) AS marca,
           SUM(qty) AS qty_total,
           SUM(ventas) AS ventas_total,
           SUM(stock_total) AS stock_total,
           COUNT(DISTINCT ubicacion) AS n_ubicaciones,
           COUNT(DISTINCT cd) AS n_cds
         FROM ciclico_stock
         WHERE upload_id = $1
         GROUP BY sku
       ),
       rankeado AS (
         SELECT *,
           SUM(ventas_total) OVER (ORDER BY ventas_total DESC, sku) AS acumulado,
           SUM(ventas_total) OVER () AS total_general
         FROM por_sku
       )
       SELECT *,
         CASE WHEN total_general > 0
           THEN ROUND(100.0 * acumulado / total_general, 2)
           ELSE 0 END AS pct_acumulado
       FROM rankeado
       ORDER BY ventas_total DESC, sku`,
      [uploadId]
    );

    const resumenMatriz = {};
    for (const abc of ["A", "B", "C"]) {
      for (const xyz of ["X", "Y", "Z"]) resumenMatriz[`${abc}${xyz}`] = 0;
    }

    const data = rows.map((r) => {
      const pct = Number(r.pct_acumulado);
      const abc = pct <= CORTE_A ? "A" : pct <= CORTE_B ? "B" : "C";
      const ventas = Number(r.ventas_total);
      const stock = Number(r.stock_total);
      const rotacion = stock > 0 ? ventas / stock : 0;
      const xyz = ventas <= 0 ? "Z" : rotacion >= ROT_X ? "X" : "Y";
      resumenMatriz[`${abc}${xyz}`]++;
      return {
        sku: r.sku,
        descripcion: r.descripcion,
        marca: r.marca,
        qty_total: Number(r.qty_total),
        ventas_total: ventas,
        stock_total: stock,
        rotacion: Number(rotacion.toFixed(2)),
        n_ubicaciones: Number(r.n_ubicaciones),
        n_cds: Number(r.n_cds),
        pct_acumulado: pct,
        clase_abc: abc,
        clase_xyz: xyz,
        matriz: `${abc}${xyz}`,
      };
    });

    res.json({ ok: true, total_skus: data.length, resumen_matriz: resumenMatriz, data });
  } catch (error) {
    console.error("❌ Error en ABC/XYZ Inventario Cíclico:", error);
    res.status(500).json({ ok: false, message: "Error calculando ABC/XYZ" });
  }
};

/**
 * GET /api/inventario-ciclico/:uploadId/dispersion
 * Cuántos SKU están en 1 / 2 / 3 / 4 / 5+ ubicaciones, global y por CD.
 */
export const obtenerDispersionCiclico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { uploadId } = req.params;

    if (!(await verificarUpload(uploadId, empresaId))) {
      return res.status(404).json({ ok: false, message: "Carga no encontrada" });
    }

    const globalRes = await pool.query(
      `SELECT n_ubic, COUNT(*) AS skus FROM (
         SELECT sku, COUNT(DISTINCT ubicacion) AS n_ubic
         FROM ciclico_stock WHERE upload_id = $1 GROUP BY sku
       ) t GROUP BY n_ubic ORDER BY n_ubic`,
      [uploadId]
    );

    const porCdRes = await pool.query(
      `SELECT cd, n_ubic, COUNT(*) AS skus FROM (
         SELECT cd, sku, COUNT(DISTINCT ubicacion) AS n_ubic
         FROM ciclico_stock WHERE upload_id = $1 GROUP BY cd, sku
       ) t GROUP BY cd, n_ubic ORDER BY cd, n_ubic`,
      [uploadId]
    );

    // Baldes 1 / 2 / 3 / 4 / 5+ con la codificación que se propuso:
    // 1 excelente, 2 controlado, 3 revisar, 4 alto, 5+ crítico.
    const balde = (n) => (n >= 5 ? "5+" : String(n));
    const nuevoBalde = () => ({ "1": 0, "2": 0, "3": 0, "4": 0, "5+": 0 });

    const global = nuevoBalde();
    for (const r of globalRes.rows) global[balde(Number(r.n_ubic))] += Number(r.skus);

    const porCd = {};
    for (const r of porCdRes.rows) {
      const cd = r.cd || "(sin CD)";
      if (!porCd[cd]) porCd[cd] = nuevoBalde();
      porCd[cd][balde(Number(r.n_ubic))] += Number(r.skus);
    }

    res.json({ ok: true, global, por_cd: porCd });
  } catch (error) {
    console.error("❌ Error en dispersión Inventario Cíclico:", error);
    res.status(500).json({ ok: false, message: "Error calculando la dispersión" });
  }
};

/**
 * GET /api/inventario-ciclico/:uploadId/consolidacion?cd=CD1
 * Por SKU x CD: ubicación "ancla" (mayor qty) a mantener, resto a mover.
 */
export const obtenerConsolidacionCiclico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { uploadId } = req.params;
    const { cd } = req.query;

    if (!(await verificarUpload(uploadId, empresaId))) {
      return res.status(404).json({ ok: false, message: "Carga no encontrada" });
    }

    const params = [uploadId];
    let filtroCd = "";
    if (cd) {
      params.push(cd);
      filtroCd = `AND cd = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT cd, sku, MAX(descripcion) AS descripcion, ubicacion, SUM(qty) AS qty
       FROM ciclico_stock
       WHERE upload_id = $1 ${filtroCd}
       GROUP BY cd, sku, ubicacion
       ORDER BY cd, sku, qty DESC`,
      params
    );

    // Agrupa en memoria por CD+SKU (ya viene ordenado por qty desc, así que
    // la primera fila de cada grupo es la ubicación ancla).
    const grupos = new Map();
    for (const r of rows) {
      const key = `${r.cd}|${r.sku}`;
      if (!grupos.has(key)) {
        grupos.set(key, {
          cd: r.cd || "(sin CD)",
          sku: r.sku,
          descripcion: r.descripcion,
          ubicaciones: [],
        });
      }
      grupos.get(key).ubicaciones.push({ ubicacion: r.ubicacion, qty: Number(r.qty) });
    }

    const sugerencias = [];
    for (const g of grupos.values()) {
      const nUbic = g.ubicaciones.length;
      if (nUbic <= 1) continue; // ya está en una sola ubicación, sin oportunidad

      const [ancla, ...resto] = g.ubicaciones;
      sugerencias.push({
        cd: g.cd,
        sku: g.sku,
        descripcion: g.descripcion,
        n_ubicaciones: nUbic,
        ubicacion_ancla: ancla.ubicacion,
        qty_ancla: ancla.qty,
        qty_total: g.ubicaciones.reduce((acc, u) => acc + u.qty, 0),
        ubicaciones_a_mover: resto.map((u) => ({ ubicacion: u.ubicacion, qty: u.qty })),
        ubicaciones_a_liberar: resto.length,
      });
    }

    sugerencias.sort((a, b) => b.ubicaciones_a_liberar - a.ubicaciones_a_liberar);

    res.json({
      ok: true,
      total_grupos_con_oportunidad: sugerencias.length,
      total_ubicaciones_a_liberar: sugerencias.reduce((acc, s) => acc + s.ubicaciones_a_liberar, 0),
      sugerencias,
    });
  } catch (error) {
    console.error("❌ Error en consolidación Inventario Cíclico:", error);
    res.status(500).json({ ok: false, message: "Error calculando la consolidación" });
  }
};
