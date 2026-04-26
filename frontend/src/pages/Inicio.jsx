import React,{useEffect,useState} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config/env";

export default function Inicio(){

const navigate = useNavigate();
const [modulos,setModulos] = useState([]);

const token = localStorage.getItem("token");

useEffect(()=>{

const load = async()=>{

try{

const res = await axios.get(
`${API_BASE}/api/modulos/roles-modulos/permitidos/usuario`,
{headers:{Authorization:`Bearer ${token}`}}
);

setModulos(res.data);

}catch(err){

console.error(err);

}

};

if(token) load();

},[token]);


const grupos = [...new Set(modulos.map(m => m.categoria))];


return(

<div className="min-h-screen bg-gray-900 text-white p-10">

<h1 className="text-3xl font-bold text-indigo-400 mb-4 text-center">
Plataforma Operacional Integrada
</h1>

<p className="text-center text-gray-400 mb-12">
LEAN • Planning • WMS • Inteligencia Operacional
</p>

{grupos.map(grupo=>(

<div key={grupo} className="mb-16">

<h2 className="text-2xl font-bold text-indigo-400 mb-6">
{grupo}
</h2>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

{modulos
.filter(m=>m.categoria===grupo)
.map(m=>(
<div
key={m.id}
onClick={()=>navigate(m.ruta)}
className="bg-gray-700 cursor-pointer p-6 rounded-2xl shadow-lg hover:scale-105 transition"
>

<div className="flex flex-col items-center text-center">

<h3 className="text-lg font-semibold">
{m.nombre}
</h3>

</div>

</div>
))}

</div>

</div>

))}

</div>

);

}