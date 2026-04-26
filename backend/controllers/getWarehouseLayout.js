import pool from "../db.js";

export const getWarehouseLayout = async (req, res) => {
  const { warehouse_id } = req.params;

  try {

    const result = await pool.query(
      `
      SELECT
        rack,
        level,
        position,
        code,
        status,
        sector
      FROM erp_core.locations
      WHERE warehouse_id = $1
      ORDER BY rack, level, position
      `,
      [warehouse_id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "error fetching layout" });
  }
};