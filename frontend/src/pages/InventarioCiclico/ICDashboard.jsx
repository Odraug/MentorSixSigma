// src/pages/InventarioCiclico/ICDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet } from "../../utils/api";

const CELL_LABEL = {
  AX: "Alta rotación, estable", AY: "Alta rotación, variable", AZ: "Alta rotación, errática",
  BX: "Rotación media, estable", BY: "Rotación media, variable", BZ: "Rotación media, errática",
  CX: "Baja rotación, estable", CY: "Baja rotación, variable", CZ: "Baja rotación, errática",
};
const ABC_INFO = { A: "Alto", B: "Medio", C: "Bajo" };
const XYZ_INFO = { X: "Estable", Y: "Media", Z: "Alta" };
const ABC_IDX = { A: 0, B: 1, C: 2 };
const XYZ_IDX = { X: 0, Y: 1, Z: 2 };
// Degradado diagonal: AX (mejor combinación: alto volumen + estable) en
// verde, CZ (peor: bajo volumen + errático) en rojo, con las combinaciones
// intermedias en el medio según qué tan lejos estén de esa esquina.
const GRADIENTE_MATRIZ = ["#15803d", "#22c55e", "#ca8a04", "#ea580c", "#b91c1c"];
const colorCelda = (abc, xyz) => GRADIENTE_MATRIZ[ABC_IDX[abc] + XYZ_IDX[xyz]];

// Codificación de dispersión propuesta: 1 excelente, 2 controlado,
// 3 revisar, 4 alto, 5+ crítico.
const DISPERSION_LABEL = { "1": "🟢 Excelente", "2": "🟢 Controlado", "3": "🟡 Revisar", "4": "🟠 Alto", "5+": "🔴 Crítico" };
const BALDES = ["1", "2", "3", "4", "5+"];

const CATEGORIAS_ORDEN = ["AX", "AY", "AZ", "BX", "BY", "BZ", "CX", "CY", "CZ"];

const Kpi = ({ label, value, accent }) => (
  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className={`text-2xl font-bold ${accent || "text-white"}`}>{value}</p>
  </div>
);

