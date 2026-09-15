-- =====================================================================
-- Migración: Módulo Inventario Cíclico (Fase 1)
-- Carga de archivo de ubicaciones + ABC/XYZ + dispersión + consolidación
-- Ejecutar una sola vez sobre tu base de datos (psql / Supabase SQL editor)
-- =====================================================================

-- 1) Cada carga de archivo es un "snapshot" independiente. Permite comparar
--    entre cargas en el futuro sin mezclar datos de distintas fechas.
CREATE TABLE IF NOT EXISTS ciclico_uploads (
  id              SERIAL PRIMARY KEY,
  empresa_id      INTEGER NOT NULL,
  nombre_archivo  TEXT,
  filas_totales   INTEGER DEFAULT 0,
  filas_procesadas INTEGER DEFAULT 0,
  subido_por      INTEGER,
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ciclico_uploads_empresa
  ON ciclico_uploads (empresa_id, creado_en DESC);

-- 2) Una fila por SKU x ubicación, tal cual viene del archivo (~55 columnas
--    en origen; se modelan las que alimentan el análisis y se guarda la fila
--    completa en `raw` por si hace falta algo no modelado más adelante).
--    Auto-contenida a propósito: no depende de un catálogo de SKU/ubicación
--    (esas tablas no existen hoy en esta base).
CREATE TABLE IF NOT EXISTS ciclico_stock (
  id              SERIAL PRIMARY KEY,
  upload_id       INTEGER NOT NULL REFERENCES ciclico_uploads(id) ON DELETE CASCADE,
  empresa_id      INTEGER NOT NULL,

  sku             TEXT NOT NULL,
  descripcion     TEXT,
  marca           TEXT,
  depto           TEXT,
  desc_depto      TEXT,
  subdepto        TEXT,
  desc_subdepto   TEXT,
  familia         TEXT,
  desc_familia    TEXT,

  cd              TEXT,
  whse            TEXT,
  ubicacion       TEXT,
  zona            TEXT,
  pasillo         TEXT,
  bahia           TEXT,
  nivel           TEXT,
  piso            TEXT,

  qty             NUMERIC DEFAULT 0,
  stock_total     NUMERIC DEFAULT 0,
  stock_en_osr    NUMERIC DEFAULT 0,
  costo           NUMERIC,
  retail_price    NUMERIC,
  ventas          NUMERIC DEFAULT 0,

  logistica_osr   TEXT,
  sugerencia_osr  TEXT,
  full_qty        NUMERIC,
  half_qty        NUMERIC,
  quarter_qty     NUMERIC,

  raw             JSONB
);

CREATE INDEX IF NOT EXISTS idx_ciclico_stock_upload ON ciclico_stock (upload_id);
CREATE INDEX IF NOT EXISTS idx_ciclico_stock_sku     ON ciclico_stock (upload_id, sku);
CREATE INDEX IF NOT EXISTS idx_ciclico_stock_cd      ON ciclico_stock (upload_id, cd);

-- 3) Registro del módulo en el menú (Inicio) y su permiso para SuperAdmin.
--    Aprovechamos para corregir un bug encontrado de paso: "Analisis ABC/XYZ"
--    (id 20) tenía la ruta vacía, por lo que hoy no es clickeable en Inicio.
UPDATE modulos SET ruta = '/analisis/abc-xyz' WHERE id = 20 AND (ruta IS NULL OR ruta = '');

INSERT INTO modulos (nombre, categoria, ruta, orden, tipo, activo)
SELECT 'Inventario Cíclico', 'inventario', '/inventario-ciclico', 1000, 'analitico', true
WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Inventario Cíclico');

-- SuperAdmin (rol_id = 1) ve ambos módulos de la categoría "inventario".
INSERT INTO roles_modulos (rol_id, modulo_id, activo)
SELECT 1, id, true FROM modulos WHERE nombre = 'Inventario Cíclico'
ON CONFLICT (rol_id, modulo_id) DO UPDATE SET activo = true;

INSERT INTO roles_modulos (rol_id, modulo_id, activo)
VALUES (1, 20, true)
ON CONFLICT (rol_id, modulo_id) DO UPDATE SET activo = true;
