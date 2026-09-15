// src/pages/InventarioCiclico/ICUpload.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiUpload } from "../../utils/api";

export default function ICUpload() {
  const navigate = useNavigate();
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
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

  const subir = async () => {
    if (!archivo) return;
    setSubiendo(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", archivo);
      const resp = await apiUpload("/inventario-ciclico/upload", formData);

      if (!resp.ok) {
        setError(resp.message || "No se pudo procesar el archivo");
        return;
      }

      navigate(`/inventario-ciclico/${resp.upload_id}`);
    } catch (err) {
      console.error("❌ Error subiendo archivo:", err);
      setError(err?.response?.data?.message || "Error subiendo el archivo");
    } finally {
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
        </div>

        <h2 className="text-lg font-semibold text-gray-300 mb-3">Cargas anteriores</h2>
        {cargandoUploads ? (
          <p className="text-gray-500 text-sm">Cargando...</p>
        ) : uploads.length === 0 ? (
          <p className="text-gray-500 text-sm">Todavía no subiste ningún archivo.</p>
        ) : (
          <div className="space-y-2">
            {uploads.map((u) => (
              <button
                key={u.id}
                onClick={() => navigate(`/inventario-ciclico/${u.id}`)}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{u.nombre_archivo}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(u.creado_en).toLocaleString("es-CL")} · {u.filas_procesadas} filas procesadas
                  </p>
                </div>
                <span className="text-indigo-400 text-sm shrink-0">Ver análisis →</span>
              </button>
            ))}
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
