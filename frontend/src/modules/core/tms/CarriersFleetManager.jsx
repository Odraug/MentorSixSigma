import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../../../config/env";

export default function CarriersFleetManager() {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [tab, setTab] = useState("carriers");
  const [carriers, setCarriers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [carrierForm, setCarrierForm] = useState({ nombre: "", rut_nit: "", contacto: "", telefono: "", email: "" });
  const [vehicleForm, setVehicleForm] = useState({ placa: "", tipo: "", carrier_id: "", capacidad_kg: "" });
  const [driverForm, setDriverForm] = useState({ nombre: "", licencia: "", telefono: "", carrier_id: "" });

  const cargar = useCallback(async () => {
    const [c, v, d] = await Promise.all([
      axios.get(`${API_BASE}/api/tms/carriers`, { headers }),
      axios.get(`${API_BASE}/api/tms/vehicles`, { headers }),
      axios.get(`${API_BASE}/api/tms/drivers`, { headers }),
    ]);
    setCarriers(c.data.data || []);
    setVehicles(v.data.data || []);
    setDrivers(d.data.data || []);
    
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crearCarrier = async () => {
    if (!carrierForm.nombre) return alert("El nombre es obligatorio");
    await axios.post(`${API_BASE}/api/tms/carriers`, carrierForm, { headers });
    setCarrierForm({ nombre: "", rut_nit: "", contacto: "", telefono: "", email: "" });
    cargar();
  };

  const crearVehicle = async () => {
    if (!vehicleForm.placa) return alert("La placa es obligatoria");
    await axios.post(`${API_BASE}/api/tms/vehicles`, vehicleForm, { headers });
    setVehicleForm({ placa: "", tipo: "", carrier_id: "", capacidad_kg: "" });
    cargar();
  };

  const crearDriver = async () => {
    if (!driverForm.nombre) return alert("El nombre es obligatorio");
    await axios.post(`${API_BASE}/api/tms/drivers`, driverForm, { headers });
    setDriverForm({ nombre: "", licencia: "", telefono: "", carrier_id: "" });
    cargar();
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl mb-4 font-bold text-indigo-400">Flota y Transportistas</h1>

      <div className="flex gap-2 mb-4">
        {["carriers", "vehicles", "drivers"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 rounded ${tab === t ? "bg-indigo-600" : "bg-slate-700"}`}>
            {t === "carriers" ? "Transportistas" : t === "vehicles" ? "Vehículos" : "Conductores"}
          </button>
        ))}
      </div>

      {tab === "carriers" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded p-4 space-y-2">
            <h2 className="font-semibold mb-2">Nuevo transportista</h2>
            <input placeholder="Nombre" value={carrierForm.nombre}
              onChange={(e) => setCarrierForm({ ...carrierForm, nombre: e.target.value })}
              className="w-full p-2 text-black rounded" />
            <input placeholder="RUT / NIT" value={carrierForm.rut_nit}
              onChange={(e) => setCarrierForm({ ...carrierForm, rut_nit: e.target.value })}
              className="w-full p-2 text-black rounded" />
            <input placeholder="Contacto" value={carrierForm.contacto}
              onChange={(e) => setCarrierForm({ ...carrierForm, contacto: e.target.value })}
              className="w-full p-2 text-black rounded" />
            <input placeholder="Teléfono" value={carrierForm.telefono}
              onChange={(e) => setCarrierForm({ ...carrierForm, telefono: e.target.value })}
              className="w-full p-2 text-black rounded" />
            <button onClick={crearCarrier} className="w-full bg-indigo-600 py-2 rounded hover:bg-indigo-700">
              Agregar
            </button>
          </div>
          <div className="bg-slate-800 rounded p-4">
            <h2 className="font-semibold mb-2">Listado</h2>
            <ul className="space-y-1 text-sm max-h-80 overflow-y-auto">
              {carriers.map((c) => (
                <li key={c.id} className="bg-slate-900 rounded p-2">
                  <p className="font-medium">{c.nombre}</p>
                  <p className="text-xs text-slate-400">{c.contacto} · {c.telefono}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "vehicles" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded p-4 space-y-2">
            <h2 className="font-semibold mb-2">Nuevo vehículo</h2>
            <input placeholder="Placa" value={vehicleForm.placa}
              onChange={(e) => setVehicleForm({ ...vehicleForm, placa: e.target.value })}
              className="w-full p-2 text-black rounded" />
            <input placeholder="Tipo (camión, furgón...)" value={vehicleForm.tipo}
              onChange={(e) => setVehicleForm({ ...vehicleForm, tipo: e.target.value })}
              className="w-full p-2 text-black rounded" />
            <select value={vehicleForm.carrier_id} onChange={(e) => setVehicleForm({ ...vehicleForm, carrier_id: e.target.value })}
              className="w-full p-2 text-black rounded">
              <option value="">Transportista (opcional)</option>
              {carriers.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <input placeholder="Capacidad (kg)" type="number" value={vehicleForm.capacidad_kg}
              onChange={(e) => setVehicleForm({ ...vehicleForm, capacidad_kg: e.target.value })}
              className="w-full p-2 text-black rounded" />
            <button onClick={crearVehicle} className="w-full bg-indigo-600 py-2 rounded hover:bg-indigo-700">
              Agregar
            </button>
          </div>
          <div className="bg-slate-800 rounded p-4">
            <h2 className="font-semibold mb-2">Listado</h2>
            <ul className="space-y-1 text-sm max-h-80 overflow-y-auto">
              {vehicles.map((v) => (
                <li key={v.id} className="bg-slate-900 rounded p-2">
                  <p className="font-medium">{v.placa} — {v.tipo}</p>
                  <p className="text-xs text-slate-400">{v.carrier_nombre || "Sin transportista"}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "drivers" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded p-4 space-y-2">
            <h2 className="font-semibold mb-2">Nuevo conductor</h2>
            <input placeholder="Nombre" value={driverForm.nombre}
              onChange={(e) => setDriverForm({ ...driverForm, nombre: e.target.value })}
              className="w-full p-2 text-black rounded" />
            <input placeholder="Licencia" value={driverForm.licencia}
              onChange={(e) => setDriverForm({ ...driverForm, licencia: e.target.value })}
              className="w-full p-2 text-black rounded" />
            <input placeholder="Teléfono" value={driverForm.telefono}
              onChange={(e) => setDriverForm({ ...driverForm, telefono: e.target.value })}
              className="w-full p-2 text-black rounded" />
            <select value={driverForm.carrier_id} onChange={(e) => setDriverForm({ ...driverForm, carrier_id: e.target.value })}
              className="w-full p-2 text-black rounded">
              <option value="">Transportista (opcional)</option>
              {carriers.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button onClick={crearDriver} className="w-full bg-indigo-600 py-2 rounded hover:bg-indigo-700">
              Agregar
            </button>
          </div>
          <div className="bg-slate-800 rounded p-4">
            <h2 className="font-semibold mb-2">Listado</h2>
            <ul className="space-y-1 text-sm max-h-80 overflow-y-auto">
              {drivers.map((d) => (
                <li key={d.id} className="bg-slate-900 rounded p-2">
                  <p className="font-medium">{d.nombre}</p>
                  <p className="text-xs text-slate-400">{d.licencia} · {d.carrier_nombre || "Sin transportista"}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/*
  Integración en App.js:
    import CarriersFleetManager from "./modules/core/tms/CarriersFleetManager.jsx";
    <Route path="/core/tms/flota" element={<CarriersFleetManager />} />
*/
