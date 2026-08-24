// src/pages/Admin/Modulos.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from '../../config/env'; // ✅ correcto

export default function Modulos() {
  const navigate = useNavigate();
  const [modulos, setModulos] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    tipo: "operativo",
    categoria: "General",
    descripcion: "",
  });
  const [editando, setEditando] = useState(null);
  const token = localStorage.getItem("token");

  // 🔹 Cargar módulos
  const cargarModulos = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/modulos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModulos(res.data);
    } catch (err) {
      console.error("❌ Error cargando módulos:", err);
    }
  };

  useEffect(() => {
    cargarModulos();
  }, []);

  // 🔹 Manejar cambios en formulario
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔹 Guardar o actualizar módulo
  const guardarModulo = async (e) => {
    e.preventDefault();
    try {
    if (editando) {
      await axios.put(`${API_BASE}/api/modulos/${editando.id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      await axios.post(`${API_BASE}/api/modulos`, form, {  // ✅ corregido
        headers: { Authorization: `Bearer ${token}` },
      });
    }


      alert("✅ Módulo guardado correctamente");
      setForm({
        nombre: "",
        tipo: "operativo",
        categoria: "General",
        descripcion: "",
      });
      setEditando(null);
      cargarModulos();
    } catch (err) {
      console.error("❌ Error guardando módulo:", err);
      alert("⚠️ Error al guardar módulo");
    }
  };

  // 🔹 Eliminar módulo
  const eliminarModulo = async (id) => {
    if (!window.confirm("¿Eliminar este módulo?")) return;
    try {
      await axios.delete(`${API_BASE}/api/modulos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      cargarModulos();
    } catch (err) {
      console.error("❌ Error al eliminar módulo:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-indigo-400">
          Gestión de Módulos
        </h1>
        <button
          onClick={() => navigate("/inicio")}
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-semibold text-sm"
        >
          ← Volver a Inicio
        </button>
      </div>

      {/* 🧩 Formulario de creación/edición */}
      <form
        onSubmit={guardarModulo}
        className="bg-gray-800 p-6 rounded-lg mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-lg"
      >
        {/* Nombre */}
        <div className="flex flex-col">
          <label className="text-indigo-300 font-semibold mb-1">
            Nombre del módulo
          </label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Ej: OEE, 5S, SIPOC..."
            className="bg-gray-700 p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          />
        </div>

        {/* Tipo */}
        <div className="flex flex-col">
          <label className="text-indigo-300 font-semibold mb-1">Tipo</label>
          <select
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            className="bg-gray-700 p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="operativo">Operativo</option>
            <option value="admin">Administrativo</option>
          </select>
        </div>

        {/* Categoría */}
        <div className="flex flex-col">
          <label className="text-indigo-300 font-semibold mb-1">
            Categoría
          </label>

          {/* Select dinámico de categorías */}
          {modulos.length > 0 && (
            <select
              name="categoria"
              value={form.categoria}
              onChange={(e) => {
                if (e.target.value === "nueva") {
                  setForm({ ...form, categoria: "" });
                } else {
                  handleChange(e);
                }
              }}
              className="bg-gray-700 p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2"
            >
              {[...new Set(modulos.map((m) => m.categoria))].map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="nueva">➕ Crear nueva categoría</option>
            </select>
          )}

          {/* Campo visible solo al crear categoría nueva */}
          {form.categoria === "" && (
            <input
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              placeholder="Escribe una nueva categoría..."
              className="bg-gray-700 p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          )}
        </div>

        {/* Botón principal */}
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold text-white transition-all"
          >
            {editando ? "Actualizar" : "Agregar"}
          </button>
        </div>

        {/* Descripción */}
        <div className="col-span-full flex flex-col">
          <label className="text-indigo-300 font-semibold mb-1">
            Descripción
          </label>
          <textarea
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            placeholder="Describe brevemente la función o propósito del módulo..."
            rows={3}
            className="bg-gray-700 p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
        </div>
      </form>

      {/* 📋 Tabla de módulos */}
      <table className="w-full bg-gray-800 text-sm rounded-lg overflow-hidden border border-gray-700">
        <thead className="bg-gray-700 text-indigo-300">
          <tr>
            <th className="p-2">ID</th>
            <th className="p-2 text-left">Nombre</th>
            <th className="p-2 text-left">Tipo</th>
            <th className="p-2 text-left">Categoría</th>
            <th className="p-2 text-left">Descripción</th>
            <th className="p-2 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {modulos.map((m) => (
            <tr
              key={m.id}
              className="border-t border-gray-700 hover:bg-gray-800/70"
            >
              <td className="p-2">{m.id}</td>
              <td className="p-2 font-semibold text-indigo-400">{m.nombre}</td>
              <td className="p-2">{m.tipo}</td>
              <td className="p-2">{m.categoria}</td>
              <td className="p-2 text-gray-300">{m.descripcion || "—"}</td>
              <td className="p-2 flex gap-2 justify-center">
                <button
                  onClick={() => {
                    setForm(m);
                    setEditando(m);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 px-3 py-1 rounded text-xs text-black"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => eliminarModulo(m.id)}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
                >
                  🗑️ Eliminar
                </button>
              </td>
            </tr>
          ))}
          {modulos.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center text-gray-400 p-3">
                No hay módulos registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
