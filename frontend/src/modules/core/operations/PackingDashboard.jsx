import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../../../config/env";

export default function PackingDashboard(){

const [tasks,setTasks] = useState([]);

const token = localStorage.getItem("token");

const load = async () => {

const res = await axios.get(
`${API_BASE}/api/operations/packing`,
{ headers:{ Authorization:`Bearer ${token}`}}
);

setTasks(res.data.data);

};

useEffect(()=>{ load(); },[]);


const start = async(id)=>{

await axios.post(
`${API_BASE}/api/operations/packing/${id}/start`,
{},
{ headers:{ Authorization:`Bearer ${token}`}}
);

load();

};

const finish = async(id)=>{

await axios.post(
`${API_BASE}/api/operations/packing/${id}/finish`,
{},
{ headers:{ Authorization:`Bearer ${token}`}}
);

load();

};

return(

<div className="p-10 text-white">

<h1 className="text-2xl mb-6">
📦 Packing
</h1>

{tasks.map(t=>(
<div key={t.id} className="bg-gray-800 p-4 mb-3 rounded">

<div>Orden: {t.order_id}</div>

<div>Status: {t.status}</div>

{t.status==="pending" &&
<button
onClick={()=>start(t.id)}
className="bg-blue-600 px-3 py-1 mt-2 rounded"
>
Iniciar
</button>
}

{t.status==="packing" &&
<button
onClick={()=>finish(t.id)}
className="bg-green-600 px-3 py-1 mt-2 rounded"
>
Finalizar
</button>
}

</div>
))}

</div>

)

}