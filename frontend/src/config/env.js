// src/config/env.js

// 🔹 Backend en Render (producción)
const PROD_API = "https://mentorsuites-backend-a1uc.onrender.com";

// 🔹 Backend local (desarrollo)
const DEV_API = "http://localhost:5000";

let API_BASE;

// Detectamos dónde estamos corriendo
if (typeof window !== "undefined") {
  const host = window.location.hostname;

  // Si estoy en localhost → uso backend local
  if (host === "localhost" || host === "127.0.0.1") {
    API_BASE = DEV_API;
  } else {
    // Cualquier otra cosa (vercel.app, mentorsuites.com, etc.) → Render
    API_BASE = PROD_API;
  }
} else {
  // SSR / tests → asumimos desarrollo
  API_BASE = DEV_API;
}

export { API_BASE };

console.log("🌐 API_BASE:", API_BASE);
