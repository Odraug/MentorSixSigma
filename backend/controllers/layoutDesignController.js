// backend/controllers/layoutDesignController.js
//
// Guarda/carga el diseño visual del layout como JSON (tabla warehouse_layout_design).
// Se mantiene separado de warehouseLayoutController.js (que genera ubicaciones reales
// en la tabla `location`) para no tocar lo que ya funciona. Este endpoint solo
// persiste la representación visual (posición/tamaño/tipo de cada elemento en el canvas).

import pool from "../db.js";
import XLSX from "xlsx";

// GET /api/wms/layout-design/:warehouseId?companyId=1
export const getLayoutDesign = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ error: "companyId es obligatorio" });
    }

    const { rows } = await pool.query(
      `SELECT id, nombre, layout_json, actualizado_en
       FROM warehouse_layout_design
       WHERE company_id = $1 AND warehouse_id = $2`,
      [companyId, warehouseId]
    );

    if (rows.length === 0) {
      return res.json({ ok: true, layout: [], nombre: "Layout principal" });
    }

    res.json({ ok: true, layout: rows[0].layout_json, nombre: rows[0].nombre, actualizado_en: rows[0].actualizado_en });
  } catch (error) {
    console.error("❌ Error obteniendo diseño de layout:", error);
    res.status(500).json({ error: "Error obteniendo diseño de layout" });
  }
};

// POST /api/wms/layout-design/importar-ubicaciones  (multipart, campo "archivo")
//
// Permite cargar la nomenclatura de ubicaciones de un rack tal como la
// maneje el cliente (Zona, Pasillo, Bahía, Nivel, Ubicación, etc.) en vez de
// depender del generador automático. No toca la base de datos: solo parsea
// el Excel y devuelve las filas normalizadas para que el frontend las guarde
// dentro del elemento del layout.
export const importarUbicacionesExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: "Archivo requerido" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!filas.length) {
      return res.status(400).json({ ok: false, message: "El archivo no tiene filas" });
    }

    const quitarAcentos = (s) =>
      String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const ubicaciones = filas.map((fila) => {
      const claveCodigo = Object.keys(fila).find((k) =>
        /ubicac|codigo/i.test(quitarAcentos(k))
      );

      const code = claveCodigo
        ? String(fila[claveCodigo]).trim()
        : Object.values(fila).map((v) => String(v).trim()).join("");

      return { code, ...fila };
    }).filter((u) => u.code);

    if (!ubicaciones.length) {
      return res.status(400).json({
        ok: false,
        message: "No se pudo identificar la columna de código de ubicación",
      });
    }

    res.json({ ok: true, total: ubicaciones.length, ubicaciones });
  } catch (error) {
    console.error("❌ Error importando ubicaciones desde Excel:", error);
    res.status(500).json({ ok: false, message: "Error leyendo el archivo Excel" });
  }
};

// Sincroniza las ubicaciones de cada rack del layout hacia wms_ubicaciones
// (registro real de slots físicos, separado del JSON visual). Es un upsert:
// nunca toca cantidad/sku_code de una ubicación ya existente, así que mover
// o redibujar un rack no borra el stock ya cargado en sus ubicaciones.
const sincronizarUbicaciones = async (companyId, warehouseId, layout) => {
  for (const el of layout) {
    if (el.tipo !== "rack" || !Array.isArray(el.ubicaciones)) continue;

    for (const u of el.ubicaciones) {
      if (!u.code) continue;
      await pool.query(
        `INSERT INTO wms_ubicaciones
           (company_id, warehouse_id, rack_element_id, codigo, nivel, posicion, lado, fondo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (company_id, warehouse_id, codigo)
         DO UPDATE SET rack_element_id = EXCLUDED.rack_element_id,
                        nivel = EXCLUDED.nivel,
                        posicion = EXCLUDED.posicion,
                        lado = EXCLUDED.lado,
                        fondo = EXCLUDED.fondo`,
        [companyId, warehouseId, el.id, u.code, u.nivel ?? null, u.posicion ?? null, u.lado ?? null, u.fondo ?? null]
      );
    }
  }
};

