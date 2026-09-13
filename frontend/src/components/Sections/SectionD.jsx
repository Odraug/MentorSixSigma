// src/components/Sections/SectionD.jsx
import React from "react";
import { update } from "../../utils/a3Helpers";

export default function SectionD({ a3, setA3 }) {
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


    // 🔹 Checklist de estandarización: toggle y edición de texto por ítem
    const estandarizacion = a3.estandarizacion || [];
    const toggleEstandarizacion = (id) => {
        setA3((prev) => {
            const copy = JSON.parse(JSON.stringify(prev));
            copy.estandarizacion = (copy.estandarizacion || []).map((item) =>
                item.id === id ? { ...item, hecha: !item.hecha } : item
            );
            return copy;
        });
    };
    const setTextoEstandarizacion = (id, texto) => {
        setA3((prev) => {
            const copy = JSON.parse(JSON.stringify(prev));
            copy.estandarizacion = (copy.estandarizacion || []).map((item) =>
                item.id === id ? { ...item, texto } : item
            );
            return copy;
        });
    };
    const agregarEstandarizacion = () => {
        setA3((prev) => {
            const copy = JSON.parse(JSON.stringify(prev));
            copy.estandarizacion = [
                ...(copy.estandarizacion || []),
                { id: Date.now(), texto: "", hecha: false },
            ];
            return copy;
        });
    };
    const eliminarEstandarizacion = (id) => {
        setA3((prev) => {
            const copy = JSON.parse(JSON.stringify(prev));
            copy.estandarizacion = (copy.estandarizacion || []).filter((item) => item.id !== id);
            return copy;
        });
    };
    const pasosCompletados = estandarizacion.filter((i) => i.hecha).length;

    // 🔹 Meta vs resultado final: reutiliza la meta/cumplimiento inicial que
    // se definió en la Sección A para cerrar el ciclo del A3 acá.
    const meta = parseFloat(a3.objetivo?.meta);
    const cumplimientoInicial = parseFloat(a3.objetivo?.cumplimiento);
    const resultadoFinal = parseFloat(a3.objetivo?.resultadoFinal);
    const hayMetaYResultado = !isNaN(meta) && !isNaN(resultadoFinal);
    const metaAlcanzada = hayMetaYResultado && resultadoFinal >= meta;

    return (
        <section className="w-full bg-gray-800 p-4 rounded-lg border border-gray-700 col-span-2">
            <h3 className="text-xl font-semibold text-teal-300 mb-2">D. Validar solución y estandarizar</h3>

            {/* 6. Meta vs resultado final */}
            <div className="mb-4">
                <label className="text-sm text-gray-400 font-semibold">6. Resultado final vs. meta</label>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                    Comparación con la meta que definiste en la sección A, para confirmar si el problema quedó resuelto.
                </p>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">🎯 Meta (%)</p>
                        <p className="text-lg font-semibold text-white">{a3.objetivo?.meta || "—"}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">📊 Cumplimiento inicial (%)</p>
                        <p className="text-lg font-semibold text-white">{a3.objetivo?.cumplimiento || "—"}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3 border border-teal-600">
                        <label className="text-xs text-gray-500 mb-1 block">✅ Resultado final (%)</label>
                        <input
                            type="number"
                            value={a3.objetivo?.resultadoFinal || ""}
                            onChange={(e) => update(a3, setA3, ["objetivo", "resultadoFinal"], e.target.value)}
                            className="w-full bg-gray-800 p-1 rounded text-lg font-semibold text-white"
                            placeholder="Ej: 96"
                        />
                    </div>
                </div>
                {hayMetaYResultado && (
                    <div
                        className={`mt-2 rounded-lg p-2 text-sm text-center font-medium ${
                            metaAlcanzada
                                ? "bg-green-900/30 border border-green-600 text-green-400"
                                : "bg-amber-900/30 border border-amber-600 text-amber-400"
                        }`}
                    >
                        {metaAlcanzada
                            ? `✅ Meta alcanzada (${resultadoFinal}% ≥ ${meta}%)`
                            : `⚠️ Todavía por debajo de la meta (${resultadoFinal}% de ${meta}%)`}
                    </div>
                )}
            </div>

            <div className="mb-3">
                <label className="text-sm text-gray-400">Confirmación del efecto / evidencia</label>
                <textarea value={a3.seguimiento.resultados} onChange={(e) => update(a3, setA3, ["seguimiento", "resultados"], e.target.value)} className="w-full mt-2 p-3 rounded bg-gray-700" rows={4} placeholder="Describe con tus palabras cómo se comportó el indicador luego de aplicar las contramedidas..." />
                <div className="mt-2">
                    <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, ["seguimiento", "imagenes"])} />
                    <div className="flex flex-wrap gap-2 mt-2">
                        {a3.seguimiento.imagenes.map((img, idx) => (
                            <div key={idx} className="relative">
                                <img src={img.url} alt={img.name} className="w-28 h-20 object-cover rounded" />
                                <button type="button" onClick={() => removeImage(["seguimiento", "imagenes"], idx)} className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 text-xs">x</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 7. Checklist de estandarización */}
            <div className="mb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-sm text-gray-400 font-semibold">7. Checklist de estandarización</label>
                    <span className="text-xs text-gray-500">{pasosCompletados}/{estandarizacion.length} pasos hechos</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                    Marcá qué falta para que la mejora se sostenga en el tiempo y no dependa de que alguien se acuerde.
                </p>
                <div className="space-y-2">
                    {estandarizacion.map((item) => (
                        <div
                            key={item.id}
                            className={`flex items-center gap-2 p-2 rounded border ${
                                item.hecha ? "bg-green-900/20 border-green-700" : "bg-gray-700 border-gray-600"
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={item.hecha}
                                onChange={() => toggleEstandarizacion(item.id)}
                                className="accent-teal-500 shrink-0"
                            />
                            <input
                                type="text"
                                value={item.texto}
                                onChange={(e) => setTextoEstandarizacion(item.id, e.target.value)}
                                className={`flex-1 bg-transparent outline-none min-w-0 ${item.hecha ? "line-through text-gray-400" : "text-white"}`}
                            />
                            <button
                                type="button"
                                onClick={() => eliminarEstandarizacion(item.id)}
                                className="shrink-0 text-gray-500 hover:text-red-400"
                                title="Eliminar"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={agregarEstandarizacion}
                    className="mt-2 bg-indigo-600 px-3 py-1 rounded hover:bg-indigo-700 text-sm"
                >
                    + Agregar paso
                </button>
            </div>

            <div className="mb-3">
                <label className="text-sm text-gray-400">Lecciones aprendidas</label>
                <textarea value={a3.lecciones} onChange={(e) => update(a3, setA3, ["lecciones"], e.target.value)} className="w-full mt-2 p-3 rounded bg-gray-700" rows={4} placeholder="¿Qué aprendiste en el camino que le serviría a otro equipo?" />
            </div>
        </section>
    );
}


