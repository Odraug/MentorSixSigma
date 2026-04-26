import React,{useEffect,useState} from "react";
import axios from "axios";
import { API_BASE } from "../../../config/env";

export default function ShippingDashboard(){

const [shipments,setShipments] = useState([]);

const token = localStorage.getItem("token");

const load = async()=>{

const res = await axios.get(
`${API_BASE}/api/operations/shipping`,
{ headers:{ Authorization:`Bearer ${token}`}}
);

setShipments(res.data.data);

};

useEffect(()=>{ load(); },[]);

const startLoading = async(id)=>{

await axios.post(
`${API_BASE}/api/operations/shipping/${id}/start-loading`,
{},
{ headers:{ Authorization:`Bearer ${token}`}}
);

load();

};

const confirm = async(id)=>{

await axios.post(
`${API_BASE}/api/operations/shipping/${id}/confirm`,
{},
{ headers:{ Authorization:`Bearer ${token}`}}
);

load();

};

return(

<div className="p-10 text-white">

<h1 className="text-2xl mb-6">
🚚 Despacho
</h1>

{shipments.map(s=>(
<div key={s.id} className="bg-gray-800 p-4 mb-3 rounded">

<div>Orden: {s.order_id}</div>

<div>Status: {s.status}</div>

{s.status==="pending" &&
<button
onClick={()=>startLoading(s.id)}
className="bg-blue-600 px-3 py-1 mt-2 rounded"
>
Cargar Camión
</button>
}

{s.status==="loading" &&
<button
onClick={()=>confirm(s.id)}
className="bg-green-600 px-3 py-1 mt-2 rounded"
>
Confirmar Despacho
</button>
}

</div>
))}

</div>

)

}