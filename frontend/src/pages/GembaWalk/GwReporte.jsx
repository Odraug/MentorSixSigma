// src/pages/GembaWalk/GwReporte.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiGet } from "../../utils/api";

export default function GwReporte() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [observaciones, setObservaciones] = useState([]);
  const [generando, setGenerando] = useState(false);
  // true cuando el reporte se arma con el respaldo local porque no se pudo
  // confirmar contra el servidor — el PDF podría no reflejar lo último guardado.
  const [fuenteLocal, setFuenteLocal] = useState(false);

  useEffect(() => {
    const idStr = localStorage.getItem("gembaIdActual");
    const idNum = idStr ? Number(idStr) : null;

    if (!idNum) {
      console.warn("No se encontró gembaIdActual para el reporte");
      setFuenteLocal(true);
      const savedPlan = localStorage.getItem("gembaPlan");
      if (savedPlan) setPlan(JSON.parse(savedPlan));
      const savedObs = localStorage.getItem("gembaEjecucion");
      if (savedObs) setObservaciones(JSON.parse(savedObs));
      return;
    }

    (async () => {
      try {
        const resp = await apiGet(`/gemba/${idNum}`);

        if (!resp.ok || !resp.gemba) {
          console.error("Error API obtener gemba:", resp);
          setFuenteLocal(true);
          const savedPlan = localStorage.getItem("gembaPlan");
          if (savedPlan) setPlan(JSON.parse(savedPlan));
          const savedObs = localStorage.getItem("gembaEjecucion");
          if (savedObs) setObservaciones(JSON.parse(savedObs));
          return;
        }

        const d = resp.gemba;

        setPlan({
          id: d.id,
          area: d.area,
          fecha: d.fecha,
          responsable: d.responsable,
          proposito: d.proposito,
          participantes: d.participantes || [],
        });

        setObservaciones(
          (d.observaciones || []).map((o) => ({
            id: o.id,
            tipo: o.tipo || "hallazgo",
            descripcion: o.descripcion || "",
            responsable: o.responsable || "",
            accionDerivada: o.accion_derivada,
            evidencias: o.evidencias || [],
          }))
        );
      } catch (err) {
        console.error("❌ Error cargando gemba en reporte:", err);
        const savedPlan = localStorage.getItem("gembaPlan");
        if (savedPlan) setPlan(JSON.parse(savedPlan));
        const savedObs = localStorage.getItem("gembaEjecucion");
        if (savedObs) setObservaciones(JSON.parse(savedObs));
      }
    })();
  }, []);

  // === Evidencias en PDF agrupadas por observación ===
  const agregarEvidenciasPorObservacion = async (doc, obsLista) => {
    if (!obsLista || !obsLista.length) return;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 14;
    const marginRight = 14;
    const maxTextWidth = pageWidth - marginLeft - marginRight;

    let y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 80;

    doc.setFontSize(14);
    doc.text("Evidencias por observación", marginLeft, y);
    y += 8;

    const imgSize = 30;

    for (let idx = 0; idx < obsLista.length; idx++) {
      const obs = obsLista[idx];
      if (!obs.evidencias || !obs.evidencias.length) continue;

      if (y + imgSize + 20 > pageHeight) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(11);
      const tituloTipo =
        obs.tipo === "buena"
          ? "Buena práctica"
          : obs.tipo === "hallazgo"
          ? "Hallazgo"
          : "Acción inmediata";

      const textoDesc = obs.descripcion || "";
      const linea = `Obs ${idx + 1}: ${tituloTipo} – ${textoDesc}`;
      const lineas = doc.splitTextToSize(linea, maxTextWidth);

      doc.text(lineas, marginLeft, y);
      y += 6 * lineas.length;

      let x = marginLeft;

      const cargarImagen = (img) =>
        new Promise((resolve) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.src = img.url;

          image.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);
            const data = canvas.toDataURL("image/jpeg");

            doc.addImage(data, "JPEG", x, y, imgSize, imgSize);
            x += imgSize + 6;
            if (x + imgSize > pageWidth - marginRight) {
              x = marginLeft;
              y += imgSize + 6;
            }
            resolve();
          };

          image.onerror = () => {
            console.warn("No se pudo cargar evidencia", img);
            resolve();
          };
        });

      for (const img of obs.evidencias) {
        if (y + imgSize + 20 > pageHeight) {
          doc.addPage();
          y = 20;
        }
        // eslint-disable-next-line no-await-in-loop
        await cargarImagen(img);
      }

      y += imgSize + 6;
    }
  };

  // === Generar PDF ===
  const generarPDF = async () => {
    if (!plan || generando) return;
    setGenerando(true);

    const doc = new jsPDF();
    const fechaHoy = new Date().toLocaleDateString("es-CL");

    // Usamos fuente estándar que soporta tildes razonablemente bien
    doc.setFont("helvetica", "normal");

    // --- Encabezado ---
    doc.setFontSize(18);
    doc.setTextColor(33, 37, 41);
    doc.text("Reporte Gemba Walk", 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Fecha del reporte: ${fechaHoy}`, 14, 28);
    doc.text(`Área / Planta: ${plan.area || "-"}`, 14, 34);
    doc.text(`Responsable: ${plan.responsable || "-"}`, 14, 40);
    doc.text(`Propósito: ${plan.proposito || "-"}`, 14, 46);

    // --- Participantes ---
    if (plan.participantes?.length) {
      doc.setTextColor(33);
      doc.setFontSize(13);
      doc.text("Participantes", 14, 56);

      const partRows = plan.participantes.map((p) => [
        p.area,
        p.nombre,
        p.cargo,
      ]);

      autoTable(doc, {
        startY: 60,
        head: [["Área / Gerencia", "Nombre y Apellido", "Cargo"]],
        body: partRows,
        theme: "grid",
        margin: { left: 14, right: 14 },
        headStyles: { fillColor: [255, 221, 87] },
      });
    }

    // --- Observaciones (tabla resumen) ---
    if (observaciones?.length) {
      const yOffset = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 80;
      doc.setTextColor(33);
      doc.setFontSize(13);
      doc.text("Observaciones registradas", 14, yOffset);

      const obsRows = observaciones.map((o) => [
        o.tipo === "buena"
          ? "Buena práctica"
          : o.tipo === "hallazgo"
          ? "Hallazgo"
          : "Acción inmediata",
        o.descripcion || "-",
        o.responsable || "-",
        o.accionDerivada ? "Sí" : "No",
      ]);

      autoTable(doc, {
        startY: yOffset + 4,
        head: [["Tipo", "Descripción", "Responsable", "Acción derivada"]],
        body: obsRows,
        theme: "grid",
        margin: { left: 14, right: 14 },
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [255, 221, 87] },
        columnStyles: {
          1: { cellWidth: "wrap" }, // descripción
        },
      });
    }

    // --- Evidencias agrupadas por observación ---
    await agregarEvidenciasPorObservacion(doc, observaciones);

    // --- Guardar ---
    doc.save(`GembaWalk_${plan.area || "reporte"}.pdf`);
    setGenerando(false);
  };

  // === Render (pantalla) ===
  if (!plan)
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 text-center">
        <p className="text-gray-400">
          No hay datos de planificación cargados.
        </p>
        <button
          onClick={() => navigate("/gemba/plan")}
          className="mt-4 bg-indigo-700 px-4 py-2 rounded-lg"
        >
          Ir a planificación
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-yellow-400">
          📄 Reporte Gemba Walk
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/gemba/ejecucion")}
            className="bg-gray-700 hover:bg-gray-800 px-3 py-2 rounded-lg"
          >
            Volver
          </button>
          <button
            onClick={generarPDF}
            disabled={generando}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed px-3 py-2 rounded-lg"
          >
            {generando ? "Generando..." : "Generar PDF"}
          </button>
        </div>
      </div>

      {fuenteLocal && (
        <div className="mb-6 bg-amber-900/30 border border-amber-600 rounded-lg p-3 text-sm text-amber-300">
          ⚠️ No se pudo confirmar esta información contra el servidor — el reporte se arma con la última copia guardada en este navegador, que podría no estar actualizada.
        </div>
      )}

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h2 className="text-xl text-yellow-300 mb-4">
          📋 Resumen del recorrido
        </h2>
        <p>
          <strong>Área / Planta:</strong> {plan.area}
        </p>
        <p>
          <strong>Fecha:</strong> {plan.fecha}
        </p>
        <p>
          <strong>Responsable:</strong> {plan.responsable}
        </p>
        <p>
          <strong>Propósito:</strong> {plan.proposito}
        </p>

        <h2 className="text-xl text-yellow-300 mt-6 mb-2">👥 Participantes</h2>
        <ul className="list-disc ml-6 text-gray-300">
          {plan.participantes?.map((p) => (
            <li key={p.id}>
              {p.nombre} ({p.cargo}) – {p.area}
            </li>
          ))}
        </ul>

        <h2 className="text-xl text-yellow-300 mt-6 mb-2">🗒️ Observaciones</h2>
        <ul className="list-disc ml-6 text-gray-300 space-y-3">
          {observaciones?.map((o) => (
            <li key={o.id}>
              <div>
                <strong>
                  {o.tipo === "buena"
                    ? "✅ Buena práctica"
                    : o.tipo === "hallazgo"
                    ? "⚠️ Hallazgo"
                    : "🔧 Acción inmediata"}
                </strong>
                : {o.descripcion} ({o.responsable})
                {o.accionDerivada && (
                  <span className="text-yellow-400 ml-1">
                    ⚡ Acción derivada
                  </span>
                )}
              </div>

              {o.evidencias && o.evidencias.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {o.evidencias.map((img, idx) => (
                    <img
                      key={idx}
                      src={img.url}
                      alt={img.name}
                      className="w-16 h-16 object-cover rounded border border-gray-600"
                    />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
