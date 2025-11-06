-- =====================================================
-- ACTUALIZACIÓN: Soporte para múltiples proveedores por producto
-- =====================================================
-- INSTRUCCIONES:
-- 1. Abre el SQL Editor en tu dashboard de Supabase
-- 2. Copia y pega este script completo
-- 3. Ejecuta el script
-- =====================================================

-- Crear tabla intermedia para relación muchos-a-muchos productos-proveedores
CREATE TABLE IF NOT EXISTS productos_proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_producto UUID NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
  id_proveedor UUID NOT NULL REFERENCES proveedores(id_proveedor) ON DELETE CASCADE,
  precio_compra DECIMAL(10,2),
  es_principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id_producto, id_proveedor)
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_productos_proveedores_producto ON productos_proveedores(id_producto);
CREATE INDEX IF NOT EXISTS idx_productos_proveedores_proveedor ON productos_proveedores(id_proveedor);

-- Migrar datos existentes de productos.id_proveedor a la tabla intermedia
INSERT INTO productos_proveedores (id_producto, id_proveedor, es_principal)
SELECT id_producto, id_proveedor, TRUE
FROM productos
WHERE id_proveedor IS NOT NULL
ON CONFLICT (id_producto, id_proveedor) DO NOTHING;

-- Agregar campo id_proveedor a movimientos_inventario para registrar de qué proveedor se compró
ALTER TABLE movimientos_inventario 
ADD COLUMN IF NOT EXISTS id_proveedor UUID REFERENCES proveedores(id_proveedor) ON DELETE SET NULL;

-- Crear índice para el nuevo campo
CREATE INDEX IF NOT EXISTS idx_movimientos_proveedor ON movimientos_inventario(id_proveedor);

-- Políticas RLS para la nueva tabla
ALTER TABLE productos_proveedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver productos_proveedores" ON productos_proveedores;
CREATE POLICY "Todos pueden ver productos_proveedores" ON productos_proveedores
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Solo administradores pueden crear productos_proveedores" ON productos_proveedores;
CREATE POLICY "Solo administradores pueden crear productos_proveedores" ON productos_proveedores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Solo administradores pueden actualizar productos_proveedores" ON productos_proveedores;
CREATE POLICY "Solo administradores pueden actualizar productos_proveedores" ON productos_proveedores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Solo administradores pueden eliminar productos_proveedores" ON productos_proveedores;
CREATE POLICY "Solo administradores pueden eliminar productos_proveedores" ON productos_proveedores
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

-- =====================================================
-- NOTA: El campo id_proveedor en la tabla productos se mantiene
-- por compatibilidad, pero ahora la tabla productos_proveedores
-- es la fuente de verdad para las relaciones producto-proveedor
-- =====================================================
