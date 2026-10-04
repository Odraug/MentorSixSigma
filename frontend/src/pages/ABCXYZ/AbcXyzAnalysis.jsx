import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../../config/env";

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
// verde, CZ (peor: bajo volumen + errático) en rojo.
const GRADIENTE_MATRIZ = ["#15803d", "#22c55e", "#ca8a04", "#ea580c", "#b91c1c"];
const colorCelda = (abc, xyz) => GRADIENTE_MATRIZ[ABC_IDX[abc] + XYZ_IDX[xyz]];

export default function AbcXyzAnalysis() {
  const token = localStorage.getItem("token");
  const companyId = localStorage.getItem("empresa_id");

  const [meses, setMeses] = useState(6);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");

  const calcular = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/api/analisis/abc-xyz`, {
        params: { companyId, meses },
        headers: { Authorization: `Bearer ${token}` },
      });
      setResultado(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Error calculando la clasificación");
    } finally {
      setLoading(false);
    }
  };

  const guardar = async () => {
    try {
      await axios.post(
        `${API_BASE}/api/analisis/abc-xyz/guardar`,
        { companyId, meses },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Clasificación guardada en el perfil logístico de cada SKU");
    } catch (err) {
      console.error(err);
      alert("Error guardando la clasificación");
    }
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl mb-4 font-bold text-indigo-400">Análisis ABC / XYZ</h1>

      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-slate-300">Meses de historia:</label>
        <input
          type="number"
          min={1}
          value={meses}
          onChange={(e) => setMeses(e.target.value)}
          className="p-2 text-black rounded w-20"
        />
        <button onClick={calcular} className="bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700">
          {loading ? "Calculando..." : "Calcular"}
        </button>
        {resultado && (
          <button onClick={guardar} className="bg-green-600 px-4 py-2 rounded hover:bg-green-700">
            Guardar en SKUs
          </button>
        )}
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {resultado && (
        <>
          {/* Matriz resumen 3x3, con ejes A-C (volumen) y X-Z (variabilidad) */}
          <div className="max-w-xl mb-8">
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
                    const cell = resultado.resumen[key];
                    return (
                      <div
                        key={key}
                        className="rounded p-3 text-center text-white flex flex-col items-center justify-center"
                        style={{ background: colorCelda(abc, xyz) }}
                        title={CELL_LABEL[key]}
                      >
                        <div className="text-base font-bold">{key}</div>
                        <div className="text-xs opacity-90">{cell.skus} SKUs</div>
                        <div className="text-xs opacity-75">{Math.round(cell.qty_total)} u.</div>
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

          {/* Tabla detallada */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-300 border-b border-slate-700">
                  <th className="p-2">SKU</th>
                  <th className="p-2">Producto</th>
                  <th className="p-2">Unidades ({resultado.periodo_meses}m)</th>
                  <th className="p-2">% Acumulado</th>
                  <th className="p-2">CV</th>
                  <th className="p-2">Matriz</th>
                </tr>
              </thead>
              <tbody>
                {resultado.data.map((row) => (
                  <tr key={row.product_id} className="border-b border-slate-800">
                    <td className="p-2">{row.sku_code}</td>
                    <td className="p-2">{row.product_name}</td>
                    <td className="p-2">{row.qty_total}</td>
                    <td className="p-2">{row.pct_acumulado}%</td>
                    <td className="p-2">{row.coef_variacion ?? "—"}</td>
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
        </>
      )}
    </div>
  );
}

/*
  Integración:
  1. Copia a: frontend/src/pages/ABCXYZ/AbcXyzAnalysis.jsx
     (ajusta el import de API_BASE según la profundidad de carpeta: "../../config/env")

  2. En App.js:
     import AbcXyzAnalysis from "./pages/ABCXYZ/AbcXyzAnalysis.jsx";
     <Route path="/analisis/abc-xyz" element={<AbcXyzAnalysis />} />
*/
