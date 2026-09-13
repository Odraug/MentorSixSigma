// src/pages/Diagnostico/DiagnosticoRapido.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost } from "../../utils/api";

export default function DiagnosticoRapido() {
  const navigate = useNavigate();
  const { id } = useParams(); // si viene, es un diagnóstico ya guardado (solo lectura)

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [informe, setInforme] = useState("");
  const [roadmap, setRoadmap] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [soloLectura, setSoloLectura] = useState(false);

  useEffect(() => {
    if (!id) {
      setNombre("");
      setDescripcion("");
      setInforme("");
      setRoadmap([]);
      setSoloLectura(false);
      return;
    }

    const cargar = async () => {
      try {
        setCargando(true);
        const resp = await apiGet(`/diagnostico/${id}`);
        if (resp?.ok && resp.diagnostico) {
          setNombre(resp.diagnostico.nombre || "");
          setDescripcion(resp.diagnostico.descripcion || "");
          setInforme(resp.diagnostico.informe || "");
          setRoadmap(resp.diagnostico.roadmap || []);
          setSoloLectura(true);
        }
      } catch (err) {
        console.error("❌ Error cargando diagnóstico:", err);
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [id]);

  const generar = async () => {
    if (!nombre.trim()) {
      alert("Poné un título corto para este diagnóstico");
      return;
    }
    if (!descripcion.trim()) {
      alert("Contanos qué querés analizar o mejorar");
      return;
    }

    try {
      setGenerando(true);
      const resp = await apiPost("/diagnostico/generar", { nombre, descripcion });
      if (resp?.ok && resp.diagnostico) {
        setInforme(resp.diagnostico.informe || "");
        setRoadmap(resp.diagnostico.roadmap || []);
        setSoloLectura(true);
        navigate(`/diagnostico/${resp.diagnostico.id}`, { replace: true });
      } else {
        alert("⚠️ No se pudo generar el diagnóstico.");
      }
    } catch (err) {
      console.error("❌ Error generando diagnóstico:", err);
      alert("❌ Error al generar el diagnóstico. Probá de nuevo en unos segundos.");
    } finally {
      setGenerando(false);
    }
  };

  const nuevoDiagnostico = () => navigate("/diagnostico");

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-indigo-400">🧭 Diagnóstico Rápido</h1>
            <p className="text-sm text-gray-400 mt-1">
              Contanos con tus palabras qué querés analizar o mejorar. La IA te da un informe y te dice por dónde empezar.
            </p>
          </div>
          <div className="flex gap-2">
            {soloLectura && (
              <button
                onClick={nuevoDiagnostico}
                className="bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700 text-sm"
              >
                ➕ Nuevo diagnóstico
              </button>
            )}
            <button
              onClick={() => navigate("/diagnostico/lista")}
              className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-800 text-sm"
            >
              Diagnósticos anteriores
            </button>
          </div>
        </div>

        {cargando ? (
          <p className="text-gray-300">Cargando diagnóstico...</p>
        ) : (
          <>
            <div className="bg-gray-800 rounded-xl p-5 space-y-3 mb-6">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={soloLectura}
                placeholder="Título corto (ej: Demoras en despacho de pedidos)"
                className="w-full p-3 rounded bg-gray-900 text-white border border-gray-700 disabled:opacity-70"
              />
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={soloLectura}
                rows={6}
                placeholder="Describí tu proceso, qué te preocupa o qué te gustaría mejorar, con tus propias palabras..."
                className="w-full p-3 rounded bg-gray-900 text-white border border-gray-700 resize-none disabled:opacity-70"
              />
              {!soloLectura && (
                <button
                  onClick={generar}
                  disabled={generando}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 py-3 rounded font-semibold"
                >
                  {generando ? "Generando diagnóstico..." : "🤖 Generar diagnóstico con IA"}
                </button>
              )}
            </div>

            {informe && (
              <div className="bg-indigo-950 border border-indigo-600 rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-indigo-300 mb-3">📋 Informe gerencial</h2>
                <p className="whitespace-pre-line text-gray-200 leading-relaxed">{informe}</p>
              </div>
            )}

            {roadmap.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-indigo-300 mb-4">🗺️ Roadmap sugerido</h2>
                <div className="space-y-3">
                  {roadmap.map((paso, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-4 bg-gray-900 border border-gray-700 rounded-lg p-4"
                    >
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Paso {i + 1}</p>
                        <p className="font-semibold text-white">{paso.modulo}</p>
                        <p className="text-sm text-gray-400 mt-1">{paso.motivo}</p>
                      </div>
                      {paso.ruta && (
                        <button
                          onClick={() => navigate(paso.ruta)}
                          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-sm font-semibold"
                        >
                          Ir a {paso.modulo} →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
