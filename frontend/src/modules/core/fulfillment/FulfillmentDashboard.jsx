import React, { useEffect, useState } from "react";
import axios from "axios";

export default function FulfillmentDashboard() {

    const [orders, setOrders] = useState([]);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [stats, setStats] = useState({
        pending_orders: 0,
        allocated_orders: 0,
        stock_breaks: 0,
        waves_planned: 0
    });

    useEffect(() => {
        fetchQueue();
        fetchStats();
    }, []);

    // ================================
    // 📦 FETCH QUEUE
    // ================================

    const fetchQueue = async () => {

        try {

            const res = await axios.get("/api/fulfillment/queue");
            setOrders(res.data);

        } catch (error) {

            console.error("Queue error", error);

        }

    };

    // ================================
    // 📊 FETCH STATS
    // ================================

    const fetchStats = async () => {

        try {

            const res = await axios.get("/api/fulfillment/stats");
            setStats(res.data);

        } catch (error) {

            console.error("Stats error", error);

        }

    };

    // ================================
    // ☑️ SELECT ORDERS
    // ================================

    const toggleSelect = (id) => {

        if (selectedOrders.includes(id)) {

            setSelectedOrders(selectedOrders.filter(o => o !== id));

        } else {

            setSelectedOrders([...selectedOrders, id]);

        }

    };

    // ================================
    // ⚙️ ALLOCATE
    // ================================

    const allocateOrders = async () => {

        if (selectedOrders.length === 0) {
            alert("Selecciona al menos una orden");
            return;
        }

        try {

            for (const id of selectedOrders) {

                await axios.post(`/api/fulfillment/allocate/${id}`);

            }

            await fetchQueue();
            await fetchStats();
            setSelectedOrders([]);

        } catch (error) {

            console.error("Allocation error", error);

        }

    };

    // ================================
    // 🌊 CREATE WAVE
    // ================================

    const createWave = async () => {

        if (selectedOrders.length === 0) {
            alert("Selecciona órdenes para crear la wave");
            return;
        }

        try {

            await axios.post("/api/fulfillment/create-wave", {
                orders: selectedOrders
            });

            await fetchQueue();
            await fetchStats();
            setSelectedOrders([]);

        } catch (error) {

            console.error("Wave creation error", error);

        }

    };

    // ================================
// 🤖 AUTO WAVE
// ================================

const autoWave = async () => {

    try {

        await axios.post("/api/fulfillment/auto-wave");

        await fetchQueue();
        await fetchStats();

    } catch (error) {

        console.error("Auto wave error", error);

    }

};

    return (

        <div className="p-6">

            <h1 className="text-2xl font-bold mb-6">
                Fulfillment Center
            </h1>

            {/* ======================================
          📊 KPI DASHBOARD
      ====================================== */}

            <div className="grid grid-cols-4 gap-4 mb-6">

                <div className="bg-white shadow rounded p-4">
                    <h3 className="text-sm text-gray-500">Orders Pending</h3>
                    <p className="text-2xl font-bold">
                        {stats.pending_orders}
                    </p>
                </div>

                <div className="bg-white shadow rounded p-4">
                    <h3 className="text-sm text-gray-500">Allocated</h3>
                    <p className="text-2xl font-bold">
                        {stats.allocated_orders}
                    </p>
                </div>

                <div className="bg-white shadow rounded p-4">
                    <h3 className="text-sm text-gray-500">Stock Breaks</h3>
                    <p className="text-2xl font-bold text-red-500">
                        {stats.stock_breaks}
                    </p>
                </div>

                <div className="bg-white shadow rounded p-4">
                    <h3 className="text-sm text-gray-500">Waves Planned</h3>
                    <p className="text-2xl font-bold text-green-600">
                        {stats.waves_planned}
                    </p>
                </div>

            </div>

            {/* ======================================
          📦 ORDERS QUEUE
      ====================================== */}

            <div className="bg-white shadow rounded">

                <table className="w-full">

                    <thead className="bg-gray-100">

                        <tr>

                            <th className="p-3"></th>
                            <th className="p-3 text-left">Order</th>
                            <th className="p-3 text-left">Cliente</th>
                            <th className="p-3 text-left">Items</th>
                            <th className="p-3 text-left">Status</th>
                            <th className="p-3 text-left">Allocation</th>

                        </tr>

                    </thead>

                    <tbody>

                        {orders.map(o => (

                            <tr key={o.id} className="border-t hover:bg-gray-50">

                                <td className="p-3">

                                    <input
                                        type="checkbox"
                                        checked={selectedOrders.includes(o.id)}
                                        onChange={() => toggleSelect(o.id)}
                                    />

                                </td>

                                <td className="p-3 font-medium">
                                    {o.order_number}
                                </td>

                                <td className="p-3">
                                    {o.customer_name}
                                </td>

                                <td className="p-3">
                                    {o.items}
                                </td>

                                <td className="p-3">
                                    {o.status}
                                </td>

                                <td className="p-3">

                                    {o.allocation_status === "stock_break"
                                        ? <span className="text-red-500 font-semibold">Stock Break</span>
                                        : o.allocation_status}

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

            {/* ======================================
          ⚙️ ACTION BUTTONS
      ====================================== */}

            <div className="mt-6 flex gap-4">

                <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    onClick={allocateOrders}
                >
                    Allocate
                </button>

                <button
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                    onClick={createWave}
                >
                    Create Wave
                </button>

                <button
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
                    onClick={AutoWave}
                >
                    Auto Wave
                </button>

            </div>

        </div>

    );

}