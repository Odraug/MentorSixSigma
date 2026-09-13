// src/components/Sections/SectionA.jsx
import React from "react";
import { update, set5W2H, setResumen5W2H } from "../../utils/a3Helpers";
import A3Header from "../A3Header";
import { API_BASE } from '../../config/env';


export default function SectionA({ a3, setA3, goTo, setMessage }) {

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(a3, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${a3.meta.titulo || "a3"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Exportado JSON (descarga iniciada)");
    setTimeout(() => setMessage(""), 3000);
  };

  // 🔹 Maneja la carga de imágenes y las convierte a base64
  const handleImageUpload = (e, path) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setA3((prev) => {
          const copy = JSON.parse(JSON.stringify(prev));
          let cur = copy;
          for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
          if (!Array.isArray(cur[path[path.length - 1]])) cur[path[path.length - 1]] = [];
          cur[path[path.length - 1]].push({
            name: file.name,
            url: event.target.result, // 👈 base64 del archivo
          });
          return copy;
        });
      };
      reader.readAsDataURL(file); // convierte a base64
    });
  };

  // 🔹 Elimina una imagen seleccionada
  const removeImage = (path, idx) => {
    setA3((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      let cur = copy;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]].splice(idx, 1);
      return copy;
    });
  };

  return (
    <section className="w-full bg-gray-800 p-4 rounded-lg border border-gray-700 col-span-2">


      <h3 className="text-xl font-semibold text-indigo-300 mb-2">
        A. Describir problema / Situación
      </h3>
      {/* Aquí pones todo lo de problema, objetivo y 5W2H */}
      {/* 1. Descripción problema */}
      <div className="mb-3">
        <label className="text-sm text-gray-400">1. Descripción del problema / Condición actual / Acciones de contención</label>
        <textarea
          value={a3.problema.descripcion}
          onChange={(e) => update(a3, setA3, ["problema", "descripcion"], e.target.value)}
          className="w-full mt-2 p-3 rounded bg-gray-700"
          rows={4}
          placeholder="Describe el problema principal..."
        />
        <textarea
          value={a3.problema.condicionActual}
          onChange={(e) => update(a3, setA3, ["problema", "condicionActual"], e.target.value)}
          className="w-full mt-2 p-3 rounded bg-gray-700"
          rows={3}
          placeholder="Condición actual..."
        />
        <textarea
          value={a3.problema.accionesContencion}
          onChange={(e) => update(a3, setA3, ["problema", "accionesContencion"], e.target.value)}
          className="w-full mt-2 p-3 rounded bg-gray-700"
          rows={2}
          placeholder="Acciones de contención..."
        />
      </div>

      
      {/* Meta y Cumplimiento */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div>
          <label className="text-sm text-gray-400">🎯 Meta (%)</label>
          <input
            type="number"
            value={a3.objetivo.meta}
            onChange={(e) => update(a3, setA3, ["objetivo", "meta"], e.target.value)}
            className="w-full mt-1 p-2 rounded bg-gray-700"
            placeholder="Ej: 95"
          />
        </div>
        <div>
          <label className="text-sm text-gray-400">📊 Cumplimiento Actual (%)</label>
          <input
            type="number"
            value={a3.objetivo.cumplimiento}
            onChange={(e) => update(a3, setA3, ["objetivo", "cumplimiento"], e.target.value)}
            className="w-full mt-1 p-2 rounded bg-gray-700"
            placeholder="Ej: 65"
          />
        </div>
        <div>
          <label className="text-sm text-gray-400">📉 Brecha (%)</label>
          <input
            type="number"
            readOnly
            value={
              a3.objetivo.meta && a3.objetivo.cumplimiento
                ? a3.objetivo.meta - a3.objetivo.cumplimiento
                : ""
            }
            className="w-full mt-1 p-2 rounded bg-gray-600 text-gray-300"
            placeholder="Auto"
          />
        </div>
      </div>


      {/* 3. Análisis 5W2H */}
      <div className="mb-3">
        <label className="text-sm text-gray-400 font-semibold">3. Análisis 5W2H</label>

        {/* Ayuda: esta tabla es la herramienta "Es / No es" para acotar el
            problema, no una pregunta de sí-o-no. Se explica una sola vez
            acá arriba y cada fila trae un ejemplo como placeholder. */}
        <div className="mt-2 mb-2 bg-gray-900/60 border border-indigo-600/40 rounded-lg p-3 text-sm text-gray-300">
          <p className="font-semibold text-indigo-300 mb-1">💡 ¿Qué anoto en cada columna?</p>
          <p>
            No es una pregunta de sí/no: es la técnica <span className="text-white font-medium">"Es / No es"</span> para delimitar el problema.
          </p>
          <p className="mt-1">
            <span className="text-green-400 font-medium">Es</span>: lo que SÍ forma parte del problema, con datos concretos.{" "}
            <span className="text-red-400 font-medium">No es</span>: algo parecido pero que NO es el problema, para descartarlo del análisis.
          </p>
          <p className="mt-1 text-gray-400 italic">
            Ej. en "Qué" → Es: "Demoras en el despacho de pedidos urgentes". No es: "Demoras en pedidos programados con anticipación".
          </p>
        </div>

        <table className="w-full mt-2 text-left border border-gray-600">
          <thead>
            <tr className="bg-gray-700 text-gray-200">
              <th className="px-2 py-1 border text-center">Elemento</th>
              <th className="px-2 py-1 border text-center">Es <span className="font-normal text-gray-400">(sí aplica)</span></th>
              <th className="px-2 py-1 border text-center">No es <span className="font-normal text-gray-400">(no aplica)</span></th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                key: "que",
                label: "Qué",
                phEs: "Ej: Demoras en el despacho de pedidos urgentes",
                phNoEs: "Ej: Demoras en pedidos programados con anticipación",
              },
              {
                key: "cuando",
                label: "Cuándo",
                phEs: "Ej: Ocurre en el turno tarde",
                phNoEs: "Ej: No ocurre en el turno mañana",
              },
              {
                key: "donde",
                label: "Dónde",
                phEs: "Ej: En el área de picking",
                phNoEs: "Ej: No se observa en despacho",
              },
              {
                key: "quien",
                label: "Quién",
                phEs: "Ej: Afecta a operarios nuevos",
                phNoEs: "Ej: No afecta a operarios con experiencia",
              },
              {
                key: "como",
                label: "Cómo",
                phEs: "Ej: Se detecta al escanear el pedido",
                phNoEs: "Ej: No se detecta en el control de calidad previo",
              },
              {
                key: "cuantos",
                label: "Cuántos",
                phEs: "Ej: 15 pedidos por semana",
                phNoEs: "Ej: No supera los 3 pedidos por día",
              },
              {
                key: "por_que",
                label: "Por qué",
                phEs: "Ej: Falta de personal capacitado en el turno",
                phNoEs: "Ej: No es por falla del sistema",
              },
            ].map(({ key, label, phEs, phNoEs }) => (
              <tr key={key}>
                <td className="px-2 py-1 border font-medium">{label}</td>
                <td className="px-2 py-1 border">
                  <textarea
                    value={a3?.analisis5W2H?.[key]?.es || ""}
                    onChange={(e) => set5W2H(a3, setA3, key, "es", e.target.value)}
                    className="w-full p-1 rounded bg-gray-700 text-white placeholder-gray-500"
                    rows={2}
                    placeholder={phEs}
                  />
                </td>
                <td className="px-2 py-1 border">
                  <textarea
                    value={a3?.analisis5W2H?.[key]?.noEs || ""}
                    onChange={(e) => set5W2H(a3, setA3, key, "noEs", e.target.value)}
                    className="w-full p-1 rounded bg-gray-700 text-white placeholder-gray-500"
                    rows={2}
                    placeholder={phNoEs}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Resumen lectura 5W2H */}
<div className="mt-2">
  <label className="text-sm text-gray-400">Resumen lectura 5W2H (manual)</label>
  <textarea
    value={a3.analisis5W2H?.resumen || ""}
    onChange={(e) => setResumen5W2H(a3, setA3, e.target.value)}
    className="w-full mt-1 p-2 rounded bg-gray-700"
    rows={3}
    placeholder="Aquí se generará la síntesis del problema según 5W2H..."
  />
</div>

{/* 🔹 Nuevo bloque IA */}
<div className="mt-4 bg-gray-900 border border-indigo-500 rounded-lg p-4 shadow-lg">
  <div className="flex justify-between items-center mb-2">
    <label className="text-sm font-semibold text-indigo-300">
      Propuesta generada con IA 🤖
    </label>
    <button
      onClick={async () => {
        const resumen5W2H = [
          { key: "que", label: "Qué" },
          { key: "cuando", label: "Cuándo" },
          { key: "donde", label: "Dónde" },
          { key: "quien", label: "Quién" },
          { key: "como", label: "Cómo" },
          { key: "cuantos", label: "Cuántos" },
          { key: "por_que", label: "Por qué" },
        ]
          .map(({ key, label }) => {
            const es = a3.analisis5W2H?.[key]?.es || "";
            const noEs = a3.analisis5W2H?.[key]?.noEs || "";
            return `${label}: ${es ? "Es " + es : ""} ${noEs ? "/ No es " + noEs : ""}`;
          })
          .join(" | ");

        const prompt = `
Analiza el siguiente 5W2H y genera una síntesis clara del problema:
${resumen5W2H}

Proporciona:
1️⃣ Un resumen breve en lenguaje simple.
2️⃣ Una hipótesis de causa probable basada en los datos.
3️⃣ Profesional (formato A3 Lean).
`;

        try {
          const response = await fetch(`${API_BASE}/api/ishikawaIA`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ engine: "gemini", prompt }), // 👈 fuerza uso de Gemini
          });

          const data = await response.json();
          const texto = data.sugerencia || "No se obtuvo respuesta de la IA.";

          setA3((prev) => {
            const copy = JSON.parse(JSON.stringify(prev));
            copy.analisis5W2H.resumenIA = texto;
            return copy;
          });
        } catch (error) {
          console.error("⚠️ Error IA 5W2H:", error);
          setA3((prev) => {
            const copy = JSON.parse(JSON.stringify(prev));
            copy.analisis5W2H.resumenIA = "Error al generar propuesta IA.";
            return copy;
          });
        }
      }}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-full text-sm shadow"
    >
      Generar con IA
    </button>
  </div>

  <textarea
    value={a3.analisis5W2H?.resumenIA || ""}
    readOnly
    className="w-full bg-gray-800 text-white p-2 rounded resize-none"
    rows={4}
    placeholder="Presiona 'Generar con IA' para obtener una propuesta automática..."
  />
</div>

      </div>

      <div className="mt-2">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleImageUpload(e, ["problema", "imagenes"])} // cambia el path según la sección
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {Array.isArray(a3.problema?.imagenes) &&
            a3.problema.imagenes.map((img, idx) => (
              <div key={idx} className="relative">
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-28 h-20 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => removeImage(["problema", "imagenes"], idx)}
                  className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 text-xs"
                >
                  x
                </button>
              </div>
            ))}
        </div>
      </div>


    </section>
  );
}
