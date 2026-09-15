// src/pages/InventarioCiclico/ICUpload.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiUpload } from "../../utils/api";

export default function ICUpload() {
  const navigate = useNavigate();
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(null); // { filas_totales, filas_procesadas }
  const [error, setError] = useState("");
  const [uploads, setUploads] = useState([]);
  const [cargandoUploads, setCargandoUploads] = useState(true);

  const cargarUploads = async () => {
    try {
      const resp = await apiGet("/inventario-ciclico/uploads");
      setUploads(resp.uploads || []);
    } catch (err) {
      console.error("❌ Error listando cargas:", err);
    } finally {
      setCargandoUploads(false);
    }
  };

  useEffect(() => {
    cargarUploads();
  }, []);

  // Espera a que el procesamiento en segundo plano termine, consultando
  // /estado cada 2s. Necesario para archivos grandes (decenas/cientos de
  // miles de filas) que tardan más de lo que aguanta una sola request HTTP.
  const esperarProcesamiento = (uploadId) => {
    const intervalo = setInterval(async () => {
      try {
        const est = await apiGet(`/inventario-ciclico/${uploadId}/estado`);
        if (!est.ok) return;

        setProgreso({ filas_totales: est.filas_totales, filas_procesadas: est.filas_procesadas });

        if (est.estado === "listo") {
          clearInterval(intervalo);
          navigate(`/inventario-ciclico/${uploadId}`);
        } else if (est.estado === "error") {
          clearInterval(intervalo);
          setSubiendo(false);
          setProgreso(null);
          setError(est.error_mensaje || "Error procesando el archivo en el servidor");
        }
      } catch (err) {
        console.error("❌ Error consultando estado:", err);
      }
    }, 2000);
  };

  const subir = async () => {
    if (!archivo) return;
    setSubiendo(true);
    setError("");
    setProgreso(null);
    try {
      const formData = new FormData();
      formData.append("file", archivo);
      const resp = await apiUpload("/inventario-ciclico/upload", formData);

      if (!resp.ok) {
        setError(resp.message || "No se pudo procesar el archivo");
        setSubiendo(false);
        return;
      }

      setProgreso({ filas_totales: 0, filas_procesadas: 0 });
      esperarProcesamiento(resp.upload_id);
      // subiendo se mantiene en true hasta que esperarProcesamiento navegue o marque error
    } catch (err) {
      console.error("❌ Error subiendo archivo:", err);
      setError(err?.response?.data?.message || "Error subiendo el archivo");
      setSubiendo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-400 mb-2">
          📦 Inventario Cíclico
        </h1>
        <p className="text-gray-400 mb-6">
          Subí el export de ubicaciones (SKU, CD, ubicación, ventas, stock) y generamos la
          clasificación ABC/XYZ, la matriz de dispersión y las sugerencias de consolidación
          por CD.
        </p>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <label className="block text-sm text-gray-400 mb-2">
            Archivo Excel (.xlsx) con una fila por SKU x ubicación
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-300 mb-4"
          />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button
            onClick={subir}
            disabled={!archivo || subiendo}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 rounded font-semibold"
          >
            {subiendo ? "Procesando..." : "Analizar archivo"}
          </button>

          {subiendo && progreso && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{progreso.filas_totales > 0 ? "Cargando filas..." : "Leyendo el archivo..."}</span>
                {progreso.filas_totales > 0 && (
                  <span>
                    {progreso.filas_procesadas.toLocaleString("es-CL")} / {progreso.filas_totales.toLocaleString("es-CL")}
                  </span>
                )}
              </div>
              <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                <div
                  className={`h-full bg-indigo-500 transition-all ${progreso.filas_totales === 0 ? "animate-pulse w-1/4" : ""}`}
                  style={
                    progreso.filas_totales > 0
                      ? { width: `${Math.min(100, (progreso.filas_procesadas / progreso.filas_totales) * 100)}%` }
                      : undefined
                  }
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Los archivos grandes pueden tardar unos minutos — podés dejar esta pantalla abierta.
              </p>
            </div>
          )}
        </div>

        <h2 className="text-lg font-semibold text-gray-300 mb-3">Cargas anteriores</h2>
        {cargandoUploads ? (
          <p className="text-gray-500 text-sm">Cargando...</p>
        ) : uploads.length === 0 ? (
          <p className="text-gray-500 text-sm">Todavía no subiste ningún archivo.</p>
        ) : (
          <div className="space-y-2">
            {uploads.map((u) => {
              const listo = u.estado === "listo";
              const conError = u.estado === "error";
              return (
                <button
                  key={u.id}
                  onClick={() => listo && navigate(`/inventario-ciclico/${u.id}`)}
                  disabled={!listo}
                  className={`w-full text-left border rounded-lg p-3 flex items-center justify-between gap-3 ${
                    listo
                      ? "bg-gray-800 hover:bg-gray-700 border-gray-700"
                      : "bg-gray-800/50 border-gray-800 cursor-not-allowed"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{u.nombre_archivo}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(u.creado_en).toLocaleString("es-CL")} · {u.filas_procesadas}/{u.filas_totales} filas
                    </p>
                  </div>
                  {listo && <span className="text-indigo-400 text-sm shrink-0">Ver análisis →</span>}
                  {conError && <span className="text-red-400 text-xs shrink-0">⚠️ Error</span>}
                  {!listo && !conError && <span className="text-amber-400 text-xs shrink-0">⏳ Procesando</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={() => navigate("/inicio")}
            className="bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded-md"
          >
            Volver al menú principal
          </button>
        </div>
      </div>
    </div>
  );
}
