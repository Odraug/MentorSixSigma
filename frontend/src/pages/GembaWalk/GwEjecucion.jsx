// src/pages/GembaWalk/GwEjecucion.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiUpload } from "../../utils/api";

export default function GwEjecucion() {
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [observaciones, setObservaciones] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [gembaId, setGembaId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  // true cuando los datos vienen del respaldo local (localStorage) porque
  // no se pudo confirmar contra el servidor — para avisarle al usuario que
  // podría no estar viendo la última versión guardada.
  const [fuenteLocal, setFuenteLocal] = useState(false);

  // 🔧 helper para limpiar evidencias con blob:
  const limpiarEvidencias = (obsArray = []) =>
    obsArray.map((o) => ({
      ...o,
      evidencias: (o.evidencias || []).filter(
        (ev) =>
          ev &&
          typeof ev.url === "string" &&
          !ev.url.startsWith("blob:")
      ),
    }));

  // 📦 Cargar plan, participantes y observaciones
  useEffect(() => {
    const idStr = localStorage.getItem("gembaIdActual");
    const idNum = idStr ? Number(idStr) : null;

    if (!idNum) {
      console.warn("No se encontró gembaIdActual");
      setCargando(false);
      return;
    }

    setGembaId(idNum);

    (async () => {
      try {
        const resp = await apiGet(`/gemba/${idNum}`);

        if (!resp.ok) {
          console.error("Error API obtener gemba:", resp);
          cargarDesdeLocalStorage();
          return;
        }

        const data = resp.gemba; // backend retorna { ok, gemba }

        // PLAN
        setPlan({
          id: data.id,
          area: data.area,
          fecha: data.fecha,
          responsable: data.responsable,
          proposito: data.proposito,
        });

        // PARTICIPANTES
        setParticipantes(data.participantes || []);

        // OBSERVACIONES (limpiando blobs viejos, si existieran)
        const obsBack = (data.observaciones || []).map((o) => ({
          id: o.id,
          tipo: o.tipo || "hallazgo",
          descripcion: o.descripcion || "",
          responsable: o.responsable || "",
          accionDerivada: o.accion_derivada,
          evidencias: o.evidencias || [],
          fechaLimite: o.fecha_limite ? String(o.fecha_limite).slice(0, 10) : "",
          estadoAccion: o.estado_accion || "Pendiente",
        }));

        setObservaciones(limpiarEvidencias(obsBack));
      } catch (err) {
        console.error("❌ Error cargando gemba:", err);
        cargarDesdeLocalStorage();
      } finally {
        setCargando(false);
      }
    })();
  
  }, []);

  const cargarDesdeLocalStorage = () => {
    setFuenteLocal(true);

    const savedPlan = localStorage.getItem("gembaPlan");
    if (savedPlan) setPlan(JSON.parse(savedPlan));

    const savedObs = localStorage.getItem("gembaEjecucion");
    if (savedObs) {
      const parsed = JSON.parse(savedObs);
      setObservaciones(limpiarEvidencias(parsed));
    }
  };

  // 💾 Guardar local cada vez que cambian observaciones
  useEffect(() => {
    localStorage.setItem("gembaEjecucion", JSON.stringify(observaciones));
  }, [observaciones]);

  // ➕ Agregar observación
  const addObs = () => {
    setObservaciones((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        tipo: "hallazgo",
        descripcion: "",
        responsable: "",
        accionDerivada: false,
        evidencias: [],
        fechaLimite: "",
        estadoAccion: "Pendiente",
      },
    ]);
  };

  // 🗑️ Eliminar observación
  const removeObs = (id) =>
    setObservaciones((prev) => prev.filter((o) => o.id !== id));

  const hoy = new Date().toISOString().slice(0, 10);
  const estaVencida = (o) =>
    o.accionDerivada && o.fechaLimite && o.fechaLimite < hoy && o.estadoAccion !== "Completada";

  const colorEstadoAccion = {
    Pendiente: "bg-gray-600 text-gray-200",
    "En progreso": "bg-blue-600 text-blue-100",
    Completada: "bg-green-600 text-green-100",
  };

  // 📝 Actualizar campo
  const setField = (id, field, value) => {
    setObservaciones((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  // 📸 Subir evidencias a Supabase Storage (antes se guardaban como data
  // URI en base64 directo en la base, lo cual infla cada fila; ahora se
  // sube el archivo y solo se guarda la URL pública resultante).
  const handleFileUpload = async (id, files) => {
    const archivos = Array.from(files || []);
    if (archivos.length === 0) return;

    if (!gembaId) {
      alert("⚠️ Guarda primero la planificación antes de subir evidencias.");
      return;
    }

    for (const file of archivos) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const resp = await apiUpload(`/gemba/${gembaId}/evidencias`, formData);

        if (!resp.ok) {
          console.error("Error subiendo evidencia Gemba:", resp);
          alert(`⚠️ No se pudo subir "${file.name}": ${resp.message || "error desconocido"}`);
          continue;
        }

        setObservaciones((prev) =>
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  evidencias: [
                    ...(o.evidencias || []),
                    { name: resp.name, type: resp.type, url: resp.url },
                  ],
                }
              : o
          )
        );
      } catch (err) {
        console.error("❌ Error subiendo evidencia Gemba:", err);
        const msg = err?.response?.data?.message || "Error subiendo el archivo";
        alert(`⚠️ No se pudo subir "${file.name}": ${msg}`);
      }
    }
  };

  // 💾 Guardar ejecución en backend
  const guardar = async () => {
    if (guardando) return; // evita doble submit con doble clic
    try {
      if (!gembaId) {
        alert("⚠️ No hay Gemba asociado. Guarda primero la planificación.");
        return;
      }

      setGuardando(true);

      const payload = {
        observaciones: observaciones.map((o) => ({
          tipo: o.tipo,
          descripcion: o.descripcion,
          responsable: o.responsable,
          accion_derivada: o.accionDerivada,
          evidencias: o.evidencias,
          fecha_limite: o.fechaLimite || null,
          estado_accion: o.estadoAccion || "Pendiente",
        })),
      };

      const resp = await apiPost(`/gemba/${gembaId}/ejecucion`, payload);

      if (!resp.ok) {
        console.error("Error API guardar ejecución:", resp);
        alert("❌ Error guardando ejecución en el servidor");
        return;
      }

      setFuenteLocal(false);
      alert("✅ Ejecución guardada correctamente");
    } catch (err) {
      console.error("❌ Error guardando ejecución:", err);
      alert("❌ Error guardando ejecución en el servidor");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 text-center">
        Cargando Gemba...
      </div>
    );
  }

  if (!plan)
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 text-center">
        <p className="text-gray-400">
          No hay planificación cargada. Por favor vuelve al plan.
        </p>
        <button
          onClick={() => navigate("/gemba/plan")}
          className="mt-4 bg-indigo-700 px-4 py-2 rounded-lg"
        >
          Ir a planificación
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-yellow-400">
          🚶 Ejecución Gemba Walk
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/gemba/intro")}
            className="bg-gray-700 hover:bg-gray-800 px-3 py-2 rounded-lg"
          >
            Menú Gemba
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed px-3 py-2 rounded-lg"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {fuenteLocal && (
        <div className="mb-6 bg-amber-900/30 border border-amber-600 rounded-lg p-3 text-sm text-amber-300">
          ⚠️ No se pudo confirmar esta información contra el servidor — estás viendo la última copia guardada en este navegador. Presioná "Guardar" para sincronizarla apenas tengas conexión.
        </div>
      )}

      {/* INFO GENERAL */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-8">
        <h2 className="text-lg text-yellow-300 mb-2">📋 Planificación</h2>
        <p>
          <strong>Área:</strong> {plan.area} |{" "}
          <strong>Fecha:</strong> {plan.fecha}
        </p>
        <p>
          <strong>Responsable:</strong> {plan.responsable}
        </p>
        <p>
          <strong>Propósito:</strong> {plan.proposito}
        </p>

        {/* Lista de participantes */}
        {participantes.length > 0 && (
          <div className="mt-3">
            <h3 className="text-sm text-gray-300">👥 Participantes</h3>
            <ul className="text-sm text-gray-400 list-disc ml-4">
              {participantes.map((p) => (
                <li key={p.id}>
                  {p.nombre} – {p.cargo} ({p.area})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* OBSERVACIONES */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <div className="flex justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl text-yellow-300">🗒️ Observaciones</h2>
          <button
            onClick={addObs}
            className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm"
          >
            + Agregar observación
          </button>
        </div>

        {/* Ayuda: qué diferencia a cada tipo de observación */}
        <div className="mb-4 bg-gray-900/60 border border-yellow-600/40 rounded-lg p-3 text-sm text-gray-300">
          <p className="font-semibold text-yellow-300 mb-1">💡 ¿Qué tipo elijo?</p>
          <p>
            <span className="text-red-400 font-medium">⚠️ Hallazgo</span>: algo que no está bien y hay que corregir.{" "}
            <span className="text-green-400 font-medium">✅ Buena práctica</span>: algo que sí funciona bien y vale la pena replicar en otras áreas.{" "}
            <span className="text-blue-300 font-medium">🔧 Acción inmediata</span>: un problema que ya se resolvió en el momento, durante el recorrido.
          </p>
        </div>

        {observaciones.length === 0 && (
          <p className="text-center text-gray-400 py-3">No hay observaciones registradas todavía.</p>
        )}

        {/* Tabla — desde md hacia arriba */}
        {observaciones.length > 0 && (
        <div className="overflow-x-auto hidden md:block">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-700 text-gray-300">
            <tr>
              <th className="p-2 border border-gray-600">Tipo</th>
              <th className="p-2 border border-gray-600">Descripción</th>
              <th className="p-2 border border-gray-600">Responsable</th>
              <th className="p-2 border border-gray-600">Acción derivada</th>
              <th className="p-2 border border-gray-600">Evidencias</th>
              <th className="p-2 border border-gray-600">Acción</th>
            </tr>
          </thead>
          <tbody>
              {observaciones.map((o) => (
                <tr key={o.id} className={`align-top ${estaVencida(o) ? "bg-red-900/20" : ""}`}>
                  <td className="p-2 border border-gray-700">
                    <select
                      value={o.tipo}
                      onChange={(e) => setField(o.id, "tipo", e.target.value)}
                      className="bg-gray-700 p-1 rounded w-full"
                    >
                      <option value="hallazgo">⚠️ Hallazgo</option>
                      <option value="buena">✅ Buena práctica</option>
                      <option value="accion">🔧 Acción inmediata</option>
                    </select>
                  </td>
                  <td className="p-2 border border-gray-700">
                    <textarea
                      value={o.descripcion}
                      onChange={(e) =>
                        setField(o.id, "descripcion", e.target.value)
                      }
                      className="bg-gray-700 p-1 rounded w-full"
                      rows={2}
                    />
                  </td>
                  <td className="p-2 border border-gray-700">
                    <input
                      type="text"
                      value={o.responsable}
                      onChange={(e) =>
                        setField(o.id, "responsable", e.target.value)
                      }
                      className="bg-gray-700 p-1 rounded w-full"
                    />
                  </td>
                  <td className="p-2 border border-gray-700">
                    <label className="flex items-center justify-center gap-1 mb-1">
                      <input
                        type="checkbox"
                        checked={o.accionDerivada}
                        onChange={(e) =>
                          setField(o.id, "accionDerivada", e.target.checked)
                        }
                      />
                    </label>
                    {o.accionDerivada && (
                      <div className="space-y-1 mt-1">
                        <input
                          type="date"
                          value={o.fechaLimite}
                          onChange={(e) => setField(o.id, "fechaLimite", e.target.value)}
                          className="bg-gray-700 p-1 rounded w-full text-xs"
                        />
                        <select
                          value={o.estadoAccion}
                          onChange={(e) => setField(o.id, "estadoAccion", e.target.value)}
                          className={`p-1 rounded w-full text-xs ${colorEstadoAccion[o.estadoAccion] || "bg-gray-700"}`}
                        >
                          <option>Pendiente</option>
                          <option>En progreso</option>
                          <option>Completada</option>
                        </select>
                        {estaVencida(o) && <span className="block text-[11px] text-red-400">⚠️ vencida</span>}
                      </div>
                    )}
                  </td>
                  <td className="p-2 border border-gray-700">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) =>
                        handleFileUpload(o.id, e.target.files)
                      }
                      className="text-xs"
                    />
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(o.evidencias || []).map((img, i) => (
                        <img
                          key={i}
                          src={img.url}
                          alt={img.name}
                          className="w-14 h-14 object-cover rounded border border-gray-600"
                        />
                      ))}
                    </div>
                  </td>
                  <td className="p-2 border border-gray-700 text-center">
                    <button
                      onClick={() => removeObs(o.id)}
                      className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        </div>
        )}

        {/* Tarjetas — mobile */}
        {observaciones.length > 0 && (
        <div className="md:hidden space-y-3">
          {observaciones.map((o) => (
            <div key={o.id} className={`border rounded-lg p-3 space-y-2 ${estaVencida(o) ? "bg-red-900/20 border-red-700" : "bg-gray-700/60 border-gray-600"}`}>
              <select
                value={o.tipo}
                onChange={(e) => setField(o.id, "tipo", e.target.value)}
                className="bg-gray-700 p-2 rounded w-full"
              >
                <option value="hallazgo">⚠️ Hallazgo</option>
                <option value="buena">✅ Buena práctica</option>
                <option value="accion">🔧 Acción inmediata</option>
              </select>
              <textarea
                value={o.descripcion}
                onChange={(e) => setField(o.id, "descripcion", e.target.value)}
                className="bg-gray-800 p-2 rounded w-full"
                rows={2}
                placeholder="Describe la observación..."
              />
              <input
                type="text"
                value={o.responsable}
                onChange={(e) => setField(o.id, "responsable", e.target.value)}
                className="bg-gray-800 p-2 rounded w-full"
                placeholder="Responsable"
              />
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={o.accionDerivada}
                  onChange={(e) => setField(o.id, "accionDerivada", e.target.checked)}
                />
                Tiene acción derivada
              </label>
              {o.accionDerivada && (
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={o.fechaLimite}
                    onChange={(e) => setField(o.id, "fechaLimite", e.target.value)}
                    className="bg-gray-800 p-2 rounded flex-1 min-w-0 text-sm"
                  />
                  <select
                    value={o.estadoAccion}
                    onChange={(e) => setField(o.id, "estadoAccion", e.target.value)}
                    className={`p-2 rounded text-sm ${colorEstadoAccion[o.estadoAccion] || "bg-gray-800"}`}
                  >
                    <option>Pendiente</option>
                    <option>En progreso</option>
                    <option>Completada</option>
                  </select>
                </div>
              )}
              {estaVencida(o) && <p className="text-xs text-red-400">⚠️ Esta acción está vencida</p>}
              <div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(o.id, e.target.files)}
                  className="text-xs"
                />
                <div className="flex flex-wrap gap-2 mt-1">
                  {(o.evidencias || []).map((img, i) => (
                    <img
                      key={i}
                      src={img.url}
                      alt={img.name}
                      className="w-14 h-14 object-cover rounded border border-gray-600"
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={() => removeObs(o.id)}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
