import pool from "../db.js";

export const getShipments = async (req,res)=>{

try{

const { rows } = await pool.query(
`
SELECT *
FROM erp_core.shipments
ORDER BY created_at DESC
`
);

res.json({ ok:true, data: rows });

}catch(error){

console.error(error);

res.status(500).json({ error:"Error obteniendo shipments" });

}

};


export const startLoading = async (req,res)=>{

const { id } = req.params;

try{

await pool.query(
`
UPDATE erp_core.shipments
SET status='loading'
WHERE id=$1
`,
[id]
);

res.json({ ok:true });

}catch(error){

console.error(error);

res.status(500).json({ error:"Error iniciando carga" });

}

};


export const confirmShipment = async (req,res)=>{

const { id } = req.params;

const client = await pool.connect();

try{

await client.query("BEGIN");

const { rows } = await client.query(
`
SELECT *
FROM erp_core.shipments
WHERE id=$1
FOR UPDATE
`,
[id]
);

if(rows.length===0){

await client.query("ROLLBACK");

return res.status(404).json({ error:"Shipment no encontrado" });

}

const shipment = rows[0];

await client.query(
`
UPDATE erp_core.shipments
SET status='shipped',
    shipped_at = NOW()
WHERE id=$1
`,
[id]
);

// actualizar orden
await client.query(
`
UPDATE erp_core.orders
SET status='shipped'
WHERE id=$1
`,
[shipment.order_id]
);

await client.query("COMMIT");

res.json({ ok:true });

}catch(error){

await client.query("ROLLBACK");

console.error(error);

res.status(500).json({ error:"Error confirmando despacho" });

}finally{

client.release();

}

};