// POST /api/wms/layout-design/:warehouseId  body: { companyId, nombre, layout }
export const saveLayoutDesign = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { companyId, nombre = "Layout principal", layout } = req.body;

    if (!companyId || !Array.isArray(layout)) {
      return res.status(400).json({ error: "companyId y layout (array) son obligatorios" });
    }

    await pool.query(
      `INSERT INTO warehouse_layout_design (company_id, warehouse_id, nombre, layout_json, creado_por, actualizado_en)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (company_id, warehouse_id)
       DO UPDATE SET layout_json = EXCLUDED.layout_json,
                      nombre = EXCLUDED.nombre,
                      actualizado_en = NOW()`,
      [companyId, warehouseId, nombre, JSON.stringify(layout), req.user?.id || null]
    );

    await sincronizarUbicaciones(companyId, warehouseId, layout);

    res.json({ ok: true, message: "Layout guardado correctamente" });
  } catch (error) {
    console.error("❌ Error guardando diseño de layout:", error);
    res.status(500).json({ error: "Error guardando diseño de layout" });
  }
};

// GET /api/wms/layout-design/:warehouseId/stock?companyId=1
// Devuelve el stock cargado por ubicación, para pintar la dispersión sobre
// el layout (2D/3D).
export const getStockPorUbicacion = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ error: "companyId es obligatorio" });
    }

    const { rows } = await pool.query(
      `SELECT rack_element_id, codigo, nivel, posicion, lado, fondo, sku_code, descripcion, cantidad
       FROM wms_ubicaciones
       WHERE company_id = $1 AND warehouse_id = $2`,
      [companyId, warehouseId]
    );

    res.json({ ok: true, ubicaciones: rows });
  } catch (error) {
    console.error("❌ Error obteniendo stock por ubicación:", error);
    res.status(500).json({ error: "Error obteniendo stock por ubicación" });
  }
};

// POST /api/wms/layout-design/:warehouseId/cargar-stock  (multipart, campo "file")
// body/query: companyId=1
// Excel con columnas Ubicación/Código, SKU, Cantidad. Solo actualiza
// ubicaciones que ya existen (creadas al guardar el layout) — no inventa
// ubicaciones nuevas desde acá.
export const cargarStockExcel = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const companyId = req.body.companyId || req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ ok: false, message: "companyId es obligatorio" });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, message: "Archivo requerido" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const quitarAcentos = (s) =>
      String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    let actualizadas = 0;
    const noEncontradas = [];

    for (const fila of filas) {
      const claveCodigo = Object.keys(fila).find((k) => /ubicac|codigo/i.test(quitarAcentos(k)));
      const claveSku = Object.keys(fila).find((k) => /sku|producto|articulo/i.test(quitarAcentos(k)));
      const claveCantidad = Object.keys(fila).find((k) => /cantidad|qty|stock/i.test(quitarAcentos(k)));

      const codigo = claveCodigo ? String(fila[claveCodigo]).trim() : "";
      const skuCode = claveSku ? String(fila[claveSku]).trim() : "";
      const cantidad = claveCantidad ? Number(fila[claveCantidad]) || 0 : 0;

      if (!codigo) continue;

      const { rowCount } = await pool.query(
        `UPDATE wms_ubicaciones
         SET sku_code = $1, cantidad = $2, actualizado_en = NOW()
         WHERE company_id = $3 AND warehouse_id = $4 AND codigo = $5`,
        [skuCode || null, cantidad, companyId, warehouseId, codigo]
      );

      if (rowCount > 0) actualizadas++;
      else noEncontradas.push(codigo);
    }

    res.json({ ok: true, actualizadas, no_encontradas: noEncontradas });
  } catch (error) {
    console.error("❌ Error cargando stock desde Excel:", error);
    res.status(500).json({ ok: false, message: "Error leyendo el archivo Excel" });
  }
};
