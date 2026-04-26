import pool from "../db.js";

// ======================================================
// 📦 QUEUE DE ÓRDENES PARA FULFILLMENT
// ======================================================
export const getFulfillmentQueue = async (req, res) => {

  try {

    const { rows } = await pool.query(`
      SELECT 
        fo.id,
        fo.order_id,
        fo.status,
        fo.allocation_status,
        o.order_number,
        o.customer_name,
        COUNT(oi.id) as items
      FROM fulfillment_orders fo
      JOIN erp_core.orders o 
        ON fo.order_id = o.id
      JOIN erp_core.order_items oi 
        ON oi.order_id = o.id
      GROUP BY fo.id,o.id
      ORDER BY fo.created_at
    `);

    res.json(rows);

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "error fetching queue" });

  }

};


// ======================================================
// ⚙️ ALLOCATE ORDER
// ======================================================
export const allocateOrder = async (req, res) => {

  const { id } = req.params;

  try {

    await allocateFulfillmentOrder(id);

    res.json({ ok: true });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "allocation failed" });

  }

};


// ======================================================
// 🌊 CREATE WAVE
// ======================================================
export const createWave = async (req, res) => {

  const { orders } = req.body;

  try {

    const wave = await pool.query(`
      INSERT INTO waves (status)
      VALUES ('open')
      RETURNING id
    `);

    const waveId = wave.rows[0].id;

    for (const foId of orders) {

      await pool.query(`
        INSERT INTO wave_orders (wave_id, fulfillment_order_id)
        VALUES ($1,$2)
      `,[waveId,foId]);

      await pool.query(`
        UPDATE fulfillment_orders
        SET wave_id = $1,
            status = 'wave_planned'
        WHERE id = $2
      `,[waveId,foId]);

    }

    res.json({
      ok: true,
      waveId
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "wave creation failed"
    });

  }

};


// ======================================================
// 📊 FULFILLMENT STATS
// ======================================================
export const getFulfillmentStats = async (req, res) => {

  try {

    const { rows } = await pool.query(`

      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE allocation_status = 'allocated') as allocated_orders,
        COUNT(*) FILTER (WHERE allocation_status = 'stock_break') as stock_breaks,
        COUNT(*) FILTER (WHERE status = 'wave_planned') as waves_planned
      FROM fulfillment_orders

    `);

    res.json(rows[0]);

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "stats error" });

  }

};


// ======================================================
// 🌊 LISTAR WAVES
// ======================================================
export const getWaves = async (req, res) => {

  try {

    const { rows } = await pool.query(`

      SELECT
        w.id,
        w.status,
        w.created_at,
        COUNT(wo.id) as orders

      FROM waves w

      LEFT JOIN wave_orders wo
        ON wo.wave_id = w.id

      GROUP BY w.id
      ORDER BY w.created_at DESC

    `);

    res.json(rows);

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "waves error" });

  }

};


// ======================================================
// 👷 PICKING MONITOR
// ======================================================
export const getPickingMonitor = async (req, res) => {

  try {

    const { rows } = await pool.query(`

      SELECT
        assigned_to,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'picked') as completed_tasks,
        COUNT(*) as total_tasks
      FROM erp_core.picking_tasks
      GROUP BY assigned_to

    `);

    res.json(rows);

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "picking monitor error" });

  }

};


// ======================================================
// 🧭 PICK PATH OPTIMIZATION
// ======================================================
export const getOptimizedPicking = async (req, res) => {

  try {

    const { waveId } = req.params;

    const { rows } = await pool.query(`

      SELECT
        pt.id,
        p.sku,
        pt.quantity,
        l.zone,
        l.aisle,
        l.rack,
        l.bin

      FROM erp_core.picking_tasks pt

      JOIN erp_core.products p
        ON pt.product_id = p.id

      JOIN erp_core.locations l
        ON pt.location_id = l.id

      JOIN fulfillment_orders fo
        ON fo.order_id = pt.order_id

      JOIN wave_orders wo
        ON wo.fulfillment_order_id = fo.id

      WHERE wo.wave_id = $1
      AND pt.status = 'pending'

      ORDER BY
        l.zone,
        l.aisle,
        l.rack,
        l.bin

    `,[waveId]);

    res.json(rows);

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "picking optimization error" });

  }

};

import { createSmartWave } from "../services/waveService.js";

export const createAutoWave = async (req,res)=>{

try{

const waveId = await createSmartWave();

res.json({
ok:true,
waveId
});

}catch(err){

console.error(err);
res.status(500).json({error:"wave error"});

}

};
