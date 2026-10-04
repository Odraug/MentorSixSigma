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
import ExcelJS from "exceljs";
import { Readable } from "stream";

// Umbral de rotación (ventas / stock_total) para separar X de Y en la
// clasificación XYZ — mismo criterio que la macro (constante ROT_X).
// Ajustable si con datos reales conviene otro corte.
const ROT_X = 1.0;
// Cortes de Pareto para ABC (mismos que ya usa el módulo de ABC/XYZ por ventas).
const CORTE_A = 80;
const CORTE_B = 95;

// ExcelJS entrega cada celda como valor primitivo, Date, o un objeto
// especial (fórmula, texto enriquecido, hipervínculo) — esto lo reduce
// siempre a un valor plano simple.
const cellValue = (v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === "object") {
    if (v instanceof Date) return v;
    if (Object.prototype.hasOwnProperty.call(v, "result")) return v.result; // fórmula
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join(""); // texto enriquecido
    if (Object.prototype.hasOwnProperty.call(v, "text")) return v.text; // hipervínculo { text, hyperlink }
  }
  return v;
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

const COLS_STOCK = [
  "upload_id", "empresa_id", "sku", "descripcion", "marca",
  "depto", "desc_depto", "subdepto", "desc_subdepto", "familia", "desc_familia",
  "cd", "whse", "ubicacion", "zona", "pasillo", "bahia", "nivel", "piso",
  "qty", "stock_total", "stock_en_osr", "costo", "retail_price", "ventas",
  "logistica_osr", "sugerencia_osr", "full_qty", "half_qty", "quarter_qty", "raw",
];

