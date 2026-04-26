import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../../../config/env";

export default function OperationsDashboard() {

  const [tasks, setTasks] = useState([]);

  const token = localStorage.getItem("token");
  const companyId = localStorage.getItem("companyId");

  const loadTasks = async () => {

    try {

      const res = await axios.get(
        `${API_BASE}/api/operations/picking?companyId=${companyId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setTasks(res.data.data);

    } catch (error) {

      console.error("Error cargando picking tasks:", error);

    }

  };

  useEffect(() => {
    loadTasks();
  }, []);

  const assignTask = async (id) => {

    await axios.post(
      `${API_BASE}/api/operations/picking/${id}/assign`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    loadTasks();

  };

  const startPicking = async (id) => {

    await axios.post(
      `${API_BASE}/api/operations/picking/${id}/start`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    loadTasks();

  };

  const finishPicking = async (id) => {

    await axios.post(
      `${API_BASE}/api/operations/picking/${id}/finish`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    loadTasks();

  };

  const grouped = {
    pending: tasks.filter(t => t.status === "pending"),
    assigned: tasks.filter(t => t.status === "assigned"),
    picking: tasks.filter(t => t.status === "picking"),
    picked: tasks.filter(t => t.status === "picked"),
    packed: tasks.filter(t => t.status === "packed")
  };

  const renderColumn = (title, list) => (

    <div className="bg-gray-800 rounded-xl p-4 flex-1">

      <h2 className="text-lg font-bold mb-4">{title}</h2>

      {list.map(task => (

        <div
          key={task.id}
          className="bg-gray-700 p-3 rounded mb-3"
        >

          <div className="font-semibold">
            Producto: {task.product_id}
          </div>

          <div className="text-sm text-gray-400">
            Orden: {task.order_id}
          </div>

          <div className="text-sm">
            Cantidad: {task.quantity}
          </div>

          <div className="mt-2 flex gap-2">

            {task.status === "pending" && (
              <button
                className="bg-blue-600 px-2 py-1 rounded"
                onClick={() => assignTask(task.id)}
              >
                Tomar
              </button>
            )}

            {task.status === "assigned" && (
              <button
                className="bg-yellow-600 px-2 py-1 rounded"
                onClick={() => startPicking(task.id)}
              >
                Iniciar
              </button>
            )}

            {task.status === "picking" && (
              <button
                className="bg-green-600 px-2 py-1 rounded"
                onClick={() => finishPicking(task.id)}
              >
                Confirmar
              </button>
            )}

          </div>

        </div>

      ))}

    </div>

  );

  return (

    <div className="min-h-screen bg-gray-900 text-white p-10">

      <h1 className="text-3xl font-bold mb-8 text-orange-400">
        📦 Operaciones WMS
      </h1>

      <div className="grid grid-cols-5 gap-4">

        {renderColumn("Pendiente", grouped.pending)}
        {renderColumn("Asignado", grouped.assigned)}
        {renderColumn("Picking", grouped.picking)}
        {renderColumn("Picked", grouped.picked)}
        {renderColumn("Packed", grouped.packed)}

      </div>

    </div>

  );

}