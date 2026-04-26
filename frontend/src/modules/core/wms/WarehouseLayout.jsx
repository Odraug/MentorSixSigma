import React,{useState} from "react";
import axios from "axios";
import { API_BASE } from "../../../config/env";

export default function WarehouseLayout(){

const token = localStorage.getItem("token");

const [warehouse,setWarehouse] = useState("");
const [racks,setRacks] = useState(1);
const [levels,setLevels] = useState(1);
const [positions,setPositions] = useState(1);
const [sector,setSector] = useState("");

const generate = async () => {

  if (!warehouse || !sector) {
    return alert("Completa todos los campos");
  }

  if (racks <= 0 || levels <= 0 || positions <= 0) {
    return alert("Valores inválidos");
  }

  try {

    const res = await axios.post(
      `${API_BASE}/api/wms/layout/generate`,
      {
        warehouse_id: warehouse,
        racks: Number(racks),
        levels: Number(levels),
        positions: Number(positions),
        sector
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    alert(`✅ ${res.data.message}
📦 Ubicaciones creadas: ${res.data.total_locations}`);

  } catch (error) {

    console.error(error);

    alert(
      error.response?.data?.error ||
      "Error generando layout"
    );
  }
};

return(

<div className="p-10 text-white">

<h1 className="text-3xl mb-8 font-bold text-indigo-400">
Warehouse Layout Manager
</h1>

<div className="grid grid-cols-2 gap-6 max-w-xl">

<input
placeholder="Warehouse ID"
value={warehouse}
onChange={e=>setWarehouse(e.target.value)}
className="p-2 text-black rounded"
/>

<input
type="number"
placeholder="Cantidad de racks"
value={racks}
onChange={e=>setRacks(e.target.value)}
className="p-2 text-black rounded"
/>

<input
type="number"
placeholder="Niveles por rack"
value={levels}
onChange={e=>setLevels(e.target.value)}
className="p-2 text-black rounded"
/>

<input
type="number"
placeholder="Posiciones por nivel"
value={positions}
onChange={e=>setPositions(e.target.value)}
className="p-2 text-black rounded"
/>

<input
placeholder="Sector (A,B,C)"
value={sector}
onChange={e=>setSector(e.target.value)}
className="p-2 text-black rounded"
/>

<button
onClick={generate}
className="bg-blue-600 p-3 rounded hover:bg-blue-700"
>
Generar Layout
</button>

</div>

</div>

);

}