import React,{useEffect,useState} from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { API_BASE } from "../../../config/env";

export default function SalesOrderDetail(){

const { id } = useParams();

const [items,setItems] = useState([]);

const token = localStorage.getItem("token");

const load = async()=>{

const res = await axios.get(
`${API_BASE}/api/sales/orders/${id}`,
{ headers:{ Authorization:`Bearer ${token}`}}
);

console.log(res.data);

setItems(res.data);

};

useEffect(()=>{ load(); },[]);

if(items.length === 0){
return <div className="p-10 text-white">Loading...</div>;
}

const order = items[0];
const confirmOrder = async()=>{

await axios.post(
`${API_BASE}/api/sales/orders/${id}/confirm`,
{},
{ headers:{ Authorization:`Bearer ${token}`}}
);

load();

};

const cancelOrder = async()=>{

await axios.post(
`${API_BASE}/api/sales/orders/${id}/cancel`,
{},
{ headers:{ Authorization:`Bearer ${token}`}}
);

load();

};
return(

<div className="p-10 text-white">

<h1 className="text-2xl mb-6">
Pedido {order.order_number}
</h1>

<div className="mb-6">
Cliente: {order.customer_name}
</div>



<div className="mb-6 grid grid-cols-4 gap-4">

<div className="bg-gray-800 p-3 rounded">
Pedido
<div className="font-bold">{order.status}</div>
</div>

<div className="bg-gray-800 p-3 rounded">
Picking
<div className="font-bold">{order.picking_status}</div>
</div>

<div className="bg-gray-800 p-3 rounded">
Packing
<div className="font-bold">pending</div>
</div>

<div className="bg-gray-800 p-3 rounded">
Shipping
<div className="font-bold">pending</div>
</div>

</div>

<table className="w-full bg-gray-800 rounded">

<thead>
<tr>
<th className="p-3 text-left">SKU</th>
<th className="p-3 text-left">Producto</th>
<th className="p-3 text-left">Cantidad</th>
<th className="p-3 text-left">UM</th>
</tr>
</thead>


<tbody>

{items.map((i,index)=>(

<tr key={index} className="border-t border-gray-700">

<td className="p-3">
{i.sku_code}
</td>

<td className="p-3">
{i.product_name}
</td>

<td className="p-3">
{i.quantity}
</td>

<td className="p-3">
{i.base_uom}
</td>

</tr>

))}

</tbody>

</table>

<div className="mt-6 flex gap-4">

<button
className="bg-blue-600 px-4 py-2 rounded"
onClick={confirmOrder}
>
Confirm Order
</button>

<button
className="bg-red-600 px-4 py-2 rounded"
onClick={cancelOrder}
>
Cancel Order
</button>

</div>

</div>

)

}