// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "react-phone-input-2/lib/style.css";
import PhoneInput from "react-phone-input-2";
import logoprincipal from "../img/logoppl2.png";
import { API_BASE } from '../config/env';

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    empresa: "",
    tipoUsuario: "",
    correo: "",
    telefono: "",
    mensaje: "",
  });

  const [dialCode, setDialCode] = useState("+56"); // Prefijo país (por defecto Chile)
  const [phone, setPhone] = useState(""); // Número local sin prefijo
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // 🔹 Manejo de cambios en campos normales
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    const telefonoE164 = `${dialCode}${String(phone).replace(/\D/g, "")}`; // +569XXXXXXX

    if (
      !formData.nombre.trim() ||
      !formData.apellido.trim() ||
      !formData.correo.trim() ||
      !formData.mensaje.trim() ||
      !telefonoE164
    ) {
      alert("Por favor completa todos los campos obligatorios.");
      return;
    }

    const payload = {
      ...formData,
      telefono: telefonoE164,
    };

try {
  setEnviando(true);

  await axios.post(`${API_BASE}/contacto/enviar`, payload);

  setEnviado(true);
  setFormData({
    nombre: "",
    apellido: "",
    empresa: "",
    tipoUsuario: "",
    correo: "",
    telefono: "",
    mensaje: "",
  });
  setPhone("");
} catch (error) {
  console.error("❌ Error al enviar:", error);
  alert("Error al enviar el mensaje. Intenta nuevamente.");
} finally {
  setEnviando(false);
}


  return (
    <div className="max-w-xl mx-auto p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-transparent rounded-lg mt-8 text-gray-900 dark:text-white shadow-lg">
      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <img
          src={logoprincipal}
          alt="Logo MentorSuites"
          className="h-20 w-auto mb-2 dark:brightness-200 cursor-pointer"
          onClick={() => navigate("/")}
        />
      </div>

      <h1 className="text-3xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">Contáctanos</h1>

      {enviado ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-green-600 text-white text-center p-4 rounded-lg font-semibold">
            ✅ Uno de nuestros asesores se contactará con usted lo más pronto posible.
          </div>
          <button
            onClick={() => navigate("/")}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Volver al inicio
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block mb-1">Nombre:</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Apellido */}
          <div>
            <label className="block mb-1">Apellido:</label>
            <input
              type="text"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Empresa */}
          <div>
            <label className="block mb-1">Nombre de Empresa:</label>
            <input
              type="text"
              name="empresa"
              value={formData.empresa}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Tipo de usuario */}
          <div>
            <label className="block mb-1">Tipo de usuario:</label>
            <select
              name="tipoUsuario"
              value={formData.tipoUsuario}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecciona...</option>
              <option value="Empresa">Empresa</option>
              <option value="Consultor">Consultor</option>
              <option value="Estudiante">Estudiante</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Correo */}
          <div>
            <label className="block mb-1">Correo electrónico:</label>
            <input
              type="email"
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="correo@empresa.com"
              required
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block mb-1">Teléfono de contacto:</label>
            <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
              <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg px-2 py-1">
                <PhoneInput
                  country={"cl"}
                  value=""
                  onChange={(val, country) => setDialCode(`+${country.dialCode}`)}
                  enableSearch
                  disableDropdown={false}
                  disableCountryCode={true}
                  countryCodeEditable={false}
                  inputStyle={{
                    width: "0px",
                    border: "none",
                    backgroundColor: "transparent",
                  }}
                  buttonStyle={{
                    backgroundColor: "transparent",
                    border: "none",
                    marginRight: "6px",
                  }}
                  dropdownStyle={{
                    backgroundColor: "#1f2937",
                    color: "white",
                  }}
                />
                <span className="text-gray-900 dark:text-white text-sm font-semibold">{dialCode}</span>
              </div>

              <input
                type="text"
                name="telefono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 p-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                placeholder="X XXXX XXXX"
                required
              />
            </div>
          </div>

          {/* Mensaje */}
          <div>
            <label className="block mb-1">Mensaje:</label>
            <textarea
              name="mensaje"
              value={formData.mensaje}
              onChange={handleChange}
              rows="4"
              className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Cuéntanos brevemente en qué podemos ayudarte..."
              required
            />
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <button
              type="submit"
              disabled={enviando}
              className={`w-full sm:w-auto py-2 px-6 rounded transition text-white ${
                enviando
                  ? "bg-gray-400 dark:bg-gray-500 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {enviando ? "Enviando..." : "Enviar mensaje"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full sm:w-auto bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white py-2 px-6 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition"
            >
              Volver al inicio
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
}

export default Register;
