// src/pages/InventarioCiclico/ICOsrSimulacion.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPut } from "../../utils/api";

const fmt = (n) => Number(n || 0).toLocaleString("es-CL");

export default function ICOsrSimulacion() {
  const { uploadId } = useParams();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [simulacion, setSimulacion] = useState(null);
  const [capacidad, setCapacidad] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const cargarSimulacion = async () => {
    const resp = await apiGet(`/inventario-ciclico/${uploadId}/osr-simulacion`);
    if (resp.ok) {
      setSimulacion(resp);
    } else {
      setError(resp.message || "No se pudo calcular la simulación");
    }
  };

  const cargarCapacidad = async () => {
    const resp = await apiGet(`/inventario-ciclico/${uploadId}/capacidad`);
    if (resp.ok) setCapacidad(resp.capacidad || []);
  };

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setError("");
      try {
        await Promise.all([cargarSimulacion(), cargarCapacidad()]);
      } catch (err) {
        console.error("❌ Error cargando simulación OSR:", err);
        setError("No se pudo cargar la simulación");
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [uploadId]);

  const capacidadOsr = capacidad.find((c) => c.cd === "OSR") || {
    cd: "OSR",
    capacidad_por_turno: 20,
    turnos_por_dia: 3,
    configurado: false,
  };

  const cambiarCapacidadOsr = (campo, valor) => {
    setCapacidad((prev) => {
      const valorNum = Number(valor) || 0;
      if (prev.some((c) => c.cd === "OSR")) {
        return prev.map((c) => (c.cd === "OSR" ? { ...c, [campo]: valorNum } : c));
      }
      return [...prev, { cd: "OSR", capacidad_por_turno: 20, turnos_por_dia: 3, [campo]: valorNum }];
    });
  };

  const guardarYRecalcular = async () => {
    setGuardando(true);
    try {
      await apiPut("/inventario-ciclico/capacidad", { capacidad });
      await cargarSimulacion();
      await cargarCapacidad();
    } catch (err) {
      console.error("❌ Error guardando capacidad OSR:", err);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 text-center">
        Calculando la simulación...
      </div>
    );
  }

  if (error || !simulacion) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 text-center">
        <p className="text-gray-400 mb-4">{error || "No se pudo cargar la simulación."}</p>
        <button
          onClick={() => navigate(`/inventario-ciclico/${uploadId}`)}
          className="bg-indigo-700 px-4 py-2 rounded-lg"
        >
          Volver al análisis
        </button>
      </div>
    );
  }

  const { estado_actual, estado_proyectado, delta, capacidad: cap, tiempo_estimado, resumen_acciones } = simulacion;

  const diasPara = (cantidad) =>
    tiempo_estimado.capacidad_diaria > 0 ? Math.ceil(cantidad / tiempo_estimado.capacidad_diaria) : null;

  const formatearDias = (dias) => {
    if (dias === null) return "—";
    if (dias <= 0) return "0 días";
    const semanas = (dias / 5).toFixed(1); // días hábiles -> semanas laborales
    return `${dias.toLocaleString("es-CL")} días hábiles (~${semanas} semanas)`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-400">
          🔄 Simulador de optimización OSR
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/inventario-ciclico/${uploadId}`)}
            className="bg-gray-700 hover:bg-gray-800 px-3 py-2 rounded-lg"
          >
            Volver al análisis
          </button>
          <button
            onClick={() => navigate("/inicio")}
            className="bg-gray-700 hover:bg-gray-800 px-3 py-2 rounded-lg"
          >
            Menú principal
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-400 mb-6 max-w-3xl">
        Simula el resultado de ejecutar las 3 acciones del bloque "Sugerencia de reabastecimiento OSR"
        (recall + reabastecer + incorporar) sobre esta carga: cómo quedaría el OSR, cuánta capacidad se
        libera, y en cuánto tiempo se podría completar según el ritmo de trabajo que configures.
      </p>

      {/* Capacidad OSR */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold text-indigo-300 mb-1">Ritmo de trabajo del OSR</h2>
        <p className="text-xs text-gray-500 mb-4">
          Cuántas tareas (recall, reabastecer o incorporar un SKU) puede ejecutar el equipo del OSR por
          turno.{" "}
          {!capacidadOsr.configurado && (
            <span className="text-amber-400">Todavía no configuraste esto — se usa un valor por defecto.</span>
          )}
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tareas por turno</label>
            <input
              type="number"
              min={1}
              value={capacidadOsr.capacidad_por_turno}
              onChange={(e) => cambiarCapacidadOsr("capacidad_por_turno", e.target.value)}
              className="p-2 text-black rounded w-28"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Turnos por día</label>
            <input
              type="number"
              min={1}
              max={3}
              value={capacidadOsr.turnos_por_dia}
              onChange={(e) => cambiarCapacidadOsr("turnos_por_dia", e.target.value)}
              className="p-2 text-black rounded w-24"
            />
          </div>
          <button
            onClick={guardarYRecalcular}
            disabled={guardando}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded-lg"
          >
            {guardando ? "Recalculando..." : "Guardar y recalcular"}
          </button>
          <p className="text-xs text-gray-500">
            = {fmt(capacidadOsr.capacidad_por_turno * capacidadOsr.turnos_por_dia)} tareas/día
          </p>
        </div>
      </div>

      {/* Antes / después */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2">Estado actual del OSR</p>
          <p className="text-2xl font-bold">{fmt(estado_actual.skus)} <span className="text-sm font-normal text-gray-400">SKU</span></p>
          <p className="text-lg text-gray-300">{fmt(estado_actual.unidades)} unidades</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2">Estado proyectado (tras recall + reabastecer + incorporar)</p>
          <p className="text-2xl font-bold">{fmt(estado_proyectado.skus)} <span className="text-sm font-normal text-gray-400">SKU</span></p>
          <p className="text-lg text-gray-300">{fmt(estado_proyectado.unidades)} unidades</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2">Variación</p>
          <p className={`text-2xl font-bold ${delta.skus >= 0 ? "text-green-400" : "text-amber-400"}`}>
            {delta.skus >= 0 ? "+" : ""}{fmt(delta.skus)} <span className="text-sm font-normal text-gray-400">SKU</span>
          </p>
          <p className={`text-lg ${delta.unidades >= 0 ? "text-green-400" : "text-amber-400"}`}>
            {delta.unidades >= 0 ? "+" : ""}{fmt(delta.unidades)} unidades
          </p>
        </div>
      </div>

      {/* Capacidad liberada vs necesaria */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold text-indigo-300 mb-3">Capacidad liberada vs. necesaria</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
          <div>
            <p className="text-xs text-gray-500">Unidades liberadas por recall</p>
            <p className="text-xl font-bold text-red-400">{fmt(cap.unidades_liberadas_recall)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Unidades necesarias (reabastecer + incorporar)</p>
            <p className="text-xl font-bold text-amber-400">{fmt(cap.unidades_necesarias_reabastecer_incorporar)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cobertura</p>
            <p className="text-xl font-bold text-green-400">
              {cap.cobertura_pct !== null ? `${cap.cobertura_pct}%` : "—"}
            </p>
          </div>
        </div>
        {cap.cobertura_pct !== null && cap.cobertura_pct > 100 && (
          <p className="text-sm text-gray-400">
            Lo que libera el recall alcanza y sobra para cubrir el reabastecimiento y la incorporación de
            nuevos SKU — queda margen para seguir sumando SKU de alta rotación al OSR además de lo ya
            sugerido.
          </p>
        )}
        {cap.cobertura_pct !== null && cap.cobertura_pct <= 100 && (
          <p className="text-sm text-amber-400">
            Lo que libera el recall no alcanza a cubrir todo lo necesario para reabastecer e incorporar —
            conviene priorizar el recall de mayor volumen primero.
          </p>
        )}
      </div>

      {/* Tiempo estimado */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold text-indigo-300 mb-3">Tiempo estimado para completar la optimización</h2>
        <p className="text-2xl font-bold text-indigo-300 mb-1">{formatearDias(tiempo_estimado.dias_habiles)}</p>
        <p className="text-xs text-gray-500 mb-4">
          {fmt(tiempo_estimado.total_tareas)} tareas en total ÷ {fmt(tiempo_estimado.capacidad_diaria)} tareas/día
          ({fmt(tiempo_estimado.capacidad_por_turno)} por turno × {tiempo_estimado.turnos_por_dia} turnos).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="p-2">Acción</th>
                <th className="p-2 text-right">SKU</th>
                <th className="p-2 text-right">Unidades</th>
                <th className="p-2 text-right">Tiempo si se hiciera sola</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-800">
                <td className="p-2 text-red-400">Recall</td>
                <td className="p-2 text-right">{fmt(resumen_acciones.recall.cantidad)}</td>
                <td className="p-2 text-right">{fmt(resumen_acciones.recall.unidades)}</td>
                <td className="p-2 text-right">{formatearDias(diasPara(resumen_acciones.recall.cantidad))}</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="p-2 text-amber-400">Reabastecer</td>
                <td className="p-2 text-right">{fmt(resumen_acciones.reabastecer.cantidad)}</td>
                <td className="p-2 text-right">{fmt(resumen_acciones.reabastecer.unidades)}</td>
                <td className="p-2 text-right">{formatearDias(diasPara(resumen_acciones.reabastecer.cantidad))}</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="p-2 text-green-400">Incorporar</td>
                <td className="p-2 text-right">{fmt(resumen_acciones.incorporar.cantidad)}</td>
                <td className="p-2 text-right">{fmt(resumen_acciones.incorporar.unidades)}</td>
                <td className="p-2 text-right">{formatearDias(diasPara(resumen_acciones.incorporar.cantidad))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          El recall concentra la mayoría de las tareas. Si primero se hace solo reabastecer + incorporar
          (más rápido) y el recall se ejecuta en paralelo o en una segunda etapa, el OSR mejora su
          composición mucho antes de terminar el recall completo.
        </p>
      </div>
    </div>
  );
}
