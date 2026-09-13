// src/components/IshikawaDiagram.jsx
import React, { useState, useEffect } from "react";
import * as htmlToImage from "html-to-image";
import { API_BASE } from '../config/env';

// Geometría del fishbone en un lienzo virtual de 1000x560. Todo el
// posicionamiento (SVG y cajas HTML superpuestas) se calcula como
// porcentaje de este lienzo, así el diagrama escala con el contenedor
// en vez de depender de un canvas de ancho fijo con scroll horizontal.
const CANVAS_W = 1000;
const CANVAS_H = 560;
const SPINE_Y = 280;
const SPINE_X_START = 40;
const SPINE_X_END = 820;
const ATTACH_X = [230, 450, 670];
const TOP_IDS = ["material", "medicion", "entorno"];
const BOTTOM_IDS = ["metodo", "maquina", "manoobra"];

const CATEGORIAS = [
  { id: "material", label: "Material", color: "#22d3ee", icon: "📦" },
  { id: "medicion", label: "Medición", color: "#a78bfa", icon: "📏" },
  { id: "entorno", label: "Entorno", color: "#eab308", icon: "🌎" },
  { id: "metodo", label: "Método", color: "#4ade80", icon: "📋" },
  { id: "maquina", label: "Máquina", color: "#fb923c", icon: "⚙️" },
  { id: "manoobra", label: "Mano de Obra", color: "#fb7185", icon: "👤" },
];

// Punto de la espina donde "nace" cada hueso, y centro de la caja de la
// categoría (siempre a la izquierda del punto de anclaje, para que todos
// los huesos queden paralelos, como en un fishbone real).
function geometriaDe(id) {
  const enTop = TOP_IDS.indexOf(id);
  if (enTop !== -1) {
    const attachX = ATTACH_X[enTop];
    return { attachX, spineY: SPINE_Y, boxX: attachX - 150, boxY: 95 };
  }
  const enBottom = BOTTOM_IDS.indexOf(id);
  const attachX = ATTACH_X[enBottom];
  return { attachX, spineY: SPINE_Y, boxX: attachX - 150, boxY: 465 };
}

const pctX = (x) => `${(x / CANVAS_W) * 100}%`;
const pctY = (y) => `${(y / CANVAS_H) * 100}%`;

