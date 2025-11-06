-- =====================================================
-- MIGRACIÓN: database-update-proveedores.sql
-- Actualizaciones en la tabla proveedores (ejemplo)
-- =====================================================

-- 1) Añadir columna email de contacto si no existe
ALTER TABLE proveedores
ADD COLUMN IF NOT EXISTS email_contacto TEXT;

-- 2) Padronizar teléfonos (esto es solo un ejemplo; adaptar según datos reales)
-- UPDATE proveedores SET telefono = regexp_replace(telefono, '[^0-9]', '', 'g') WHERE telefono IS NOT NULL;

-- 3) Crear índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(lower(nombre));

-- Verificación
-- SELECT id_proveedor, nombre, email_contacto FROM proveedores LIMIT 10;
