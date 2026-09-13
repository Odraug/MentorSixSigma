import React, { useState, useEffect, useCallback } from "react";
import { Rnd } from "react-rnd";
import axios from "axios";
import { API_BASE } from "../../../config/env";
import LayoutCanvas3D from "./LayoutCanvas3D";

const TIPOS = {
  rack:    { label: "Rack",    color: "#6366f1" },
  pasillo: { label: "Pasillo", color: "#334155" },
  muelle:  { label: "Muelle de carga", color: "#f59e0b" },
  zona:    { label: "Zona / Área", color: "#10b981" },
  oficina: { label: "Oficina", color: "#ec4899" },
};

// Colores de la matriz ABC/XYZ, iguales a los de AbcXyzAnalysis.jsx para
// que un rack "AX" se vea igual aquí y en la pantalla de análisis.
const CLASE_COLOR = {
  AX: "#065f46", AY: "#0f766e", AZ: "#155e75",
  BX: "#854d0e", BY: "#a16207", BZ: "#b45309",
  CX: "#7f1d1d", CY: "#991b1b", CZ: "#b91c1c",
};

// Subtipos de rack disponibles al configurar un elemento tipo "rack".
const RACK_SUBTIPOS = {
  selectivo_simple: "Selectivo Simple",
  doble_profundidad: "Doble Profundidad",
};

const pad = (n, len = 2) => String(n).padStart(len, "0");

