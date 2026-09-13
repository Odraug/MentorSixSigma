// src/pages/VSM/VsmNodeTypes.jsx
//
// Nodos personalizados para el VSM interactivo (React Flow). Los nodos son
// de solo lectura visual — la edición de sus campos pasa por el panel
// lateral de VsmFlow.jsx (mismo patrón que el panel de racks del
// Diseñador de Layout de WMS), así el arrastre del nodo nunca choca con
// hacer foco en un input.

import React from "react";
import { Handle, Position } from "reactflow";

const baseBox = "rounded-lg border-2 px-3 py-2 shadow-md min-w-[150px] text-white";

export function ProcesoNode({ data, selected }) {
  return (
    <div
      className={`${baseBox} bg-slate-800 ${selected ? "border-cyan-400" : "border-slate-600"}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-cyan-400" />
      <p className="font-semibold text-sm truncate">{data.nombre || "Proceso"}</p>
      <div className="text-[10px] text-slate-300 grid grid-cols-2 gap-x-2 mt-1">
        <span>C/T: {data.ct ?? 0} min</span>
        <span>C/O: {data.co ?? 0} min</span>
        <span>Uptime: {data.uptime ?? 0}%</span>
        <span>Op: {data.operadores ?? 0}</span>
      </div>
      {data.valorAgregado === false && (
        <p className="text-[9px] text-amber-400 mt-1">Sin valor agregado</p>
      )}
      <Handle type="source" position={Position.Right} className="!bg-cyan-400" />
    </div>
  );
}

export function InventarioNode({ data, selected }) {
  return (
    <div className="relative flex flex-col items-center">
      <Handle type="target" position={Position.Left} className="!bg-amber-400" />
      <div
        className={`w-16 h-16 flex items-center justify-center text-slate-900 font-bold text-xs ${
          selected ? "ring-2 ring-cyan-400" : ""
        }`}
        style={{
          background: "#f59e0b",
          clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        }}
      >
        <span className="mt-3">{data.dias ?? 0}d</span>
      </div>
      <p className="text-[10px] text-slate-300 mt-1 max-w-[80px] text-center truncate">
        {data.nombre || "Inventario"}
      </p>
      <Handle type="source" position={Position.Right} className="!bg-amber-400" />
    </div>
  );
}

export function ExternoNode({ data, selected }) {
  const esProveedor = data.tipo === "proveedor";
  return (
    <div
      className={`${baseBox} ${esProveedor ? "bg-red-900" : "bg-blue-900"} ${
        selected ? "border-cyan-400" : "border-transparent"
      } text-center`}
    >
      {!esProveedor && <Handle type="target" position={Position.Left} className="!bg-slate-300" />}
      <p className="text-lg">{esProveedor ? "🏭" : "🏬"}</p>
      <p className="font-semibold text-sm truncate">{data.nombre || (esProveedor ? "Proveedor" : "Cliente")}</p>
      {esProveedor && <Handle type="source" position={Position.Right} className="!bg-slate-300" />}
    </div>
  );
}

export const vsmNodeTypes = {
  proceso: ProcesoNode,
  inventario: InventarioNode,
  proveedor: ExternoNode,
  cliente: ExternoNode,
};
