import pool from "../db.js";

export const getControlTower = async (req,res)=>{

try{

const { rows } = await pool.query(
`
SELECT *
FROM erp_core.wms_control_tower
`
);

res.json({
ok:true,
data: rows[0]
});

}catch(error){

console.error(error);

res.status(500).json({
error:"Error obteniendo control tower"
});

}

};

export const getLiveOrders = async (req,res)=>{

try{

const { rows } = await pool.query(
`
SELECT *
FROM erp_core.wms_orders_live
ORDER BY created_at DESC
LIMIT 50
`
);

res.json({
ok:true,
data: rows
});

}catch(error){

console.error(error);

res.status(500).json({
error:"Error obteniendo pedidos live"
});

}

};