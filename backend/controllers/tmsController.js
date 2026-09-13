// backend/controllers/tmsController.js
//
// Módulo TMS (Transportation Management System):
// - Maestros: transportistas, vehículos, conductores
// - Cargas (loads): agrupan uno o más shipments/orders en un mismo viaje
// - Ciclo de vida: planned -> dispatched -> in_transit -> delivered
// - Tracking: eventos libres (checkpoint, retraso, incidente, entrega)
//
// Todas las consultas filtran por company_id tomado del token (req.user.empresa_id),
// no del cliente, para no repetir el hallazgo de seguridad de shippingController.js.

import pool from "../db.js";

/* ============ MAESTROS ============ */

export const getCarriers = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { rows } = await pool.query(
      `SELECT * FROM erp_core.carriers WHERE company_id = $1 ORDER BY nombre`,
      [companyId]
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    console.error("❌ getCarriers:", error);
    res.status(500).json({ error: "Error obteniendo transportistas" });
  }
};

export const createCarrier = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { nombre, rut_nit, contacto, telefono, email, tarifa_base } = req.body;
    if (!nombre) return res.status(400).json({ error: "nombre es obligatorio" });

    const { rows } = await pool.query(
      `INSERT INTO erp_core.carriers (company_id, nombre, rut_nit, contacto, telefono, email, tarifa_base)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [companyId, nombre, rut_nit, contacto, telefono, email, tarifa_base]
    );
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (error) {
    console.error("❌ createCarrier:", error);
    res.status(500).json({ error: "Error creando transportista" });
  }
};

export const getVehicles = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { rows } = await pool.query(
      `SELECT v.*, c.nombre AS carrier_nombre
       FROM erp_core.vehicles v
       LEFT JOIN erp_core.carriers c ON c.id = v.carrier_id
       WHERE v.company_id = $1
       ORDER BY v.placa`,
      [companyId]
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    console.error("❌ getVehicles:", error);
    res.status(500).json({ error: "Error obteniendo vehículos" });
  }
};

export const createVehicle = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { carrier_id, placa, tipo, capacidad_kg, capacidad_m3 } = req.body;
    if (!placa) return res.status(400).json({ error: "placa es obligatoria" });

    const { rows } = await pool.query(
      `INSERT INTO erp_core.vehicles (company_id, carrier_id, placa, tipo, capacidad_kg, capacidad_m3)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [companyId, carrier_id || null, placa, tipo, capacidad_kg, capacidad_m3]
    );
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (error) {
    console.error("❌ createVehicle:", error);
    res.status(500).json({ error: "Error creando vehículo" });
  }
};

export const getDrivers = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { rows } = await pool.query(
      `SELECT d.*, c.nombre AS carrier_nombre
       FROM erp_core.drivers d
       LEFT JOIN erp_core.carriers c ON c.id = d.carrier_id
       WHERE d.company_id = $1
       ORDER BY d.nombre`,
      [companyId]
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    console.error("❌ getDrivers:", error);
    res.status(500).json({ error: "Error obteniendo conductores" });
  }
};