// Archivos reales son de decenas/cientos de miles de filas (SKU x ubicación).
// Un primer intento con la librería `xlsx` cargaba el archivo COMPLETO en
// memoria antes de procesar nada, y en el plan gratuito de Render (muy poca
// RAM) el proceso moría sin dejar ningún error registrado -- la carga
// quedaba pegada en "procesando" para siempre. Por eso se usa el lector en
// streaming de `exceljs`: lee fila por fila desde el buffer sin nunca tener
// el archivo entero en memoria, e inserta en lotes a medida que lee. Todo
// esto corre después de responder al cliente; el frontend hace polling con
// /estado para ver el progreso.
const procesarArchivoEnSegundoPlano = async (uploadId, empresaId, buffer) => {
  const BATCH = 1000;
  let procesadas = 0;
  let filasLeidas = 0;
  let huboFilas = false;
  let headers = null;
  let lote = [];

  const insertarLote = async () => {
    if (lote.length === 0) return;
    const values = [];
    const params = [];
    let p = 1;
    for (const fila of lote) {
      values.push(`(${fila.map(() => `$${p++}`).join(",")})`);
      params.push(...fila);
    }
    await pool.query(
      `INSERT INTO ciclico_stock (${COLS_STOCK.join(",")}) VALUES ${values.join(",")}`,
      params
    );
    lote = [];
  };

  const actualizarProgreso = () =>
    pool.query(`UPDATE ciclico_uploads SET filas_totales = $1, filas_procesadas = $2 WHERE id = $3`, [
      filasLeidas,
      procesadas,
      uploadId,
    ]);

  try {
    const stream = Readable.from(buffer);
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(stream, {
      sharedStrings: "cache",
      styles: "ignore",
      hyperlinks: "ignore",
      worksheets: "emit",
    });

    let primeraHojaProcesada = false;

    for await (const worksheetReader of workbookReader) {
      if (primeraHojaProcesada) {
        // Ya se procesó la hoja con datos. Aun así hay que drenar el resto
        // de hojas: cortar la iteración acá con `break` dejaba al lector en
        // streaming colgado a veces (nunca llegaba a marcar el upload como
        // "listo" aunque ya hubiera insertado todas las filas), así que en
        // vez de eso simplemente se ignoran sus filas sin salir del loop.
        for await (const _fila of worksheetReader) {
          // ignorar
        }
        continue;
      }

      for await (const row of worksheetReader) {
        if (!headers) {
          // Fila de encabezados: define el mapeo de columna -> nombre.
          headers = row.values.map((v) => {
            const val = cellValue(v);
            return val == null ? null : String(val).trim().toUpperCase();
          });
          continue;
        }

        huboFilas = true;
        filasLeidas++;

        const f = {};
        for (let c = 1; c < row.values.length; c++) {
          if (headers[c]) f[headers[c]] = cellValue(row.values[c]);
        }

        const sku = strOrNull(f["SKU"]);
        if (sku) {
          lote.push([
            uploadId, empresaId, sku,
            strOrNull(f["DESCRIPCION"]), strOrNull(f["MARCA"]),
            strOrNull(f["DEPTO"]), strOrNull(f["DESC_DEPTO"]),
            strOrNull(f["SUBDEPTO"]), strOrNull(f["DESC_SUBDEPTO"]),
            strOrNull(f["FAMILIA"]), strOrNull(f["DESC_FAMILIA"]),
            strOrNull(f["CD"]), strOrNull(f["WHSE"]), strOrNull(f["UBICACION"]),
            strOrNull(f["ZONA"]), strOrNull(f["PASILLO"]), strOrNull(f["BAHIA"]),
            strOrNull(f["LVL"]), strOrNull(f["PISO"]),
            num(f["QTY"], 0), num(f["STOCK_TOTAL"], 0), num(f["STOCK_EN_OSR"], 0),
            numOrNull(f["COSTO"]), numOrNull(f["RETAIL_PRICE"]), num(f["VENTAS"], 0),
            strOrNull(f["LOGISTICA_OSR"]), strOrNull(f["SUGERENCIA_OSR"]),
            numOrNull(f["FULL"]), numOrNull(f["HALF"]), numOrNull(f["QUARTER"]),
            JSON.stringify(f),
          ]);
          procesadas++;
        }

        if (lote.length >= BATCH) {
          await insertarLote();
          await actualizarProgreso();
        }
      }
      primeraHojaProcesada = true;
    }

    await insertarLote(); // remanente que no llegó a completar un lote

    if (!huboFilas) {
      await pool.query(
        `UPDATE ciclico_uploads SET estado = 'error', error_mensaje = $1 WHERE id = $2`,
        ["El archivo no tiene filas (o no se encontró la hoja con datos)", uploadId]
      );
      return;
    }

    await pool.query(
      `UPDATE ciclico_uploads SET filas_totales = $1, filas_procesadas = $2, estado = 'listo' WHERE id = $3`,
      [filasLeidas, procesadas, uploadId]
    );
  } catch (error) {
    console.error("❌ Error procesando archivo Inventario Cíclico (upload " + uploadId + "):", error);
    try {
      await pool.query(
        `UPDATE ciclico_uploads SET estado = 'error', error_mensaje = $1 WHERE id = $2`,
        [String(error.message || error).slice(0, 500), uploadId]
      );
    } catch (errorSecundario) {
      console.error("❌ Además falló al registrar el error en la base:", errorSecundario);
    }
  }
};

/**
 * POST /api/inventario-ciclico/upload
 * Body (form-data): file
 * Responde apenas se crea el registro de carga; el procesamiento pesado
 * sigue en segundo plano (ver /estado para el progreso).
 */
export const subirArchivoCiclico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const usuarioId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "Archivo requerido" });
    }
    if (!empresaId) {
      return res.status(400).json({ ok: false, message: "Falta empresa en el token" });
    }

    // Todavía no se lee el archivo acá: con 100k+ filas, parsearlo solo ya
    // puede tardar decenas de segundos y no queremos bloquear la respuesta.
    const uploadRes = await pool.query(
      `INSERT INTO ciclico_uploads (empresa_id, nombre_archivo, filas_totales, subido_por, estado)
       VALUES ($1, $2, 0, $3, 'procesando')
       RETURNING id`,
      [empresaId, req.file.originalname, usuarioId]
    );
    const uploadId = uploadRes.rows[0].id;

    res.status(202).json({
      ok: true,
      upload_id: uploadId,
      estado: "procesando",
    });

    // No se espera (await) esta llamada: sigue corriendo después de responder.
    procesarArchivoEnSegundoPlano(uploadId, empresaId, req.file.buffer);
  } catch (error) {
    console.error("❌ Error subiendo archivo Inventario Cíclico:", error);
    res.status(500).json({ ok: false, message: "Error procesando el archivo" });
  }
};

