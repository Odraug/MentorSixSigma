// src/pages/A3Intro.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function A3Intro() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-indigo-400 mb-4">
        A3 – Análisis y Resolución de Problemas
      </h1>

      <p className="text-gray-300 text-center max-w-3xl mb-8 leading-relaxed">
        El formato A3 es una herramienta fundamental del pensamiento Lean que 
        permite documentar de forma estructurada la resolución de problemas. 
        Integra análisis 5W2H, causas raíz (Ishikawa), contramedidas y 
        seguimiento, fomentando la mejora continua basada en hechos y datos.
      </p>

      <div className="mb-8">
        <img
          src="/img/a3_diagrama.png"
          alt="Diagrama A3"
          className="w-[600px] rounded-lg shadow-lg border border-gray-700"
          onError={(e) => (e.target.style.display = "none")}
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => navigate("/a3/list")}
          className="bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-lg font-semibold"
        >
          Ver Mis A3
        </button>

        <button
          onClick={() => navigate("/a3/nuevo")}
          className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-lg font-semibold"
        >
          Crear Nuevo A3
        </button>

        <button
          onClick={() => navigate("/inicio")}
          className="bg-gray-700 hover:bg-gray-800 px-5 py-3 rounded-lg font-semibold"
        >
          Volver al Menú principal
        </button>
      </div>

      <footer className="text-sm text-gray-500 mt-10">
        MentorSuites® · Módulo A3 · Versión 1.0
      </footer>
    </div>
  );
}
