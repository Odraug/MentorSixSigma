import React, { useEffect, useState } from "react";
import axios from "axios";

export default function WaveManager() {

  const [waves, setWaves] = useState([]);

  useEffect(() => {
    fetchWaves();
  }, []);

  const fetchWaves = async () => {

    const res = await axios.get("/api/fulfillment/waves");
    setWaves(res.data);

  };

  return (

    <div className="p-6">

      <h1 className="text-2xl font-bold mb-6">
        Wave Manager
      </h1>

      <div className="grid grid-cols-3 gap-4">

        {waves.map(w => (

          <div
            key={w.id}
            className="bg-white shadow rounded p-4"
          >

            <h2 className="text-lg font-bold">
              Wave {w.id}
            </h2>

            <p className="text-sm text-gray-500">
              Orders: {w.orders}
            </p>

            <p className="text-sm text-gray-500">
              Status: {w.status}
            </p>

            <p className="text-sm text-gray-500">
              Created: {new Date(w.created_at).toLocaleString()}
            </p>

          </div>

        ))}

      </div>

    </div>

  );

}