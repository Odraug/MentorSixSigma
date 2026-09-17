// src/pages/Manual/ManualArticulo.jsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import contenido from "./contenido";

export default function ManualArticulo() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const articulo = contenido.find((a) => a.slug === slug);
  const indice = contenido.findIndex((a) => a.slug === slug);
  const anterior = indice > 0 ? contenido[indice - 1] : null;
  const siguiente = indice >= 0 && indice < contenido.length - 1 ? contenido[indice + 1] : null;

  if (!articulo) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 text-center">
        <p className="text-gray-400 mb-4">No encontramos esa página del manual.</p>
        <button onClick={() => navigate("/manual")} className="bg-indigo-700 px-4 py-2 rounded-lg">
          Volver al manual
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <button onClick={() => navigate("/manual")} className="bg-gray-700 hover:bg-gray-800 px-3 py-2 rounded-lg text-sm">
            ← Manual de Uso
          </button>
          <button onClick={() => navigate("/inicio")} className="bg-gray-700 hover:bg-gray-800 px-3 py-2 rounded-lg text-sm">
            Menú principal
          </button>
        </div>

        <div className="mb-2 text-xs font-bold text-indigo-300 tracking-wide uppercase">{articulo.fase}</div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <span>{articulo.icono}</span> {articulo.titulo}
        </h1>
        <p className="text-gray-400 mb-8">{articulo.resumen}</p>

        <div className="space-y-6">
          {articulo.secciones.map((sec, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-indigo-300 mb-3">{sec.titulo}</h2>

              {sec.parrafos?.map((p, j) => (
                <p key={j} className="text-gray-300 leading-relaxed mb-2">{p}</p>
              ))}

              {sec.pasos && (
                <ol className="list-decimal list-inside space-y-1.5 text-gray-300">
                  {sec.pasos.map((paso, j) => (
                    <li key={j}>{paso}</li>
                  ))}
                </ol>
              )}

              {sec.items && (
                <ul className="list-disc list-inside space-y-1.5 text-gray-300">
                  {sec.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-800 gap-3">
          {anterior ? (
            <button
              onClick={() => navigate(`/manual/${anterior.slug}`)}
              className="text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-4 py-2 text-sm"
            >
              ← {anterior.titulo}
            </button>
          ) : <span />}
          {siguiente ? (
            <button
              onClick={() => navigate(`/manual/${siguiente.slug}`)}
              className="text-right bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-4 py-2 text-sm"
            >
              {siguiente.titulo} →
            </button>
          ) : <span />}
        </div>
      </div>
    </div>
  );
}
