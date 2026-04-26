import pool from "../db.js";

export const getPackingTasks = async (req,res) => {

  try {

    const { rows } = await pool.query(
      `
      SELECT *
      FROM erp_core.packing_tasks
      ORDER BY created_at DESC
      `
    );

    res.json({
      ok:true,
      data: rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:"Error obteniendo packing tasks"
    });

  }

};


export const startPacking = async (req,res) => {

  const { id } = req.params;

  try {

    await pool.query(
      `
      UPDATE erp_core.packing_tasks
      SET status='packing'
      WHERE id=$1
      `,
      [id]
    );

    res.json({ ok:true });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:"Error iniciando packing"
    });

  }

};


export const finishPacking = async (req,res) => {

  const { id } = req.params;

  try {

await pool.query(
`
UPDATE erp_core.packing_tasks
SET status='packed',
    packed_at = NOW()
WHERE id=$1
`,
[id]
);

// crear shipment
await pool.query(
`
INSERT INTO erp_core.shipments
(order_id, warehouse_id, status)
VALUES ($1,$2,'pending')
ON CONFLICT DO NOTHING
`,
[task.order_id, task.warehouse_id]
);

    res.json({ ok:true });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:"Error finalizando packing"
    });

  }

};