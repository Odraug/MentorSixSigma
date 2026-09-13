
import { crearSubtareaBase } from "../utils/a3Helpers.js";




export const defaultA3 = {
  meta: { titulo: "", autor: "", fecha: new Date().toISOString().slice(0, 10) },

  problema: { 
    descripcion: "", 
    condicionActual: "", 
    accionesContencion: "", 
    imagenes: [] 
  },

  causas: {
    hombre: [""], 
    maquina: [""], 
    metodo: [""], 
    material: [""], 
    entorno: [""], 
    medida: [""],
    analisis5whys: "", 
    ishikawaNotes: "", 
    imagenes: [], 
    redaccionProblema: ""
  },

  // ✅ dejamos solo esta versión del objetivo
  objetivo: {
    declaracion: "",
    indicador: "",
    meta: "",
    cumplimiento: "",
    brecha: "",
    // Resultado medido después de implementar las contramedidas (Sección D),
    // para poder comparar contra la meta definida en la Sección A.
    resultadoFinal: ""
  },
  
  analisis5W2H: {
    que: { es: "", noEs: "" },
    cuando: { es: "", noEs: "" },
    donde: { es: "", noEs: "" },
    quien: { es: "", noEs: "" },
    como: { es: "", noEs: "" },
    cuantos: { es: "", noEs: "" },
    por_que: { es: "", noEs: "" },
    resumen: ""
  },

  contramedidas: { lista: [""] },
  acciones: [],
  seguimiento: { plan: "", resultados: "", graficoData: [], imagenes: [] },
  lecciones: "",
  // Checklist de estandarización (Sección D) — precargado con los pasos
  // típicos de Lean Six Sigma para sostener la mejora en el tiempo.
  estandarizacion: [
    { id: 1, texto: "Actualizar el procedimiento / instructivo de trabajo (SOP)", hecha: false },
    { id: 2, texto: "Capacitar al equipo en el nuevo método", hecha: false },
    { id: 3, texto: "Agregar o actualizar el control visual en el área", hecha: false },
    { id: 4, texto: "Definir plan de auditoría de seguimiento", hecha: false }
  ]
};






// 🔑 Claves de almacenamiento
export const STORAGE_KEYS = {
  IMPLEMENTACION_5S: "implementacion5S",
};

// 🧮 Días hábiles (L-V)
export const contarDiasHabiles = (inicio, fin) => {
  if (!inicio || !fin) return 0;
  const start = new Date(inicio);
  const end = new Date(fin);
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
};

// 🔢 Numeración visible
export const numeroTarea = (sIdx, tIdx) => `${sIdx + 1}.${tIdx + 1}`;

// 🧱 Plantillas base

export const crearTareaBase = () => ({
  id: crypto.randomUUID(),
  lugar: "",
  descripcion: "",
  responsable: "",
  inicio: "",
  fin: "",
  dependeDe: null,
  completada: false,
  evidencias: [],
  subtareas: [],
});

export const crearSeccionBase = (nombre) => ({
  nombre,
  inicioPlanificado: "",
  finPlanificado: "",
  duracion: 0,
  tareas: [],
  avance: 0,
});

// 📚 Secciones por defecto
export const SECCIONES_5S_DEFAULT = [
  crearSeccionBase("1S · Seiri (Clasificar)"),
  crearSeccionBase("2S · Seiton (Ordenar)"),
  crearSeccionBase("3S · Seiso (Limpiar)"),
  crearSeccionBase("4S · Seiketsu (Estandarizar)"),
  crearSeccionBase("5S · Shitsuke (Disciplina)"),
];

// ✅ Estado / Cómputos
export const isBlocked = (t, tareas) => {
  if (!t.dependeDe) return false;
  const pred = tareas.find((x) => x.id === t.dependeDe);
  return !pred || !pred.completada;
};

export const calcularAvanceS = (tareas) => {
  if (!tareas?.length) return 0;
  const done = tareas.filter((t) => t.completada).length;
  return Math.round((done / tareas.length) * 100);
};

export const calcularAvanceGlobal = (secciones) => {
  if (!secciones?.length) return 0;
  const sum = secciones.reduce((acc, s) => acc + (s.avance || 0), 0);
  return Number((sum / secciones.length).toFixed(1));
};

// 💾 Persistencia
export const loadImplementacion5S = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.IMPLEMENTACION_5S);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveImplementacion5S = (secciones) => {
  localStorage.setItem(
    STORAGE_KEYS.IMPLEMENTACION_5S,
    JSON.stringify(secciones)
  );
};

export const clearImplementacion5S = () => {
  localStorage.removeItem(STORAGE_KEYS.IMPLEMENTACION_5S);
};

export const DEFAULT_GEMBA = {
  proyecto: "",
  responsable: "",
  fecha: new Date().toISOString().slice(0, 10),
  area: "",
  observaciones: [],
  oportunidades: [],
  acciones: [],
};

