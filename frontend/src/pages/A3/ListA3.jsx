// src/pages/ListA3.jsx
import React, { useEffect, useState } from "react";
import { listarA3PorEmpresa } from "../../utils/apiA3";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ListA3() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [a3list, setA3list] = useState([]);
  const empresaId = usuario?.empresa_id || localStorage.getItem("empresaId");

  useEffect(() => {
    if (empresaId) {
      listarA3PorEmpresa(empresaId).then(setA3list).catch(console.error);
    }
  }, [empresaId]);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h2 className="text-2xl font-bold text-indigo-400 mb-4">
        📋 Proyectos A3 - Six Sigma
      </h2>
<div className="flex justify-end gap-2 mb-4">
      <button
        onClick={() => navigate("/a3/nuevo")}
        className="bg-indigo-600 px-4 py-2 rounded mb-4"
      >
        Nuevo A3
      </button>

        <button
        onClick={() => navigate("/a3/intro")}
        className="bg-indigo-600 px-4 py-2 rounded mb-4"
      >
     Volver Menú A3
      </button>
</div>

      <table className="w-full border border-gray-700 text-left">
        <thead className="bg-gray-800 text-indigo-300">
          <tr>
            <th className="p-2 border">Título</th>
            <th className="p-2 border">Estado</th>
            <th className="p-2 border">Fecha creación</th>
            <th className="p-2 border text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {a3list.map((p) => (
            <tr key={p.id} className="hover:bg-gray-800">
              <td className="p-2 border">{p.titulo}</td>
              <td className="p-2 border">{p.estado}</td>
              <td className="p-2 border">{p.fecha_creacion?.slice(0, 10)}</td>
              <td className="p-2 border text-center">
                <button
                  onClick={() => navigate(`/a3/${p.id}`)}
                  className="bg-indigo-500 px-3 py-1 rounded"
                >
                  Abrir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
