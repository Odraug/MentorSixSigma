import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { HiOutlineSquares2X2, HiOutlineArrowRight } from "react-icons/hi2";
import { API_BASE } from "../config/env";
import iconA3 from "../img/modulos/icon-a3.png";
import icon5s from "../img/modulos/icon-5s.png";
import iconGemba from "../img/modulos/icon-gemba.png";
import iconVsm from "../img/modulos/icon-vsm.png";
import iconSipoc from "../img/modulos/icon-sipoc.png";
import iconOee from "../img/modulos/icon-oee.png";
import iconDashboard from "../img/modulos/icon-dashboard.png";
import iconTmsCargas from "../img/modulos/icon-tms-cargas.png";
import iconTmsFlota from "../img/modulos/icon-tms-flota.png";
import iconYard from "../img/modulos/icon-yard.png";
import iconLayout from "../img/modulos/icon-layout.png";

// Iconos propios de MentorSuites por nombre de módulo; el resto usa un ícono genérico.
const ICONOS_POR_MODULO = {
  "5s": icon5s,
  "a3": iconA3,
  "gemba walk": iconGemba,
  "vsm": iconVsm,
  "sipoc": iconSipoc,
  "oee": iconOee,
  "ooe": iconOee,
  "teep": iconOee,
  "kpi": iconDashboard,
  "drp": iconDashboard,
  "tms - cargas y despacho": iconTmsCargas,
  "tms - flota y transportistas": iconTmsFlota,
  "yard management": iconYard,
  "diseñador de layout": iconLayout,
  "disenador de layout": iconLayout,
};

const quitarAcentos = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const getIconoModulo = (nombre = "") => {
  const clave = nombre.trim().toLowerCase();
  return ICONOS_POR_MODULO[clave] || ICONOS_POR_MODULO[quitarAcentos(clave)];
};

export default function Inicio() {
  const navigate = useNavigate();
  const [modulos, setModulos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/api/modulos/roles-modulos/permitidos/usuario`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setModulos(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    };

    if (token) {
      load();
    } else {
      setCargando(false);
    }
  }, [token]);

  const grupos = [...new Set(modulos.map((m) => m.categoria))];

  return (
    <div className="min-h-screen bg-gray-900 text-white px-6 sm:px-10 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-indigo-400 mb-3">
          Plataforma Operacional Integrada
        </h1>
        <div className="mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-green-400 mb-4" />
        
      </div>

      {cargando && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <div className="h-10 w-10 rounded-full border-2 border-gray-700 border-t-indigo-400 animate-spin mb-4" />
          <p>Cargando tus módulos...</p>
        </div>
      )}

      {!cargando && modulos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
          <HiOutlineSquares2X2 className="h-12 w-12 mb-4 text-gray-600" />
          <p className="text-lg font-medium text-gray-300">
            Todavía no tenés módulos asignados
          </p>
          <p className="text-sm mt-1">
            Pedile a un administrador que te habilite acceso desde Roles.
          </p>
        </div>
      )}

      {!cargando &&
        grupos.map((grupo) => (
          <div key={grupo} className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-blue-500 to-green-400" />
              <h2 className="text-xl font-bold text-indigo-300 tracking-wide">
                {grupo}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {modulos
                .filter((m) => m.categoria === grupo)
                .map((m) => {
                  const icono = getIconoModulo(m.nombre);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => navigate(m.ruta)}
                      className="group relative text-left bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-700 hover:border-cyan-500/50 hover:bg-gray-700/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300"
                    >
                      <div className="flex flex-col items-center text-center gap-3">
                        {icono ? (
                          <img
                            src={icono}
                            alt=""
                            className="h-16 w-16 group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-cyan-400 to-green-400 text-xl font-bold text-white shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform duration-300">
                            {m.nombre?.trim().charAt(0).toUpperCase() || "?"}
                          </div>
                        )}

                        <h3 className="text-base font-semibold text-white">
                          {m.nombre}
                        </h3>

                        <span className="flex items-center gap-1 text-xs font-medium text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          Abrir módulo
                          <HiOutlineArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
    </div>
  );
}
