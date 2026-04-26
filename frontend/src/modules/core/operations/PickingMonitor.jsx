import React, { useEffect, useState } from "react";
import axios from "axios";

export default function PickingMonitor() {

  const [data, setData] = useState([]);

  useEffect(() => {
    fetchMonitor();
  }, []);

  const fetchMonitor = async () => {

    const res = await axios.get("/api/fulfillment/picking-monitor");
    setData(res.data);

  };

  const getProgress = (completed, total) => {

    if (total === 0) return 0;
    return Math.round((completed / total) * 100);

  };

  return (

    <div className="p-6">

      <h1 className="text-2xl font-bold mb-6">
        Picking Monitor
      </h1>

      <table className="w-full bg-white shadow rounded">

        <thead className="bg-gray-100">

          <tr>
            <th className="p-3 text-left">Worker</th>
            <th className="p-3 text-left">Pending</th>
            <th className="p-3 text-left">Completed</th>
            <th className="p-3 text-left">Progress</th>
          </tr>

        </thead>

        <tbody>

          {data.map((w, i) => {

            const progress = getProgress(
              w.completed_tasks,
              w.total_tasks
            );

            return (

              <tr key={i} className="border-t">

                <td className="p-3">
                  {w.assigned_to || "Unassigned"}
                </td>

                <td className="p-3">
                  {w.pending_tasks}
                </td>

                <td className="p-3">
                  {w.completed_tasks}
                </td>

                <td className="p-3">

                  <div className="w-full bg-gray-200 rounded h-4">

                    <div
                      className="bg-green-500 h-4 rounded"
                      style={{ width: `${progress}%` }}
                    />

                  </div>

                  <span className="text-sm">
                    {progress}%
                  </span>

                </td>

              </tr>

            );

          })}

        </tbody>

      </table>

    </div>

  );

}