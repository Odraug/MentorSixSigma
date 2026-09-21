// src/components/UpdateBanner.jsx
//
// Avisa cuando hay una versión nueva desplegada mientras la pestaña seguía
// abierta con la versión vieja (algo que ya pasó varias veces: el usuario
// navega dentro de la SPA con JS viejo en memoria y cae a rutas que ese JS
// todavía no conoce). No usa service worker -- compara el nombre del
// archivo main.[hash].js que está corriendo contra el que sirve el
// servidor ahora mismo.
import React, { useEffect, useRef, useState } from "react";

const INTERVALO_MS = 2 * 60 * 1000; // 2 minutos

const extraerBundle = (texto) => {
  const match = texto.match(/static\/js\/main\.[a-z0-9]+\.js/i);
  return match ? match[0] : null;
};

export default function UpdateBanner() {
  const [hayVersionNueva, setHayVersionNueva] = useState(false);
  const bundleActualRef = useRef(null);

  useEffect(() => {
    // El bundle que está corriendo ahora mismo ya está en el DOM: lo leemos
    // del propio <script>, no hace falta pedirlo.
    const scriptActual = document.querySelector('script[src*="/static/js/main."]');
    bundleActualRef.current = scriptActual ? extraerBundle(scriptActual.src) : null;

    const chequear = async () => {
      if (!bundleActualRef.current || hayVersionNueva) return;
      try {
        const resp = await fetch("/", { cache: "no-store" });
        const html = await resp.text();
        const bundleServidor = extraerBundle(html);
        if (bundleServidor && bundleServidor !== bundleActualRef.current) {
          setHayVersionNueva(true);
        }
      } catch {
        // Si falla el chequeo (sin conexión, etc.) no molestamos al usuario.
      }
    };

    const intervalo = setInterval(chequear, INTERVALO_MS);

    // Chequeo extra al volver a la pestaña -- suele detectar el caso real
    // (dejaste la pestaña abierta, volviste más tarde) más rápido que
    // esperar al próximo tick del intervalo.
    const alVolverVisible = () => {
      if (document.visibilityState === "visible") chequear();
    };
    document.addEventListener("visibilitychange", alVolverVisible);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolverVisible);
    };
  }, []);

  if (!hayVersionNueva) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-indigo-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 max-w-xs">
      <span className="text-sm">🔄 Hay una versión nueva disponible.</span>
      <button
        onClick={() => window.location.reload()}
        className="bg-white text-indigo-700 text-sm font-semibold px-3 py-1.5 rounded hover:bg-gray-100 shrink-0"
      >
        Actualizar
      </button>
    </div>
  );
}
