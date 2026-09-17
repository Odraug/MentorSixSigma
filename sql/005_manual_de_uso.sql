-- =====================================================================
-- Migración: registro del módulo "Manual de Uso" en el menú
-- No agrega tablas (el contenido vive en el frontend, en
-- frontend/src/pages/Manual/contenido.js) -- esto solo lo da de alta
-- en el menú de Inicio para todos los roles.
-- =====================================================================

INSERT INTO modulos (nombre, categoria, ruta, orden, tipo, activo)
SELECT 'Manual de Uso', 'Ayuda', '/manual', 0, 'ayuda', true
WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Manual de Uso');

INSERT INTO roles_modulos (rol_id, modulo_id, activo)
SELECT r.id, m.id, true
FROM roles r CROSS JOIN modulos m
WHERE m.nombre = 'Manual de Uso'
ON CONFLICT (rol_id, modulo_id) DO UPDATE SET activo = true;
