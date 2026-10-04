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
  const [objetivoUnidades, setObjetivoUnidades] = useState(900000);
  const [objetivoInput, setObjetivoInput] = useState("900000");

  const cargarSimulacion = async (objetivo) => {
    const resp = await apiGet(
      `/inventario-ciclico/${uploadId}/osr-simulacion?objetivo_unidades=${objetivo}`
    );
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
        await Promise.all([cargarSimulacion(objetivoUnidades), cargarCapacidad()]);
      } catch (err) {
        console.error("❌ Error cargando simulación OSR:", err);
        setError("No se pudo cargar la simulación");
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [uploadId]);

  const recalcularObjetivo = async () => {
    const nuevoObjetivo = Number(objetivoInput) || 0;
    setObjetivoUnidades(nuevoObjetivo);
    setCargando(true);
    try {
      await cargarSimulacion(nuevoObjetivo);
    } finally {
      setCargando(false);
    }
  };

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

  const guardarCapacidad = async () => {
    setGuardando(true);
    try {
      await apiPut("/inventario-ciclico/capacidad", { capacidad });
      await cargarSimulacion(objetivoUnidades);
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

  const { estado_actual, tras_recall, estado_proyectado, delta, recall, relleno, tiempo_estimado } = simulacion;

  const diasPara = (cantidad) =>
    tiempo_estimado.capacidad_diaria > 0 ? Math.ceil(cantidad / tiempo_estimado.capacidad_diaria) : null;

  const formatearDias = (dias) => {
    if (dias === null) return "—";
    if (dias <= 0) return "0 días";
    const semanas = (dias / 5).toFixed(1);
    return `${dias.toLocaleString("es-CL")} días hábiles (~${semanas} semanas)`;
  };

  const pctObjetivoAlcanzado = simulacion.objetivo_unidades > 0
    ? (estado_proyectado.unidades / simulacion.objetivo_unidades) * 100
    : null;

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
        Simula cómo llegar a una capacidad objetivo de unidades en el OSR: primero hace recall de los SKU
        de baja rotación (libera espacio) y después reparte lo que falta hasta el objetivo entre las
        categorías AX/AY/BX, proporcional a cuánto ocupa cada una hoy, y dentro de cada una, proporcional
        a las ventas de cada SKU.
      </p>

      {/* Objetivo */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold text-indigo-300 mb-1">Capacidad objetivo del OSR</h2>
        <p className="text-xs text-gray-500 mb-4">Cuánto querés que el OSR llegue a almacenar en total.</p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Objetivo — Unidades</label>
            <input
              type="number"
              min={0}
              value={objetivoInput}
              onChange={(e) => setObjetivoInput(e.target.value)}
              className="p-2 text-black rounded w-40"
            />
          </div>
          <button
            onClick={recalcularObjetivo}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg"
          >
            Recalcular
          </button>
        </div>
      </div>

      {/* Estado actual / tras recall / proyectado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2">Estado actual del OSR</p>
          <p className="text-2xl font-bold">{fmt(estado_actual.skus)} <span className="text-sm font-normal text-gray-400">SKU</span></p>
          <p className="text-lg text-gray-300">{fmt(estado_actual.unidades)} unidades</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2">Tras el recall</p>
          <p className="text-2xl font-bold">{fmt(tras_recall.skus)} <span className="text-sm font-normal text-gray-400">SKU</span></p>
          <p className="text-lg text-gray-300">{fmt(tras_recall.unidades)} unidades</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2">Proyectado (recall + relleno al objetivo)</p>
          <p className="text-2xl font-bold">{fmt(estado_proyectado.skus)} <span className="text-sm font-normal text-gray-400">SKU</span></p>
          <p className="text-lg text-gray-300">{fmt(estado_proyectado.unidades)} unidades</p>
          {pctObjetivoAlcanzado !== null && (
            <p className="text-xs text-indigo-300 mt-1">{pctObjetivoAlcanzado.toFixed(1)}% del objetivo</p>
          )}
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2">Variación total</p>
          <p className={`text-2xl font-bold ${delta.skus >= 0 ? "text-green-400" : "text-amber-400"}`}>
            {delta.skus >= 0 ? "+" : ""}{fmt(delta.skus)} <span className="text-sm font-normal text-gray-400">SKU</span>
          </p>
          <p className={`text-lg ${delta.unidades >= 0 ? "text-green-400" : "text-amber-400"}`}>
            {delta.unidades >= 0 ? "+" : ""}{fmt(delta.unidades)} unidades
          </p>
        </div>
      </div>

      {/* Relleno hasta el objetivo */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold text-indigo-300 mb-3">Relleno hasta el objetivo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
          <div>
            <p className="text-xs text-gray-500">Falta para el objetivo (tras recall)</p>
            <p className="text-xl font-bold text-amber-400">{fmt(relleno.gap_total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Se logra cubrir</p>
            <p className="text-xl font-bold text-green-400">{fmt(relleno.gap_cubierto)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Déficit (sin stock suficiente en la red)</p>
            <p className={`text-xl font-bold ${relleno.shortfall > 0 ? "text-red-400" : "text-gray-500"}`}>
              {fmt(relleno.shortfall)}
            </p>
          </div>
        </div>
        {relleno.shortfall > 0 && (
          <p className="text-sm text-amber-400 mb-4">
            No hay stock suficiente en el resto de la red para llegar 100% al objetivo — esto es lo máximo
            alcanzable con el stock actual de AX/AY/BX.
          </p>
        )}

        <h3 className="text-sm font-semibold text-gray-300 mb-2">Apertura por categoría</h3>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="p-2">Categoría</th>
                <th className="p-2 text-right">Unidades actual</th>
                <th className="p-2 text-right">Unidades asignadas</th>
                <th className="p-2 text-right">Unidades proyectado</th>
                <th className="p-2 text-right">SKU nuevos</th>
              </tr>
            </thead>
            <tbody>
              {["AX", "AY", "BX"].map((m) => {
                const c = relleno.por_categoria[m];
                return (
                  <tr key={m} className="border-b border-gray-800">
                    <td className="p-2">{m}</td>
                    <td className="p-2 text-right">{fmt(c.unidades_actual)}</td>
                    <td className="p-2 text-right text-green-400">+{fmt(c.unidades_asignadas)}</td>
                    <td className="p-2 text-right font-semibold">{fmt(c.unidades_proyectado)}</td>
                    <td className="p-2 text-right">{fmt(c.skus_nuevos)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h3 className="text-sm font-semibold text-gray-300 mb-2 mt-4">
          Detalle por SKU ({fmt(relleno.total_skus_con_asignacion)} con asignación)
        </h3>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-800">
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="p-2">SKU</th>
                <th className="p-2">Descripción</th>
                <th className="p-2">Cat.</th>
                <th className="p-2">Tote</th>
                <th className="p-2 text-right">Stock OSR actual</th>
                <th className="p-2 text-right">A sumar</th>
                <th className="p-2 text-right">Nuevo total</th>
                <th className="p-2 text-right">Totes estimados</th>
              </tr>
            </thead>
            <tbody>
              {relleno.detalle.map((d) => (
                <tr key={d.sku} className="border-b border-gray-800">
                  <td className="p-2">{d.sku}</td>
                  <td className="p-2 text-gray-300">{d.descripcion}</td>
                  <td className="p-2">{d.matriz}</td>
                  <td className="p-2 text-gray-400">{d.tote_tipo}</td>
                  <td className="p-2 text-right">{fmt(d.stock_en_osr_actual)}</td>
                  <td className="p-2 text-right text-green-400">+{fmt(d.unidades_asignadas)}</td>
                  <td className="p-2 text-right font-semibold">{fmt(d.nuevo_total_osr)}</td>
                  <td className="p-2 text-right">{d.totes_estimados ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {relleno.total_skus_con_asignacion > relleno.detalle.length && (
          <p className="text-xs text-gray-500 mt-2">
            Mostrando los {relleno.detalle.length} de mayor asignación de {relleno.total_skus_con_asignacion}.
          </p>
        )}
      </div>

      {/* Ritmo de trabajo y tiempo estimado */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold text-indigo-300 mb-1">Tiempo estimado para completar la optimización</h2>
        <p className="text-xs text-gray-500 mb-4">
          Cuántas tareas (recall o sumar stock a un SKU) puede ejecutar el equipo del OSR por turno.{" "}
          {!capacidadOsr.configurado && (
            <span className="text-amber-400">Todavía no configuraste esto — se usa un valor por defecto.</span>
          )}
        </p>
        <div className="flex flex-wrap items-end gap-4 mb-5">
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
            onClick={guardarCapacidad}
            disabled={guardando}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded-lg"
          >
            {guardando ? "Guardando..." : "Guardar y recalcular"}
          </button>
          <p className="text-xs text-gray-500">
            = {fmt(capacidadOsr.capacidad_por_turno * capacidadOsr.turnos_por_dia)} tareas/día
          </p>
        </div>

        <p className="text-2xl font-bold text-indigo-300 mb-1">{formatearDias(tiempo_estimado.dias_habiles)}</p>
        <p className="text-xs text-gray-500 mb-4">
          {fmt(tiempo_estimado.total_tareas)} tareas en total ÷ {fmt(tiempo_estimado.capacidad_diaria)} tareas/día.
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
                <td className="p-2 text-right">{fmt(recall.cantidad)}</td>
                <td className="p-2 text-right">{fmt(recall.unidades_liberadas)}</td>
                <td className="p-2 text-right">{formatearDias(diasPara(recall.cantidad))}</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="p-2 text-green-400">Relleno (reabastecer + incorporar)</td>
                <td className="p-2 text-right">{fmt(relleno.total_skus_con_asignacion)}</td>
                <td className="p-2 text-right">{fmt(relleno.gap_cubierto)}</td>
                <td className="p-2 text-right">{formatearDias(diasPara(relleno.total_skus_con_asignacion))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          El recall concentra la mayoría de las tareas. Si primero se hace solo el relleno (más rápido) y
          el recall se ejecuta en paralelo o en una segunda etapa, el OSR mejora su composición mucho antes
          de terminar el recall completo.
        </p>
      </div>
    </div>
  );
}
