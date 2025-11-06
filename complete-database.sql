-- =====================================================
-- COMPLETE DATABASE SCRIPT
-- Combined and ordered SQL for quick deployment.
-- Generated: 2025-11-05
-- Contents: extensions → schema (tables) → indexes → functions/triggers → RLS/policies → supplemental scripts/migrations
-- IMPORTANT: Review before running on production. Keep backups.
-- =====================================================

-- === EXTENSIONS ===
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- === MAIN SCHEMA AND OBJECTS (from database-setup.sql) ===

-- BEGIN: database-setup.sql

-- =====================================================
-- SISTEMA DE GESTIÓN DE INVENTARIO PARA PyME
-- Script de Creación de Base de Datos
-- (content from src/archive/database-setup.sql)
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
  -- double-decrementing stock (once here and once when the movimiento es
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

-- (policies continue in original file)

-- END: database-setup.sql


-- === SUPPLEMENTAL: tabla-auditoria.sql ===
-- (content from src/archive/tabla-auditoria.sql)

-- Crear tabla de auditoría si no existe
CREATE TABLE IF NOT EXISTS auditoria (
  id_auditoria UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID REFERENCES usuarios(id),
  accion VARCHAR(50) NOT NULL,
  entidad VARCHAR(100) NOT NULL,
  entidad_id VARCHAR(255),
  descripcion TEXT NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(id_usuario);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad, entidad_id);

-- Comentarios para documentación
COMMENT ON TABLE auditoria IS 'Registro de auditoría de todas las operaciones del sistema';
COMMENT ON COLUMN auditoria.accion IS 'Tipo de acción: create, edit, delete, sale, movement';
COMMENT ON COLUMN auditoria.entidad IS 'Tipo de entidad afectada: product, category, user, supplier, customer, inventory';
COMMENT ON COLUMN auditoria.descripcion IS 'Descripción detallada de la acción realizada';

-- === SUPPLEMENTAL: crear-tabla-usuarios.sql ===
-- (content from src/archive/crear-tabla-usuarios.sql)

-- Script: crear-tabla-usuarios.sql
-- Crea la tabla `usuarios` que usa la app para autenticación local

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_usuario TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre_completo TEXT,
  rol TEXT DEFAULT 'user',
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE usuarios IS 'Usuarios locales para acceso administrativo/legacy. Preferible usar Supabase Auth en producción.';

-- === MIGRATIONS: database-add-proveedor-to-movements.sql ===
-- (content from src/archive/database-add-proveedor-to-movements.sql)

-- MIGRACIÓN: Agregar columna id_proveedor a movimientos_inventario

-- Agregar columna id_proveedor a la tabla movimientos_inventario
ALTER TABLE movimientos_inventario 
ADD COLUMN IF NOT EXISTS id_proveedor UUID REFERENCES proveedores(id_proveedor) ON DELETE SET NULL;

-- Crear índice para mejorar rendimiento de búsquedas por proveedor
CREATE INDEX IF NOT EXISTS idx_movimientos_proveedor ON movimientos_inventario(id_proveedor);

-- Comentario para documentación
COMMENT ON COLUMN movimientos_inventario.id_proveedor IS 'Referencia al proveedor de donde se compró el producto (para movimientos tipo Entrada)';

-- === MIGRATIONS: database-update-proveedores.sql ===
-- (content from src/archive/database-update-proveedores.sql)

-- MIGRACIÓN: database-update-proveedores.sql
-- Actualizaciones en la tabla proveedores (ejemplo)

-- 1) Añadir columna email de contacto si no existe
ALTER TABLE proveedores
ADD COLUMN IF NOT EXISTS email_contacto TEXT;

-- 3) Crear índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(lower(nombre));

-- === SUPPLEMENTAL: actualizar-passwords-cifradas.sql (template) ===
-- (content from src/archive/actualizar-passwords-cifradas.sql)

-- Script: actualizar-passwords-cifradas.sql
-- Uso: actualizar hash de contraseñas en la tabla `usuarios` si necesitas reemplazarlas
-- Ejemplo: actualizar el hash del usuario 'demo'
-- UPDATE usuarios SET password_hash = '<NUEVO_HASH_SHA256>' WHERE nombre_usuario = 'demo';

-- Para generar hashes localmente, usa la utilidad `src/generar-hashes.html` o cualquier script/herramienta que produzca SHA-256 en hex.

-- === END OF FILE ===
