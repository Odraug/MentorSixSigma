-- =====================================================================
-- Migración: Clasificación ABC/XYZ + Diseñador visual de Layout
-- Ejecutar una sola vez sobre tu base de datos (psql / Supabase SQL editor)
-- =====================================================================

-- 1) Agrega columna XYZ y matriz combinada al perfil logístico del SKU
--    (segmento_abc ya existía, aquí solo completamos lo que falta)
ALTER TABLE sku_logistics_profile
  ADD COLUMN IF NOT EXISTS segmento_xyz VARCHAR(1),
  ADD COLUMN IF NOT EXISTS matriz_abc_xyz VARCHAR(2),
  ADD COLUMN IF NOT EXISTS coef_variacion NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS abc_xyz_actualizado_en TIMESTAMPTZ;

-- 2) Tabla para persistir el diseño visual del layout (guardado como JSON:
--    posición, tamaño y tipo de cada elemento del canvas). Es deliberadamente
--    simple (JSONB) para no tener que migrar el esquema cada vez que cambias
--    el editor visual — la relación con ubicaciones reales (tabla `location`)
--    se hace por el campo location_code dentro de cada elemento.
CREATE TABLE IF NOT EXISTS warehouse_layout_design (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER NOT NULL,
  warehouse_id  VARCHAR(100) NOT NULL,
  nombre        VARCHAR(150) DEFAULT 'Layout principal',
  layout_json   JSONB NOT NULL DEFAULT '[]',
  creado_por    INTEGER,
  creado_en     TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_layout_design_company
  ON warehouse_layout_design (company_id, warehouse_id);
