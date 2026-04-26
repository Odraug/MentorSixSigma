import pool from "../db.js";

export const generateLayout = async (req, res) => {
  const {
    warehouse_id,
    racks,
    levels,
    positions,
    sector
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 🔒 Validar si ya existe layout
    const existing = await client.query(
      `SELECT 1 FROM erp_core.locations WHERE warehouse_id = $1 LIMIT 1`,
      [warehouse_id]
    );

    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "El layout ya existe para este warehouse"
      });
    }

    const values = [];
    const placeholders = [];

    let count = 1;

    for (let r = 1; r <= racks; r++) {
      for (let l = 1; l <= levels; l++) {
        for (let p = 1; p <= positions; p++) {

          const code =
            String(r).padStart(3, "0") + "-" +
            String(l).padStart(3, "0") + "-" +
            String(p).padStart(3, "0");

          values.push(
            warehouse_id,  // $1
            r,             // $2
            l,             // $3
            p,             // $4
            code,          // $5
            sector,        // $6
            "EMPTY",       // $7 status
            0,             // $8 capacity
            0,             // $9 current_load
            "STORAGE",     // $10 location_type
            true           // $11 is_pickable
          );

          placeholders.push(
            `($${count++}, $${count++}, $${count++}, $${count++}, $${count++}, $${count++}, $${count++}, $${count++}, $${count++}, $${count++}, $${count++})`
          );
        }
      }
    }

    await client.query(
      `
      INSERT INTO erp_core.locations
      (
        warehouse_id,
        rack,
        level,
        position,
        code,
        sector,
        status,
        capacity,
        current_load,
        location_type,
        is_pickable
      )
      VALUES ${placeholders.join(",")}
      `,
      values
    );

    await client.query("COMMIT");

    res.json({
      message: "Layout generado correctamente",
      total_locations: racks * levels * positions
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "layout error" });
  } finally {
    client.release();
  }
};