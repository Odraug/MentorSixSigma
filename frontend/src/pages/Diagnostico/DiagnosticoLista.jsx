// src/pages/Diagnostico/DiagnosticoLista.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiDelete } from "../../utils/api";

export default function DiagnosticoLista() {
  const navigate = useNavigate();
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    try {
      setCargando(true);
      const resp = await apiGet("/diagnostico");
      if (resp?.ok) {
        setDiagnosticos(resp.diagnosticos || []);
      }
    } catch (err) {
      console.error("❌ Error listando diagnósticos:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar este diagnóstico?")) return;
    try {
      await apiDelete(`/diagnostico/${id}`);
      cargar();
    } catch (err) {
      console.error("❌ Error eliminando diagnóstico:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
          <h1 className="text-3xl font-bold text-indigo-400">🧭 Diagnósticos Rápidos</h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/diagnostico")}
              className="bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700"
            >
              ➕ Nuevo diagnóstico
            </button>
          </div>
        </div>

        {cargando ? (
          <p className="text-gray-300">Cargando...</p>
        ) : diagnosticos.length === 0 ? (
          <p className="text-gray-400">Todavía no generaste ningún diagnóstico.</p>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-700 text-gray-300">
                <tr>
                  <th className="p-2 text-left">Nombre</th>
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticos.map((d) => (
                  <tr key={d.id} className="border-t border-gray-700">
                    <td className="p-2">{d.nombre}</td>
                    <td className="p-2">
                      {d.fecha_creacion
                        ? new Date(d.fecha_creacion).toLocaleString("es-CL")
                        : "—"}
                    </td>
                    <td className="p-2 text-center space-x-2">
                      <button
                        onClick={() => navigate(`/diagnostico/${d.id}`)}
                        className="bg-indigo-600 px-2 py-1 rounded hover:bg-indigo-700 text-xs"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => eliminar(d.id)}
                        className="bg-red-600 px-2 py-1 rounded hover:bg-red-700 text-xs"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
