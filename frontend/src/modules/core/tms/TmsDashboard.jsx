import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../../../config/env";

const ESTADO_COLOR = {
  planned: "#64748b",
  dispatched: "#0ea5e9",
  in_transit: "#f59e0b",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

const ESTADO_LABEL = {
  planned: "Planificada",
  dispatched: "Despachada",
  in_transit: "En tránsito",
  delivered: "Entregada",
  cancelled: "Cancelada",
};

export default function TmsDashboard() {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [loads, setLoads] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [nuevoEvento, setNuevoEvento] = useState("");
  const [status, setStatus] = useState("");

  // Formulario de nueva carga
  const [form, setForm] = useState({
    warehouse_id: "", origen: "", destino: "",
    carrier_id: "", vehicle_id: "", driver_id: "", costo_flete: "",
    shipment_ids: [],
  });

  const cargarTodo = useCallback(async () => {
    try {
      const [loadsRes, pendRes, carRes, vehRes, drvRes] = await Promise.all([
        axios.get(`${API_BASE}/api/tms/loads`, { headers }),
        axios.get(`${API_BASE}/api/tms/shipments-pendientes`, { headers }),
        axios.get(`${API_BASE}/api/tms/carriers`, { headers }),
        axios.get(`${API_BASE}/api/tms/vehicles`, { headers }),
        axios.get(`${API_BASE}/api/tms/drivers`, { headers }),
      ]);
      setLoads(loadsRes.data.data || []);
      setPendientes(pendRes.data.data || []);
      setCarriers(carRes.data.data || []);
      setVehicles(vehRes.data.data || []);
      setDrivers(drvRes.data.data || []);
    } catch (err) {
      console.error(err);
      setStatus("Error cargando datos del TMS");
    }
    
  }, []);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const toggleShipment = (id) => {
    setForm((prev) => ({
      ...prev,
      shipment_ids: prev.shipment_ids.includes(id)
        ? prev.shipment_ids.filter((s) => s !== id)
        : [...prev.shipment_ids, id],
    }));
  };

  const crearCarga = async () => {
    if (!form.warehouse_id || form.shipment_ids.length === 0) {
      alert("Indica la bodega y selecciona al menos un despacho pendiente");
      return;
    }
    try {
      await axios.post(`${API_BASE}/api/tms/loads`, form, { headers });
      setStatus("✅ Carga creada");
      setForm({ warehouse_id: "", origen: "", destino: "", carrier_id: "", vehicle_id: "", driver_id: "", costo_flete: "", shipment_ids: [] });
      cargarTodo();
    } catch (err) {
      console.error(err);
      setStatus(err.response?.data?.error || "Error creando la carga");
    }
  };

  const verDetalle = async (id) => {
    try {
      const res = await axios.get(`${API_BASE}/api/tms/loads/${id}`, { headers });
      setSelectedLoad(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const despachar = async (id) => {
    try {
      await axios.post(`${API_BASE}/api/tms/loads/${id}/dispatch`, {}, { headers });
      cargarTodo();
      if (selectedLoad?.id === id) verDetalle(id);
    } catch (err) {
      alert(err.response?.data?.error || "Error despachando");
    }
  };

  const marcarEntregada = async (id) => {
    try {
      await axios.post(`${API_BASE}/api/tms/loads/${id}/deliver`, {}, { headers });
      cargarTodo();
      if (selectedLoad?.id === id) verDetalle(id);
    } catch (err) {
      alert(err.response?.data?.error || "Error marcando entrega");
    }
  };

  const registrarEvento = async () => {
    if (!nuevoEvento || !selectedLoad) return;
    try {
      await axios.post(
        `${API_BASE}/api/tms/loads/${selectedLoad.id}/tracking`,
        { evento: "checkpoint", descripcion: nuevoEvento },
        { headers }
      );
      setNuevoEvento("");
      verDetalle(selectedLoad.id);
      cargarTodo();
    } catch (err) {
      alert("Error registrando el evento");
    }
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl mb-4 font-bold text-indigo-400">TMS — Cargas y Despachos</h1>
      {status && <p className="text-sm text-slate-300 mb-3">{status}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: crear carga */}
        <div className="bg-slate-800 rounded p-4 space-y-3">
          <h2 className="text-lg font-semibold text-slate-200">Nueva carga</h2>

          <input placeholder="ID de bodega" value={form.warehouse_id}
            onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
            className="w-full p-2 text-black rounded" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Origen" value={form.origen}
              onChange={(e) => setForm({ ...form, origen: e.target.value })}
              className="p-2 text-black rounded" />
            <input placeholder="Destino" value={form.destino}
              onChange={(e) => setForm({ ...form, destino: e.target.value })}
              className="p-2 text-black rounded" />
          </div>

          <select value={form.carrier_id} onChange={(e) => setForm({ ...form, carrier_id: e.target.value })}
            className="w-full p-2 text-black rounded">
            <option value="">Transportista (opcional)</option>
            {carriers.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
              className="p-2 text-black rounded">
              <option value="">Vehículo</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.placa}</option>)}
            </select>
            <select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
              className="p-2 text-black rounded">
              <option value="">Conductor</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>

          <input placeholder="Costo de flete" type="number" value={form.costo_flete}
            onChange={(e) => setForm({ ...form, costo_flete: e.target.value })}
            className="w-full p-2 text-black rounded" />

          <div>
            <p className="text-sm text-slate-300 mb-1">Despachos pendientes de asignar:</p>
            <div className="max-h-40 overflow-y-auto bg-slate-900 rounded p-2 space-y-1">
              {pendientes.length === 0 && <p className="text-xs text-slate-500">No hay despachos pendientes</p>}
              {pendientes.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.shipment_ids.includes(p.id)}
                    onChange={() => toggleShipment(p.id)} />
                  {p.order_number} — {p.customer_name}
                </label>
              ))}
            </div>
          </div>

          <button onClick={crearCarga} className="w-full bg-indigo-600 py-2 rounded hover:bg-indigo-700">
            Crear carga
          </button>
        </div>

        {/* Columna derecha: listado + detalle */}
        <div className="space-y-4">
          <div className="bg-slate-800 rounded p-4">
            <h2 className="text-lg font-semibold text-slate-200 mb-2">Cargas</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loads.map((l) => (
                <div key={l.id} onClick={() => verDetalle(l.id)}
                  className="flex justify-between items-center bg-slate-900 rounded p-2 cursor-pointer hover:bg-slate-700">
                  <div>
                    <p className="text-sm font-medium">Carga #{l.id} — {l.origen} → {l.destino}</p>
                    <p className="text-xs text-slate-400">
                      {l.carrier_nombre || "Sin transportista"} · {l.vehicle_placa || "Sin vehículo"} · {l.total_shipments} despacho(s)
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded" style={{ background: ESTADO_COLOR[l.status] }}>
                    {ESTADO_LABEL[l.status] || l.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {selectedLoad && (
            <div className="bg-slate-800 rounded p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Carga #{selectedLoad.id}</h3>
                <span className="text-xs px-2 py-1 rounded" style={{ background: ESTADO_COLOR[selectedLoad.status] }}>
                  {ESTADO_LABEL[selectedLoad.status]}
                </span>
              </div>

              <div className="flex gap-2 mb-3">
                {selectedLoad.status === "planned" && (
                  <button onClick={() => despachar(selectedLoad.id)} className="bg-sky-600 px-3 py-1 rounded text-sm hover:bg-sky-700">
                    Despachar
                  </button>
                )}
                {["dispatched", "in_transit"].includes(selectedLoad.status) && (
                  <button onClick={() => marcarEntregada(selectedLoad.id)} className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-700">
                    Marcar entregada
                  </button>
                )}
              </div>

              <p className="text-sm text-slate-300 mb-1">Despachos incluidos:</p>
              <ul className="text-xs text-slate-400 mb-3 list-disc list-inside">
                {selectedLoad.shipments?.map((s) => (
                  <li key={s.id}>{s.order_number} — {s.customer_name} ({s.status})</li>
                ))}
              </ul>

              <p className="text-sm text-slate-300 mb-1">Registrar evento de seguimiento:</p>
              <div className="flex gap-2 mb-3">
                <input value={nuevoEvento} onChange={(e) => setNuevoEvento(e.target.value)}
                  placeholder="Ej: Pasó control en ruta 5" className="flex-1 p-2 text-black rounded text-sm" />
                <button onClick={registrarEvento} className="bg-slate-600 px-3 rounded text-sm hover:bg-slate-700">
                  Agregar
                </button>
              </div>

              <p className="text-sm text-slate-300 mb-1">Historial:</p>
              <ul className="text-xs text-slate-400 space-y-1 max-h-40 overflow-y-auto">
                {selectedLoad.eventos?.map((e) => (
                  <li key={e.id}>
                    <span className="text-slate-500">{new Date(e.created_at).toLocaleString()}</span> — {e.evento}
                    {e.descripcion ? `: ${e.descripcion}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/*
  Integración en App.js:
    import TmsDashboard from "./modules/core/tms/TmsDashboard.jsx";
    <Route path="/core/tms" element={<TmsDashboard />} />

  Requiere haber corrido antes sql/002_tms_yard_management.sql
*/
