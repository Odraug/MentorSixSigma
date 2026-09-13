// src/components/A3Pdf.jsx
import React, { useRef } from "react";
import html2pdf from "html2pdf.js";
import { defaultA3 } from "../../constants/a3Defaults";

export default function A3Pdf({ a3 }) {
  const contentRef = useRef();

  const generatePDF = async () => {
    const element = contentRef.current;
    await new Promise((resolve) => setTimeout(resolve, 500)); // Espera carga de imágenes

    const opt = {
      margin: 0.2,
      filename: `${a3?.meta?.titulo || "A3_Report"}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 3, useCORS: true },
      jsPDF: { unit: "mm", format: "a3", orientation: "landscape" },
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      {/* HEADER FIJO */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-400">Reporte Formato A3</h1>
        <button
          onClick={generatePDF}
          className="bg-pink-600 px-4 py-2 rounded hover:bg-pink-700"
        >
          📄 Generar PDF
        </button>
      </div>

      {/* CONTENIDO PDF */}
      <div
        ref={contentRef}
        id="a3-pdf"
        className="bg-white text-black p-4 rounded shadow-md text-sm grid grid-cols-2 gap-2 border border-gray-400"
        style={{
          gridTemplateRows: "auto 1fr 1fr", // Mantiene proporciones 2x2
        }}
      >
        {/* CABECERA */}
        <div className="col-span-2 border-b border-gray-400 pb-2 mb-2">
          <div className="flex justify-between">
            <div>
              <h2 className="font-bold text-lg text-green-700">
                A3 - Resolución estructural del problema
              </h2>
              <p>
                Equipo de Proyecto: {a3.meta?.autor || "Integrantes del equipo"}
              </p>
            </div>
            <div className="text-right">
              <p>
                <strong>Título:</strong> {a3.meta?.titulo || "Sin título"}
              </p>
              <p>
                <strong>Fecha:</strong> {a3.meta?.fecha || "Sin fecha"}
              </p>
            </div>
          </div>
        </div>

        {/* SECCIÓN A */}
        <section className="border border-gray-300 p-2">
          <h3 className="font-bold text-green-700">
            A. Descripción del problema / Condición actual / Acciones de
            contención
          </h3>
          <p><strong>Descripción del problema:</strong></p>
          <p>{a3.problema?.descripcion || "Sin descripción."}</p>
          <p><strong>Condición actual:</strong></p>
          <p>{a3.problema?.condicionActual || "Sin condición."}</p>
          <p><strong>Acciones de contención:</strong></p>
          <p>{a3.problema?.accionesContencion || "No indicadas."}</p>

          {/* Resumen 5W2H */}
          {a3?.analisis5W2H?.resumen && (
            <div className="mt-3 border-t border-gray-300 pt-2">
              <p className="font-semibold text-gray-800 mb-1">
                Resumen lectura 5W2H (IA / manual):
              </p>
              <p className="text-sm leading-snug text-gray-700">
                {a3.analisis5W2H.resumen}
              </p>
            </div>
          )}

          {Array.isArray(a3.problema?.imagenes) &&
            a3.problema.imagenes.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {a3.problema.imagenes.map((img, idx) => (
                  <img
                    key={idx}
                    src={img.url}
                    alt={img.name}
                    className="border border-gray-400 rounded max-h-28 object-contain"
                  />
                ))}
              </div>
            )}

{/* Indicador de Cumplimiento tipo gauge semicircular */}
{(a3.objetivo?.meta || a3.objetivo?.cumplimiento) && (() => {
  const meta = Number(a3.objetivo?.meta) || 0;
  const actual = Number(a3.objetivo?.cumplimiento) || 0;
  const brecha = Math.max(meta - actual, 0);

  const radius = 60;
  const cx = 100, cy = 100;

  // Cálculo de ángulos
  const angleActual = (actual / 100) * 180;
  const angleMeta = (meta / 100) * 180;

  const polarToCartesian = (cx, cy, r, angle) => ({
    x: cx - r * Math.cos((angle * Math.PI) / 180),
    y: cy - r * Math.sin((angle * Math.PI) / 180),
  });

  const start = polarToCartesian(cx, cy, radius, 0);
  const endActual = polarToCartesian(cx, cy, radius, angleActual);
  const endMeta = polarToCartesian(cx, cy, radius, angleMeta);

  return (
        <div className="mt-6 text-center">
      {/* 🔹 Título centrado arriba */}
      <p className="font-semibold text-gray-800 mb-3 text-lg">
        Cumplimiento Actual vs Meta
      </p>


    <div className="flex flex-col md:flex-row items-center justify-center mt-4 gap-6">
      {/* Panel de valores */}
      <div className="text-sm text-gray-800 space-y-1 text-left">
        <p>Meta: <strong>{meta}%</strong></p>
        <p>Cumplimiento Actual: <strong>{actual}%</strong></p>
        <p>Brecha: <strong>{brecha.toFixed(1)}%</strong></p>
      </div>

      {/* Gráfico tipo gauge */}
      <div className="text-center">
        <svg viewBox="0 0 200 110" className="w-60 mx-auto">
          {/* Fondo gris */}
          <path
            d={`M ${start.x},${start.y} A ${radius},${radius} 0 1,1 ${cx + radius},${cy}`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="10"
          />

          {/* Arco de cumplimiento actual */}
          <path
            d={`M ${start.x},${start.y} A ${radius},${radius} 0 ${angleActual > 180 ? 1 : 0},1 ${endActual.x},${endActual.y}`}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Arco de brecha */}
          {brecha > 0 && (
            <path
              d={`M ${endActual.x},${endActual.y} A ${radius},${radius} 0 0,1 ${endMeta.x},${endMeta.y}`}
              fill="none"
              stroke="#EF4444"
              strokeWidth="10"
              strokeLinecap="round"
            />
          )}

          {/* Línea punteada verde de meta */}
          <line
            x1={cx}
            y1={cy}
            x2={endMeta.x}
            y2={endMeta.y}
            stroke="#16A34A"
            strokeWidth="2"
            strokeDasharray="4 2"
          />

          {/* Texto del porcentaje actual */}
          <text
            x={cx}
            y={cy - 10}
            textAnchor="middle"
            fontSize="22"
            fontWeight="bold"
            fill="#111"
          >
            {actual.toFixed(1)}%
          </text>

          {/* Etiquetas de 0% y 100% */}
          <text x={cx - radius} y={cy + 10} textAnchor="middle" fontSize="10">0%</text>
          <text x={cx + radius} y={cy + 10} textAnchor="middle" fontSize="10">100%</text>
        </svg>

        {/* Leyenda inferior */}
        <div className="flex justify-center items-center gap-4 text-xs mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-600"></div> Meta
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500"></div> Actual
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500"></div> Brecha
          </div>
        </div>
      </div>
    </div>
    </div>
  );
})()}
        </section>

{/* SECCIÓN B */}
<section className="border border-gray-300 p-3 rounded">
  <h3 className="font-bold text-purple-700 mb-1">
    B. Encontrar causa raíz (Diagrama Ishikawa)
  </h3>
  <p className="text-sm mb-2 text-gray-800">
    <strong>Identifica las causas según su origen:</strong>
  </p>

  {/* 🔹 Texto general del problema o redacción */}


  {/* 🔹 Imagen del diagrama Ishikawa (si existe) */}
  {Array.isArray(a3.causas?.imagenes) && a3.causas.imagenes.length > 0 ? (
    <div className="flex flex-wrap justify-center gap-3 mt-3">
      {a3.causas.imagenes.map((img, idx) => (
        <div key={idx} className="flex flex-col items-center">
<img
  src={img.url}
  alt={img.name}
  style={{
    display: "block",
    maxWidth: "700px",
    width: "100%",
    height: "auto",
    border: "1px solid #ccc",
    borderRadius: "8px",
    objectFit: "contain",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  }}
/>
          <p className="text-xs text-gray-600 mt-1">{img.name}</p>
        </div>
      ))}
    </div>
  ) : (
    <p className="italic text-gray-500 text-sm mt-2">
      No se ha generado el diagrama Ishikawa aún.
    </p>
  )}
</section>



        {/* SECTION C */}
        <section
          className="border border-gray-300 p-2 flex flex-col justify-between"
          style={{
            minHeight: "240px",
            maxHeight: "260px",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <div style={{ flex: 1, overflow: "hidden" }}>
            <h3 className="font-bold text-red-700 mb-2">
              C. Resolver problema / contramedidas
            </h3>

            <div
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {a3.acciones && a3.acciones.length > 0 ? (
                <table
                  className="w-full border-collapse border border-gray-400 text-xs"
                  style={{ tableLayout: "fixed" }}
                >
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-1">Acción</th>
                      <th className="border p-1">Responsable</th>
                      <th className="border p-1">Fecha</th>
                      <th className="border p-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a3.acciones.map((row, idx) => (
                      <tr key={idx}>
                        <td className="border p-1">{row.accion}</td>
                        <td className="border p-1">{row.responsable}</td>
                        <td className="border p-1">{row.fecha}</td>
                        <td className="border p-1">{row.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No hay acciones correctivas.</p>
              )}
            </div>
          </div>

          {Array.isArray(a3.contramedidas?.imagenes) &&
            a3.contramedidas.imagenes.length > 0 && (
              <div
                style={{
                  marginTop: "6px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px",
                  justifyContent: "flex-start",
                }}
              >
                {a3.contramedidas.imagenes.map((img, i) => (
                  <img
                    key={i}
                    src={img.url}
                    alt={img.name}
                    style={{
                      width: "200px",
                      height: "100px",
                      objectFit: "contain",
                      border: "2px solid #ccc",
                      borderRadius: "4px",
                    }}
                  />
                ))}
              </div>
            )}
        </section>


        {/* SECCIÓN D */}
        <section className="border border-gray-300 p-2">
          <h3 className="font-bold text-teal-700">
            D. Validar solución y estandarizar
          </h3>
          {a3.objetivo?.resultadoFinal && (
            <p>
              <strong>Resultado final vs. meta:</strong>{" "}
              {a3.objetivo.resultadoFinal}% (meta: {a3.objetivo?.meta || "—"}%)
            </p>
          )}

          <p><strong>Resultados:</strong></p>
          <p>{a3.seguimiento?.resultados || "Sin resultados."}</p>

          {Array.isArray(a3.estandarizacion) && a3.estandarizacion.length > 0 && (
            <>
              <p><strong>Checklist de estandarización:</strong></p>
              <ul className="list-disc ml-5">
                {a3.estandarizacion.map((item) => (
                  <li key={item.id}>
                    {item.hecha ? "✅" : "⬜"} {item.texto || "(sin descripción)"}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p><strong>Lecciones aprendidas:</strong></p>
          <p>{a3.lecciones || "Sin lecciones registradas."}</p>

          {Array.isArray(a3.seguimiento?.imagenes) &&
            a3.seguimiento.imagenes.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {a3.seguimiento.imagenes.map((img, idx) => (
                  <img
                    key={idx}
                    src={img.url}
                    alt={img.name}
                    className="border border-gray-400 rounded max-h-28 object-contain"
                  />
                ))}
              </div>
            )}
        </section>
{/* BLOQUE ADICIONAL - ANÁLISIS IA Y EXTRAS */}
{(a3?.analisisIA || a3?.ishikawaIA) && (
  <section className="col-span-2 border border-gray-400 p-3 mt-3 rounded">
    <h3 className="font-bold text-indigo-700 mb-2">
      🧠 Análisis IA y Comentarios Adicionales
    </h3>

    {/* IA - Resumen / sugerencias del problema */}
    {a3.analisisIA && (
      <div className="mb-3">
        <p className="font-semibold text-gray-800">Sugerencias IA (Sección A):</p>
        <p className="text-sm text-gray-700 whitespace-pre-line">
          {a3.analisisIA}
        </p>
      </div>
    )}

    {/* IA - Análisis Ishikawa */}
    {a3.ishikawaIA && (
      <div className="mb-3">
        <p className="font-semibold text-gray-800">
          Análisis IA del Diagrama Ishikawa (Sección B):
        </p>
        <p className="text-sm text-gray-700 whitespace-pre-line">
          {a3.ishikawaIA}
        </p>
      </div>
    )}

    {/* Otros análisis o comentarios IA */}
    {a3.extraIA && (
      <div className="mb-2">
        <p className="font-semibold text-gray-800">Otros análisis IA:</p>
        <p className="text-sm text-gray-700 whitespace-pre-line">
          {a3.extraIA}
        </p>
      </div>
    )}
  </section>
)}

{(a3?.analisis5W2H?.resumenIA || a3?.causas?.ishikawaIA) && (
  <section className="col-span-2 border border-gray-400 p-5 mt-6 rounded bg-gray-50">
    <h3 className="font-bold text-indigo-700 mb-3 text-lg">
      🧠 Análisis IA — Sección A (5W2H) y Sección B (Ishikawa)
    </h3>

    {a3?.analisis5W2H?.resumenIA && (
      <>
        <p className="font-semibold text-gray-800 mb-1">Sección A — 5W2H:</p>
        <p className="text-sm text-gray-700 whitespace-pre-line leading-snug mb-4">
          {a3.analisis5W2H.resumenIA}
        </p>
      </>
    )}

    {a3?.causas?.ishikawaIA && (
      <>
        <p className="font-semibold text-gray-800 mb-1">Sección B — Ishikawa:</p>
        <p className="text-sm text-gray-700 whitespace-pre-line leading-snug">
          {a3.causas.ishikawaIA}
        </p>
      </>
    )}
  </section>
)}



        
      </div>
    </div>
  );
}
