import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

export default function PickingRoute() {

  const { waveId } = useParams();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchRoute();
  }, []);

  const fetchRoute = async () => {

    const res = await axios.get(`/api/fulfillment/optimized-picking/${waveId}`);
    setTasks(res.data);

  };

  return (

    <div className="p-6">

      <h1 className="text-2xl font-bold mb-6">
        Picking Route - Wave {waveId}
      </h1>

      <table className="w-full bg-white shadow rounded">

        <thead className="bg-gray-100">

          <tr>
            <th className="p-3 text-left">SKU</th>
            <th className="p-3 text-left">Qty</th>
            <th className="p-3 text-left">Zone</th>
            <th className="p-3 text-left">Aisle</th>
            <th className="p-3 text-left">Rack</th>
            <th className="p-3 text-left">Bin</th>
          </tr>

        </thead>

        <tbody>

          {tasks.map(t => (

            <tr key={t.id} className="border-t">

              <td className="p-3">{t.sku}</td>
              <td className="p-3">{t.quantity}</td>
              <td className="p-3">{t.zone}</td>
              <td className="p-3">{t.aisle}</td>
              <td className="p-3">{t.rack}</td>
              <td className="p-3">{t.bin}</td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}