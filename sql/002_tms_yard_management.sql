-- =====================================================================
-- Migración: TMS (Transportation Management) + Yard Management
-- Ejecutar sobre tu base de datos (Supabase SQL editor o psql).
-- No modifica ninguna tabla existente, salvo un ALTER aditivo sobre
-- erp_core.shipments para poder vincularlos a una carga (load) del TMS.
-- =====================================================================

-- ---------- Maestros de transporte ----------

CREATE TABLE IF NOT EXISTS erp_core.carriers (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  rut_nit VARCHAR(50),
  contacto VARCHAR(150),
  telefono VARCHAR(50),
  email VARCHAR(150),
  tarifa_base NUMERIC(12,2),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_core.vehicles (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  carrier_id INTEGER REFERENCES erp_core.carriers(id),
  placa VARCHAR(20) NOT NULL,
  tipo VARCHAR(50),                 -- camion, furgon, tracto-semirremolque...
  capacidad_kg NUMERIC(12,2),
  capacidad_m3 NUMERIC(12,2),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_core.drivers (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  carrier_id INTEGER REFERENCES erp_core.carriers(id),
  nombre VARCHAR(150) NOT NULL,
  licencia VARCHAR(50),
  telefono VARCHAR(50),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Cargas (viajes) ----------
-- Una "load" agrupa uno o varios shipments/orders que salen en el mismo
-- vehículo. Es la unidad que se despacha, se rastrea y se marca entregada.

CREATE TABLE IF NOT EXISTS erp_core.loads (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  warehouse_id VARCHAR(100),
  carrier_id INTEGER REFERENCES erp_core.carriers(id),
  vehicle_id INTEGER REFERENCES erp_core.vehicles(id),
  driver_id INTEGER REFERENCES erp_core.drivers(id),
  status VARCHAR(30) DEFAULT 'planned',  -- planned, dispatched, in_transit, delivered, cancelled
  origen VARCHAR(200),
  destino VARCHAR(200),
  costo_flete NUMERIC(12,2),
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_core.load_shipments (
  id SERIAL PRIMARY KEY,
  load_id INTEGER NOT NULL REFERENCES erp_core.loads(id) ON DELETE CASCADE,
  shipment_id INTEGER NOT NULL REFERENCES erp_core.shipments(id),
  orden_entrega INTEGER DEFAULT 1,
  UNIQUE (load_id, shipment_id)
);

CREATE TABLE IF NOT EXISTS erp_core.load_tracking_events (
  id SERIAL PRIMARY KEY,
  load_id INTEGER NOT NULL REFERENCES erp_core.loads(id) ON DELETE CASCADE,
  evento VARCHAR(50) NOT NULL,   -- dispatched, checkpoint, delay, delivered, incident
  descripcion TEXT,
  ubicacion VARCHAR(200),
  creado_por INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loads_company_status ON erp_core.loads (company_id, status);

-- ---------- Yard Management (patio) ----------

CREATE TABLE IF NOT EXISTS erp_core.yard_docks (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  warehouse_id VARCHAR(100),
  codigo VARCHAR(20) NOT NULL,
  tipo VARCHAR(30) DEFAULT 'carga',   -- carga, descarga, mixto
  estado VARCHAR(20) DEFAULT 'libre', -- libre, ocupado, mantenimiento
  UNIQUE (company_id, warehouse_id, codigo)
);

CREATE TABLE IF NOT EXISTS erp_core.yard_visits (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  warehouse_id VARCHAR(100),
  load_id INTEGER REFERENCES erp_core.loads(id),
  dock_id INTEGER REFERENCES erp_core.yard_docks(id),
  placa VARCHAR(20) NOT NULL,
  conductor VARCHAR(150),
  transportista VARCHAR(150),
  tipo_visita VARCHAR(20) DEFAULT 'descarga',  -- carga, descarga
  check_in TIMESTAMPTZ DEFAULT NOW(),
  asignado_muelle_en TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  estado VARCHAR(20) DEFAULT 'en_porteria',    -- en_porteria, en_muelle, finalizado
  observaciones TEXT
);

CREATE INDEX IF NOT EXISTS idx_yard_visits_estado
  ON erp_core.yard_visits (company_id, warehouse_id, estado);

-- Vincula un shipment existente a la carga que lo transporta (nullable,
-- no rompe nada de lo que ya funciona con erp_core.shipments)
ALTER TABLE erp_core.shipments
  ADD COLUMN IF NOT EXISTS load_id INTEGER REFERENCES erp_core.loads(id);

-- ---------- Registro en el sistema de permisos por módulo ----------
-- Para que TMS, Yard Management, el diseñador de layout y ABC/XYZ aparezcan
-- en tu matriz de permisos (PermisosMatrix.jsx) y puedas asignarlos por rol.
-- Ajusta 'tipo' y 'categoria' si tu convención usa otros valores; revisa
-- primero con: SELECT DISTINCT tipo, categoria FROM core.modulos;

INSERT INTO core.modulos (nombre, tipo, categoria, descripcion)
VALUES
  ('TMS - Cargas y Despacho', 'operacional', 'wms', 'Creación de cargas, despacho y seguimiento de flota'),
  ('TMS - Flota y Transportistas', 'operacional', 'wms', 'Gestión de transportistas, vehículos y conductores'),
  ('Yard Management', 'operacional', 'wms', 'Control de patio: check-in, muelles y check-out'),
  ('Diseñador de Layout', 'operacional', 'wms', 'Diseño visual del layout de la bodega'),
  ('Análisis ABC/XYZ', 'analitico', 'inventario', 'Clasificación de SKUs por rotación y variabilidad')
ON CONFLICT DO NOTHING;
