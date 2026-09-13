// src/components/Sections/SectionC.jsx
import React from "react";
import { update } from "../../utils/a3Helpers";


export default function SectionC({ a3, setA3 }) {
  const addContramedida = () => setA3(prev => ({ ...prev, contramedidas: { ...prev.contramedidas, lista: [...prev.contramedidas.lista, ""] } }));
  const removeContramedida = i => setA3(prev => ({ ...prev, contramedidas: { ...prev.contramedidas, lista: prev.contramedidas.lista.filter((_, idx) => idx !== i) } }));
  const setContramedida = (i, value) => setA3(prev => { const copy = JSON.parse(JSON.stringify(prev)); copy.contramedidas.lista[i] = value; return copy; });

  const addAccion = () => setA3(prev => ({ ...prev, acciones: [...prev.acciones, { accion: "", responsable: "", fecha: "", estado: "Pendiente" }] }));
  const setAccionField = (idx, field, value) => setA3(prev => { const copy = JSON.parse(JSON.stringify(prev)); copy.acciones[idx][field] = value; return copy; });
  const removeAccion = idx => setA3(prev => { const copy = JSON.parse(JSON.stringify(prev)); copy.acciones.splice(idx, 1); return copy; });

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


  const hoy = new Date().toISOString().slice(0, 10);
  const estaVencida = (row) => row.fecha && row.fecha < hoy && row.estado !== "Completada";

  const colorEstado = {
    Pendiente: "bg-gray-600 text-gray-200",
    "En progreso": "bg-blue-600 text-blue-100",
    Completada: "bg-green-600 text-green-100",
    Demorado: "bg-red-600 text-red-100",
  };

  return (
    <section className="w-full bg-gray-800 p-4 rounded-lg border border-gray-700 col-span-2">

      <h3 className="text-xl font-semibold text-red-300 mb-2">C. Resolver problema / Contramedidas</h3>

      {/* Ayuda: distingue las dos listas de esta sección, que a simple
          vista parecen lo mismo pero cumplen roles distintos. */}
      <div className="mb-3 bg-gray-900/60 border border-red-600/40 rounded-lg p-3 text-sm text-gray-300">
        <p className="font-semibold text-red-300 mb-1">💡 ¿Cuál es la diferencia entre las dos listas?</p>
        <p>
          <span className="text-white font-medium">Contramedidas</span>: la idea general para atacar la causa (ej: "Estandarizar el checklist de recepción").{" "}
          <span className="text-white font-medium">Plan de acciones</span>: las tareas concretas para llevar esa idea a la práctica, cada una con responsable y fecha.
        </p>
      </div>

      <div className="mb-3">
              <label className="text-sm text-gray-400 font-semibold">4. Contramedidas propuestas</label>
              {a3.contramedidas.lista.length === 0 && (
                <p className="text-sm text-gray-500 italic mt-2">Todavía no agregaste ninguna contramedida.</p>
              )}
              <div className="space-y-2 mt-2">
                {a3.contramedidas.lista.map((c, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <textarea
                      value={c}
                      onChange={(e) => setContramedida(idx, e.target.value)}
                      className="flex-1 p-2 rounded bg-gray-700"
                      rows={2}
                      placeholder="Ej: Estandarizar el checklist de recepción de mercadería"
                    />
                    <button type="button" onClick={() => removeContramedida(idx)} className="bg-red-600 px-2 rounded hover:bg-red-700 shrink-0">Eliminar</button>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <button type="button" onClick={addContramedida} className="bg-indigo-600 px-3 py-1 rounded hover:bg-indigo-700">Añadir contramedida</button>
              </div>
            </div>

            <div className="mb-3">
              <label className="text-sm text-gray-400 font-semibold">5. Plan de acciones correctivas</label>

              {a3.acciones.length === 0 && (
                <p className="text-sm text-gray-500 italic mt-2">Todavía no agregaste ninguna acción concreta.</p>
              )}

              {/* Tabla — solo desde md hacia arriba, donde entran las 5 columnas sin apretarse */}
              <div className="overflow-x-auto mt-2 hidden md:block">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="text-gray-300">
                      <th className="px-2 py-1">Acción</th>
                      <th className="px-2 py-1">Responsable</th>
                      <th className="px-2 py-1">Fecha</th>
                      <th className="px-2 py-1">Estado</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {a3.acciones.map((row, idx) => (
                      <tr key={idx} className={`align-top ${estaVencida(row) ? "bg-red-900/20" : ""}`}>
                        <td className="px-2 py-1"><input value={row.accion} onChange={(e) => setAccionField(idx, "accion", e.target.value)} className="bg-gray-700 p-1 rounded w-full" placeholder="¿Qué hay que hacer?" /></td>
                        <td className="px-2 py-1"><input value={row.responsable} onChange={(e) => setAccionField(idx, "responsable", e.target.value)} className="bg-gray-700 p-1 rounded w-full" placeholder="¿Quién?" /></td>
                        <td className="px-2 py-1">
                          <input type="date" value={row.fecha} onChange={(e) => setAccionField(idx, "fecha", e.target.value)} className="bg-gray-700 p-1 rounded w-full" />
                          {estaVencida(row) && <span className="block text-[11px] text-red-400 mt-0.5">⚠️ vencida</span>}
                        </td>
                        <td className="px-2 py-1">
                          <select value={row.estado} onChange={(e) => setAccionField(idx, "estado", e.target.value)} className={`p-1 rounded text-sm ${colorEstado[row.estado] || "bg-gray-700"}`}>
                            <option>Pendiente</option>
                            <option>En progreso</option>
                            <option>Completada</option>
                            <option>Demorado</option>
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <button type="button" onClick={() => removeAccion(idx)} className="bg-red-600 px-2 py-1 rounded">Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas — mobile, para no forzar scroll horizontal en una tabla de 5 columnas */}
              <div className="md:hidden mt-2 space-y-2">
                {a3.acciones.map((row, idx) => (
                  <div key={idx} className={`rounded-lg border p-3 space-y-2 ${estaVencida(row) ? "bg-red-900/20 border-red-700" : "bg-gray-700 border-gray-600"}`}>
                    <input value={row.accion} onChange={(e) => setAccionField(idx, "accion", e.target.value)} className="bg-gray-800 p-2 rounded w-full" placeholder="¿Qué hay que hacer?" />
                    <div className="flex gap-2">
                      <input value={row.responsable} onChange={(e) => setAccionField(idx, "responsable", e.target.value)} className="bg-gray-800 p-2 rounded flex-1 min-w-0" placeholder="Responsable" />
                      <input type="date" value={row.fecha} onChange={(e) => setAccionField(idx, "fecha", e.target.value)} className="bg-gray-800 p-2 rounded flex-1 min-w-0" />
                    </div>
                    {estaVencida(row) && <p className="text-xs text-red-400">⚠️ Esta acción está vencida</p>}
                    <div className="flex items-center justify-between gap-2">
                      <select value={row.estado} onChange={(e) => setAccionField(idx, "estado", e.target.value)} className={`p-1.5 rounded text-sm ${colorEstado[row.estado] || "bg-gray-800"}`}>
                        <option>Pendiente</option>
                        <option>En progreso</option>
                        <option>Completada</option>
                        <option>Demorado</option>
                      </select>
                      <button type="button" onClick={() => removeAccion(idx)} className="bg-red-600 px-3 py-1 rounded text-sm">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2">
                <button type="button" onClick={addAccion} className="bg-indigo-600 px-3 py-1 rounded hover:bg-indigo-700">Añadir acción</button>
              </div>
            </div>

<div className="mt-2">
  <input
    type="file"
    accept="image/*"
    multiple
    onChange={(e) => handleImageUpload(e, ["contramedidas", "imagenes"])} // cambia el path según la sección
  />
  <div className="flex flex-wrap gap-2 mt-2">
    {Array.isArray(a3.contramedidas.imagenes) &&
      a3.contramedidas.imagenes.map((img, idx) => (
        <div key={idx} className="relative">
          <img
            src={img.url}
            alt={img.name}
            className="w-28 h-20 object-cover rounded"
          />
          <button
            type="button"
            onClick={() => removeImage(["contramedidas", "imagenes"], idx)}
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
