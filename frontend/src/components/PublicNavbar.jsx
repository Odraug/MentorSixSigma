// ============================================================
// 📌 PublicNavbar.jsx
// 🚀 Navbar para páginas públicas (Landing, Login, Register)
// ============================================================

import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function PublicNavbar() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-end h-16 px-10 bg-gray-900/95 backdrop-blur-sm text-white shadow-lg border-b border-gray-700">

      {/* Botón "Iniciar sesión" */}
      {pathname !== "/login" && (
        <Link
          to="/login"
          className="px-5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 transition shadow-md text-sm font-medium"
        >
          Iniciar sesión
        </Link>
      )}

    </nav>
  );
}