/**
 * GET /api/inventario-ciclico/:uploadId/estado
 * Para hacer polling del progreso de una carga grande.
 */
export const obtenerEstadoCiclico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { uploadId } = req.params;

    const { rows } = await pool.query(
      `SELECT id, filas_totales, filas_procesadas, estado, error_mensaje, creado_en
       FROM ciclico_uploads WHERE id = $1 AND empresa_id = $2`,
      [uploadId, empresaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Carga no encontrada" });
    }

    let carga = rows[0];

    // Red de seguridad: si el proceso en segundo plano murió (reinicio del
    // servidor, sin memoria, etc.) sin llegar a marcar error, la carga queda
    // en "procesando" para siempre. Si pasaron más de 10 minutos sin
    // novedades, se da por perdida en vez de dejar al usuario esperando.
    const minutosDesdeCreacion = (Date.now() - new Date(carga.creado_en).getTime()) / 60000;
    if (carga.estado === "procesando" && minutosDesdeCreacion > 10) {
      const mensaje = "El procesamiento se interrumpió (probablemente el servidor se reinició por falta de memoria). Probá subir el archivo de nuevo.";
      await pool.query(
        `UPDATE ciclico_uploads SET estado = 'error', error_mensaje = $1 WHERE id = $2 AND estado = 'procesando'`,
        [mensaje, uploadId]
      );
      carga = { ...carga, estado: "error", error_mensaje: mensaje };
    }

    res.json({ ok: true, ...carga });
  } catch (error) {
    console.error("❌ Error consultando estado Inventario Cíclico:", error);
    res.status(500).json({ ok: false, message: "Error consultando el estado" });
  }
};

/**
 * GET /api/inventario-ciclico/uploads
 */