export const createDriver = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { carrier_id, nombre, licencia, telefono } = req.body;
    if (!nombre) return res.status(400).json({ error: "nombre es obligatorio" });

    const { rows } = await pool.query(
      `INSERT INTO erp_core.drivers (company_id, carrier_id, nombre, licencia, telefono)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [companyId, carrier_id || null, nombre, licencia, telefono]
    );
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (error) {
    console.error("❌ createDriver:", error);
    res.status(500).json({ error: "Error creando conductor" });
  }
};

/* ============ SHIPMENTS PENDIENTES DE ASIGNAR A UNA CARGA ============ */

// GET /api/tms/shipments-pendientes  → shipments sin load_id asignado, de la empresa del usuario
export const getShipmentsPendientes = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { rows } = await pool.query(
      `SELECT s.id, s.order_id, s.warehouse_id, s.status, s.created_at,
              o.order_number, o.customer_name
       FROM erp_core.shipments s
       JOIN erp_core.orders o ON o.id = s.order_id
       WHERE o.company_id = $1
         AND s.load_id IS NULL
         AND s.status IN ('pending', 'loading')
       ORDER BY s.created_at ASC`,
      [companyId]
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    console.error("❌ getShipmentsPendientes:", error);
    res.status(500).json({ error: "Error obteniendo despachos pendientes" });
  }
};

/* ============ CARGAS (LOADS) ============ */

// GET /api/tms/loads?status=planned
export const getLoads = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { status } = req.query;

    const params = [companyId];
    let filtro = "WHERE l.company_id = $1";
    if (status) {
      params.push(status);
      filtro += ` AND l.status = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT l.*,
              c.nombre AS carrier_nombre,
              v.placa AS vehicle_placa,
              d.nombre AS driver_nombre,
              (SELECT COUNT(*) FROM erp_core.load_shipments ls WHERE ls.load_id = l.id) AS total_shipments
       FROM erp_core.loads l
       LEFT JOIN erp_core.carriers c ON c.id = l.carrier_id
       LEFT JOIN erp_core.vehicles v ON v.id = l.vehicle_id
       LEFT JOIN erp_core.drivers d ON d.id = l.driver_id
       ${filtro}
       ORDER BY l.created_at DESC`,
      params
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    console.error("❌ getLoads:", error);
    res.status(500).json({ error: "Error obteniendo cargas" });
  }
};

// GET /api/tms/loads/:id  → detalle con shipments y eventos de tracking
export const getLoadDetail = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { id } = req.params;

    const { rows: loadRows } = await pool.query(
      `SELECT l.*, c.nombre AS carrier_nombre, v.placa AS vehicle_placa, d.nombre AS driver_nombre
       FROM erp_core.loads l
       LEFT JOIN erp_core.carriers c ON c.id = l.carrier_id
       LEFT JOIN erp_core.vehicles v ON v.id = l.vehicle_id
       LEFT JOIN erp_core.drivers d ON d.id = l.driver_id
       WHERE l.id = $1 AND l.company_id = $2`,
      [id, companyId]
    );
    if (loadRows.length === 0) {
      return res.status(404).json({ error: "Carga no encontrada" });
    }

    const { rows: shipments } = await pool.query(
      `SELECT s.id, s.order_id, o.order_number, o.customer_name, s.status, ls.orden_entrega
       FROM erp_core.load_shipments ls
       JOIN erp_core.shipments s ON s.id = ls.shipment_id
       JOIN erp_core.orders o ON o.id = s.order_id
       WHERE ls.load_id = $1
       ORDER BY ls.orden_entrega`,
      [id]
    );

    const { rows: eventos } = await pool.query(
      `SELECT * FROM erp_core.load_tracking_events WHERE load_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({ ok: true, data: { ...loadRows[0], shipments, eventos } });
  } catch (error) {
    console.error("❌ getLoadDetail:", error);
    res.status(500).json({ error: "Error obteniendo detalle de la carga" });
  }
};

// POST /api/tms/loads  body: { warehouse_id, origen, destino, carrier_id, vehicle_id, driver_id, costo_flete, shipment_ids: [] }
export const createLoad = async (req, res) => {
  const client = await pool.connect();
  try {
    const companyId = req.user.empresa_id;
    const {
      warehouse_id, origen, destino,
      carrier_id, vehicle_id, driver_id,
      costo_flete, shipment_ids = [],
    } = req.body;

    if (!Array.isArray(shipment_ids) || shipment_ids.length === 0) {
      return res.status(400).json({ error: "Debes incluir al menos un shipment_id" });
    }

    await client.query("BEGIN");

    const { rows: loadRows } = await client.query(
      `INSERT INTO erp_core.loads
        (company_id, warehouse_id, carrier_id, vehicle_id, driver_id, origen, destino, costo_flete, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'planned')
       RETURNING *`,
      [companyId, warehouse_id, carrier_id || null, vehicle_id || null, driver_id || null, origen, destino, costo_flete || null]
    );
    const load = loadRows[0];

    let orden = 1;
    for (const shipmentId of shipment_ids) {
      await client.query(
        `INSERT INTO erp_core.load_shipments (load_id, shipment_id, orden_entrega)
         VALUES ($1,$2,$3)`,
        [load.id, shipmentId, orden++]
      );
      await client.query(
        `UPDATE erp_core.shipments SET load_id = $1 WHERE id = $2`,
        [load.id, shipmentId]
      );
    }

    await client.query(
      `INSERT INTO erp_core.load_tracking_events (load_id, evento, descripcion, creado_por)
       VALUES ($1, 'created', 'Carga planificada', $2)`,
      [load.id, req.user.id]
    );

    await client.query("COMMIT");
    res.status(201).json({ ok: true, data: load });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ createLoad:", error);
    res.status(500).json({ error: "Error creando la carga" });
  } finally {
    client.release();
  }
};

