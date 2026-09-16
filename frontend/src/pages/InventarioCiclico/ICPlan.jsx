// src/pages/InventarioCiclico/ICPlan.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost, apiPut } from "../../utils/api";

const PRIORIDAD_COLOR = {
  P1: "bg-red-600 text-red-100",
  P2: "bg-amber-600 text-amber-100",
  P3: "bg-blue-600 text-blue-100",
  P4: "bg-gray-600 text-gray-200",
};

export default function ICPlan() {
  const { uploadId } = useParams();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [capacidad, setCapacidad] = useState([]);
  const [guardandoCapacidad, setGuardandoCapacidad] = useState(false);
  const [horizonteDias, setHorizonteDias] = useState(60);
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  const [planes, setPlanes] = useState([]);
  const [planActual, setPlanActual] = useState(null); // { plan, tareas } o resumen recién generado
  const [filtroCd, setFiltroCd] = useState("");
  const [filtroPrioridad, setFiltroPrioridad] = useState("");

  const cargarCapacidad = async () => {
    const resp = await apiGet(`/inventario-ciclico/${uploadId}/capacidad`);
    if (resp.ok) setCapacidad(resp.capacidad);
  };

  const cargarPlanes = async () => {
    const resp = await apiGet(`/inventario-ciclico/${uploadId}/planes`);
    if (resp.ok) setPlanes(resp.planes);
  };

  useEffect(() => {
    (async () => {
      setCargando(true);
      await Promise.all([cargarCapacidad(), cargarPlanes()]);
      setCargando(false);
    })();
  }, [uploadId]);

  const cambiarCapacidad = (cd, campo, valor) => {
    setCapacidad((prev) => prev.map((c) => (c.cd === cd ? { ...c, [campo]: valor } : c)));
  };

  const guardarCapacidad = async () => {
    setGuardandoCapacidad(true);
    try {
      await apiPut("/inventario-ciclico/capacidad", { capacidad });
    } catch (err) {
      console.error("❌ Error guardando capacidad:", err);
    } finally {
      setGuardandoCapacidad(false);
    }
  };

  const generarPlan = async () => {
    setGenerando(true);
    setError("");
    try {
      const resp = await apiPost(`/inventario-ciclico/${uploadId}/plan`, {
        horizonte_dias: Number(horizonteDias) || 60,
        fecha_inicio: fechaInicio,
        capacidad,
      });

      if (!resp.ok) {
        setError(resp.message || "No se pudo generar el plan");
        return;
      }

      const detalle = await apiGet(`/inventario-ciclico/plan/${resp.plan_id}`);
      setPlanActual({ ...detalle, resumen_por_cd: resp.resumen_por_cd });
      cargarPlanes();
    } catch (err) {
      console.error("❌ Error generando plan:", err);
      setError(err?.response?.data?.message || "Error generando el plan");
    } finally {
      setGenerando(false);
    }
  };

  const verPlan = async (planId) => {
    const detalle = await apiGet(`/inventario-ciclico/plan/${planId}`);
    if (detalle.ok) setPlanActual(detalle);
  };

  if (cargando) {
    return <div className="min-h-screen bg-gray-900 text-white p-8 text-center">Cargando...</div>;
  }

  const cdsDisponibles = capacidad.map((c) => c.cd);
  const tareasFiltradas = (planActual?.tareas || []).filter(
    (t) => (!filtroCd || t.cd === filtroCd) && (!filtroPrioridad || t.prioridad === filtroPrioridad)
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-400">📅 Plan de Inventario Cíclico</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/inventario-ciclico/${uploadId}`)}
            className="bg-gray-700 hover:bg-gray-800 px-3 py-2 rounded-lg"
          >
            Volver al análisis
          </button>
          <button onClick={() => navigate("/inicio")} className="bg-gray-700 hover:bg-gray-800 px-3 py-2 rounded-lg">
            Menú principal
          </button>
        </div>
      </div>

      <p className="text-gray-400 mb-6 max-w-3xl">
        Prioriza cada SKU según ABC/XYZ + dispersión, y reparte los conteos entre turnos (lun-vie) para
        que en el horizonte elegido se cubran todos los SKU de cada CD, priorizando los más críticos.
      </p>

      {/* Capacidad por CD */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-indigo-300 mb-3">Capacidad por CD (SKU por turno)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="p-2">CD</th>
                <th className="p-2">SKU por turno</th>
                <th className="p-2">Turnos por día</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {capacidad.map((c) => (
                <tr key={c.cd} className="border-b border-gray-800">
                  <td className="p-2 font-medium">{c.cd}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={1}
                      value={c.capacidad_por_turno}
                      onChange={(e) => cambiarCapacidad(c.cd, "capacidad_por_turno", e.target.value)}
                      className="bg-gray-700 p-1 rounded w-24"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={1}
                      max={3}
                      value={c.turnos_por_dia}
                      onChange={(e) => cambiarCapacidad(c.cd, "turnos_por_dia", e.target.value)}
                      className="bg-gray-700 p-1 rounded w-20"
                    />
                  </td>
                  <td className="p-2">
                    {!c.configurado && <span className="text-xs text-amber-400">sin configurar (default)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={guardarCapacidad}
          disabled={guardandoCapacidad}
          className="mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2 rounded text-sm font-semibold"
        >
          {guardandoCapacidad ? "Guardando..." : "Guardar capacidad"}
        </button>
      </div>

      {/* Generar plan */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-indigo-300 mb-3">Generar plan</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Horizonte (días)</label>
            <input
              type="number"
              min={7}
              value={horizonteDias}
              onChange={(e) => setHorizonteDias(e.target.value)}
              className="bg-gray-700 p-2 rounded w-28"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Fecha de inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="bg-gray-700 p-2 rounded"
            />
          </div>
          <button
            onClick={generarPlan}
            disabled={generando}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-60 px-4 py-2 rounded font-semibold"
          >
            {generando ? "Generando..." : "Generar plan"}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>

      {/* Historial de planes */}
      {planes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-2">Planes anteriores</h2>
          <div className="flex flex-wrap gap-2">
            {planes.map((p) => (
              <button
                key={p.id}
                onClick={() => verPlan(p.id)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-1.5 text-xs"
              >
                {new Date(p.creado_en).toLocaleDateString("es-CL")} · {p.horizonte_dias}d · {p.total_tareas} tareas
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resultado del plan */}
      {planActual && (
        <>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-indigo-300 mb-3">
              Resumen — {planActual.plan.fecha_inicio} a {planActual.plan.fecha_fin} ({planActual.plan.total_tareas} tareas)
            </h2>
            {planActual.resumen_por_cd ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="p-2">CD</th>
                      <th className="p-2">SKUs</th>
                      <th className="p-2">Necesarias</th>
                      <th className="p-2">Asignadas</th>
                      <th className="p-2">Capacidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planActual.resumen_por_cd.map((r) => (
                      <tr key={r.cd} className="border-b border-gray-800">
                        <td className="p-2 font-medium">{r.cd}</td>
                        <td className="p-2">{r.skus}</td>
                        <td className="p-2">{r.tareas_necesarias}</td>
                        <td className="p-2">{r.tareas_asignadas}</td>
                        <td className="p-2">
                          {r.capacidad_insuficiente ? (
                            <span className="text-red-400">⚠️ insuficiente ({r.capacidad_por_turno}/turno)</span>
                          ) : (
                            <span className="text-green-400">✅ {r.capacidad_por_turno}/turno</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Plan histórico — usá los filtros de abajo para revisar el calendario.</p>
            )}
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-indigo-300">Calendario</h2>
              <div className="flex gap-2">
                <select value={filtroCd} onChange={(e) => setFiltroCd(e.target.value)} className="bg-gray-700 p-2 rounded text-sm">
                  <option value="">Todos los CD</option>
                  {cdsDisponibles.map((cd) => (
                    <option key={cd} value={cd}>{cd}</option>
                  ))}
                </select>
                <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="bg-gray-700 p-2 rounded text-sm">
                  <option value="">Todas las prioridades</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800">
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Día</th>
                    <th className="p-2">Turno</th>
                    <th className="p-2">CD</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Descripción</th>
                    <th className="p-2">Prioridad</th>
                    <th className="p-2">Frecuencia</th>
                  </tr>
                </thead>
                <tbody>
                  {tareasFiltradas.slice(0, 500).map((t, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="p-2">{t.fecha}</td>
                      <td className="p-2">{t.dia_semana}</td>
                      <td className="p-2">{t.turno}</td>
                      <td className="p-2">{t.cd}</td>
                      <td className="p-2">{t.sku}</td>
                      <td className="p-2 text-gray-300">{t.descripcion}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${PRIORIDAD_COLOR[t.prioridad]}`}>{t.prioridad}</span>
                      </td>
                      <td className="p-2 text-gray-400">{t.frecuencia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tareasFiltradas.length > 500 && (
              <p className="text-xs text-gray-500 mt-2">Mostrando las primeras 500 de {tareasFiltradas.length} tareas. Usá los filtros para acotar.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