export default function ICDashboard() {
  const { uploadId } = useParams();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [resumen, setResumen] = useState(null);
  const [abcXyz, setAbcXyz] = useState(null);
  const [dispersion, setDispersion] = useState(null);
  const [consolidacion, setConsolidacion] = useState(null);
  const [filtroCd, setFiltroCd] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null); // { matriz, cd|null }

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setError("");
      try {
        const [r1, r2, r3] = await Promise.all([
          apiGet(`/inventario-ciclico/${uploadId}/resumen`),
          apiGet(`/inventario-ciclico/${uploadId}/abc-xyz`),
          apiGet(`/inventario-ciclico/${uploadId}/dispersion`),
        ]);
        setResumen(r1.ok ? r1 : null);
        setAbcXyz(r2.ok ? r2 : null);
        setDispersion(r3.ok ? r3 : null);
        if (!r1.ok) setError(r1.message || "No se pudo cargar el resumen");
      } catch (err) {
        console.error("❌ Error cargando dashboard Inventario Cíclico:", err);
        setError("No se pudo cargar el análisis de esta carga");
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [uploadId]);

  useEffect(() => {
    const cargarConsolidacion = async () => {
      try {
        const qs = filtroCd ? `?cd=${encodeURIComponent(filtroCd)}` : "";
        const resp = await apiGet(`/inventario-ciclico/${uploadId}/consolidacion${qs}`);
        setConsolidacion(resp.ok ? resp : null);
      } catch (err) {
        console.error("❌ Error cargando consolidación:", err);
      }
    };
    cargarConsolidacion();
  }, [uploadId, filtroCd]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 text-center">
        Analizando la carga...
      </div>
    );
  }

  if (error || !resumen) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 text-center">
        <p className="text-gray-400 mb-4">{error || "No se pudo cargar el análisis."}</p>
        <button
          onClick={() => navigate("/inventario-ciclico")}
          className="bg-indigo-700 px-4 py-2 rounded-lg"
        >
          Volver a cargas
        </button>
      </div>
    );
  }

  const { resumen: r, por_cd: porCd } = resumen;
  const consolidacionTop = (consolidacion?.sugerencias || []).slice(0, 200);
  const cdsDisponibles = [...new Set(porCd.map((c) => c.cd))];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-400">
          📦 Inventario Cíclico — Análisis
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/inventario-ciclico")}
            className="bg-gray-700 hover:bg-gray-800 px-3 py-2 rounded-lg"
          >
            Otra carga
          </button>
          <button
            onClick={() => navigate(`/inventario-ciclico/${uploadId}/plan`)}
            className="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg"
          >
            📅 Planificar inventario cíclico
          </button>
          <button
            onClick={() => navigate("/inicio")}
            className="bg-gray-700 hover:bg-gray-800 px-3 py-2 rounded-lg"
          >
            Menú principal
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <Kpi label="Unidades" value={r.unidades.toLocaleString("es-CL")} />
        <Kpi label="Ubicaciones" value={r.ubicaciones.toLocaleString("es-CL")} />
        <Kpi label="SKUs" value={r.skus.toLocaleString("es-CL")} />
        <Kpi label="Ubicaciones / SKU" value={r.ubicaciones_por_sku} />
        <Kpi
          label="% Optimizable"
          value={`${r.porcentaje_optimizable}%`}
          accent="text-amber-400"
        />
      </div>

      {/* Distribución por CD */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold text-indigo-300 mb-3">Distribución por CD</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="p-2">CD</th>
                <th className="p-2">Ubicaciones</th>
                <th className="p-2">Optimizables</th>
                <th className="p-2">%</th>
              </tr>
            </thead>
            <tbody>
              {porCd.map((c) => (
                <tr key={c.cd} className="border-b border-gray-800">
                  <td className="p-2 font-medium">{c.cd}</td>
                  <td className="p-2">{c.ubicaciones.toLocaleString("es-CL")}</td>
                  <td className="p-2">{c.optimizables.toLocaleString("es-CL")}</td>
                  <td className="p-2">
                    <span className={c.porcentaje >= 30 ? "text-amber-400 font-semibold" : ""}>
                      {c.porcentaje}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matriz de dispersión */}
      {dispersion && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold text-indigo-300 mb-1">Matriz de dispersión</h2>
          <p className="text-xs text-gray-500 mb-3">SKUs según cuántas ubicaciones distintas ocupan</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="p-2">CD</th>
                  {BALDES.map((b) => (
                    <th key={b} className="p-2 text-center">{DISPERSION_LABEL[b]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800 bg-gray-900/40">
                  <td className="p-2 font-semibold">Global</td>
                  {BALDES.map((b) => (
                    <td key={b} className="p-2 text-center">{dispersion.global[b]}</td>
                  ))}
                </tr>
                {Object.entries(dispersion.por_cd).map(([cd, baldes]) => (
                  <tr key={cd} className="border-b border-gray-800">
                    <td className="p-2">{cd}</td>
                    {BALDES.map((b) => (
                      <td key={b} className="p-2 text-center">{baldes[b]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABC/XYZ */}
      {abcXyz && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold text-indigo-300 mb-3">Clasificación ABC / XYZ</h2>

          <div className="max-w-xl mb-6">
            <div className="grid grid-cols-[64px_1fr_1fr_1fr] gap-1.5">
              <div />
              {["A", "B", "C"].map((abc) => (
                <div key={abc} className="text-center pb-1">
                  <div className="text-sm font-bold text-gray-200">{abc}</div>
                  <div className="text-[10px] text-gray-500">({ABC_INFO[abc]})</div>
                </div>
              ))}

              {["X", "Y", "Z"].map((xyz) => (
                <React.Fragment key={xyz}>
                  <div className="flex flex-col items-center justify-center text-center pr-1">
                    <div className="text-sm font-bold text-gray-200">{xyz}</div>
                    <div className="text-[10px] text-gray-500">({XYZ_INFO[xyz]})</div>
                  </div>
                  {["A", "B", "C"].map((abc) => {
                    const key = `${abc}${xyz}`;
                    return (
                      <div
                        key={key}
                        className="rounded p-3 text-center text-white flex flex-col items-center justify-center"
                        style={{ background: colorCelda(abc, xyz) }}
                        title={CELL_LABEL[key]}
                      >
                        <div className="text-base font-bold">{key}</div>
                        <div className="text-xs opacity-90">{abcXyz.resumen_matriz[key]} SKUs</div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-2 text-center">
              → Volumen de demanda: A (alto) a C (bajo) &nbsp;·&nbsp; ↓ Variabilidad: X (estable) a Z (errática)
            </p>
          </div>
        </div>
      )}

      {/* Resumen por categoría y CD */}
      {abcXyz && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold text-indigo-300 mb-1">Resumen por categoría y CD</h2>
          <p className="text-xs text-gray-500 mb-3">
            Hacé clic en una categoría (o en un CD dentro de ella) para ver el detalle de SKU.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="p-2">Categoría</th>
                  <th className="p-2">CD</th>
                  <th className="p-2 text-right">SKU</th>
                  <th className="p-2 text-right">Unidades</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIAS_ORDEN.map((matriz) => {
                  const filasCd = (abcXyz.resumen_cd_matriz || []).filter((r) => r.matriz === matriz);
                  const totalSkus = abcXyz.resumen_matriz[matriz] || 0;
                  const totalUnidades = filasCd.reduce((acc, r) => acc + r.unidades, 0);
                  const totalSeleccionado =
                    categoriaSeleccionada?.matriz === matriz && !categoriaSeleccionada?.cd;
                  return (
                    <React.Fragment key={matriz}>
                      <tr
                        className={`border-b border-gray-800 cursor-pointer hover:bg-gray-700/50 ${
                          totalSeleccionado ? "bg-indigo-900/40" : ""
                        }`}
                        onClick={() => setCategoriaSeleccionada({ matriz, cd: null })}
                      >
                        <td className="p-2 font-semibold">
                          <span
                            className="inline-block w-3 h-3 rounded-sm mr-2 align-middle"
                            style={{ background: colorCelda(matriz[0], matriz[1]) }}
                          />
                          {matriz}
                          <span className="text-[10px] text-gray-500 ml-1">({CELL_LABEL[matriz]})</span>
                        </td>
                        <td className="p-2 text-gray-500">Todos</td>
                        <td className="p-2 text-right font-semibold">{totalSkus.toLocaleString("es-CL")}</td>
                        <td className="p-2 text-right font-semibold">{totalUnidades.toLocaleString("es-CL")}</td>
                      </tr>
                      {filasCd.map((r) => {
                        const seleccionada =
                          categoriaSeleccionada?.matriz === matriz && categoriaSeleccionada?.cd === r.cd;
                        return (
                          <tr
                            key={`${matriz}-${r.cd}`}
                            className={`border-b border-gray-800/50 cursor-pointer hover:bg-gray-700/50 ${
                              seleccionada ? "bg-indigo-900/40" : ""
                            }`}
                            onClick={() => setCategoriaSeleccionada({ matriz, cd: r.cd })}
                          >
                            <td className="p-2 pl-6 text-gray-500">{matriz}</td>
                            <td className="p-2">{r.cd}</td>
                            <td className="p-2 text-right">{r.skus.toLocaleString("es-CL")}</td>
                            <td className="p-2 text-right">{r.unidades.toLocaleString("es-CL")}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalle de SKU de la categoría/CD seleccionada */}
      {abcXyz && categoriaSeleccionada && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h2 className="text-lg font-semibold text-indigo-300">
              Detalle — {categoriaSeleccionada.matriz}
              {categoriaSeleccionada.cd ? ` · ${categoriaSeleccionada.cd}` : " · todos los CD"}
            </h2>
            <button
              onClick={() => setCategoriaSeleccionada(null)}
              className="text-gray-400 hover:text-white text-sm"
            >
              ✕ Cerrar
            </button>
          </div>
          {(() => {
            const filtrados = abcXyz.data.filter(
              (row) =>
                row.matriz === categoriaSeleccionada.matriz &&
                (!categoriaSeleccionada.cd || (row.cds || []).includes(categoriaSeleccionada.cd))
            );
            return (
              <>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-800">
                      <tr className="text-left text-gray-400 border-b border-gray-700">
                        <th className="p-2">SKU</th>
                        <th className="p-2">Descripción</th>
                        <th className="p-2">Ventas</th>
                        <th className="p-2">Stock</th>
                        <th className="p-2">N° ubic.</th>
                        <th className="p-2">Matriz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.slice(0, 200).map((row) => (
                        <tr key={row.sku} className="border-b border-gray-800">
                          <td className="p-2">{row.sku}</td>
                          <td className="p-2 text-gray-300">{row.descripcion}</td>
                          <td className="p-2">{row.ventas_total.toLocaleString("es-CL")}</td>
                          <td className="p-2">{row.stock_total.toLocaleString("es-CL")}</td>
                          <td className="p-2">{row.n_ubicaciones}</td>
                          <td className="p-2">
                            <span
                              className="px-2 py-1 rounded text-xs"
                              style={{ background: colorCelda(row.matriz[0], row.matriz[1]) }}
                            >
                              {row.matriz}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtrados.length > 200 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Mostrando los primeros 200 de {filtrados.length} SKU (ordenados por ventas).
                  </p>
                )}
                {filtrados.length === 0 && (
                  <p className="text-sm text-gray-500 py-3">No hay SKU en esta categoría.</p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Sugerencias de consolidación */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h2 className="text-lg font-semibold text-indigo-300">Sugerencias de consolidación</h2>
          <select
            value={filtroCd}
            onChange={(e) => setFiltroCd(e.target.value)}
            className="bg-gray-700 p-2 rounded text-sm"
          >
            <option value="">Todos los CD</option>
            {cdsDisponibles.map((cd) => (
              <option key={cd} value={cd}>{cd}</option>
            ))}
          </select>
        </div>

        {consolidacion && (
          <p className="text-xs text-gray-500 mb-3">
            {consolidacion.total_grupos_con_oportunidad} SKU×CD con oportunidad de consolidación ·{" "}
            {consolidacion.total_ubicaciones_a_liberar} ubicaciones a liberar en total
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="p-2">SKU</th>
                <th className="p-2">CD</th>
                <th className="p-2">N° ubic.</th>
                <th className="p-2">Mantener en</th>
                <th className="p-2">A liberar</th>
              </tr>
            </thead>
            <tbody>
              {consolidacionTop.map((s) => (
                <tr key={`${s.cd}-${s.sku}`} className="border-b border-gray-800">
                  <td className="p-2">{s.sku}</td>
                  <td className="p-2">{s.cd}</td>
                  <td className="p-2">{s.n_ubicaciones}</td>
                  <td className="p-2 text-green-400">{s.ubicacion_ancla} ({s.qty_ancla.toLocaleString("es-CL")} u.)</td>
                  <td className="p-2 text-amber-400">{s.ubicaciones_a_liberar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {consolidacion && consolidacion.sugerencias.length > 200 && (
          <p className="text-xs text-gray-500 mt-2">
            Mostrando las 200 de mayor impacto de {consolidacion.sugerencias.length}.
          </p>
        )}
        {consolidacion && consolidacion.sugerencias.length === 0 && (
          <p className="text-sm text-gray-500 py-3">No hay oportunidades de consolidación con este filtro.</p>
        )}
      </div>
    </div>
  );
}
