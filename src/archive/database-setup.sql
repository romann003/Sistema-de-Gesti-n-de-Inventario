-- =====================================================
-- SISTEMA DE GESTIÓN DE INVENTARIO PARA PyME
-- Script de Creación de Base de Datos
-- =====================================================
-- INSTRUCCIONES:
-- 1. Abre el SQL Editor en tu dashboard de Supabase
-- 2. Copia y pega este script completo
-- 3. Ejecuta el script
-- 4. Verifica que todas las tablas se hayan creado correctamente
-- =====================================================

-- =====================================================
-- TABLA: perfiles
-- Descripción: Extiende auth.users con información adicional del usuario
-- =====================================================
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('Administrador', 'Empleado')),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: categorias
-- Descripción: Categorías de productos
-- =====================================================
CREATE TABLE IF NOT EXISTS categorias (
  id_categoria UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: proveedores
-- Descripción: Información de proveedores
-- =====================================================
CREATE TABLE IF NOT EXISTS proveedores (
  id_proveedor UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  contacto TEXT NOT NULL,
  telefono TEXT,
  correo TEXT,
  direccion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: productos
-- Descripción: Catálogo de productos con gestión de stock
-- =====================================================
CREATE TABLE IF NOT EXISTS productos (
  id_producto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  id_categoria UUID REFERENCES categorias(id_categoria) ON DELETE SET NULL,
  id_proveedor UUID REFERENCES proveedores(id_proveedor) ON DELETE SET NULL,
  precio DECIMAL(10,2) NOT NULL,
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  stock_maximo INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: clientes
-- Descripción: Información de clientes
-- =====================================================
CREATE TABLE IF NOT EXISTS clientes (
  id_cliente UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  contacto TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  correo TEXT,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id_movimiento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('Entrada', 'Ajuste')),
  cantidad INTEGER NOT NULL,
  motivo TEXT NOT NULL,
  id_producto UUID REFERENCES productos(id_producto) ON DELETE CASCADE,
  id_usuario UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  notas TEXT
);
-- 1) Permitir 'Salida' en movimientos_inventario: eliminar el CHECK antiguo (si existe)
--    y crear uno nuevo que incluya 'Salida'. Usamos DROP CONSTRAINT IF EXISTS para
--    que la operación sea idempotente y no falle si ya fue aplicada.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimientos_inventario_tipo_check' AND conrelid = 'movimientos_inventario'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE movimientos_inventario DROP CONSTRAINT movimientos_inventario_tipo_check';
  END IF;
END $$;

ALTER TABLE movimientos_inventario
  ADD CONSTRAINT movimientos_inventario_tipo_check CHECK (tipo IN ('Entrada','Ajuste','Salida'));

-- =====================================================
-- TABLA: ventas
-- Descripción: Registro de ventas realizadas
-- =====================================================
CREATE TABLE IF NOT EXISTS ventas (
  id_venta UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente UUID REFERENCES clientes(id_cliente) ON DELETE SET NULL,
  -- ahora `ventas` actúa como cabecera de venta (una venta puede tener varios ítems)
  total DECIMAL(10,2) DEFAULT 0,
  id_usuario UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  notas TEXT
);

-- =====================================================
-- TABLA: detalles_venta
-- Descripción: Ítems asociados a una venta (productos vendidos)
-- =====================================================
CREATE TABLE IF NOT EXISTS detalles_venta (
  id_detalle UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_venta UUID REFERENCES ventas(id_venta) ON DELETE CASCADE,
  id_producto UUID REFERENCES productos(id_producto) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hacer nullable la columna `cantidad` en `ventas` solo si existe.
-- En algunos esquemas antiguos `ventas` contenía columnas por ítem (cantidad, precio, etc.).
-- Antes de eliminar esas columnas (o cambiarlas), nos aseguramos de que la columna
-- `cantidad` pueda aceptar NULL para evitar violaciones de NOT NULL durante la
-- migración hacia `detalles_venta`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ventas' AND column_name = 'cantidad'
  ) THEN
    EXECUTE 'ALTER TABLE ventas ALTER COLUMN cantidad DROP NOT NULL';
  END IF;
END$$;

-- =====================================================
-- TABLA: auditoria
-- Descripción: Registro de auditoría de todas las acciones
-- =====================================================
CREATE TABLE IF NOT EXISTS auditoria (
  id_auditoria UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accion TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(id_categoria);
CREATE INDEX IF NOT EXISTS idx_productos_proveedor ON productos(id_proveedor);
CREATE INDEX IF NOT EXISTS idx_productos_sku ON productos(sku);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_inventario(id_producto);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_inventario(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(id_cliente);
-- idx_ventas_producto removed: ventas now acts as header and detalles_venta stores product references
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(id_usuario);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad, entidad_id);

-- =====================================================
-- TRIGGER: Crear perfil automáticamente al registrar usuario
-- =====================================================
CREATE OR REPLACE FUNCTION crear_perfil_automatico()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfiles (id, nombre, rol, activo)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'), 
    COALESCE(NEW.raw_user_meta_data->>'rol', 'Empleado'), 
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_crear_perfil ON auth.users;
CREATE TRIGGER trigger_crear_perfil
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION crear_perfil_automatico();

-- =====================================================
-- TRIGGER: Actualizar stock en entradas de inventario
-- =====================================================
CREATE OR REPLACE FUNCTION aumentar_stock_entrada()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'Entrada' THEN
    UPDATE productos
    SET stock_actual = stock_actual + NEW.cantidad,
        updated_at = NOW()
    WHERE id_producto = NEW.id_producto;
  ELSIF NEW.tipo = 'Ajuste' THEN
    UPDATE productos
    SET stock_actual = NEW.cantidad,
        updated_at = NOW()
    WHERE id_producto = NEW.id_producto;
  ELSIF NEW.tipo = 'Salida' THEN
    UPDATE productos
    SET stock_actual = stock_actual - NEW.cantidad,
        updated_at = NOW()
    WHERE id_producto = NEW.id_producto;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_aumentar_stock ON movimientos_inventario;
CREATE TRIGGER trigger_aumentar_stock
AFTER INSERT ON movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION aumentar_stock_entrada();

-- =====================================================
-- TRIGGER: Reducir stock en ventas
-- =====================================================
CREATE OR REPLACE FUNCTION reducir_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
  -- Mantener compatibilidad: si se inserta en la tabla 'ventas' con campos
  -- de item (esquema antiguo), se reducirá stock. Para el nuevo modelo
  -- (cabecera + detalles), el trigger de reducción se aplica sobre
  -- 'detalles_venta' (ver función 'reducir_stock_por_detalle').
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reducir_stock ON ventas;
CREATE TRIGGER trigger_reducir_stock
AFTER INSERT ON ventas
FOR EACH ROW
EXECUTE FUNCTION reducir_stock_venta();

-- =====================================================
-- TRIGGER: Reducir stock cuando se inserta un detalle de venta
-- =====================================================
CREATE OR REPLACE FUNCTION reducir_stock_por_detalle()
RETURNS TRIGGER AS $$
BEGIN
  -- NOTE: stock is adjusted via movimientos_inventario (tipo='Salida') which
  -- has its own trigger (aumentar_stock_entrada) to change stock. To avoid
  -- double-decrementing stock (once here and once when the movimiento is
  -- inserted), this function is a NO-OP. The movimientos_inventario trigger
  -- will perform the actual stock changes.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reducir_stock_detalle ON detalles_venta;
CREATE TRIGGER trigger_reducir_stock_detalle
AFTER INSERT ON detalles_venta
FOR EACH ROW
EXECUTE FUNCTION reducir_stock_por_detalle();

-- =====================================================
-- TRIGGER: Crear movimiento de tipo 'Salida' al insertar un detalle de venta
-- Inserta una fila en movimientos_inventario por cada ítem vendido
-- =====================================================
CREATE OR REPLACE FUNCTION crear_movimiento_salida_por_detalle()
RETURNS TRIGGER AS $$
DECLARE
  vid_usuario UUID;
BEGIN
  -- Intentar obtener el usuario que registró la venta desde la cabecera
  SELECT id_usuario INTO vid_usuario FROM ventas WHERE id_venta = NEW.id_venta;

  INSERT INTO movimientos_inventario (tipo, cantidad, motivo, id_producto, id_usuario, fecha, notas)
  VALUES (
    'Salida',
    NEW.cantidad,
    'Venta',
    NEW.id_producto,
    vid_usuario,
    NOW(),
    'Venta ID: ' || NEW.id_venta
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_crear_movimiento_salida_detalle ON detalles_venta;
CREATE TRIGGER trigger_crear_movimiento_salida_detalle
AFTER INSERT ON detalles_venta
FOR EACH ROW
EXECUTE FUNCTION crear_movimiento_salida_por_detalle();

-- =====================================================
-- TRIGGER: Mantener ventas.total actualizado
-- Recalcula el total de la venta cuando se INSERTA/ACTUALIZA/ELIMINA
-- un detalle de venta. Idempotente: usa CREATE OR REPLACE y DROP TRIGGER IF EXISTS.
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_total_venta()
RETURNS TRIGGER AS $$
BEGIN
  -- NEW is available for INSERT/UPDATE; use its id_venta, otherwise use OLD
  PERFORM 1;
  UPDATE ventas
  SET total = (
    SELECT COALESCE(SUM(subtotal), 0) FROM detalles_venta WHERE id_venta = COALESCE(NEW.id_venta, OLD.id_venta)
  )
  WHERE id_venta = COALESCE(NEW.id_venta, OLD.id_venta);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for INSERT and UPDATE on detalles_venta
DROP TRIGGER IF EXISTS trigger_actualizar_total_detalle ON detalles_venta;
CREATE TRIGGER trigger_actualizar_total_detalle
AFTER INSERT OR UPDATE ON detalles_venta
FOR EACH ROW
EXECUTE FUNCTION actualizar_total_venta();

-- Trigger for DELETE on detalles_venta (uses OLD)
CREATE OR REPLACE FUNCTION actualizar_total_venta_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ventas
  SET total = (
    SELECT COALESCE(SUM(subtotal), 0) FROM detalles_venta WHERE id_venta = OLD.id_venta
  )
  WHERE id_venta = OLD.id_venta;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_total_detalle_delete ON detalles_venta;
CREATE TRIGGER trigger_actualizar_total_detalle_delete
AFTER DELETE ON detalles_venta
FOR EACH ROW
EXECUTE FUNCTION actualizar_total_venta_delete();

-- =====================================================
-- ÍNDICES recomendados para detalles_venta
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_detalles_venta_id_venta ON detalles_venta(id_venta);
CREATE INDEX IF NOT EXISTS idx_detalles_venta_id_producto ON detalles_venta(id_producto);

-- =====================================================
-- TRIGGER: Actualizar updated_at en productos
-- =====================================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_updated_at ON productos;
CREATE TRIGGER trigger_actualizar_updated_at
BEFORE UPDATE ON productos
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON perfiles;
CREATE POLICY "Los usuarios pueden ver su propio perfil" ON perfiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Los administradores pueden ver todos los perfiles" ON perfiles;
CREATE POLICY "Los administradores pueden ver todos los perfiles" ON perfiles
  FOR SELECT USING (
    EXISTS (
