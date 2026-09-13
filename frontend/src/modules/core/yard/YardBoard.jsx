import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../../../config/env";

const ESTADO_COLOR = {
  en_porteria: "#f59e0b",
  en_muelle: "#0ea5e9",
  finalizado: "#10b981",
};
const ESTADO_LABEL = {
  en_porteria: "En portería",
  en_muelle: "En muelle",
  finalizado: "Finalizado",
};

export default function YardBoard() {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [warehouseId, setWarehouseId] = useState("");
  const [visitas, setVisitas] = useState([]);
  const [docks, setDocks] = useState([]);
  const [status, setStatus] = useState("");

  const [checkInForm, setCheckInForm] = useState({
    placa: "", conductor: "", transportista: "", tipo_visita: "descarga",
  });
  const [nuevoDock, setNuevoDock] = useState({ codigo: "", tipo: "descarga" });

  const cargarBoard = useCallback(async () => {
    if (!warehouseId) return;
    try {
      const res = await axios.get(`${API_BASE}/api/yard/board`, {
        params: { warehouseId }, headers,
      });
      setVisitas(res.data.data.visitas || []);
      setDocks(res.data.data.docks || []);
    } catch (err) {
      console.error(err);
      setStatus("Error cargando el tablero del patio");
    }
    
  }, [warehouseId]);

  useEffect(() => {
    if (!warehouseId) return;
    cargarBoard();
    const interval = setInterval(cargarBoard, 15000); // refresco automático cada 15s
    return () => clearInterval(interval);
  }, [warehouseId, cargarBoard]);

  const registrarCheckIn = async () => {
    if (!warehouseId || !checkInForm.placa) {
      alert("Indica la bodega y la placa del vehículo");
      return;
    }
    try {
      await axios.post(`${API_BASE}/api/yard/check-in`,
        { warehouse_id: warehouseId, ...checkInForm }, { headers });
      setCheckInForm({ placa: "", conductor: "", transportista: "", tipo_visita: "descarga" });
      setStatus("✅ Ingreso registrado");
      cargarBoard();
    } catch (err) {
      setStatus(err.response?.data?.error || "Error registrando el ingreso");
    }
  };

  const asignarMuelle = async (visitaId, dockId) => {
    try {
      await axios.post(`${API_BASE}/api/yard/visits/${visitaId}/asignar-muelle`,
        { dock_id: dockId }, { headers });
      cargarBoard();
    } catch (err) {
      alert(err.response?.data?.error || "Error asignando el muelle");
    }
  };

  const checkOut = async (visitaId) => {
    try {
      await axios.post(`${API_BASE}/api/yard/visits/${visitaId}/check-out`, {}, { headers });
      cargarBoard();
    } catch (err) {
      alert(err.response?.data?.error || "Error registrando la salida");
    }
  };

  const crearDock = async () => {
    if (!warehouseId || !nuevoDock.codigo) return alert("Indica bodega y código del muelle");
    try {
      await axios.post(`${API_BASE}/api/yard/docks`,
        { warehouse_id: warehouseId, ...nuevoDock }, { headers });
      setNuevoDock({ codigo: "", tipo: "descarga" });
      cargarBoard();
    } catch (err) {
      alert(err.response?.data?.error || "Error creando el muelle");
    }
  };

  const dockDisponible = (d) => d.estado === "libre";

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl mb-4 font-bold text-indigo-400">Yard Management — Control de Patio</h1>

      <div className="flex items-center gap-3 mb-4">
        <input placeholder="ID de bodega" value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="p-2 text-black rounded" />
        <button onClick={cargarBoard} className="bg-slate-600 px-3 py-2 rounded hover:bg-slate-700">
          Actualizar
        </button>
        {status && <span className="text-sm text-slate-300">{status}</span>}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Check-in */}
        <div className="bg-slate-800 rounded p-4 space-y-2">
          <h2 className="font-semibold mb-2">Registrar ingreso (check-in)</h2>
          <input placeholder="Placa" value={checkInForm.placa}
            onChange={(e) => setCheckInForm({ ...checkInForm, placa: e.target.value })}
            className="w-full p-2 text-black rounded" />
          <input placeholder="Conductor" value={checkInForm.conductor}
            onChange={(e) => setCheckInForm({ ...checkInForm, conductor: e.target.value })}
            className="w-full p-2 text-black rounded" />
          <input placeholder="Transportista" value={checkInForm.transportista}
            onChange={(e) => setCheckInForm({ ...checkInForm, transportista: e.target.value })}
            className="w-full p-2 text-black rounded" />
          <select value={checkInForm.tipo_visita}
            onChange={(e) => setCheckInForm({ ...checkInForm, tipo_visita: e.target.value })}
            className="w-full p-2 text-black rounded">
            <option value="descarga">Descarga (recepción)</option>
            <option value="carga">Carga (despacho)</option>
          </select>
          <button onClick={registrarCheckIn} className="w-full bg-indigo-600 py-2 rounded hover:bg-indigo-700">
            Check-in
          </button>

          <div className="border-t border-slate-600 pt-3 mt-3">
            <p className="text-sm text-slate-300 mb-1">Agregar muelle</p>
            <div className="flex gap-2">
              <input placeholder="Código (M1, M2...)" value={nuevoDock.codigo}
                onChange={(e) => setNuevoDock({ ...nuevoDock, codigo: e.target.value })}
                className="flex-1 p-2 text-black rounded text-sm" />
              <button onClick={crearDock} className="bg-slate-600 px-3 rounded text-sm hover:bg-slate-700">
                +
              </button>
            </div>
          </div>
        </div>

        {/* Muelles */}
        <div className="bg-slate-800 rounded p-4">
          <h2 className="font-semibold mb-2">Muelles</h2>
          <div className="grid grid-cols-2 gap-2">
            {docks.map((d) => (
              <div key={d.id} className="rounded p-3 text-center text-sm"
                style={{ background: d.estado === "libre" ? "#065f46" : d.estado === "ocupado" ? "#7f1d1d" : "#475569" }}>
                <p className="font-bold">{d.codigo}</p>
                <p className="text-xs opacity-80">{d.estado}</p>
              </div>
            ))}
            {docks.length === 0 && <p className="text-xs text-slate-500 col-span-2">Sin muelles registrados</p>}
          </div>
        </div>

        {/* Visitas activas */}
        <div className="bg-slate-800 rounded p-4">
          <h2 className="font-semibold mb-2">Vehículos en el patio</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {visitas.length === 0 && <p className="text-xs text-slate-500">No hay vehículos en el patio</p>}
            {visitas.map((v) => (
              <div key={v.id} className="bg-slate-900 rounded p-2">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-medium text-sm">{v.placa} — {v.tipo_visita}</p>
                  <span className="text-xs px-2 py-1 rounded" style={{ background: ESTADO_COLOR[v.estado] }}>
                    {ESTADO_LABEL[v.estado]}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">
                  {v.conductor || "—"} · {v.transportista || "—"} · {v.dock_codigo ? `Muelle ${v.dock_codigo}` : "Sin muelle"}
                </p>
                <p className="text-xs text-slate-500 mb-2">
                  Ingreso: {new Date(v.check_in).toLocaleTimeString()}
                </p>

                {v.estado === "en_porteria" && (
                  <select
                    defaultValue=""
                    onChange={(e) => e.target.value && asignarMuelle(v.id, e.target.value)}
                    className="w-full p-1 text-black rounded text-xs"
                  >
                    <option value="">Asignar muelle...</option>
                    {docks.filter(dockDisponible).map((d) => (
                      <option key={d.id} value={d.id}>{d.codigo}</option>
                    ))}
                  </select>
                )}

                {v.estado === "en_muelle" && (
                  <button onClick={() => checkOut(v.id)} className="w-full bg-green-600 py-1 rounded text-xs hover:bg-green-700">
                    Check-out
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/*
  Integración en App.js:
    import YardBoard from "./modules/core/yard/YardBoard.jsx";
    <Route path="/core/yard" element={<YardBoard />} />

  El tablero se auto-refresca cada 15 segundos mientras haya un warehouseId
  cargado — pensado para dejarlo abierto en una pantalla de portería/patio.
*/
