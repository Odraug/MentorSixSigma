-- =====================================================================
-- Migración: Plan de Inventario Cíclico (priorización + calendario)
-- Ejecutar una sola vez sobre tu base de datos (psql / Supabase SQL editor)
-- =====================================================================

-- Capacidad de conteo por CD (cuántos SKU puede cubrir un turno). Se
-- configura una vez por empresa+CD y se reutiliza en cada plan que se genere.
CREATE TABLE IF NOT EXISTS ciclico_capacidad_cd (
  id                   SERIAL PRIMARY KEY,
  empresa_id           INTEGER NOT NULL,
  cd                   TEXT NOT NULL,
  capacidad_por_turno  INTEGER NOT NULL DEFAULT 20,
  turnos_por_dia       INTEGER NOT NULL DEFAULT 3,
  actualizado_en       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (empresa_id, cd)
);

-- Un plan generado (una "corrida" del motor, con sus parámetros).
CREATE TABLE IF NOT EXISTS ciclico_planes (
  id             SERIAL PRIMARY KEY,
  upload_id      INTEGER NOT NULL REFERENCES ciclico_uploads(id) ON DELETE CASCADE,
  empresa_id     INTEGER NOT NULL,
  horizonte_dias INTEGER NOT NULL,
  fecha_inicio   DATE NOT NULL,
  fecha_fin      DATE NOT NULL,
  total_tareas   INTEGER DEFAULT 0,
  generado_por   INTEGER,
  creado_en      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ciclico_planes_upload ON ciclico_planes (upload_id, creado_en DESC);

-- Calendario resultante: una fila por (SKU, CD, ocurrencia). `estado` queda
-- listo para la futura etapa de cumplimiento (hoy siempre 'pendiente', sin
-- UI todavía para cambiarlo).
CREATE TABLE IF NOT EXISTS ciclico_plan_tareas (
  id            SERIAL PRIMARY KEY,
  plan_id       INTEGER NOT NULL REFERENCES ciclico_planes(id) ON DELETE CASCADE,
  sku           TEXT NOT NULL,
  descripcion   TEXT,
  cd            TEXT NOT NULL,
  prioridad     TEXT NOT NULL,   -- P1..P4
  frecuencia    TEXT NOT NULL,   -- SEMANAL/QUINCENAL/MENSUAL/TRIMESTRAL
  score_total   NUMERIC,
  fecha         DATE NOT NULL,
  dia_semana    TEXT NOT NULL,
  turno         INTEGER NOT NULL,
  estado        TEXT NOT NULL DEFAULT 'pendiente'
);

CREATE INDEX IF NOT EXISTS idx_plan_tareas_plan ON ciclico_plan_tareas (plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_tareas_cd_fecha ON ciclico_plan_tareas (plan_id, cd, fecha, turno);