export const listarUploadsCiclico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { rows } = await pool.query(
      `SELECT id, nombre_archivo, filas_totales, filas_procesadas, estado, creado_en
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
           COUNT(DISTINCT cd) AS n_cds,
           ARRAY_AGG(DISTINCT cd) AS cds
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

    const matrizPorSku = {};
    const data = rows.map((r) => {
      const pct = Number(r.pct_acumulado);
      const abc = pct <= CORTE_A ? "A" : pct <= CORTE_B ? "B" : "C";
      const ventas = Number(r.ventas_total);
      const stock = Number(r.stock_total);
      const rotacion = stock > 0 ? ventas / stock : 0;
      const xyz = ventas <= 0 ? "Z" : rotacion >= ROT_X ? "X" : "Y";
      const matriz = `${abc}${xyz}`;
      resumenMatriz[matriz]++;
      matrizPorSku[r.sku] = matriz;
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
        cds: r.cds || [],
        pct_acumulado: pct,
        clase_abc: abc,
        clase_xyz: xyz,
        matriz,
      };
    });

    // Apertura por CD: cuántas unidades vendidas (qty) y cuánto stock actual
    // (stock_total) tiene cada SKU en cada CD, reutilizando la clasificación
    // ya calculada arriba por SKU.
    const { rows: cdRows } = await pool.query(
      `SELECT sku, cd, SUM(qty) AS unidades, SUM(stock_total) AS stock
       FROM ciclico_stock
       WHERE upload_id = $1
       GROUP BY sku, cd`,
      [uploadId]
    );

    const resumenCdMatrizMap = {};
    for (const r of cdRows) {
      const matriz = matrizPorSku[r.sku];
      if (!matriz) continue;
      const key = `${r.cd}|${matriz}`;
      if (!resumenCdMatrizMap[key]) {
        resumenCdMatrizMap[key] = { cd: r.cd, matriz, skus: 0, unidades: 0, stock: 0 };
      }
      resumenCdMatrizMap[key].skus += 1;
      resumenCdMatrizMap[key].unidades += Number(r.unidades);
      resumenCdMatrizMap[key].stock += Number(r.stock);
    }
    const resumenCdMatriz = Object.values(resumenCdMatrizMap).sort(
      (a, b) => a.matriz.localeCompare(b.matriz) || a.cd.localeCompare(b.cd)
    );

    res.json({
      ok: true,
      total_skus: data.length,
      resumen_matriz: resumenMatriz,
      resumen_cd_matriz: resumenCdMatriz,
      data,
    });
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

// Solo AX/AY/BX se consideran candidatas a vivir en el OSR (alta/media
// rotación). A cada una se le asigna un tipo de tote: a mayor rotación,
// tote más grande, para maximizar SKU y unidades por slot de la máquina.
const TOTE_POR_MATRIZ = { AX: "FULL", AY: "HALF", BX: "QUARTER" };
const CAMPO_CAPACIDAD = { FULL: "full_qty", HALF: "half_qty", QUARTER: "quarter_qty" };
const TARGET_OCUPACION = 0.85;
const TOP_SUGERENCIAS = 300;

// Clasifica cada SKU (ABC/XYZ) y lo reparte en las 3 bolsas de acción sobre
// el OSR. Compartido entre /osr-reabastecimiento y /osr-simulacion para no
// recalcular (ni poder desincronizar) la misma lógica dos veces.
const calcularOsrReabastecimiento = async (uploadId) => {
  const { rows } = await pool.query(
      `WITH por_sku AS (
         SELECT
           sku,
           MAX(descripcion) AS descripcion,
           SUM(ventas) AS ventas_total,
           SUM(stock_total) AS stock_total,
           MAX(stock_en_osr) AS stock_en_osr,
           MAX(logistica_osr) AS logistica_osr,
           MAX(sugerencia_osr) AS sugerencia_osr,
           MAX(full_qty) AS full_qty,
           MAX(half_qty) AS half_qty,
           MAX(quarter_qty) AS quarter_qty
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

    const reabastecer = [];
    const incorporar = [];
    const recall = [];

    // Apertura por categoría AX/AY/BX: cuánto hay hoy en el OSR y cuánto
    // quedaría tras reabastecer+incorporar (el recall nunca toca estas 3
    // categorías por definición). Sirve de base para repartir una capacidad
    // objetivo del OSR por categoría más adelante.
    const porCategoria = {};
    for (const m of Object.keys(TOTE_POR_MATRIZ)) {
      porCategoria[m] = { skus_actual: 0, unidades_actual: 0, skus_proyectado: 0, unidades_proyectado: 0 };
    }

    let skusEnOsr = 0;
    let unidadesEnOsr = 0;

    for (const r of rows) {
      const pct = Number(r.pct_acumulado);
      const abc = pct <= CORTE_A ? "A" : pct <= CORTE_B ? "B" : "C";
      const ventas = Number(r.ventas_total);
      const stockTotal = Number(r.stock_total);
      const rotacion = stockTotal > 0 ? ventas / stockTotal : 0;
      const xyz = ventas <= 0 ? "Z" : rotacion >= ROT_X ? "X" : "Y";
      const matriz = `${abc}${xyz}`;

      const stockOsr = Number(r.stock_en_osr) || 0;
      const logisticaOsr = r.logistica_osr || null;

      if (stockOsr > 0) {
        skusEnOsr++;
        unidadesEnOsr += stockOsr;
      }

      const toteTipo = TOTE_POR_MATRIZ[matriz];

      if (toteTipo) {
        if (stockOsr > 0) {
          porCategoria[matriz].skus_actual++;
          porCategoria[matriz].unidades_actual += stockOsr;
          porCategoria[matriz].skus_proyectado++;
          porCategoria[matriz].unidades_proyectado += stockOsr;
        }

        const capacidad = Number(r[CAMPO_CAPACIDAD[toteTipo]]) || 0;
        if (capacidad > 0) {
          const target = Math.round(capacidad * TARGET_OCUPACION);
          const base = {
            sku: r.sku,
            descripcion: r.descripcion,
            matriz,
            tote_tipo: toteTipo,
            capacidad_tote: capacidad,
            target_unidades: target,
            logistica_osr: logisticaOsr,
            sugerencia_osr_origen: r.sugerencia_osr && r.sugerencia_osr !== "-" ? r.sugerencia_osr : null,
          };

          if (stockOsr > 0) {
            if (stockOsr < target) {
              const unidadesAReponer = target - stockOsr;
              reabastecer.push({
                ...base,
                ocupacion_actual: stockOsr,
                ocupacion_pct: Number(((stockOsr / capacidad) * 100).toFixed(1)),
                unidades_a_reponer: unidadesAReponer,
              });
              porCategoria[matriz].unidades_proyectado += unidadesAReponer;
            }
          } else if (logisticaOsr !== "N") {
            const unidadesSugeridas = Math.min(target, stockTotal);
            incorporar.push({
              ...base,
              stock_total_disponible: stockTotal,
              unidades_sugeridas: unidadesSugeridas,
            });
            porCategoria[matriz].skus_proyectado++;
            porCategoria[matriz].unidades_proyectado += unidadesSugeridas;
          }
        }
      } else if (stockOsr > 0) {
        recall.push({
          sku: r.sku,
          descripcion: r.descripcion,
          matriz,
          ocupacion_actual: stockOsr,
          logistica_osr: logisticaOsr,
        });
      }
    }

    reabastecer.sort((a, b) => b.unidades_a_reponer - a.unidades_a_reponer);
    incorporar.sort((a, b) => b.unidades_sugeridas - a.unidades_sugeridas);
    recall.sort((a, b) => b.ocupacion_actual - a.ocupacion_actual);

    return {
      reabastecer,
      incorporar,
      recall,
      estadoActualOsr: { skus: skusEnOsr, unidades: unidadesEnOsr },
      porCategoria,
    };
};

/**
 * GET /api/inventario-ciclico/:uploadId/osr-reabastecimiento
 * Tres sugerencias sobre el uso del OSR, usando las columnas del archivo
 * (stock_en_osr, logistica_osr, full/half/quarter_qty) + la clasificación
 * ABC/XYZ ya calculada en /abc-xyz:
 *  - reabastecer: SKU AX/AY/BX ya en el OSR por debajo del 85% del tote
 *    asignado según su categoría.
 *  - incorporar: SKU AX/AY/BX aptos (logistica_osr != 'N') que todavía no
 *    están en el OSR.
 *  - recall: SKU que están en el OSR pero NO son AX/AY/BX (baja rotación),
 *    candidatos a sacar para liberar capacidad.
 */
export const obtenerOsrReabastecimientoCiclico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { uploadId } = req.params;

    if (!(await verificarUpload(uploadId, empresaId))) {
      return res.status(404).json({ ok: false, message: "Carga no encontrada" });
    }

    const { reabastecer, incorporar, recall } = await calcularOsrReabastecimiento(uploadId);

    res.json({
      ok: true,
      resumen: {
        reabastecer: {
          cantidad: reabastecer.length,
          unidades_a_reponer: reabastecer.reduce((acc, s) => acc + s.unidades_a_reponer, 0),
        },
        incorporar: {
          cantidad: incorporar.length,
          unidades_sugeridas: incorporar.reduce((acc, s) => acc + s.unidades_sugeridas, 0),
        },
        recall: {
          cantidad: recall.length,
          unidades_a_liberar: recall.reduce((acc, s) => acc + s.ocupacion_actual, 0),
        },
      },
      reabastecer: reabastecer.slice(0, TOP_SUGERENCIAS),
      incorporar: incorporar.slice(0, TOP_SUGERENCIAS),
      recall: recall.slice(0, TOP_SUGERENCIAS),
    });
  } catch (error) {
    console.error("❌ Error en reabastecimiento OSR Inventario Cíclico:", error);
    res.status(500).json({ ok: false, message: "Error calculando el reabastecimiento OSR" });
  }
};

