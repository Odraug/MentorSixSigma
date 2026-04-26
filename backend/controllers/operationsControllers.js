import pool from "../db.js";

export const getPickingTasks = async (req, res) => {

  const { companyId } = req.query;

  try {

    const { rows } = await pool.query(
      `
      SELECT
        pt.id,
        pt.order_id,
        pt.product_id,
        pt.quantity,
        pt.picked_quantity,
        pt.status,
        pt.location_id,
        p.name AS product_name
      FROM erp_core.picking_tasks pt
      LEFT JOIN erp_core.products p
        ON p.id = pt.product_id
      WHERE p.company_id = $1
      ORDER BY pt.created_at DESC
      `,
      [companyId]
    );

    res.json({
      ok: true,
      data: rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error obteniendo tareas de picking"
    });

  }

};

export const assignPickingTask = async (req, res) => {

  const { id } = req.params;
  const { userId } = req.body;

  try {

    const { rowCount } = await pool.query(
      `
      UPDATE erp_core.picking_tasks
      SET status = 'assigned',
          assigned_to = $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [userId, id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }

    res.json({ ok: true });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Error asignando tarea" });

  }

};

export const startPicking = async (req, res) => {

  const { id } = req.params;

  try {

    await pool.query(
      `
      UPDATE erp_core.picking_tasks
      SET status = 'picking',
          updated_at = NOW()
      WHERE id = $1
      `,
      [id]
    );

    res.json({ ok: true });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Error iniciando picking" });

  }

};

export const finishPicking = async (req, res) => {

  const { id } = req.params;

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // Obtener datos de la tarea
    const taskResult = await client.query(
      `
      SELECT order_id, warehouse_id
      FROM erp_core.picking_tasks
      WHERE id = $1
      `,
      [id]
    );

    const task = taskResult.rows[0];

    if (!task) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Tarea no encontrada" });
    }

    // Finalizar picking
    await client.query(
      `
      UPDATE erp_core.picking_tasks
      SET status = 'picked',
          picked_quantity = quantity,
          updated_at = NOW()
      WHERE id = $1
      `,
      [id]
    );

    // Crear tarea de packing
    await client.query(
      `
      INSERT INTO erp_core.packing_tasks
      (order_id, warehouse_id, status)
      VALUES ($1,$2,'pending')
      ON CONFLICT DO NOTHING
      `,
      [task.order_id, task.warehouse_id]
    );

    await client.query("COMMIT");

    res.json({
      ok: true,
      message: "Picking finalizado y tarea de packing creada"
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      error: "Error finalizando picking"
    });

  } finally {

    client.release();

  }

};