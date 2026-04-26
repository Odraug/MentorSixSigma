import pool from "../db.js";

/* ==============================
   CONFIRM ORDER (GENERA PICKING)
============================== */
export const confirmOrder = async (req, res) => {

  const { id } = req.params;

  try {

    await pool.query("BEGIN");

    // Cambiar estado del pedido
    await pool.query(
      `
      UPDATE erp_core.orders
      SET status = 'confirmed'
      WHERE id = $1
      `,
      [id]
    );

    // Obtener items del pedido
    const items = await pool.query(
      `
      SELECT product_id, quantity
      FROM erp_core.order_items
      WHERE order_id = $1
      `,
      [id]
    );

    const warehouseId = 'f0a95103-9e04-4cba-9da4-22f346dc25bd';

    // Crear picking tasks
    for (const item of items.rows) {

      await pool.query(
        `
        INSERT INTO erp_core.picking_tasks
        (
          id,
          order_id,
          product_id,
          warehouse_id,
          quantity,
          status,
          created_at,
          updated_at
        )
        VALUES
        (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          'pending',
          NOW(),
          NOW()
        )
        `,
        [
          id,
          item.product_id,
          warehouseId,
          item.quantity
        ]
      );

    }

    await pool.query("COMMIT");

    res.json({ message: "Order confirmed and picking tasks created" });

  } catch (error) {

    await pool.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "confirm order error" });

  }

};


/* ==============================
   SHIP ORDER (ATÓMICO SEGURO)
============================== */
export const shipOrder = async (req, res) => {

  const { id } = req.params;
  const { companyId, warehouseId } = req.body;

  if (!companyId || !warehouseId) {
    return res.status(400).json({
      error: "companyId y warehouseId son obligatorios",
    });
  }

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const { rows: orderRows } = await client.query(
      `SELECT status
       FROM erp_core.orders
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (orderRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    if (orderRows[0].status !== "confirmed") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Orden no confirmada" });
    }

    const { rows: items } = await client.query(
      `SELECT *
       FROM erp_core.order_items
       WHERE order_id = $1`,
      [id]
    );

    for (const item of items) {

      const updateResult = await client.query(
        `UPDATE erp_core.inventory_balances
         SET quantity_on_hand = quantity_on_hand - $1,
             quantity_reserved = quantity_reserved - $1,
             updated_at = NOW()
         WHERE company_id = $2
           AND product_id = $3
           AND warehouse_id = $4
           AND quantity_on_hand >= $1
           AND quantity_reserved >= $1
         RETURNING id`,
        [item.quantity, companyId, item.product_id, warehouseId]
      );

      if (updateResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Stock insuficiente al momento de despachar ${item.product_id}`
        });
      }

      await client.query(
        `INSERT INTO erp_core.inventory_movements
         (company_id, product_id, warehouse_id,
          movement_type, quantity, reference_type, reference_id)
         VALUES ($1,$2,$3,'sale',$4,'order',$5)`,
        [
          companyId,
          item.product_id,
          warehouseId,
          -item.quantity,
          id
        ]
      );
    }

    await client.query(
      `UPDATE erp_core.orders
       SET status = 'shipped'
       WHERE id = $1`,
      [id]
    );

    await client.query("COMMIT");

    res.json({
      ok: true,
      message: "Orden despachada correctamente"
    });

  } catch (error) {

    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Error al despachar orden" });

  } finally {

    client.release();

  }
};


/* ==============================
   CANCEL ORDER
============================== */
export const cancelOrder = async (req, res) => {

  const { id } = req.params;
  const { companyId, warehouseId } = req.body;

  if (!companyId || !warehouseId) {
    return res.status(400).json({
      error: "companyId y warehouseId son obligatorios",
    });
  }

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const { rows: orderRows } = await client.query(
      `SELECT status
       FROM erp_core.orders
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (orderRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    const status = orderRows[0].status;

    if (status === "shipped") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "No se puede cancelar una orden despachada"
      });
    }

    if (status === "confirmed") {

      const { rows: items } = await client.query(
        `SELECT *
         FROM erp_core.order_items
         WHERE order_id = $1`,
        [id]
      );

      for (const item of items) {

        await client.query(
          `UPDATE erp_core.inventory_balances
           SET quantity_reserved = quantity_reserved - $1,
               updated_at = NOW()
           WHERE company_id = $2
             AND product_id = $3
             AND warehouse_id = $4
             AND quantity_reserved >= $1`,
          [item.quantity, companyId, item.product_id, warehouseId]
        );
      }
    }

    await client.query(
      `UPDATE erp_core.orders
       SET status = 'cancelled'
       WHERE id = $1`,
      [id]
    );

    await client.query("COMMIT");

    res.json({
      ok: true,
      message: "Orden cancelada correctamente"
    });

  } catch (error) {

    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Error al cancelar orden" });

  } finally {

    client.release();

  }
};

export const getSalesOrders = async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        id,
        order_number,
        customer_name,
        status,
        created_at
      FROM erp_core.orders
      ORDER BY created_at DESC
    `);

    console.log("Orders found:", result.rows.length);

    res.json(result.rows);

  } catch (error) {

    console.error("Error fetching orders:", error);

    res.status(500).json({
      error: "Error fetching orders"
    });

  }

};

export const getSalesOrderDetail = async (req, res) => {

  const { id } = req.params;

  try {

    const { rows } = await pool.query(
      `
      SELECT
      o.id,
      o.order_number,
      o.customer_name,
      o.status,
      o.picking_status,
      oi.product_id,
      p.sku_code,
      p.name as product_name,
      oi.quantity,
      p.base_uom
      FROM erp_core.orders o

      LEFT JOIN erp_core.order_items oi
      ON oi.order_id = o.id

      LEFT JOIN erp_core.products p
      ON p.id = oi.product_id

      WHERE o.id = $1
      `,
      [id]
    );

    res.json(rows);

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "order detail error" });

  }

};

