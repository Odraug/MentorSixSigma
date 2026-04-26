import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../../config/env";

export default function SalesOrdersList() {

  const [orders, setOrders] = useState([]);

  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const load = async () => {

    try {

      const res = await axios.get(
        `${API_BASE}/api/sales/orders`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Orders received:", JSON.stringify(res.data, null, 2));
      setOrders(res.data);

    } catch (error) {

      console.error("Error loading orders:", error);

    }

  };

  useEffect(() => {

    load();

  }, []);

  const openOrder = (id) => {

    navigate(`/core/sales/order/${id}`);

  };

  return (

    <div className="bg-white shadow rounded">

      <table className="w-full bg-white shadow rounded text-gray-800">

        <thead className="bg-slate-700 text-white">

          <tr>
            <th className="p-3 text-left">Order</th>
            <th className="p-3 text-left">Customer</th>
            <th className="p-3 text-left">Items</th>
            <th className="p-3 text-left">Status</th>
          </tr>

        </thead>

        <tbody>

          {orders.map(order => (

            <tr
              key={order.id}
              className="border-t hover:bg-gray-50 cursor-pointer"
              onClick={() => openOrder(order.id)}
            >

              <td className="p-3 font-medium">
                {order.order_number}
              </td>

              <td className="p-3">
                {order.customer_name}
              </td>

              <td className="p-3">
                0
              </td>

              <td className="p-3">
                {order.status}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}