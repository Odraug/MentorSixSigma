// src/pages/Admin/Usuarios.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from '../../config/env';

export default function Usuarios() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    id: null,
    nombre: "",
    email: "",
    password: "",
    empresa_id: "",
    rol_id: "",
  });
  const [modoEdicion, setModoEdicion] = useState(false);

  const token = localStorage.getItem("token");

  // 🧠 Cargar datos iniciales
  useEffect(() => {
    cargarUsuarios();
    cargarEmpresas();
    cargarRoles();
  }, []);

  // 📌 Obtener usuarios
  const cargarUsuarios = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setUsuarios(data);
      else setUsuarios([]);
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
      setUsuarios([]);
    }
  };

  // 📌 Obtener empresas
  const cargarEmpresas = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/empresas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setEmpresas(data);
      else setEmpresas([]);
    } catch (err) {
      console.error("Error al obtener empresas:", err);
      setEmpresas([]);
    }
  };

  // 📌 Obtener roles
  const cargarRoles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setRoles(data);
      else setRoles([]);
    } catch (err) {
      console.error("Error al obtener roles:", err);
      setRoles([]);
    }
  };

  // ✏️ Manejar inputs
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ➕ Crear usuario
  const crearUsuario = async () => {
    if (!form.nombre || !form.email || !form.password || !form.empresa_id || !form.rol_id) {
      alert("Por favor completa todos los campos.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/usuarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setUsuarios((prev) => [...prev, data.usuario || form]);
        alert("✅ Usuario creado correctamente");
        resetForm();
      } else {
        alert(`⚠️ ${data.message || "Error al crear usuario"}`);
      }
    } catch (err) {
      console.error("❌ Error de conexión:", err);
    }
  };

  // 🛠️ Editar usuario
  const editarUsuario = (u) => {
    setModoEdicion(true);
    setForm({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      password: "",
      empresa_id: u.empresa_id || "",
      rol_id: u.rol_id || "",
    });
  };

  // 🔄 Actualizar usuario
  const actualizarUsuario = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/${form.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setUsuarios((prev) =>
          prev.map((u) => (u.id === form.id ? { ...u, ...form } : u))
        );
        alert("✅ Usuario actualizado correctamente");
        resetForm();
      } else {
        alert(`⚠️ ${data.message || "Error al actualizar usuario"}`);
      }
    } catch (err) {
      console.error("❌ Error actualizando:", err);
    }
  };

  // 🗑️ Eliminar usuario
  const eliminarUsuario = async (id) => {
    const confirmar = window.confirm("¿Seguro que deseas eliminar este usuario?");
    if (!confirmar) return;

    try {
      const res = await fetch(`${API_BASE}/api/usuarios/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setUsuarios((prev) => prev.filter((u) => u.id !== id));
        alert("🗑️ Usuario eliminado correctamente");
      } else {
        alert("⚠️ Error al eliminar usuario");
      }
    } catch (err) {
      console.error("❌ Error eliminando:", err);
    }
  };

  // 🔄 Reset form
  const resetForm = () => {
    setForm({
      id: null,
      nombre: "",
      email: "",
      password: "",
      empresa_id: "",
      rol_id: "",
    });
    setModoEdicion(false);
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-indigo-400">
          Gestión de Usuarios
        </h2>
        <button
          onClick={() => navigate("/inicio")}
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-semibold text-sm"
        >
          ← Volver a Inicio
        </button>
      </div>

      {/* FORMULARIO */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <input
          type="text"
          name="nombre"
          placeholder="Nombre completo"
          value={form.nombre}
          onChange={handleChange}
          className="p-2 rounded bg-gray-700 text-white w-full"
        />
        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          value={form.email}
          onChange={handleChange}
          className="p-2 rounded bg-gray-700 text-white w-full"
        />
        <input
          type="password"
          name="password"
          placeholder={modoEdicion ? "Nueva contraseña (opcional)" : "Contraseña"}
          value={form.password}
          onChange={handleChange}
          className="p-2 rounded bg-gray-700 text-white w-full"
        />
        <select
          name="empresa_id"
          value={form.empresa_id}
          onChange={handleChange}
          className="p-2 rounded bg-gray-700 text-white w-full"
        >
          <option value="">Selecciona empresa...</option>
          {Array.isArray(empresas) &&
            empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
        </select>
        <select
          name="rol_id"
          value={form.rol_id}
          onChange={handleChange}
          className="p-2 rounded bg-gray-700 text-white w-full"
        >
          <option value="">Selecciona rol...</option>
          {Array.isArray(roles) &&
            roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
        </select>
      </div>

      {/* BOTONES */}
      <div className="flex gap-4 mb-8">
        {modoEdicion ? (
          <>
            <button
              onClick={actualizarUsuario}
              className="bg-yellow-500 hover:bg-yellow-600 px-6 py-2 rounded font-semibold"
            >
              Actualizar
            </button>
            <button
              onClick={resetForm}
              className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded font-semibold"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            onClick={crearUsuario}
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-semibold"
          >
            Crear Usuario
          </button>
        )}
      </div>

      {/* TABLA DE USUARIOS */}
      <table className="w-full bg-gray-800 rounded-lg shadow-md">
        <thead className="bg-gray-700 text-indigo-300">
          <tr>
            <th className="py-2 px-4 text-left">ID</th>
            <th className="py-2 px-4 text-left">Nombre</th>
            <th className="py-2 px-4 text-left">Correo</th>
            <th className="py-2 px-4 text-left">Empresa</th>
            <th className="py-2 px-4 text-left">Rol</th>
            <th className="py-2 px-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(usuarios) &&
            usuarios.map((u) => (
              <tr
                key={u.id}
                className="border-t border-gray-700 hover:bg-gray-700/50"
              >
                <td className="py-2 px-4">{u.id}</td>
                <td className="py-2 px-4">{u.nombre}</td>
                <td className="py-2 px-4">{u.email}</td>
                <td className="py-2 px-4">{u.empresa || "—"}</td>
                <td className="py-2 px-4">{u.rol || "—"}</td>
                <td className="py-2 px-4 flex justify-center gap-2">
                  <button
                    onClick={() => editarUsuario(u)}
                    className="bg-yellow-500 hover:bg-yellow-600 px-3 py-1 rounded text-sm font-semibold"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => eliminarUsuario(u.id)}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-semibold"
                  >
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
