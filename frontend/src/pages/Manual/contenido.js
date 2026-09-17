// src/pages/Manual/contenido.js
//
// Contenido del Manual de Uso. Se mantiene como datos estáticos (no CMS):
// más rápido de lanzar y de editar por código. Si en algún momento hace
// falta que alguien sin acceso al código lo edite, ahí sí conviene migrar
// esto a una tabla + pantalla de administración.
//
// Cada artículo: slug (para la URL), título, fase (misma categoría que usa
// Inicio.jsx, para agrupar igual), ícono, resumen corto y secciones.

const contenido = [
  {
    slug: "diagnostico-rapido",
    titulo: "Diagnóstico Rápido",
    fase: "0. Diagnóstico",
    icono: "🧭",
    resumen: "Contale a la IA tu problema con tus palabras y te dice por dónde empezar.",
    secciones: [
      {
        titulo: "¿Para qué sirve?",
        parrafos: [
          "Es el punto de partida antes de meterte de lleno en una metodología. Describís tu problema u oportunidad de mejora con tus propias palabras, sin necesidad de saber todavía qué herramienta Lean usar, y el sistema te devuelve un informe gerencial y un roadmap sugerido de por dónde arrancar.",
        ],
      },
      {
        titulo: "¿Cómo se usa?",
        pasos: [
          "Escribí un título corto para el diagnóstico (ej: \"Demoras en despacho de pedidos\").",
          "Contá con tus palabras qué te preocupa, qué querés analizar o mejorar — cuanto más detalle, mejor.",
          "Presioná \"Generar diagnóstico con IA\".",
          "Revisá el informe gerencial y el roadmap: cada paso sugerido trae un botón que te lleva directo al módulo correspondiente.",
          "Podés generar un diagnóstico nuevo o revisar los anteriores desde \"Diagnósticos anteriores\".",
        ],
      },
      {
        titulo: "Tips",
        items: [
          "Incluí números si los tenés (frecuencia, cantidad de casos, a quién afecta) — el diagnóstico sale más preciso.",
          "No hace falta saber de antemano si tu problema es un tema de A3, VSM o 5S: para eso está este módulo.",
        ],
      },
    ],
  },
  {
    slug: "sipoc",
    titulo: "SIPOC",
    fase: "1. Definir",
    icono: "📘",
    resumen: "Delimita un proceso (proveedores, entradas, actividades, salidas, clientes) antes de mejorarlo.",
    secciones: [
      {
        titulo: "¿Para qué sirve?",
        parrafos: [
          "SIPOC (Suppliers, Inputs, Process, Outputs, Customers) es la herramienta para delimitar el alcance de un proceso antes de analizarlo a fondo: quiénes son los Proveedores, qué Entradas necesita el proceso, cuáles son sus Actividades principales, qué Salidas produce y quiénes son los Clientes que las reciben.",
        ],
      },
      {
        titulo: "¿Cómo se usa?",
        pasos: [
          "Desde \"Iniciar / Ver SIPOC\" entrás al listado de tus diagramas SIPOC.",
          "Creá uno nuevo o abrí uno existente para seguir completándolo.",
          "Completá cada columna (S-I-P-O-C) con la información real del proceso.",
        ],
      },
      {
        titulo: "Tips",
        items: [
          "Hacé el SIPOC antes de meterte con VSM o A3 sobre el mismo proceso — te evita analizar cosas que en realidad están fuera del alcance real.",
          "Si no te ponés de acuerdo con el equipo en dónde empieza o termina el proceso, ese es exactamente el problema que el SIPOC está para resolver.",
        ],
      },
    ],
  },
  {
    slug: "gemba-walk",
    titulo: "Gemba Walk",
    fase: "2. Medir",
    icono: "🚶",
    resumen: "Recorré el lugar donde ocurre el trabajo y registrá lo que observás, en vez de asumir desde un escritorio.",
    secciones: [
      {
        titulo: "¿Para qué sirve?",
        parrafos: [
          "Gemba (\"el lugar real\" en japonés) es la práctica de ir a observar directamente dónde pasan las cosas, en vez de tomar decisiones solo con reportes. Este módulo estructura ese recorrido en tres etapas: Planificación, Ejecución y Reporte.",
        ],
      },
      {
        titulo: "¿Cómo se usa?",
        pasos: [
          "Planificación: definí área, fecha, responsable, propósito y los participantes del recorrido.",
          "Ejecución: registrá cada observación clasificada como ⚠️ Hallazgo (algo que corregir), ✅ Buena práctica (algo para replicar en otras áreas) o 🔧 Acción inmediata (un problema que ya se resolvió en el momento).",
          "Cada observación puede llevar foto de evidencia. Si marcás \"tiene acción derivada\", le asignás fecha límite y estado (Pendiente / En progreso / Completada).",
          "Reporte: generá un PDF con el resumen completo del recorrido para compartir.",
        ],
      },
      {
        titulo: "Tips",
        items: [
          "Las acciones derivadas con fecha vencida se resaltan solas en rojo, tanto en la ejecución como en el listado de planes — es tu alerta visual de qué está atrasado.",
          "Una \"buena práctica\" vale tanto como un hallazgo: no es solo para encontrar problemas, también para identificar qué replicar en otras áreas.",
        ],
      },
    ],
  },
  {
    slug: "vsm",
    titulo: "VSM — Mapa de Flujo de Valor",
    fase: "2. Medir",
    icono: "🧵",
    resumen: "Mapeá el flujo de un proceso en un lienzo interactivo y calculá Lead Time y % de Valor Agregado automáticamente.",
    secciones: [
      {
        titulo: "¿Para qué sirve?",
        parrafos: [
          "El Value Stream Mapping muestra visualmente por dónde pasa el trabajo, dónde se acumula tiempo y dónde hay desperdicio. Acá es un lienzo interactivo de verdad (arrastrar y soltar, conectar con flechas), no una tabla ni un dibujo estático.",
        ],
      },
      {
        titulo: "¿Cómo se usa?",
        pasos: [
          "Agregá nodos al lienzo: Proceso, Inventario, Proveedor o Cliente.",
          "Conectalos con flechas en el orden real en que fluye el trabajo.",
          "Completá los datos de cada nodo de Proceso (tiempo de ciclo, tiempo de cambio, uptime, operadores).",
          "El sistema calcula solo el Lead Time total y el % de Valor Agregado a partir del mapa que armaste.",
        ],
      },
      {
        titulo: "Tips",
        items: [
          "El cálculo es tan bueno como los datos que cargues en cada nodo — no dejes tiempos en cero \"para después\".",
          "Un VSM sin nodos de Inventario entre procesos suele estar ocultando el verdadero cuello de botella.",
        ],
      },
    ],
  },
  {
    slug: "a3",
    titulo: "A3",
    fase: "3. Analizar y Mejorar",
    icono: "📄",
    resumen: "La metodología completa de resolución de problemas, de punta a punta, en un solo documento.",
    secciones: [
      {
        titulo: "¿Para qué sirve?",
        parrafos: [
          "Es el formato clásico Lean para llevar un problema desde su descripción hasta la solución validada, todo en un único documento estructurado en 4 secciones.",
        ],
      },
      {
        titulo: "¿Cómo se usa?",
        pasos: [
          "A. Describir el problema: condición actual, meta vs. cumplimiento actual, y el análisis 5W2H \"Es / No es\" para acotar el problema (hay un indicador que muestra cuántas de las 7 dimensiones ya completaste).",
          "B. Análisis de causas: diagrama de Ishikawa (6M) interactivo, con sugerencia de causa raíz generada por IA.",
          "C. Contramedidas: la idea general para atacar la causa, más un plan de acciones concretas con responsable, fecha y estado (las vencidas se resaltan en rojo).",
          "D. Validar y estandarizar: comparás el resultado final contra la meta definida en la sección A, y completás un checklist de estandarización para que la mejora no se pierda con el tiempo.",
        ],
      },
      {
        titulo: "Tips",
        items: [
          "\"Es / No es\" no es una pregunta de sí o no: \"Es\" es lo que SÍ forma parte del problema, \"No es\" es algo parecido que hay que descartar del análisis.",
          "No saltes directo a una causa sin completar el 5W2H — es lo que evita \"adivinar\" la causa raíz antes de tiempo.",
          "El checklist de estandarización de la sección D es el paso que más se salta y el que más se necesita: sin eso, la mejora dura hasta que alguien se olvida.",
        ],
      },
    ],
  },
  {
    slug: "5s",
    titulo: "5S",
    fase: "3. Analizar y Mejorar",
    icono: "🧹",
    resumen: "Metodología japonesa de orden, limpieza y disciplina en el lugar de trabajo.",
    secciones: [
      {
        titulo: "¿Para qué sirve?",
        parrafos: [
          "Las 5S son: Seiri (Clasificar — sacar lo innecesario), Seiton (Ordenar — un lugar para cada cosa), Seiso (Limpiar), Seiketsu (Estandarizar) y Shitsuke (Disciplina — sostenerlo en el tiempo).",
        ],
      },
      {
        titulo: "¿Cómo se usa?",
        pasos: [
          "Creá un proyecto 5S desde \"Ir a mis proyectos 5S\".",
          "Implementación: registrá tareas para cada una de las 5S, con responsable y evidencia fotográfica.",
          "Seguimiento: revisá el avance del proyecto en el tiempo.",
          "Auditoría: verificá periódicamente que lo implementado se sostiene (no volvió a desordenarse).",
        ],
      },
      {
        titulo: "Tips",
        items: [
          "5S no termina cuando terminás de ordenar una vez: la etapa de Auditoría es la que evita que todo vuelva para atrás en un par de meses.",
          "Sacá foto de evidencia siempre, incluso de lo obvio — es lo que te permite mostrar el antes/después más adelante.",
        ],
      },
    ],
  },
  {
    slug: "kpi",
    titulo: "KPI",
    fase: "2. Medir",
    icono: "📊",
    resumen: "Panel único con OEE, OOE, TEEP y análisis Kaizen por línea, con ayuda de IA para interpretarlos.",
    secciones: [
      {
        titulo: "¿Para qué sirve?",
        parrafos: [
          "Centraliza los indicadores clásicos de eficiencia de equipos y líneas (OEE, OOE, TEEP) en un solo dashboard, junto con un análisis Kaizen por línea que la IA ayuda a interpretar.",
        ],
      },
      {
        titulo: "¿Cómo se usa?",
        pasos: [
          "Filtrá por año y mes para acotar el período que te interesa.",
          "El dashboard combina automáticamente los registros ya cargados en los módulos de OEE, OOE y TEEP.",
          "Revisá el análisis Kaizen por línea para ver un resumen ya interpretado del desempeño.",
        ],
      },
      {
        titulo: "Tips",
        items: [
          "Si una línea aparece con bajo desempeño en el análisis Kaizen, es un buen candidato para abrir un A3 sobre esa línea específica.",
        ],
      },
    ],
  },
];

export default contenido;
