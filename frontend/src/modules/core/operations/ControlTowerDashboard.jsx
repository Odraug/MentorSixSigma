import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../../../config/env";
import { useNavigate } from "react-router-dom";

export default function ControlTowerDashboard() {

  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const headers = {
    Authorization: `Bearer ${token}`
  };

  // ================================
  // 🎯 LOAD DATA
  // ================================

  const loadKpi = async () => {
    try {

      const res = await axios.get(
        `${API_BASE}/api/wms/control-tower`,
        { headers }
      );

      setData(res.data.data);

    } catch (error) {
      console.error("Error cargando KPI:", error);
    }
  };

  const loadOrders = async () => {
    try {

      const res = await axios.get(
        `${API_BASE}/api/wms/control-tower/orders`,
        { headers }
      );

      setOrders(res.data.data);

    } catch (error) {
      console.error("Error cargando pedidos:", error);
    }
  };

  const loadAll = async () => {

    setLoading(true);

    await Promise.all([
      loadKpi(),
      loadOrders()
    ]);

    setLoading(false);

  };

  useEffect(() => {

    loadAll();

    const interval = setInterval(loadAll, 10000);

    return () => clearInterval(interval);

  }, []);

  // ================================
  // 🎨 SEMÁFORO
  // ================================

  const getColor = (estado) => {

    if (!estado) return "text-gray-400";

    if (estado === "completado") return "text-green-400";
    if (estado === "en_proceso") return "text-yellow-400";
    if (estado === "pendiente") return "text-gray-400";
    if (estado === "atrasado") return "text-red-500";

    return "text-white";

  };

  // ================================
  // 🚨 ALERTAS
  // ================================

  const alerts = orders.filter(o =>
    o.estado_operacional === "atrasado" ||
    o.picking_status === "pending"
  );

  // ================================
  // 📊 KPI DERIVADO
  // ================================

  const backlog = data
    ? (data.pedidos_creados - data.despachados)
    : 0;

  // ================================
  // ⏳ LOADING
  // ================================

  if (loading || !data) {
    return (
      <div className="p-10 text-white">
        Cargando Control Tower...
      </div>
    );
  }

  // ================================
  // 🧩 UI
  // ================================

  return (

    <div className="p-10 text-white">

      <h1 className="text-3xl mb-10 text-indigo-400">
        📡 Control Tower Logístico
      </h1>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-6 mb-10">

        <div className="bg-blue-600 p-6 rounded-xl">
          <h2 className="text-lg">Pedidos Creados</h2>
          <div className="text-3xl">{data.pedidos_creados}</div>
        </div>

        <div className="bg-indigo-600 p-6 rounded-xl">
          <h2 className="text-lg">Confirmados</h2>
          <div className="text-3xl">{data.pedidos_confirmados}</div>
        </div>

        <div className="bg-orange-600 p-6 rounded-xl">
          <h2 className="text-lg">En Picking</h2>
          <div className="text-3xl">{data.en_picking}</div>
        </div>

        <div className="bg-yellow-600 p-6 rounded-xl">
          <h2 className="text-lg">Picking Completado</h2>
          <div className="text-3xl">{data.picking_completado}</div>
        </div>

        <div className="bg-green-600 p-6 rounded-xl">
          <h2 className="text-lg">En Packing</h2>
          <div className="text-3xl">{data.en_packing}</div>
        </div>

        <div className="bg-teal-600 p-6 rounded-xl">
          <h2 className="text-lg">Packing Completado</h2>
          <div className="text-3xl">{data.packing_completado}</div>
        </div>

        <div className="bg-purple-600 p-6 rounded-xl">
          <h2 className="text-lg">En Despacho</h2>
          <div className="text-3xl">{data.en_despacho}</div>
        </div>

        <div className="bg-gray-700 p-6 rounded-xl">
          <h2 className="text-lg">Despachados</h2>
          <div className="text-3xl">{data.despachados}</div>
        </div>

        {/* KPI NUEVO */}
        <div className="bg-red-600 p-6 rounded-xl col-span-2">
          <h2 className="text-lg">Backlog Operacional</h2>
          <div className="text-3xl">{backlog}</div>
        </div>

      </div>

      {/* ALERTAS */}
      {alerts.length > 0 && (

        <div className="bg-red-900 p-4 rounded mb-6">

          <h2 className="text-lg font-bold mb-2">
            ⚠️ Alertas Operacionales
          </h2>

          {alerts.map(a => (
            <div key={a.order_id} className="text-sm">
              Pedido {a.order_id} con problema
            </div>
          ))}

        </div>

      )}

      {/* TABLA */}
      <h2 className="text-2xl mb-4">
        Pedidos en Operación
      </h2>

      <div className="bg-gray-800 rounded-xl p-4 overflow-x-auto">

        <table className="w-full text-left">

          <thead className="text-gray-400">
            <tr>
              <th className="p-2">Pedido</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Picking</th>
              <th className="p-2">Packing</th>
              <th className="p-2">Despacho</th>
              <th className="p-2">Creado</th>
            </tr>
          </thead>

          <tbody>

            {orders.map(order => (

              <tr
                key={order.order_id}
                className="border-t border-gray-700 hover:bg-gray-700 cursor-pointer"
                onClick={() => navigate(`/core/sales/order/${order.order_id}`)}
              >

                <td className="p-2 font-semibold">
                  {order.order_id}
                </td>

                <td className={`p-2 font-semibold ${getColor(order.estado_operacional)}`}>
                  {order.estado_operacional}
                </td>

                <td className="p-2">
                  {order.picking_status || "-"}
                </td>

                <td className="p-2">
                  {order.packing_status || "-"}
                </td>

                <td className="p-2">
                  {order.shipment_status || "-"}
                </td>

                <td className="p-2">
                  {new Date(order.created_at).toLocaleString()}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

}