// POST /api/tms/loads/:id/dispatch  → planned -> dispatched
export const dispatchLoad = async (req, res) => {
  const client = await pool.connect();
  try {
    const companyId = req.user.empresa_id;
    const { id } = req.params;

    const { rows } = await client.query(
      `SELECT * FROM erp_core.loads WHERE id = $1 AND company_id = $2 FOR UPDATE`,
      [id, companyId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Carga no encontrada" });
    if (rows[0].status !== "planned") {
      return res.status(400).json({ error: `No se puede despachar una carga en estado ${rows[0].status}` });
    }

    await client.query("BEGIN");

    await client.query(
      `UPDATE erp_core.loads SET status = 'dispatched', dispatched_at = NOW() WHERE id = $1`,
      [id]
    );
    await client.query(
      `UPDATE erp_core.shipments SET status = 'shipped', shipped_at = NOW() WHERE load_id = $1`,
      [id]
    );
    await client.query(
      `UPDATE erp_core.orders o SET status = 'shipped'
       FROM erp_core.shipments s
       WHERE s.load_id = $1 AND s.order_id = o.id`,
      [id]
    );
    await client.query(
      `INSERT INTO erp_core.load_tracking_events (load_id, evento, descripcion, creado_por)
       VALUES ($1, 'dispatched', 'Carga despachada desde bodega', $2)`,
      [id, req.user.id]
    );

    await client.query("COMMIT");
    res.json({ ok: true, message: "Carga despachada" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ dispatchLoad:", error);
    res.status(500).json({ error: "Error despachando la carga" });
  } finally {
    client.release();
  }
};

// POST /api/tms/loads/:id/tracking  body: { evento, descripcion, ubicacion }
export const addTrackingEvent = async (req, res) => {
  try {
    const companyId = req.user.empresa_id;
    const { id } = req.params;
    const { evento, descripcion, ubicacion } = req.body;

    if (!evento) return res.status(400).json({ error: "evento es obligatorio" });

    const { rows: loadCheck } = await pool.query(
      `SELECT id, status FROM erp_core.loads WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );
    if (loadCheck.length === 0) return res.status(404).json({ error: "Carga no encontrada" });

    if (evento === "checkpoint" && loadCheck[0].status === "dispatched") {
      await pool.query(`UPDATE erp_core.loads SET status = 'in_transit' WHERE id = $1`, [id]);
    }

    const { rows } = await pool.query(
      `INSERT INTO erp_core.load_tracking_events (load_id, evento, descripcion, ubicacion, creado_por)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, evento, descripcion || null, ubicacion || null, req.user.id]
    );

    res.status(201).json({ ok: true, data: rows[0] });
  } catch (error) {
    console.error("❌ addTrackingEvent:", error);
    res.status(500).json({ error: "Error registrando evento de tracking" });
  }
};

// POST /api/tms/loads/:id/deliver
export const deliverLoad = async (req, res) => {
  const client = await pool.connect();
  try {
    const companyId = req.user.empresa_id;
    const { id } = req.params;

    const { rows } = await client.query(
      `SELECT * FROM erp_core.loads WHERE id = $1 AND company_id = $2 FOR UPDATE`,
      [id, companyId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Carga no encontrada" });
    if (!["dispatched", "in_transit"].includes(rows[0].status)) {
      return res.status(400).json({ error: `No se puede entregar una carga en estado ${rows[0].status}` });
    }

    await client.query("BEGIN");

    await client.query(
      `UPDATE erp_core.loads SET status = 'delivered', delivered_at = NOW() WHERE id = $1`,
      [id]
    );
    await client.query(
      `UPDATE erp_core.orders o SET status = 'delivered'
       FROM erp_core.shipments s
       WHERE s.load_id = $1 AND s.order_id = o.id`,
      [id]
    );
    await client.query(
      `INSERT INTO erp_core.load_tracking_events (load_id, evento, descripcion, creado_por)
       VALUES ($1, 'delivered', 'Carga entregada a destino', $2)`,
      [id, req.user.id]
    );

    await client.query("COMMIT");
    res.json({ ok: true, message: "Carga marcada como entregada" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ deliverLoad:", error);
    res.status(500).json({ error: "Error marcando entrega" });
  } finally {
    client.release();
  }
};