const sanitizarPrefijo = (label) =>
  (label || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "RACK";

// Genera el listado de ubicaciones (nomenclatura) de un rack a partir de su
// configuración: niveles de altura x posiciones horizontales (vigas), donde
// cada viga tiene 2 pallets lado a lado (A/B). En doble profundidad cada
// posición se duplica en frente/fondo (F1/F2).
const generarUbicaciones = ({ label, subtipo, niveles, posiciones }) => {
  const prefix = sanitizarPrefijo(label);
  const ubicaciones = [];
  for (let n = 1; n <= niveles; n++) {
    for (let p = 1; p <= posiciones; p++) {
      for (const lado of ["A", "B"]) {
        if (subtipo === "doble_profundidad") {
          for (const fondo of [1, 2]) {
            ubicaciones.push({
              code: `${prefix}-N${pad(n)}-P${pad(p)}${lado}-F${fondo}`,
              nivel: n,
              posicion: p,
              lado,
              fondo,
            });
          }
        } else {
          ubicaciones.push({
            code: `${prefix}-N${pad(n)}-P${pad(p)}${lado}`,
            nivel: n,
            posicion: p,
            lado,
            fondo: null,
          });
        }
      }
    }
  }
  return ubicaciones;
};

// Cuenta cuántas ubicaciones de un rack tienen stock cargado (cantidad > 0)
// según el mapa { [codigo]: { cantidad, sku_code } } que devuelve el backend.
const contarOcupacion = (el, stockPorUbicacion) => {
  const total = el.ubicaciones?.length || 0;
  if (total === 0) return { ocupadas: 0, total: 0 };
  const ocupadas = el.ubicaciones.filter((u) => (stockPorUbicacion[u.code]?.cantidad || 0) > 0).length;
  return { ocupadas, total };
};

// Color de calor gris (vacío) -> rojo (lleno) según % de ubicaciones ocupadas.
const colorPorOcupacion = (el, stockPorUbicacion) => {
  const { ocupadas, total } = contarOcupacion(el, stockPorUbicacion);
  if (total === 0) return "#334155";
  const pct = ocupadas / total;
  const vacio = [51, 65, 85]; // slate-700
  const lleno = [220, 38, 38]; // red-600
  const mezclar = (i) => Math.round(vacio[i] + (lleno[i] - vacio[i]) * pct);
  return `rgb(${mezclar(0)}, ${mezclar(1)}, ${mezclar(2)})`;
};

let uid = 0;
const nextId = () => `el_${Date.now()}_${uid++}`;

export default function WarehouseLayoutDesigner() {
  const token = localStorage.getItem("token");
  const companyId = localStorage.getItem("empresa_id"); // ajusta al nombre real que uses en tu AuthContext

  const [warehouseId, setWarehouseId] = useState("");
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [tipoActivo, setTipoActivo] = useState("rack");
  const [status, setStatus] = useState("");
  const [modoColorABC, setModoColorABC] = useState(false);
  const [clasificacion, setClasificacion] = useState(null);
  const [vista, setVista] = useState("3d"); // "3d" | "2d"

  // Stock cargado por ubicación: { [codigo]: { sku_code, cantidad, ... } }
  const [stockPorUbicacion, setStockPorUbicacion] = useState({});
  const [modoDispersion, setModoDispersion] = useState(false);

  // Configuración por defecto para el próximo rack a agregar al canvas.
  const [rackSubtipo, setRackSubtipo] = useState("selectivo_simple");
  const [rackNiveles, setRackNiveles] = useState(4);
  const [rackPosiciones, setRackPosiciones] = useState(5);

  const selected = elements.find((e) => e.id === selectedId);

  const cargarLayout = useCallback(async () => {
    if (!warehouseId || !companyId) return;
    try {
      const res = await axios.get(
        `${API_BASE}/api/wms/layout-design/${warehouseId}`,
        { params: { companyId }, headers: { Authorization: `Bearer ${token}` } }
      );
      setElements(res.data.layout || []);
      setStatus("Layout cargado");
    } catch (err) {
      console.error(err);
      setStatus("No había layout guardado, empezando en blanco");
      setElements([]);
    }
  }, [warehouseId, companyId, token]);

  useEffect(() => {
    if (warehouseId) cargarLayout();
  }, [warehouseId, cargarLayout]);

  const cargarStockUbicaciones = useCallback(async () => {
    if (!warehouseId || !companyId) return;
    try {
      const res = await axios.get(
        `${API_BASE}/api/wms/layout-design/${warehouseId}/stock`,
        { params: { companyId }, headers: { Authorization: `Bearer ${token}` } }
      );
      const mapa = {};
      (res.data.ubicaciones || []).forEach((u) => {
        mapa[u.codigo] = u;
      });
      setStockPorUbicacion(mapa);
      setStatus(`📦 Stock cargado: ${res.data.ubicaciones.length} ubicaciones con registro`);
    } catch (err) {
      console.error(err);
      setStatus("❌ No se pudo cargar el stock");
    }
  }, [warehouseId, companyId, token]);

  const subirStockExcel = async (file) => {
    if (!file || !warehouseId || !companyId) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(
        `${API_BASE}/api/wms/layout-design/${warehouseId}/cargar-stock`,
        formData,
        {
          params: { companyId },
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        }
      );
      setStatus(
        `✅ Stock actualizado en ${res.data.actualizadas} ubicaciones` +
          (res.data.no_encontradas?.length ? ` · ${res.data.no_encontradas.length} códigos no encontrados` : "")
      );
      cargarStockUbicaciones();
    } catch (err) {
      console.error(err);
      setStatus(`❌ ${err.response?.data?.message || "Error cargando el stock"}`);
    }
  };

  const cargarClasificacionAbcXyz = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/analisis/abc-xyz`, {
        params: { companyId, meses: 6 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasificacion(res.data);
      setModoColorABC(true);
      setStatus("Clasificación ABC/XYZ cargada — asigna una clase a cada rack");
    } catch (err) {
      console.error(err);
      setStatus("❌ No se pudo cargar la clasificación ABC/XYZ");
    }
  };

  const agregarElemento = () => {
    const label = `${TIPOS[tipoActivo].label} ${elements.filter((e) => e.tipo === tipoActivo).length + 1}`;
    const nuevo = {
      id: nextId(),
      tipo: tipoActivo,
      label,
      x: 20,
      y: 20,
      width: tipoActivo === "pasillo" ? 260 : tipoActivo === "rack" ? 140 : 100,
      height: tipoActivo === "pasillo" ? 40 : tipoActivo === "rack" ? 110 : 80,
      location_code: "",
      clase_abc_xyz: "", // se llena manualmente o con el selector cuando hay clasificación cargada
    };

    if (tipoActivo === "rack") {
      nuevo.rack_subtipo = rackSubtipo;
      nuevo.niveles = rackNiveles;
      nuevo.posiciones_horizontales = rackPosiciones;
      nuevo.nomenclatura_fuente = "auto"; // "auto" = generada aquí, "excel" = importada tal cual la maneje el cliente
      nuevo.ubicaciones = generarUbicaciones({
        label,
        subtipo: rackSubtipo,
        niveles: rackNiveles,
        posiciones: rackPosiciones,
      });
    }

    setElements((prev) => [...prev, nuevo]);
    setSelectedId(nuevo.id);
  };

  // Actualiza un elemento. Si es un rack con nomenclatura "auto", regenera su
  // listado de ubicaciones cada vez que cambia etiqueta/subtipo/niveles/
  // posiciones. Si la nomenclatura fue importada desde Excel ("excel"), se
  // respeta tal cual y no se regenera (a menos que el propio cambio traiga
  // un nuevo array de `ubicaciones`, como hace la importación).
  const actualizarElemento = (id, cambios) => {
    setElements((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const actualizado = { ...e, ...cambios };
        if (actualizado.tipo === "rack" && actualizado.nomenclatura_fuente !== "excel") {
          actualizado.ubicaciones = generarUbicaciones({
            label: actualizado.label,
            subtipo: actualizado.rack_subtipo,
            niveles: actualizado.niveles,
            posiciones: actualizado.posiciones_horizontales,
          });
        }
        return actualizado;
      })
    );
  };

  const importarUbicacionesDesdeExcel = async (id, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(
        `${API_BASE}/api/wms/layout-design/importar-ubicaciones`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );
      actualizarElemento(id, {
        ubicaciones: res.data.ubicaciones,
        nomenclatura_fuente: "excel",
      });
      setStatus(`✅ ${res.data.total} ubicaciones importadas desde Excel`);
    } catch (err) {
      console.error(err);
      setStatus(`❌ ${err.response?.data?.message || "Error importando el Excel"}`);
    }
  };

  const volverAGenerarAutomaticamente = (id) => {
    actualizarElemento(id, { nomenclatura_fuente: "auto" });
  };

  const eliminarSeleccionado = () => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  };

  const guardar = async () => {
    if (!warehouseId || !companyId) {
      alert("Completa el ID de bodega");
      return;
    }
    try {
      await axios.post(
        `${API_BASE}/api/wms/layout-design/${warehouseId}`,
        { companyId, nombre: `Layout ${warehouseId}`, layout: elements },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus("✅ Layout guardado");
    } catch (err) {
      console.error(err);
      setStatus("❌ Error guardando el layout");
    }
  };

  // Color a mostrar en cada elemento: dispersión de stock (si está activa)
  // tiene prioridad sobre ABC/XYZ, que a su vez tiene prioridad sobre el
  // color por tipo de elemento (rack, pasillo, etc).
  const colorDeElemento = (el) => {
    if (modoDispersion && el.tipo === "rack") {
      return colorPorOcupacion(el, stockPorUbicacion);
    }
    if (modoColorABC && el.clase_abc_xyz && CLASE_COLOR[el.clase_abc_xyz]) {
      return CLASE_COLOR[el.clase_abc_xyz];
    }
    return TIPOS[el.tipo]?.color || "#6366f1";
  };

  // Texto "N/M ocupadas" para mostrar sobre un rack cuando el modo
  // dispersión está activo (2D y 3D).
  const subtituloDispersion = (el) => {
    if (!modoDispersion || el.tipo !== "rack") return null;
    const { ocupadas, total } = contarOcupacion(el, stockPorUbicacion);
    return total > 0 ? `${ocupadas}/${total} ocupadas` : null;
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl mb-4 font-bold text-indigo-400">
        Diseñador Visual de Layout
      </h1>

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input
          placeholder="ID de bodega"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="p-2 text-black rounded"
        />
        <button onClick={cargarLayout} className="bg-slate-600 px-3 py-2 rounded hover:bg-slate-700">
          Cargar
        </button>
        <button onClick={guardar} className="bg-green-600 px-3 py-2 rounded hover:bg-green-700">
          Guardar layout
        </button>
        <button onClick={cargarClasificacionAbcXyz} className="bg-teal-600 px-3 py-2 rounded hover:bg-teal-700">
          Cargar clasificación ABC/XYZ
        </button>
        {clasificacion && (
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={modoColorABC}
              onChange={(e) => setModoColorABC(e.target.checked)}
            />
            Colorear por clase ABC/XYZ
          </label>
        )}
        <button onClick={cargarStockUbicaciones} className="bg-orange-700 px-3 py-2 rounded hover:bg-orange-800">
          📦 Cargar stock
        </button>
        <label className="bg-orange-900 px-3 py-2 rounded hover:bg-orange-950 cursor-pointer text-sm">
          📥 Subir stock (Excel)
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              subirStockExcel(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </label>
        {Object.keys(stockPorUbicacion).length > 0 && (
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={modoDispersion}
              onChange={(e) => setModoDispersion(e.target.checked)}
            />
            Ver dispersión de stock
          </label>
        )}
        <div className="flex bg-slate-800 rounded overflow-hidden ml-auto">
          <button
            onClick={() => setVista("3d")}
            className={`px-3 py-2 text-sm font-semibold ${vista === "3d" ? "bg-indigo-600" : "hover:bg-slate-700"}`}
          >
            🧊 Vista 3D
          </button>
          <button
            onClick={() => setVista("2d")}
            className={`px-3 py-2 text-sm font-semibold ${vista === "2d" ? "bg-indigo-600" : "hover:bg-slate-700"}`}
          >
            🗺️ Vista 2D
          </button>
        </div>
        {status && <span className="text-sm text-slate-300 w-full">{status}</span>}
      </div>

      <div className="flex gap-4">
        <div className="w-64 shrink-0 bg-slate-800 rounded p-3 space-y-3">
          <div>
            <label className="text-sm text-slate-300">Tipo de elemento</label>
            <select
              value={tipoActivo}
              onChange={(e) => setTipoActivo(e.target.value)}
              className="w-full p-2 text-black rounded mt-1"
            >
              {Object.entries(TIPOS).map(([key, t]) => (
                <option key={key} value={key}>{t.label}</option>
              ))}
            </select>
          </div>

          {tipoActivo === "rack" && (
            <div className="space-y-2 bg-slate-900/60 rounded p-2 border border-slate-700">
              <div>
                <label className="text-xs text-slate-400">Subtipo de rack</label>
                <select
                  value={rackSubtipo}
                  onChange={(e) => setRackSubtipo(e.target.value)}
                  className="w-full p-2 text-black rounded mt-1 text-sm"
                >
                  {Object.entries(RACK_SUBTIPOS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400">Niveles de altura</label>
                  <input
                    type="number"
                    min="1"
                    value={rackNiveles}
                    onChange={(e) => setRackNiveles(Number(e.target.value) || 0)}
                    className="w-full p-2 text-black rounded mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Ubic. al horizontal (vigas)</label>
                  <input
                    type="number"
                    min="1"
                    value={rackPosiciones}
                    onChange={(e) => setRackPosiciones(Number(e.target.value) || 0)}
                    className="w-full p-2 text-black rounded mt-1 text-sm"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Cada viga tiene espacio para 2 pallets uno al lado del otro.
                {rackSubtipo === "doble_profundidad" &&
                  " Doble profundidad duplica cada posición (frente/fondo)."}
              </p>
              <p className="text-xs text-indigo-300 font-semibold">
                Total ubicaciones a generar:{" "}
                {rackNiveles * rackPosiciones * 2 * (rackSubtipo === "doble_profundidad" ? 2 : 1)}
              </p>
            </div>
          )}

          <button
            onClick={agregarElemento}
            className="w-full bg-indigo-600 py-2 rounded hover:bg-indigo-700"
          >
            + Agregar al canvas
          </button>

          {selected && (
            <div className="border-t border-slate-600 pt-3 space-y-2">
              <p className="text-sm text-slate-300">Elemento seleccionado</p>
              <input
                value={selected.label}
                onChange={(e) => actualizarElemento(selected.id, { label: e.target.value })}
                className="w-full p-2 text-black rounded"
                placeholder="Nombre / etiqueta"
              />
              {selected.tipo !== "rack" && (
                <input
                  value={selected.location_code}
                  onChange={(e) => actualizarElemento(selected.id, { location_code: e.target.value })}
                  className="w-full p-2 text-black rounded"
                  placeholder="Código de ubicación (opcional)"
                />
              )}

              {selected.tipo === "rack" && (
                <div className="space-y-2 bg-slate-900/60 rounded p-2 border border-slate-700">
                  <div>
                    <label className="text-xs text-slate-400">Subtipo de rack</label>
                    <select
                      value={selected.rack_subtipo || "selectivo_simple"}
                      onChange={(e) => actualizarElemento(selected.id, { rack_subtipo: e.target.value })}
                      className="w-full p-2 text-black rounded mt-1 text-sm"
                    >
                      {Object.entries(RACK_SUBTIPOS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-400">Niveles de altura</label>
                      <input
                        type="number"
                        min="1"
                        value={selected.niveles ?? 0}
                        onChange={(e) => actualizarElemento(selected.id, { niveles: Number(e.target.value) || 0 })}
                        className="w-full p-2 text-black rounded mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Ubic. al horizontal</label>
                      <input
                        type="number"
                        min="1"
                        value={selected.posiciones_horizontales ?? 0}
                        onChange={(e) =>
                          actualizarElemento(selected.id, { posiciones_horizontales: Number(e.target.value) || 0 })
                        }
                        className="w-full p-2 text-black rounded mt-1 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-indigo-300 font-semibold">
                    {selected.ubicaciones?.length || 0} ubicaciones ·{" "}
                    {selected.nomenclatura_fuente === "excel" ? "importadas desde Excel" : "generadas automáticamente"}
                  </p>
                  {selected.ubicaciones?.length > 0 && (
                    <div className="max-h-32 overflow-y-auto bg-slate-950/60 rounded p-2 font-mono text-[10px] text-slate-300 space-y-0.5">
                      {selected.ubicaciones.map((u) => (
                        <div key={u.code}>{u.code}</div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-slate-700 pt-2 space-y-1">
                    <label className="text-xs text-slate-400">
                      La nomenclatura queda a criterio del cliente: importá un Excel con tus propias columnas
                      (Zona, Pasillo, Bahía, Nivel, Ubicación...) y reemplaza lo generado automáticamente.
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => {
                        importarUbicacionesDesdeExcel(selected.id, e.target.files[0]);
                        e.target.value = "";
                      }}
                      className="w-full text-xs text-slate-300"
                    />
                    {selected.nomenclatura_fuente === "excel" && (
                      <button
                        onClick={() => volverAGenerarAutomaticamente(selected.id)}
                        className="w-full bg-slate-600 hover:bg-slate-500 py-1.5 rounded text-xs"
                      >
                        ↺ Volver a generar automáticamente
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selected.tipo === "rack" && (
                <div>
                  <label className="text-xs text-slate-400">Clase ABC/XYZ de este rack</label>
                  <select
                    value={selected.clase_abc_xyz || ""}
                    onChange={(e) => actualizarElemento(selected.id, { clase_abc_xyz: e.target.value })}
                    className="w-full p-2 text-black rounded mt-1"
                  >
                    <option value="">Sin asignar</option>
                    {Object.keys(CLASE_COLOR).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={eliminarSeleccionado}
                className="w-full bg-red-600 py-2 rounded hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          )}

          <div className="border-t border-slate-600 pt-3 text-xs text-slate-400 space-y-1">
            <p className="text-slate-300 mb-1">
              {modoDispersion ? "Leyenda dispersión de stock" : modoColorABC ? "Leyenda ABC/XYZ" : "Leyenda de tipos"}
            </p>
            {modoDispersion ? (
              <div className="space-y-1">
                <div className="h-3 rounded" style={{ background: "linear-gradient(90deg, rgb(51,65,85), rgb(220,38,38))" }} />
                <div className="flex justify-between">
                  <span>Vacío</span>
                  <span>Lleno</span>
                </div>
              </div>
            ) : modoColorABC ? (
              Object.entries(CLASE_COLOR).map(([key, color]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded" style={{ background: color }} />
                  {key}
                </div>
              ))
            ) : (
              Object.entries(TIPOS).map(([key, t]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded" style={{ background: t.color }} />
                  {t.label}
                </div>
              ))
            )}
          </div>
        </div>

        {vista === "3d" ? (
          <LayoutCanvas3D
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={(id, x, y) => actualizarElemento(id, { x, y })}
            colorDeElemento={colorDeElemento}
            obtenerSubtitulo={subtituloDispersion}
            canvasWidth={900}
            canvasHeight={600}
          />
        ) : (
          <div
            className="relative bg-slate-900 border border-slate-700 rounded"
            style={{ width: 900, height: 600, overflow: "hidden" }}
            onClick={() => setSelectedId(null)}
          >
            {elements.map((el) => (
              <Rnd
                key={el.id}
                size={{ width: el.width, height: el.height }}
                position={{ x: el.x, y: el.y }}
                bounds="parent"
                onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                onDragStop={(e, d) => actualizarElemento(el.id, { x: d.x, y: d.y })}
                onResizeStop={(e, dir, ref, delta, pos) =>
                  actualizarElemento(el.id, {
                    width: parseInt(ref.style.width, 10),
                    height: parseInt(ref.style.height, 10),
                    ...pos,
                  })
                }
                style={{
                  background: colorDeElemento(el),
                  border: el.id === selectedId ? "2px solid white" : "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "white",
                  cursor: "move",
                  textAlign: "center",
                  padding: 4,
                }}
              >
                {el.label}
                {el.tipo === "rack" ? (
                  <div style={{ fontSize: 9, opacity: 0.85, lineHeight: 1.2 }}>
                    {modoDispersion ? (
                      subtituloDispersion(el) || "sin stock cargado"
                    ) : (
                      <>
                        {RACK_SUBTIPOS[el.rack_subtipo] || ""}
                        <br />
                        {el.niveles || 0}N × {el.posiciones_horizontales || 0}P · {el.ubicaciones?.length || 0} ubic.
                      </>
                    )}
                  </div>
                ) : (
                  el.location_code && (
                    <div style={{ fontSize: 10, opacity: 0.8 }}>({el.location_code})</div>
                  )
                )}
              </Rnd>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/*
  Integración en App.js:
    import WarehouseLayoutDesigner from "./modules/core/wms/WarehouseLayoutDesigner.jsx";
    <Route path="/core/wms/layout-designer" element={<WarehouseLayoutDesigner />} />

  Cómo funciona el overlay ABC/XYZ:
  1. Clic en "Cargar clasificación ABC/XYZ" trae el resumen calculado por el
     backend (mismo endpoint que usa la pantalla de Análisis ABC/XYZ).
  2. Selecciona un rack en el canvas y asígnale una clase (AX, BY, CZ, etc.)
     desde el panel lateral — hoy es manual porque un rack físico puede
     contener varios SKUs de distintas clases, así que la asignación final
     depende del criterio de quien diseña el layout.
  3. Activa "Colorear por clase ABC/XYZ" para ver el plano coloreado según
     la clase asignada a cada rack, en vez del color por tipo de elemento.

  Siguiente paso posible: si más adelante guardas en `location` qué SKUs
  viven en cada ubicación, se podría auto-sugerir la clase dominante de cada
  rack en vez de asignarla a mano.
*/
