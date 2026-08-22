// ============================================================
// 📌 PublicNavbar.jsx
// 🚀 Navbar para páginas públicas (Landing, Login, Register)
// ============================================================

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { HiOutlineSun, HiOutlineMoon } from "react-icons/hi2";
import { useTheme } from "../context/ThemeContext.jsx";

export default function PublicNavbar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-end gap-3 h-16 px-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm text-gray-900 dark:text-white shadow-lg border-b border-gray-200 dark:border-gray-700">

      {/* Botón cambio de tema */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
        className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      >
        {theme === "dark" ? (
          <HiOutlineSun className="h-5 w-5" />
        ) : (
          <HiOutlineMoon className="h-5 w-5" />
        )}
      </button>

      {/* Botón "Iniciar sesión" */}
      {pathname !== "/login" && (
        <Link
          to="/login"
          className="px-5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-md text-sm font-medium"
        >
          Iniciar sesión
        </Link>
      )}

    </nav>
  );
}