export default function IshikawaDiagram({ a3, setA3 }) {
  // ✅ Inicializa desde a3 si ya existe, o crea estructura base
  const [causas, setCausas] = useState(() => {
    if (a3?.causas?.lista) return a3.causas.lista;
    return CATEGORIAS.reduce((acc, cat) => {
      acc[cat.id] = [{ id: 1, texto: "", placeholder: `Causa en ${cat.label}` }];
      return acc;
    }, {});
  });

  // ✅ Sincroniza cuando el A3 cambie (por ejemplo, al cargar desde BD)
  useEffect(() => {
    if (a3?.causas?.lista) {
      setCausas(a3.causas.lista);
    }
  }, [a3.causas?.lista]);

  // ✅ Guarda automáticamente cada cambio en A3 y localStorage
  useEffect(() => {
    setA3((prev) => {
      const copy = structuredClone(prev);
      copy.causas = copy.causas || {};
      copy.causas.lista = causas;
      return copy;
    });
  }, [causas, setA3]);

  const agregarCausa = (catId, label) => {
    setCausas((prev) => ({
      ...prev,
      [catId]: [
        ...prev[catId],
        { id: Date.now(), texto: "", placeholder: `Nueva causa en ${label}` },
      ],
    }));
  };

  const eliminarCausa = (catId, causaId) => {
    setCausas((prev) => ({
      ...prev,
      [catId]: prev[catId].filter((c) => c.id !== causaId),
    }));
  };

  const editarCausa = (catId, causaId, texto) => {
    setCausas((prev) => ({
      ...prev,
      [catId]: prev[catId].map((c) => (c.id === causaId ? { ...c, texto } : c)),
    }));
  };

  const analizarConIA = async () => {
    const resumen = CATEGORIAS
      .map((cat) => `${cat.label}: ${causas[cat.id].map((c) => c.texto).join(", ")}`)
      .join(" | ");
    const problemaUsuario = document.getElementById("problemaTextArea")?.value || "";

    const prompt = `
Analiza este diagrama de Ishikawa (6M).
Problema declarado: ${problemaUsuario}

Categorías y causas:
${resumen}

Entrega:
1) Síntesis del posible problema raíz.
2) Hipótesis de causa principal.
3) Recomendación Lean para validación.
`;

    try {
      const response = await fetch(`${API_BASE}/geminiIA`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine: "gemini", prompt }),
      });

      const data = await response.json();
      const textoIA = data.sugerencia || "No se obtuvo respuesta de la IA.";

      const out = document.getElementById("sugerenciaTextArea");
      if (out) out.value = textoIA;

      // 🖼️ Capturar el diagrama como imagen (solo tiene sentido en desktop,
      // donde se ve el fishbone; en mobile el mismo nodo está oculto con
      // display:none y capturarlo daría una imagen en blanco)
      const esDesktop = window.innerWidth >= 768;
      const node = esDesktop ? document.querySelector(".ishikawa-canvas") : null;
      if (node) {
        node.style.overflow = "visible";

        const dataUrl = await htmlToImage.toPng(node, {
          cacheBust: true,
          pixelRatio: 3,
          backgroundColor: "#0f172a",
        });

        setA3((prev) => {
          const copy = structuredClone(prev);
          copy.causas = copy.causas || {};
          copy.causas.ishikawaIA = textoIA;
          copy.causas.imagenes = [{ name: "ishikawa.png", url: dataUrl }];
          copy.causas.lista = causas;
          return copy;
        });
      } else {
        setA3((prev) => {
          const copy = structuredClone(prev);
          copy.causas = copy.causas || {};
          copy.causas.ishikawaIA = textoIA;
          copy.causas.lista = causas;
          return copy;
        });
      }
    } catch (error) {
      console.error("⚠️ Error al analizar/exportar IA:", error);
      const out = document.getElementById("sugerenciaTextArea");
      if (out) out.value = "Error al analizar con IA.";
    }
  };

  // Lista de causas de una categoría: se reutiliza tanto en la caja
  // flotante del fishbone (desktop) como en la tarjeta apilada (mobile).
  const ListaCausas = ({ cat }) => (
    <div className="flex flex-col gap-1.5 w-full">
      {causas[cat.id]?.map((causa) => (
        <div
          key={causa.id}
          className="flex items-center justify-between bg-white/10 border border-gray-700 rounded-full px-3 py-1 text-xs sm:text-sm text-white shadow-sm"
        >
          <input
            type="text"
            value={causa.texto}
            onChange={(e) => editarCausa(cat.id, causa.id, e.target.value)}
            className="bg-transparent outline-none flex-1 text-white min-w-0"
            placeholder={causa.placeholder}
          />
          <button
            onClick={() => eliminarCausa(cat.id, causa.id)}
            className="ml-2 shrink-0 text-yellow-400 hover:text-red-400"
            title="Eliminar"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={() => agregarCausa(cat.id, cat.label)}
        className="self-center px-3 py-1 bg-gray-700 border border-gray-600 text-xs rounded-full hover:bg-gray-600 transition"
      >
        + causa
      </button>
    </div>
  );

  return (
    <div className="bg-gray-900 text-white rounded-2xl p-4 sm:p-8 shadow-lg relative">
      <h2 className="text-2xl font-bold text-blue-400 mb-2 text-center">
        Diagrama de Ishikawa (6M)
      </h2>
      <p className="text-gray-400 text-sm mb-6 text-center">
        Agrega causas por categoría; todo se guarda automáticamente en tu A3.
      </p>

      {/* 🐟 Fishbone real — solo en pantallas medianas en adelante.
          Un diagrama con huesos diagonales no entra bien en un teléfono,
          así que ahí usamos la lista apilada de más abajo. */}
      <div
        className="ishikawa-canvas relative w-full mx-auto hidden md:block"
        style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, maxWidth: 1100 }}
      >
        <svg
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="ishikawa-arrow"
              markerWidth="12"
              markerHeight="12"
              refX="8"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="#3b82f6" />
            </marker>
          </defs>

          {/* Espina central */}
          <line
            x1={SPINE_X_START}
            y1={SPINE_Y}
            x2={SPINE_X_END}
            y2={SPINE_Y}
            stroke="#3b82f6"
            strokeWidth="4"
            markerEnd="url(#ishikawa-arrow)"
          />

          {/* Huesos: uno por categoría, desde el punto de anclaje en la
              espina hasta el centro de su caja flotante */}
          {CATEGORIAS.map((cat) => {
            const g = geometriaDe(cat.id);
            return (
              <line
                key={cat.id}
                x1={g.attachX}
                y1={g.spineY}
                x2={g.boxX}
                y2={g.boxY}
                stroke={cat.color}
                strokeWidth="2.5"
                opacity="0.85"
              />
            );
          })}
        </svg>

        {/* Cabeza: PROBLEMA / EFECTO */}
        <div
          className="absolute bg-blue-900 border-2 border-blue-400 rounded-xl p-3 shadow-lg flex flex-col"
          style={{
            left: pctX(SPINE_X_END + 10),
            top: pctY(SPINE_Y),
            width: pctX(170),
            transform: "translateY(-50%)",
          }}
        >
          <strong className="text-blue-300 block text-center mb-1 text-sm">
            PROBLEMA / EFECTO
          </strong>
          <textarea
            id="problemaTextArea"
            className="w-full bg-transparent text-white text-xs outline-none resize-none"
            rows="4"
            placeholder="Describe el problema..."
          />
        </div>

        {/* Cajas de categoría, ancladas al extremo de cada hueso */}
        {CATEGORIAS.map((cat) => {
          const g = geometriaDe(cat.id);
          return (
            <div
              key={cat.id}
              className="absolute flex flex-col items-center bg-gray-800/90 border rounded-xl p-2.5 shadow-md hover:border-gray-500 transition"
              style={{
                left: pctX(g.boxX),
                top: pctY(g.boxY),
                width: pctX(230),
                maxHeight: "34%",
                overflowY: "auto",
                transform: "translate(-50%, -50%)",
                borderColor: cat.color + "80",
              }}
            >
              <div
                className="text-xs font-bold mb-1.5 text-center sticky top-0 bg-gray-800/90 backdrop-blur-sm rounded-md py-0.5 w-full flex items-center justify-center gap-1.5"
                style={{ color: cat.color }}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </div>
              <ListaCausas cat={cat} />
            </div>
          );
        })}
      </div>

      {/* 📱 Vista apilada — mobile y pantallas angostas */}
      <div className="md:hidden flex flex-col gap-3">
        <div className="bg-blue-900 border-2 border-blue-400 rounded-xl p-3">
          <strong className="text-blue-300 block text-center mb-1 text-sm">
            PROBLEMA / EFECTO
          </strong>
          <textarea
            id="problemaTextArea-mobile"
            className="w-full bg-transparent text-white text-sm outline-none resize-none"
            rows="3"
            placeholder="Describe el problema..."
            onChange={(e) => {
              const desktop = document.getElementById("problemaTextArea");
              if (desktop) desktop.value = e.target.value;
            }}
          />
        </div>

        {CATEGORIAS.map((cat) => (
          <div
            key={cat.id}
            className="bg-gray-800/90 border rounded-xl p-3"
            style={{ borderColor: cat.color + "80" }}
          >
            <div
              className="text-sm font-bold mb-2 flex items-center gap-2"
              style={{ color: cat.color }}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </div>
            <ListaCausas cat={cat} />
          </div>
        ))}
      </div>

      {/* 📊 Sugerencia IA */}
      <div className="mt-6 bg-indigo-100 border-2 border-indigo-400 rounded-xl p-4 w-full max-w-3xl mx-auto shadow-lg">
        <strong className="text-indigo-700 block text-center mb-2">Sugerencia IA</strong>
        <textarea
          id="sugerenciaTextArea"
          readOnly
          className="w-full bg-transparent text-gray-800 text-sm outline-none resize-none"
          rows="6"
          placeholder="Presiona 'Analizar con IA' para generar una sugerencia..."
          defaultValue={a3?.causas?.ishikawaIA || ""}
        />
      </div>

      <div className="flex justify-center mt-6 mb-4">
        <button
          onClick={analizarConIA}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-md transition"
        >
          Analizar con IA 🤖
        </button>
      </div>
    </div>
  );
}