const CAPACIDAD_OSR_DEFAULT = 20;

/**
 * GET /api/inventario-ciclico/:uploadId/osr-simulacion
 * Simula el estado del OSR si se ejecutan las 3 acciones (recall +
 * reabastecer + incorporar): SKU y unidades antes/después, si lo liberado
 * por recall alcanza para cubrir lo que piden reabastecer+incorporar, y un
 * tiempo estimado de ejecución según la capacidad configurada para 'OSR' en
 * ciclico_capacidad_cd (la misma tabla que usa Plan de Inventario Cíclico;
 * si no está configurada se usa un default de 20 tareas/turno x 3 turnos).
 */
export const obtenerOsrSimulacionCiclico = async (req, res) => {
  try {
    const empresaId = req.user?.empresa_id;
    const { uploadId } = req.params;

    if (!(await verificarUpload(uploadId, empresaId))) {
      return res.status(404).json({ ok: false, message: "Carga no encontrada" });
    }

    const { reabastecer, incorporar, recall, estadoActualOsr, porCategoria } = await calcularOsrReabastecimiento(uploadId);

    const unidadesRecall = recall.reduce((acc, s) => acc + s.ocupacion_actual, 0);
    const unidadesReabastecer = reabastecer.reduce((acc, s) => acc + s.unidades_a_reponer, 0);
    const unidadesIncorporar = incorporar.reduce((acc, s) => acc + s.unidades_sugeridas, 0);
    const unidadesNecesarias = unidadesReabastecer + unidadesIncorporar;

    const estadoProyectado = {
      skus: estadoActualOsr.skus - recall.length + incorporar.length,
      unidades: estadoActualOsr.unidades - unidadesRecall + unidadesReabastecer + unidadesIncorporar,
    };

    const capRes = await pool.query(
      `SELECT capacidad_por_turno, turnos_por_dia FROM ciclico_capacidad_cd WHERE empresa_id = $1 AND cd = 'OSR'`,
      [empresaId]
    );
    const capacidadPorTurno = Number(capRes.rows[0]?.capacidad_por_turno) || CAPACIDAD_OSR_DEFAULT;
    const turnosPorDia = Number(capRes.rows[0]?.turnos_por_dia) || 3;
    const capacidadDiaria = capacidadPorTurno * turnosPorDia;

    const totalTareas = recall.length + reabastecer.length + incorporar.length;
    const diasHabilesNecesarios = capacidadDiaria > 0 ? Math.ceil(totalTareas / capacidadDiaria) : null;

    res.json({
      ok: true,
      estado_actual: estadoActualOsr,
      estado_proyectado: estadoProyectado,
      delta: {
        skus: estadoProyectado.skus - estadoActualOsr.skus,
        unidades: estadoProyectado.unidades - estadoActualOsr.unidades,
      },
      capacidad: {
        unidades_liberadas_recall: unidadesRecall,
        unidades_necesarias_reabastecer_incorporar: unidadesNecesarias,
        cobertura_pct: unidadesNecesarias > 0
          ? Number(((unidadesRecall / unidadesNecesarias) * 100).toFixed(1))
          : null,
      },
      tiempo_estimado: {
        total_tareas: totalTareas,
        capacidad_por_turno: capacidadPorTurno,
        turnos_por_dia: turnosPorDia,
        capacidad_diaria: capacidadDiaria,
        dias_habiles: diasHabilesNecesarios,
        capacidad_configurada: Boolean(capRes.rows[0]),
      },
      por_categoria: Object.fromEntries(
        Object.entries(porCategoria).map(([matriz, c]) => [
          matriz,
          {
            ...c,
            participacion_pct: estadoProyectado.unidades > 0
              ? Number(((c.unidades_proyectado / estadoProyectado.unidades) * 100).toFixed(1))
              : 0,
          },
        ])
      ),
      resumen_acciones: {
        reabastecer: { cantidad: reabastecer.length, unidades: unidadesReabastecer },
        incorporar: { cantidad: incorporar.length, unidades: unidadesIncorporar },
        recall: { cantidad: recall.length, unidades: unidadesRecall },
      },
    });
  } catch (error) {
    console.error("❌ Error en simulación OSR Inventario Cíclico:", error);
    res.status(500).json({ ok: false, message: "Error calculando la simulación OSR" });
  }
};
