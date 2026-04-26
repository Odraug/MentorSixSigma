import React,{useEffect,useState} from "react";
import axios from "axios";
import { API_BASE } from "../../config/env";

export default function PermisosMatrix(){

const [roles,setRoles] = useState([]);
const [modulos,setModulos] = useState([]);
const [permisos,setPermisos] = useState([]);

const token = localStorage.getItem("token");

const load = async()=>{

const res = await axios.get(
`${API_BASE}/api/permisos/matrix`,
{headers:{Authorization:`Bearer ${token}`}}
);

setRoles(res.data.roles);
setModulos(res.data.modulos);
setPermisos(res.data.permisos);

};

useEffect(()=>{load()},[]);

const tienePermiso = (rol,modulo)=>{

return permisos.some(
p => p.rol_id === rol && p.modulo_id === modulo
);

};

const toggle = async(rol,modulo)=>{

await axios.post(
`${API_BASE}/api/permisos/toggle`,
{rol_id:rol, modulo_id:modulo},
{headers:{Authorization:`Bearer ${token}`}}
);

load();

};

return(

<div className="p-10 text-white">

<h1 className="text-3xl mb-6 text-indigo-400">
Matriz de Permisos
</h1>

<table className="w-full bg-gray-800">

<thead>

<tr>

<th className="p-3 text-left">Modulo</th>

{roles.map(r=>(
<th key={r.id} className="p-3">
{r.nombre}
</th>
))}

</tr>

</thead>

<tbody>

{modulos.map(m=>(

<tr key={m.id} className="border-t border-gray-700">

<td className="p-3">
{m.nombre}
</td>

{roles.map(r=>{

const activo = tienePermiso(r.id,m.id);

return(

<td key={r.id} className="text-center">

<input
type="checkbox"
checked={activo}
onChange={()=>toggle(r.id,m.id)}
/>

</td>

);

})}

</tr>

))}

</tbody>

</table>

</div>

);

}