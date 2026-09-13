// backend/controllers/yardController.js
//
// Yard Management: control de vehículos en el patio de la bodega.
// Ciclo de una visita: check-in (en_porteria) -> asignar muelle (en_muelle)
// -> check-out (finalizado). Libera y ocupa el muelle automáticamente.

import pool from "../db.js";

/* ============ MUELLES ============ */

// GET /api/yard/docks?warehouseId=BOD1
export const getDocks = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { warehouseId } = req.query;

    const params = [companyId];
    let filtro = "WHERE company_id = $1";
    if (warehouseId) {
      params.push(warehouseId);
      filtro += ` AND warehouse_id = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT * FROM erp_core.yard_docks ${filtro} ORDER BY codigo`,
      params
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    console.error("❌ getDocks:", error);
    res.status(500).json({ error: "Error obteniendo muelles" });
  }
};

// POST /api/yard/docks  body: { warehouse_id, codigo, tipo }
export const createDock = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { warehouse_id, codigo, tipo } = req.body;
    if (!warehouse_id || !codigo) {
      return res.status(400).json({ error: "warehouse_id y codigo son obligatorios" });
    }

    const { rows } = await pool.query(
      `INSERT INTO erp_core.yard_docks (company_id, warehouse_id, codigo, tipo)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [companyId, warehouse_id, codigo, tipo || "carga"]
    );
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (error) {
    console.error("❌ createDock:", error);
    res.status(500).json({ error: "Error creando muelle (¿código repetido en esa bodega?)" });
  }
};

/* ============ TABLERO DEL PATIO ============ */

// GET /api/yard/board?warehouseId=BOD1  → visitas activas + muelles, para un tablero en vivo
export const getYardBoard = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { warehouseId } = req.query;

    const params = [companyId];
    let filtroVisitas = "WHERE v.company_id = $1 AND v.estado != 'finalizado'";
    let filtroDocks = "WHERE company_id = $1";
    if (warehouseId) {
      params.push(warehouseId);
      filtroVisitas += ` AND v.warehouse_id = $${params.length}`;
      filtroDocks += ` AND warehouse_id = $${params.length}`;
    }

    const { rows: visitas } = await pool.query(
      `SELECT v.*, d.codigo AS dock_codigo, l.status AS load_status
       FROM erp_core.yard_visits v
       LEFT JOIN erp_core.yard_docks d ON d.id = v.dock_id
       LEFT JOIN erp_core.loads l ON l.id = v.load_id
       ${filtroVisitas}
       ORDER BY v.check_in ASC`,
      params
    );

    const { rows: docks } = await pool.query(
      `SELECT * FROM erp_core.yard_docks ${filtroDocks} ORDER BY codigo`,
      params
    );

    res.json({ ok: true, data: { visitas, docks } });
  } catch (error) {
    console.error("❌ getYardBoard:", error);
    res.status(500).json({ error: "Error obteniendo el tablero del patio" });
  }
};

/* ============ CICLO DE LA VISITA ============ */

// POST /api/yard/check-in
// body: { warehouse_id, placa, conductor, transportista, tipo_visita, load_id }
export const checkIn = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { warehouse_id, placa, conductor, transportista, tipo_visita, load_id } = req.body;

    if (!warehouse_id || !placa) {
      return res.status(400).json({ error: "warehouse_id y placa son obligatorios" });
    }

    const { rows } = await pool.query(
      `INSERT INTO erp_core.yard_visits
        (company_id, warehouse_id, placa, conductor, transportista, tipo_visita, load_id, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'en_porteria')
       RETURNING *`,
      [companyId, warehouse_id, placa, conductor || null, transportista || null, tipo_visita || "descarga", load_id || null]
    );

    if (load_id) {
      await pool.query(
        `INSERT INTO erp_core.load_tracking_events (load_id, evento, descripcion, creado_por)
         VALUES ($1, 'checkpoint', 'Vehículo ingresó al patio', $2)`,
        [load_id, req.user.id]
      );
    }

    res.status(201).json({ ok: true, data: rows[0] });
  } catch (error) {
    console.error("❌ checkIn:", error);
    res.status(500).json({ error: "Error registrando el ingreso al patio" });
  }
};

// POST /api/yard/visits/:id/asignar-muelle  body: { dock_id }
export const asignarMuelle = async (req, res) => {
  const client = await pool.connect();
  try {
    const companyId = req.user.empresa_id;
    const { id } = req.params;
    const { dock_id } = req.body;

    if (!dock_id) return res.status(400).json({ error: "dock_id es obligatorio" });

    await client.query("BEGIN");

    const { rows: dockRows } = await client.query(
      `SELECT * FROM erp_core.yard_docks WHERE id = $1 AND company_id = $2 FOR UPDATE`,
      [dock_id, companyId]
    );
    if (dockRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Muelle no encontrado" });
    }
    if (dockRows[0].estado === "ocupado") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "El muelle ya está ocupado" });
    }

    const { rows: visitRows } = await client.query(
      `UPDATE erp_core.yard_visits
       SET dock_id = $1, estado = 'en_muelle', asignado_muelle_en = NOW()
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      [dock_id, id, companyId]
    );
    if (visitRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Visita no encontrada" });
    }

    await client.query(
      `UPDATE erp_core.yard_docks SET estado = 'ocupado' WHERE id = $1`,
      [dock_id]
    );

    await client.query("COMMIT");
    res.json({ ok: true, data: visitRows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ asignarMuelle:", error);
    res.status(500).json({ error: "Error asignando el muelle" });
  } finally {
    client.release();
  }
};

// POST /api/yard/visits/:id/check-out
export const checkOut = async (req, res) => {
  const client = await pool.connect();
  try {
    const companyId = req.user.empresa_id;
    const { id } = req.params;

    await client.query("BEGIN");

    const { rows: visitRows } = await client.query(
      `UPDATE erp_core.yard_visits
       SET estado = 'finalizado', check_out = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [id, companyId]
    );
    if (visitRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Visita no encontrada" });
    }

    const visita = visitRows[0];
    if (visita.dock_id) {
      await client.query(
        `UPDATE erp_core.yard_docks SET estado = 'libre' WHERE id = $1`,
        [visita.dock_id]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true, data: visita });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ checkOut:", error);
    res.status(500).json({ error: "Error registrando la salida" });
  } finally {
    client.release();
  }
};
