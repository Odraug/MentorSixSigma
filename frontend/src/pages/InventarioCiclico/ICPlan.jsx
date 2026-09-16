// src/pages/InventarioCiclico/ICPlan.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
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
  const [horizonteDias, setHorizonteDias] = useState(45);
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  const [planes, setPlanes] = useState([]);
  const [planActual, setPlanActual] = useState(null); // { plan, tareas } o resumen recién generado
  const [filtroCd, setFiltroCd] = useState("");
  const [filtroPrioridad, setFiltroPrioridad] = useState("");
  const [filtroPiso, setFiltroPiso] = useState("");

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
  // Ahora cada "tarea" viene expandida a una fila por ubicación física del
  // SKU (para poder mostrar dónde contar y filtrar por piso). `tarea_id`
  // identifica la tarea real (SKU+CD+fecha+turno) detrás de esas filas.
  const pisosDisponibles = [...new Set((planActual?.tareas || []).map((t) => t.piso).filter(Boolean))].sort();
  const tareasFiltradas = (planActual?.tareas || []).filter(
    (t) =>
      (!filtroCd || t.cd === filtroCd) &&
      (!filtroPrioridad || t.prioridad === filtroPrioridad) &&
      (!filtroPiso || t.piso === filtroPiso)
  );

  // Agrupa TODAS las tareas del plan (no solo las filtradas/mostradas) en
  // bloques de 7 días desde la fecha de inicio, con apertura por CD y
  // contando por prioridad. Dedupe por tarea_id: una tarea puede tener
  // varias ubicaciones, pero acá se cuenta una sola vez (es "1 SKU a
  // contar", no "1 ubicación a visitar").
  const resumenSemanal = (() => {
    const tareas = planActual?.tareas || [];
    if (!tareas.length || !planActual?.plan?.fecha_inicio) return [];
    const inicio = new Date(String(planActual.plan.fecha_inicio).slice(0, 10) + "T00:00:00");
    const vistas = new Set();
    const buckets = {};
    for (const t of tareas) {
      if (vistas.has(t.tarea_id)) continue;
      vistas.add(t.tarea_id);
      const fecha = new Date(String(t.fecha).slice(0, 10) + "T00:00:00");
      const semana = Math.floor((fecha - inicio) / (7 * 86400000));
      const key = `${semana}|${t.cd}`;
      if (!buckets[key]) buckets[key] = { semana, cd: t.cd, P1: 0, P2: 0, P3: 0, P4: 0, total: 0 };
      buckets[key][t.prioridad] = (buckets[key][t.prioridad] || 0) + 1;
      buckets[key].total += 1;
    }
    return Object.values(buckets)
      .sort((a, b) => a.semana - b.semana || a.cd.localeCompare(b.cd))
      .map((b) => {
        const desde = new Date(inicio.getTime() + b.semana * 7 * 86400000);
        const hasta = new Date(desde.getTime() + 6 * 86400000);
        return { ...b, desde: desde.toISOString().slice(0, 10), hasta: hasta.toISOString().slice(0, 10) };
      });
  })();

  // Agrupa las filas (semana, cd) en bloques por semana, con un total de la
  // semana sumando todos los CD, para renderizar sub-filas + subtotal.
  const semanasAgrupadas = (() => {
    const porSemana = {};
    for (const r of resumenSemanal) {
      if (!porSemana[r.semana]) {
        porSemana[r.semana] = { semana: r.semana, desde: r.desde, hasta: r.hasta, filas: [], total: { P1: 0, P2: 0, P3: 0, P4: 0, total: 0 } };
      }
      porSemana[r.semana].filas.push(r);
      porSemana[r.semana].total.P1 += r.P1 || 0;
      porSemana[r.semana].total.P2 += r.P2 || 0;
      porSemana[r.semana].total.P3 += r.P3 || 0;
      porSemana[r.semana].total.P4 += r.P4 || 0;
      porSemana[r.semana].total.total += r.total || 0;
    }
    return Object.values(porSemana).sort((a, b) => a.semana - b.semana);
  })();

  const descargarExcel = () => {
    const tareas = planActual?.tareas || [];
    if (!tareas.length) return;

    const filas = tareas.map((t) => ({
      Fecha: t.fecha?.slice(0, 10),
      Día: t.dia_semana,
      Turno: t.turno,
      CD: t.cd,
      Piso: t.piso || "",
      Ubicación: t.ubicacion || "",
      SKU: t.sku,
      Descripción: t.descripcion,
      Prioridad: t.prioridad,
      Frecuencia: t.frecuencia,
      Operario: "",
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja["!cols"] = [
      { wch: 11 }, { wch: 10 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 14 },
      { wch: 14 }, { wch: 32 }, { wch: 9 }, { wch: 11 }, { wch: 16 },
    ];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Plan");
    XLSX.writeFile(libro, `plan-inventario-ciclico-${planActual.plan.fecha_inicio?.slice(0, 10)}.xlsx`);
  };

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
            <label className="block text-xs text-gray-400 mb-1">Horizonte (días, máx. 45)</label>
            <input
              type="number"
              min={7}
              max={45}
              value={horizonteDias}
              onChange={(e) => setHorizonteDias(Math.min(45, Number(e.target.value) || 45))}
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

          {/* Resumen semanal por prioridad */}
          {resumenSemanal.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-indigo-300 mb-1">Resumen semanal por prioridad</h2>
              <p className="text-xs text-gray-500 mb-3">Cuántos SKU se cuentan cada semana, con apertura por CD y por prioridad.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="p-2">Semana</th>
                      <th className="p-2">CD</th>
                      <th className="p-2 text-red-400">P1</th>
                      <th className="p-2 text-amber-400">P2</th>
                      <th className="p-2 text-blue-400">P3</th>
                      <th className="p-2 text-gray-400">P4</th>
                      <th className="p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semanasAgrupadas.map((sem) => (
                      <React.Fragment key={sem.semana}>
                        {sem.filas.map((r) => (
                          <tr key={`${sem.semana}-${r.cd}`} className="border-b border-gray-800">
                            <td className="p-2 text-gray-400">Sem. {sem.semana + 1} ({sem.desde} a {sem.hasta})</td>
                            <td className="p-2">{r.cd}</td>
                            <td className="p-2">{r.P1 || 0}</td>
                            <td className="p-2">{r.P2 || 0}</td>
                            <td className="p-2">{r.P3 || 0}</td>
                            <td className="p-2">{r.P4 || 0}</td>
                            <td className="p-2">{r.total}</td>
                          </tr>
                        ))}
                        {sem.filas.length > 1 && (
                          <tr className="border-b-2 border-gray-700 bg-gray-900/40 font-semibold">
                            <td className="p-2" colSpan={2}>Total semana {sem.semana + 1}</td>
                            <td className="p-2">{sem.total.P1}</td>
                            <td className="p-2">{sem.total.P2}</td>
                            <td className="p-2">{sem.total.P3}</td>
                            <td className="p-2">{sem.total.P4}</td>
                            <td className="p-2">{sem.total.total}</td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-indigo-300">Calendario</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={descargarExcel}
                  className="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded text-sm"
                >
                  ⬇️ Descargar Excel
                </button>
                <select value={filtroCd} onChange={(e) => setFiltroCd(e.target.value)} className="bg-gray-700 p-2 rounded text-sm">
                  <option value="">Todos los CD</option>
                  {cdsDisponibles.map((cd) => (
                    <option key={cd} value={cd}>{cd}</option>
                  ))}
                </select>
                <select value={filtroPiso} onChange={(e) => setFiltroPiso(e.target.value)} className="bg-gray-700 p-2 rounded text-sm">
                  <option value="">Todos los pisos</option>
                  {pisosDisponibles.map((piso) => (
                    <option key={piso} value={piso}>{piso}</option>
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
            <p className="text-xs text-gray-500 mb-2">
              Cada fila es una ubicación física a visitar — un SKU con varias ubicaciones en el CD aparece varias veces.
            </p>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800">
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Día</th>
                    <th className="p-2">Turno</th>
                    <th className="p-2">CD</th>
                    <th className="p-2">Piso</th>
                    <th className="p-2">Ubicación</th>
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
                      <td className="p-2">{t.piso || "—"}</td>
                      <td className="p-2 text-gray-300">{t.ubicacion || "—"}</td>
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
              <p className="text-xs text-gray-500 mt-2">Mostrando las primeras 500 de {tareasFiltradas.length} filas (ubicaciones). Usá los filtros para acotar, o descargá el Excel completo.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
