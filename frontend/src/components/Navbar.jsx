// src/components/Navbar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import logoprincipal from "../img/Logo_Login_transparent.png";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  // 🔹 Logout
  const handleLogout = () => {
    if (window.confirm("¿Deseas cerrar sesión?")) {
      logout();
      navigate("/", { replace: true });
    }
  };

  // 🔹 Insignia de rol (los accesos de administración viven en el bloque ADMIN de Inicio)
  const renderRolBadge = () => {
    if (!usuario) return null;

    switch (usuario.rol) {
      case "SuperAdmin":
        return (
          <span className="text-xs text-yellow-400 font-semibold">🔐 SuperAdmin</span>
        );
      case "AdminEmpresa":
        return (
          <span className="text-xs text-blue-300 font-semibold">👔 Admin</span>
        );
      default:
        return null;
    }
  };

  return (
    <nav className="flex justify-between items-center p-4 bg-gray-800 shadow-lg text-white">

      {/* LOGO */}
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => navigate("/inicio")}
      >
        <img
          src={logoprincipal}
          alt="MentorSuites"
          className="h-14 w-auto"
        />
      </div>

      {/* USUARIO */}
      <div className="flex items-center gap-3 ml-auto">
        {usuario ? (
          <>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 bg-gray-700 px-3 py-1 rounded-md">
                <span className="text-green-400 text-sm">🟢 En línea</span>
                <span className="text-gray-300 font-medium text-sm truncate max-w-[150px]">
                  {usuario.email}
                </span>
              </div>
              {renderRolBadge()}
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              Salir
            </button>
          </>
        ) : (
          <span className="text-sm text-gray-400">🔴 Desconectado</span>
        )}
      </div>

    </nav>
  );
}
