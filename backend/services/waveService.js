import pool from "../db.js";

export const createSmartWave = async () => {

  const { rows } = await pool.query(`

    SELECT
      fo.id,
      o.customer_name,
      o.id as order_id

    FROM fulfillment_orders fo

    JOIN erp_core.orders o
    ON fo.order_id = o.id

    WHERE fo.status = 'pending'

    LIMIT 20

  `);

  if(rows.length === 0){
    return null;
  }

  const wave = await pool.query(`
    INSERT INTO waves(status)
    VALUES('open')
    RETURNING id
  `);

  const waveId = wave.rows[0].id;

  for(const order of rows){

    await pool.query(`
      INSERT INTO wave_orders(wave_id, fulfillment_order_id)
      VALUES($1,$2)
    `,[waveId,order.id]);

  }

  return waveId;

};