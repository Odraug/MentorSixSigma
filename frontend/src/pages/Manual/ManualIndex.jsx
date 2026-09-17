// src/pages/Manual/ManualIndex.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import contenido from "./contenido";

// Mismo orden de fases que usa Inicio.jsx, para que el manual se sienta
// como el mismo recorrido que ya conocés.
const ORDEN_FASES = ["0. Diagnóstico", "1. Definir", "2. Medir", "3. Analizar y Mejorar", "4. Operar"];

export default function ManualIndex() {
  const navigate = useNavigate();

  const fases = ORDEN_FASES.filter((f) => contenido.some((a) => a.fase === f));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-2 flex-wrap gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-indigo-400">📖 Manual de Uso</h1>
          <button
            onClick={() => navigate("/inicio")}
            className="bg-gray-700 hover:bg-gray-800 px-3 py-2 rounded-lg text-sm"
          >
            Volver al menú principal
          </button>
        </div>
        <p className="text-gray-400 mb-8">
          Guía rápida de cada módulo: para qué sirve, cómo se usa y algunos tips. Organizado en el mismo
          orden en que se recorre la metodología, desde el diagnóstico hasta operar.
        </p>

        {fases.map((fase) => (
          <div key={fase} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-3.5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-green-400" />
              <h2 className="text-sm font-bold text-indigo-300 tracking-wide uppercase">{fase}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contenido
                .filter((a) => a.fase === fase)
                .map((a) => (
                  <button
                    key={a.slug}
                    onClick={() => navigate(`/manual/${a.slug}`)}
                    className="text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500/50 rounded-xl p-4 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{a.icono}</span>
                      <h3 className="font-semibold text-white">{a.titulo}</h3>
                    </div>
                    <p className="text-sm text-gray-400">{a.resumen}</p>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
