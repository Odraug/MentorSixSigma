// src/pages/VSM/VsmIntro.jsx
import React from "react";
import { useNavigate } from "react-router-dom";


export default function VsmIntro() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      
      <h1 className="text-3xl font-bold text-green-400 mb-6">
        Value Stream
      </h1>

      <p className="text-gray-300 text-center max-w-2xl mb-8">
        El Mapeo de Flujo de Valor (VSM) permite visualizar y analizar el flujo
        de materiales e información necesarios para entregar un producto o
        servicio al cliente. Armá el mapa arrastrando procesos e inventarios —
        el Tiempo de Entrega y el %Valor Agregado se calculan solos.
      </p>

      <div className="flex gap-6">
        <button
          onClick={() => navigate("/vsm/builder")}
          className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-lg font-semibold"
        >
          🗺️ Crear / Editar Mapa
        </button>

                <button
          onClick={() => navigate("/inicio")}
          className="bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded-md"
        >
          Volver al menú principal
        </button>
      </div>
    </div>
    
  );
}
