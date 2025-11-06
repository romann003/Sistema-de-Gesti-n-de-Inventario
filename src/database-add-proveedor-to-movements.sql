-- =====================================================
-- MIGRACIÓN: Agregar columna id_proveedor a movimientos_inventario
-- =====================================================
-- INSTRUCCIONES:
-- 1. Abre el SQL Editor en tu dashboard de Supabase
-- 2. Copia y pega este script completo
-- 3. Ejecuta el script
-- =====================================================

-- Agregar columna id_proveedor a la tabla movimientos_inventario
ALTER TABLE movimientos_inventario 
ADD COLUMN IF NOT EXISTS id_proveedor UUID REFERENCES proveedores(id_proveedor) ON DELETE SET NULL;

-- Crear índice para mejorar rendimiento de búsquedas por proveedor
CREATE INDEX IF NOT EXISTS idx_movimientos_proveedor ON movimientos_inventario(id_proveedor);

-- Comentario para documentación
COMMENT ON COLUMN movimientos_inventario.id_proveedor IS 'Referencia al proveedor de donde se compró el producto (para movimientos tipo Entrada)';

-- =====================================================
-- Verificar la estructura actualizada
-- =====================================================
-- Para verificar que la columna se agregó correctamente, ejecuta:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'movimientos_inventario'
-- ORDER BY ordinal_position;
-- =====================================================
