import dotenv from "dotenv";
dotenv.config({ path: "C:/1OdraugSmartLogistics/a3mentor/backend/.env" });
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: false,
});

const EMPRESA_ID = 1;
const USUARIO_ID = 1;

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ===================== 5S =====================
    const proy5s = await client.query(
      `INSERT INTO proyectos_5s (usuario_id, empresa_id, nombre, area, responsable, fecha_inicio, estado, avance)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [USUARIO_ID, EMPRESA_ID, "5S Línea de Envasado", "Producción", "Carlo Guardo", "2026-07-15", "En progreso", 45]
    );
    const proyecto5sId = proy5s.rows[0].id;

    const impl5s = await client.query(
      `INSERT INTO implementaciones_5s (proyecto_id, avance) VALUES ($1,$2) RETURNING id`,
      [proyecto5sId, 45]
    );
    const implementacionId = impl5s.rows[0].id;

    const tareasData = [
      ["Seiri (Clasificar)", "Retirar elementos innecesarios del área de envasado", "Ana Torres", "2026-07-15", "2026-07-20", true],
      ["Seiton (Ordenar)", "Definir ubicaciones fijas para herramientas e insumos", "Luis Rojas", "2026-07-21", "2026-07-28", true],
      ["Seiso (Limpiar)", "Establecer rutina diaria de limpieza de la línea", "Marta Silva", "2026-07-29", "2026-08-05", false],
    ];
    const tareaIds = [];
    for (const [seccion, descripcion, responsable, inicio, fin, completada] of tareasData) {
      const r = await client.query(
        `INSERT INTO tareas_5s (implementacion_id, seccion, descripcion, responsable, inicio, fin, completada)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [implementacionId, seccion, descripcion, responsable, inicio, fin, completada]
      );
      tareaIds.push(r.rows[0].id);
    }

    await client.query(
      `INSERT INTO subtareas_5s (tarea_id, descripcion, responsable, completada) VALUES ($1,$2,$3,$4)`,
      [tareaIds[0], "Clasificar materiales por frecuencia de uso", "Ana Torres", true]
    );
    await client.query(
      `INSERT INTO subtareas_5s (tarea_id, descripcion, responsable, completada) VALUES ($1,$2,$3,$4)`,
      [tareaIds[1], "Instalar tablero de herramientas con siluetas", "Luis Rojas", true]
    );

    const audit5s = await client.query(
      `INSERT INTO auditorias_5s (proyecto_id, fecha, auditor, puntaje, comentario_global)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [proyecto5sId, "2026-08-10", "Carlo Guardo", 78, "Buen avance general, falta consolidar el hábito de limpieza diaria."]
    );
    const auditoriaId = audit5s.rows[0].id;

    await client.query(
      `INSERT INTO auditoria_items_5s (auditoria_id, tarea_id, puntuacion, observaciones) VALUES ($1,$2,$3,$4)`,
      [auditoriaId, tareaIds[0], 85, "Área bien clasificada"]
    );
    await client.query(
      `INSERT INTO auditoria_items_5s (auditoria_id, tarea_id, puntuacion, observaciones) VALUES ($1,$2,$3,$4)`,
      [auditoriaId, tareaIds[1], 80, "Tablero instalado, falta etiquetado"]
    );

    console.log("✅ 5S: proyecto", proyecto5sId, "con", tareaIds.length, "tareas y auditoría", auditoriaId);

    // ===================== A3 =====================
    const a3proy = await client.query(
      `INSERT INTO a3_proyectos (id_empresa, id_usuario, titulo, descripcion, estado, fecha_inicio)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [EMPRESA_ID, USUARIO_ID, "Reducción de reprocesos en Línea 2",
       "Proyecto A3 para atacar el alto índice de reprocesos detectado en la línea de ensamble 2.",
       "En progreso", "2026-07-01"]
    );
    const a3Id = a3proy.rows[0].id;

    await client.query(
      `INSERT INTO a3_problemas (id_a3, descripcion, condicion_actual, acciones_contencion, meta, cumplimiento, brecha)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [a3Id, "La línea 2 presenta un 12% de reprocesos, muy por encima del objetivo de 5%.",
       "12% de unidades reprocesadas por defectos de ensamble",
       "Inspección 100% al final de línea mientras se implementan contramedidas", 5, 8, 3]
    );

    const ishikawa = await client.query(
      `INSERT INTO a3_ishikawa (id_a3, problema) VALUES ($1,$2) RETURNING id`,
      [a3Id, "Alto índice de reprocesos en Línea 2"]
    );
    const ishikawaId = ishikawa.rows[0].id;

    const causas = [
      ["Mano de obra", "Falta de capacitación en el nuevo procedimiento de ensamble"],
      ["Método", "Instructivo de trabajo desactualizado"],
      ["Máquina", "Torque de atornillado descalibrado"],
      ["Material", "Variabilidad en tolerancias de proveedor"],
    ];
    for (const [categoria, texto] of causas) {
      await client.query(
        `INSERT INTO a3_ishikawa_causas (id_ishikawa, categoria, texto) VALUES ($1,$2,$3)`,
        [ishikawaId, categoria, texto]
      );
    }

    await client.query(`INSERT INTO a3_contramedidas (id_a3, descripcion) VALUES ($1,$2)`,
      [a3Id, "Actualizar instructivo de trabajo y capacitar a todo el turno"]);
    await client.query(`INSERT INTO a3_contramedidas (id_a3, descripcion) VALUES ($1,$2)`,
      [a3Id, "Calibrar herramienta de torque semanalmente"]);

    const acciones = [
      ["Capacitar operadores en nuevo procedimiento", "Ana Torres", "2026-07-10", "Completado"],
      ["Calibrar atornilladores neumáticos", "Luis Rojas", "2026-07-15", "Completado"],
      ["Auditar cumplimiento de instructivo actualizado", "Carlo Guardo", "2026-08-01", "Pendiente"],
    ];
    for (const [accion, responsable, fecha, estado] of acciones) {
      await client.query(
        `INSERT INTO a3_acciones (id_a3, accion, responsable, fecha, estado) VALUES ($1,$2,$3,$4,$5)`,
        [a3Id, accion, responsable, fecha, estado]
      );
    }

    await client.query(
      `INSERT INTO a3_seguimiento (id_a3, resultados, lecciones) VALUES ($1,$2,$3)`,
      [a3Id, "El índice de reprocesos bajó de 12% a 8% en las primeras 3 semanas.",
       "La capacitación tiene mayor impacto cuando se refuerza con checklist visual en el puesto."]
    );

    console.log("✅ A3: proyecto", a3Id, "con Ishikawa, contramedidas, acciones y seguimiento");

    // ===================== GEMBA WALK =====================
    const gemba = await client.query(
      `INSERT INTO gemba_planes (empresa_id, usuario_id, area, fecha, responsable, proposito)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [EMPRESA_ID, USUARIO_ID, "Almacén Central", "2026-08-18", "Carlo Guardo",
       "Revisión de cumplimiento 5S y seguridad en zona de picking"]
    );
    const gembaId = gemba.rows[0].id;

    await client.query(
      `INSERT INTO gemba_participantes (gemba_id, area, nombre, cargo) VALUES ($1,$2,$3,$4)`,
      [gembaId, "Logística", "Ana Gómez", "Supervisora de Turno"]
    );
    await client.query(
      `INSERT INTO gemba_participantes (gemba_id, area, nombre, cargo) VALUES ($1,$2,$3,$4)`,
      [gembaId, "Calidad", "Pedro Fuentes", "Analista de Calidad"]
    );

    const observaciones = [
      ["Seguridad", "Extintor bloqueado por pallets en pasillo B", "Ana Gómez", true],
      ["5S", "Zona de picking sin señalización de ubicaciones", "Pedro Fuentes", true],
      ["Positivo", "Buen orden general en zona de despacho", "Carlo Guardo", false],
    ];
    for (const [tipo, descripcion, responsable, accion_derivada] of observaciones) {
      await client.query(
        `INSERT INTO gemba_observaciones (gemba_id, tipo, descripcion, responsable, accion_derivada)
         VALUES ($1,$2,$3,$4,$5)`,
        [gembaId, tipo, descripcion, responsable, accion_derivada]
      );
    }

    console.log("✅ Gemba Walk: plan", gembaId, "con 2 participantes y 3 observaciones");

    // ===================== OEE =====================
    const oeeRecs = [
      { fecha: "2026-08-18", linea: "Línea 1", turno: "Turno Mañana", tpm: 480, tparadas: 45, vi: 10, up: 3800, ub: 3700 },
      { fecha: "2026-08-19", linea: "Línea 1", turno: "Turno Tarde", tpm: 480, tparadas: 60, vi: 10, up: 3600, ub: 3500 },
      { fecha: "2026-08-20", linea: "Línea 2", turno: "Turno Mañana", tpm: 480, tparadas: 30, vi: 8, up: 3400, ub: 3350 },
    ];
    const oeeIds = [];
    for (const r of oeeRecs) {
      const tOperativo = r.tpm - r.tparadas;
      const disponibilidad = tOperativo / r.tpm;
      const rendimiento = r.up / (tOperativo * r.vi);
      const calidad = r.ub / r.up;
      const oee = disponibilidad * rendimiento * calidad;
      const res = await client.query(
        `INSERT INTO oee_registros
         (empresa_id, usuario_id, fecha, linea, turno, tiempo_planificado_min, tiempo_paradas_min,
          velocidad_ideal_und_x_min, unidades_producidas, unidades_buenas, disponibilidad, rendimiento, calidad, oee)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        [EMPRESA_ID, USUARIO_ID, r.fecha, r.linea, r.turno, r.tpm, r.tparadas, r.vi, r.up, r.ub,
         disponibilidad, rendimiento, calidad, oee]
      );
      oeeIds.push(res.rows[0].id);
    }

    await client.query(
      `INSERT INTO oee_paradas (registro_id, hora, causa, minutos, tipo_falla) VALUES ($1,$2,$3,$4,$5)`,
      [oeeIds[0], "09:15", "Cambio de formato", 25, "Programada"]
    );
    await client.query(
      `INSERT INTO oee_paradas (registro_id, hora, causa, minutos, tipo_falla) VALUES ($1,$2,$3,$4,$5)`,
      [oeeIds[0], "11:40", "Falla mecánica menor", 20, "No programada"]
    );

    console.log("✅ OEE:", oeeIds.length, "registros con paradas");

    // ===================== OOE =====================
    const ooeRecs = [
      { fecha: "2026-08-18", linea: "Línea 1", turno: "Turno Mañana", top: 430, tpm: 480 },
      { fecha: "2026-08-19", linea: "Línea 1", turno: "Turno Tarde", top: 415, tpm: 480 },
    ];
    for (const r of ooeRecs) {
      await client.query(
        `INSERT INTO ooe_registros (empresa_id, fecha, linea, turno, tiempo_operativo_min, tiempo_planificado_min, ooe)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [EMPRESA_ID, r.fecha, r.linea, r.turno, r.top, r.tpm, r.top / r.tpm]
      );
    }
    console.log("✅ OOE:", ooeRecs.length, "registros");

    // ===================== TEEP =====================
    const teepRecs = [
      { fecha: "2026-08-18", linea: "Línea 1", turno: "Turno Mañana", tcal: 1440, tpm: 480, top: 430, pt: 4800, pr: 3800, ub: 3700, ut: 3800 },
      { fecha: "2026-08-19", linea: "Línea 1", turno: "Turno Tarde", tcal: 1440, tpm: 480, top: 415, pt: 4800, pr: 3600, ub: 3500, ut: 3600 },
    ];
    for (const r of teepRecs) {
      const teep = (r.pr / r.pt) * (r.tpm / r.tcal);
      await client.query(
        `INSERT INTO teep_registros
         (empresa_id, fecha, linea, turno, tiempo_calendario_min, tiempo_planificado_min, tiempo_operativo_min,
          produccion_teorica, produccion_real, unidades_buenas, unidades_totales, teep)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [EMPRESA_ID, r.fecha, r.linea, r.turno, r.tcal, r.tpm, r.top, r.pt, r.pr, r.ub, r.ut, teep]
      );
    }
    console.log("✅ TEEP:", teepRecs.length, "registros");

    // ===================== VSM =====================
    const baseTs = Date.now();
    const elements = [
      { id: baseTs, type: "process-box", title: "Recepción", content: "C/T=20s\nC/O=2min\nTiempo=8h\nTurnos=2\nDisponible=98%", x: 80, y: 200, width: 150, height: 120 },
      { id: baseTs + 1, type: "process-box", title: "Corte", content: "C/T=30s\nC/O=5min\nTiempo=8h\nTurnos=2\nDisponible=95%", x: 280, y: 200, width: 150, height: 120 },
      { id: baseTs + 2, type: "process-box", title: "Ensamble", content: "C/T=45s\nC/O=8min\nTiempo=8h\nTurnos=2\nDisponible=92%", x: 480, y: 200, width: 150, height: 120 },
      { id: baseTs + 3, type: "process-box", title: "Empaque", content: "C/T=25s\nC/O=3min\nTiempo=8h\nTurnos=2\nDisponible=97%", x: 680, y: 200, width: 150, height: 120 },
    ];
    const connections = [
      { from: baseTs, to: baseTs + 1, type: "push" },
      { from: baseTs + 1, to: baseTs + 2, type: "push" },
      { from: baseTs + 2, to: baseTs + 3, type: "push" },
    ];
    const procesos = [
      { nombre: "Recepción", tiempo_ciclo: 20, operarios: 1, disponibilidad: 0.98 },
      { nombre: "Corte", tiempo_ciclo: 30, operarios: 2, disponibilidad: 0.95 },
      { nombre: "Ensamble", tiempo_ciclo: 45, operarios: 3, disponibilidad: 0.92 },
      { nombre: "Empaque", tiempo_ciclo: 25, operarios: 2, disponibilidad: 0.97 },
    ];

    const vsm = await client.query(
      `INSERT INTO vsm_mapas (empresa_id, nombre, descripcion, unidad, procesos, layout, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [EMPRESA_ID, "VSM Línea de Ensamble", "Mapa de flujo de valor del proceso de ensamble final",
       "segundos", JSON.stringify(procesos), JSON.stringify({ elements, connections }), USUARIO_ID]
    );
    console.log("✅ VSM: mapa", vsm.rows[0].id, "con 4 procesos conectados");

    // ===================== SIPOC =====================
    const sipocData = {
      suppliers: ["Proveedor de packaging", "Transportista"],
      inputs: ["Pedido confirmado", "Stock disponible"],
      process: ["Picking", "Packing", "Etiquetado", "Carga a camión"],
      outputs: ["Pedido despachado", "Guía de despacho"],
      customers: ["Cliente final", "Centro de distribución"],
    };
    const sipoc = await client.query(
      `INSERT INTO sipoc_proyectos (empresa_id, nombre, proceso, responsable, sipoc_data)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [EMPRESA_ID, "SIPOC Proceso de Despacho", "Despacho de pedidos", "Carlo Guardo", JSON.stringify(sipocData)]
    );
    console.log("✅ SIPOC: proyecto", sipoc.rows[0].id);

    await client.query("COMMIT");
    console.log("\n🎉 Seed completo, todo commiteado.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ ERROR (rollback aplicado):", e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
