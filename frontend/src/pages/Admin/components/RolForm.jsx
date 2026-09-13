// src/pages/Admin/components/RolForm.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from '../../../config/env'; // ✅ limpieza: solo importamos lo necesario

export default function RolForm({ rolEditando, onGuardar, onCancelar }) {
  const token = localStorage.getItem("token");
  const [modulos, setModulos] = useState([]);
  const [rol, setRol] = useState({
    id: rolEditando?.id || null,
    nombre: rolEditando?.nombre || "",
    descripcion: rolEditando?.descripcion || "",
    modulos: [],
  });

  /* ✅ Cargar lista de módulos disponibles */
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

  /* ✅ Cargar módulos ya asignados al rol (si se está editando) */
  const cargarModulosDelRol = async (rolId) => {
    if (!rolId) return;
    try {
      const res = await axios.get(`${API_BASE}/api/roles-modulos/rol/${rolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const activos = res.data.filter((m) => m.activo).map((m) => m.nombre);
      setRol((prev) => ({ ...prev, modulos: activos }));
    } catch (err) {
      console.error("❌ Error obteniendo módulos del rol:", err);
    }
  };

  useEffect(() => {
    cargarModulos();
    if (rolEditando?.id) cargarModulosDelRol(rolEditando.id);
  }, [rolEditando]);

  /* ✅ Toggle de selección */
  const toggleModulo = (nombre) => {
    setRol((prev) => {
      const yaTiene = prev.modulos.includes(nombre);
      return {
        ...prev,
        modulos: yaTiene
          ? prev.modulos.filter((m) => m !== nombre)
          : [...prev.modulos, nombre],
      };
    });
  };

  /* ✅ Guardar rol y relaciones */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Guardar o actualizar el rol
      const rolRes = rol.id
        ? await axios.put(`${API_BASE}/api/roles/${rol.id}`, rol, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await axios.post(`${API_BASE}/api/roles`, rol, {
            headers: { Authorization: `Bearer ${token}` },
          });

      const rolId = rolRes.data.id || rolRes.data.rol?.id;

      // Guardar asignaciones en roles_modulos
      await Promise.all(
        modulos.map(async (m) => {
          const activo = rol.modulos.includes(m.nombre);
          await axios.post(
            `${API_BASE}/api/roles-modulos`,
            {
              rol_id: rolId,
              modulo_id: m.id,
              activo,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        })
      );

      alert("✅ Rol guardado correctamente con sus módulos asignados");
      onGuardar();
    } catch (err) {
      console.error("❌ Error guardando rol:", err);
      alert("⚠️ Error al guardar rol.");
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-md">
      <h2 className="text-lg font-bold text-indigo-400 mb-4">
        {rol.id ? "✏️ Editar Rol" : "➕ Crear Nuevo Rol"}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Nombre del rol"
          value={rol.nombre}
          onChange={(e) => setRol({ ...rol, nombre: e.target.value })}
          className="bg-gray-700 p-2 rounded text-white"
          required
        />
        <textarea
          placeholder="Descripción"
          value={rol.descripcion}
          onChange={(e) => setRol({ ...rol, descripcion: e.target.value })}
          className="bg-gray-700 p-2 rounded text-white"
          rows={2}
        />

        <h3 className="text-indigo-300 mt-2">Módulos permitidos:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {modulos.map((m) => (
            <label
              key={m.id}
              className={`cursor-pointer px-3 py-2 rounded border ${
                rol.modulos.includes(m.nombre)
                  ? "bg-indigo-600 text-white border-indigo-400"
                  : "bg-gray-700 text-gray-300 border-gray-600"
              } hover:border-indigo-400 transition`}
            >
              <input
                type="checkbox"
                checked={rol.modulos.includes(m.nombre)}
                onChange={() => toggleModulo(m.nombre)}
                className="mr-2 accent-indigo-500"
              />
              {m.nombre}
              <span className="block text-xs text-gray-400 italic">{m.tipo}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onCancelar}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold"
          >
            Guardar Rol
          </button>
        </div>
      </form>
    </div>
  );
}
