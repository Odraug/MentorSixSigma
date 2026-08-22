import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoprincipal from "../img/Logo_Login.png";
import { API_BASE } from "../config/env";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    empresa: "",
  });

  const [empresas, setEmpresas] = useState([]);
  const [error, setError] = useState("");
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const buscarEmpresas = async () => {
    if (!formData.email) return;

    try {
      setLoadingEmpresas(true);
      setEmpresas([]);
      setFormData((prev) => ({ ...prev, empresa: "" }));

      const emailEncoded = encodeURIComponent(formData.email.trim());
      const url = `${API_BASE}/api/usuarios/empresas/${emailEncoded}`;

      const res = await fetch(url);

      if (!res.ok) {
        setEmpresas([]);
        return;
      }

      const data = await res.json();
      setEmpresas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando empresas:", err);
      setEmpresas([]);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.empresa) {
      setError("Debes seleccionar una empresa");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.usuario, data.token, formData.empresa);

        localStorage.setItem("empresaId", formData.empresa);

        const rol = data.usuario.rol?.toLowerCase().replace(/\s+/g, "");

        if (rol === "superadmin") {
          navigate("/admin/dashboard", { replace: true });
        } else {
          navigate("/inicio", { replace: true });
        }
      } else {
        setError(data.message || "Credenciales inválidas");
      }
    } catch (err) {
      console.error("Error al conectar:", err);
      setError("Error de conexión con el servidor");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img
            src={logoprincipal}
            alt="Logo MentorSuites"
            className="h-24 w-auto mb-2 cursor-pointer"
            onClick={() => navigate("/")}
          />
          <h2 className="text-3xl font-bold text-indigo-400">Iniciar sesión</h2>
          <p className="text-gray-400 text-sm">Bienvenido a MentorSuites</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={buscarEmpresas}
            className="w-full p-3 rounded bg-gray-700 text-white"
            placeholder="ejemplo@correo.com"
            required
          />

          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-3 rounded bg-gray-700 text-white"
            placeholder="••••••••"
            required
          />

          <select
            name="empresa"
            value={formData.empresa}
            onChange={handleChange}
            className="w-full p-3 rounded bg-gray-700 text-white"
            required
          >
            <option value="">
              {loadingEmpresas ? "Cargando empresas..." : "Selecciona empresa..."}
            </option>

            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}

            {!loadingEmpresas && empresas.length === 0 && (
              <option value="" disabled>
                Sin empresas asociadas
              </option>
            )}
          </select>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
}