// src/pages/GembaWalk/GwListado.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../utils/api";

export default function GwListado() {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchPlanes = async () => {
      try {
        // Usa la empresa del token (backend: GET /api/gemba/empresa)
        const resp = await apiGet("/gemba/empresa");

        if (!resp.ok) {
          console.error("Error API listando planes Gemba:", resp);
          setPlanes([]);
          return;
        }

        setPlanes(resp.planes || []);
      } catch (error) {
        console.error("❌ Error cargando planes Gemba:", error);
        setPlanes([]);
      } finally {
        setCargando(false);
      }
    };

    fetchPlanes();
  }, []);

  const irANuevoPlan = () => {
    navigate("/gemba/plan");
  };

  const irAEjecucion = (plan) => {
    // dejemos seleccionado este gemba para la ejecución
    localStorage.setItem("gembaIdActual", plan.id);
    localStorage.setItem("gembaPlan", JSON.stringify(plan));
    navigate("/gemba/ejecucion");
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 text-center">
        Cargando planes de Gemba...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-400">
          📋 Planes de Gemba Walk
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/gemba/intro")}
            className="bg-gray-700 hover:bg-gray-800 px-3 py-2 rounded-lg"
          >
            Menú Gemba
          </button>
          <button
            onClick={irANuevoPlan}
            className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg"
          >
            + Nuevo plan
          </button>
        </div>
      </div>

      {/* Grid de tarjetas */}
      {planes.length === 0 ? (
        <p className="text-gray-400">
          No hay planes de Gemba. Crea uno nuevo para comenzar.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {planes.map((plan) => {
            const fechaLegible = plan.fecha
              ? new Date(plan.fecha).toLocaleDateString("es-CL")
              : "-";

            // Estado aproximado a partir de los conteos que ya trae el listado
            // (evita pedir el detalle completo de cada Gemba solo para saber
            // si tiene observaciones cargadas).
            const totalObs = Number(plan.observaciones_count) || 0;
            const accionesPendientes = Number(plan.acciones_derivadas_count) || 0;
            const estado = totalObs === 0 ? "Sin ejecutar" : "En curso";
            const colorEstado =
              totalObs === 0
                ? "bg-gray-600 text-gray-200"
                : "bg-blue-600 text-blue-100";

            return (
              <div
                key={plan.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h2 className="text-xl font-bold text-white">
                    {plan.proposito || "Gemba sin título"}
                  </h2>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${colorEstado}`}>
                    {estado}
                  </span>
                </div>

                <p className="text-sm text-gray-300">
                  <strong>Área:</strong> {plan.area}
                </p>
                <p className="text-sm text-gray-300">
                  <strong>Responsable:</strong> {plan.responsable}
                </p>
                <p className="text-sm text-gray-400">
                  <strong>Fecha:</strong> {fechaLegible}
                </p>

                {totalObs > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    🗒️ {totalObs} observación{totalObs === 1 ? "" : "es"} registrada{totalObs === 1 ? "" : "s"}
                    {accionesPendientes > 0 && (
                      <span className="text-yellow-400"> · ⚡ {accionesPendientes} con acción derivada</span>
                    )}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {/* Similar a Implementación / Seguimiento / Auditoría en 5S */}
                  <button
                    onClick={() => irAEjecucion(plan)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
                  >
                    Ejecución
                  </button>

                  {/* Opcional: futuro módulo de Reporte */}
                  <button
                    onClick={() => {
                      localStorage.setItem("gembaIdActual", plan.id);
                      localStorage.setItem("gembaPlan", JSON.stringify(plan));
                      navigate("/gemba/reporte");
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1 rounded"
                  >
                    Reporte
                  </button>

                  {/* Eliminar (más adelante podemos hacer el endpoint) */}
                  {/* <button className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded">
                    Eliminar
                  </button> */}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
