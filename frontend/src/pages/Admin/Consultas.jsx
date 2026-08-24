// src/pages/Admin/Consultas.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from '../../config/env'; // ✅ ruta correcta

const Consultas = () => {
  const navigate = useNavigate();
  const [consultas, setConsultas] = useState([]);
  const [comentario, setComentario] = useState("");
  const [seleccionada, setSeleccionada] = useState(null);
  const [comentarios, setComentarios] = useState([]);

  useEffect(() => {
    obtenerConsultas();
  }, []);

const obtenerConsultas = async () => {
  const token = localStorage.getItem("token");
  try {
    const res = await axios.get(`${API_BASE}/api/consultas`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = res.data;

    // 🔥 Normalización
    const lista = Array.isArray(data)
      ? data
      : Array.isArray(data.consultas)
      ? data.consultas
      : [];

    setConsultas(lista);
  } catch (error) {
    console.error("❌ Error obteniendo consultas:", error);
    setConsultas([]); // evita crash
  }
};


  const verComentarios = async (id) => {
    setSeleccionada(id);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${API_BASE}/api/consultas/${id}/comentarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComentarios(res.data);
    } catch (error) {
      console.error("❌ Error cargando comentarios:", error);
    }
  };

  const agregarComentario = async () => {
    if (!comentario.trim()) return;
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${API_BASE}/api/consultas/${seleccionada}/comentarios`,
        { comentario },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComentario("");
      verComentarios(seleccionada);
    } catch (error) {
      console.error("❌ Error agregando comentario:", error);
    }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `${API_BASE}/api/consultas/${id}/estado`,
        { estado: nuevoEstado },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      obtenerConsultas();
    } catch (error) {
      console.error("❌ Error actualizando estado:", error);
    }
  };

  return (
    <div className="p-6 text-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-indigo-400">
          Gestión de Consultas
        </h1>
        <button
          onClick={() => navigate("/inicio")}
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-semibold text-sm"
        >
          ← Volver a Inicio
        </button>
      </div>

      {/* Tabla principal */}
      <div className="overflow-x-auto">
        <table className="w-full bg-gray-800 rounded-lg">
          <thead>
            <tr className="bg-gray-700 text-left">
              <th className="p-2">Nombre</th>
              <th className="p-2">Correo</th>
              <th className="p-2">Mensaje</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {consultas.map((c) => (
              <tr key={c.id} className="border-t border-gray-700">
                <td className="p-2">
                  {c.nombre} {c.apellido}
                </td>
                <td className="p-2">{c.correo}</td>
                <td className="p-2">{c.mensaje?.slice(0, 40)}...</td>
                <td className="p-2">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      c.estado === "Resuelta"
                        ? "bg-green-600"
                        : c.estado === "En progreso"
                        ? "bg-yellow-600"
                        : "bg-gray-600"
                    }`}
                  >
                    {c.estado}
                  </span>
                </td>
                <td className="p-2 flex gap-2">
                  <button
                    onClick={() => verComentarios(c.id)}
                    className="bg-indigo-500 hover:bg-indigo-600 px-3 py-1 rounded"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => cambiarEstado(c.id, "En progreso")}
                    className="bg-yellow-500 hover:bg-yellow-600 px-3 py-1 rounded"
                  >
                    Progreso
                  </button>
                  <button
                    onClick={() => cambiarEstado(c.id, "Resuelta")}
                    className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded"
                  >
                    Resuelta
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Panel de comentarios */}
      {seleccionada && (
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h2 className="text-xl mb-2">
            Comentarios de la consulta #{seleccionada}
          </h2>
          <ul className="space-y-2 mb-4">
            {comentarios.map((com) => (
              <li key={com.id} className="bg-gray-800 p-2 rounded">
                <p className="text-sm text-gray-300">{com.comentario}</p>
                <p className="text-xs text-gray-500">
                  por {com.creado_por} —{" "}
                  {new Date(com.fecha).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 text-white"
            placeholder="Escribe un comentario interno..."
          />
          <button
            onClick={agregarComentario}
            className="mt-2 bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded"
          >
            Agregar comentario
          </button>
        </div>
      )}
    </div>
  );
};

export default Consultas;
