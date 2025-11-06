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
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Los administradores pueden actualizar perfiles" ON perfiles;
CREATE POLICY "Los administradores pueden actualizar perfiles" ON perfiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

-- Políticas para categorías (todos pueden leer, solo admin puede modificar)
DROP POLICY IF EXISTS "Todos pueden ver categorías" ON categorias;
CREATE POLICY "Todos pueden ver categorías" ON categorias
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Solo administradores pueden crear categorías" ON categorias;
CREATE POLICY "Solo administradores pueden crear categorías" ON categorias
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Solo administradores pueden actualizar categorías" ON categorias;
CREATE POLICY "Solo administradores pueden actualizar categorías" ON categorias
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Solo administradores pueden eliminar categorías" ON categorias;
CREATE POLICY "Solo administradores pueden eliminar categorías" ON categorias
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

-- Políticas para proveedores
DROP POLICY IF EXISTS "Todos pueden ver proveedores" ON proveedores;
CREATE POLICY "Todos pueden ver proveedores" ON proveedores
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Solo administradores pueden crear proveedores" ON proveedores;
CREATE POLICY "Solo administradores pueden crear proveedores" ON proveedores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Solo administradores pueden actualizar proveedores" ON proveedores;
CREATE POLICY "Solo administradores pueden actualizar proveedores" ON proveedores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Solo administradores pueden eliminar proveedores" ON proveedores;
CREATE POLICY "Solo administradores pueden eliminar proveedores" ON proveedores
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

-- Políticas para productos
DROP POLICY IF EXISTS "Todos pueden ver productos" ON productos;
CREATE POLICY "Todos pueden ver productos" ON productos
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Solo administradores pueden crear productos" ON productos;
CREATE POLICY "Solo administradores pueden crear productos" ON productos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Solo administradores pueden actualizar productos" ON productos;
CREATE POLICY "Solo administradores pueden actualizar productos" ON productos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Solo administradores pueden eliminar productos" ON productos;
CREATE POLICY "Solo administradores pueden eliminar productos" ON productos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

-- Políticas para clientes
DROP POLICY IF EXISTS "Todos pueden ver clientes" ON clientes;
CREATE POLICY "Todos pueden ver clientes" ON clientes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Todos pueden crear clientes" ON clientes;
CREATE POLICY "Todos pueden crear clientes" ON clientes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Solo administradores pueden actualizar clientes" ON clientes;
CREATE POLICY "Solo administradores pueden actualizar clientes" ON clientes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Solo administradores pueden eliminar clientes" ON clientes;
CREATE POLICY "Solo administradores pueden eliminar clientes" ON clientes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

-- Políticas para movimientos de inventario
DROP POLICY IF EXISTS "Todos pueden ver movimientos" ON movimientos_inventario;
CREATE POLICY "Todos pueden ver movimientos" ON movimientos_inventario
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Todos pueden crear movimientos" ON movimientos_inventario;
CREATE POLICY "Todos pueden crear movimientos" ON movimientos_inventario
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para ventas
DROP POLICY IF EXISTS "Todos pueden ver ventas" ON ventas;
CREATE POLICY "Todos pueden ver ventas" ON ventas
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Todos pueden crear ventas" ON ventas;
CREATE POLICY "Todos pueden crear ventas" ON ventas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para auditoría
DROP POLICY IF EXISTS "Todos pueden ver auditoría" ON auditoria;
CREATE POLICY "Todos pueden ver auditoría" ON auditoria
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Sistema puede crear registros de auditoría" ON auditoria;
CREATE POLICY "Sistema puede crear registros de auditoría" ON auditoria
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- DATOS DE EJEMPLO
-- =====================================================

-- Insertar categorías de ejemplo
INSERT INTO categorias (nombre, descripcion) VALUES
  ('Electrónica', 'Productos electrónicos y tecnológicos'),
  ('Papelería', 'Artículos de oficina y papelería'),
  ('Alimentos', 'Productos alimenticios'),
  ('Limpieza', 'Productos de limpieza y mantenimiento'),
  ('Herramientas', 'Herramientas y equipos')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar proveedores de ejemplo
INSERT INTO proveedores (nombre, contacto, telefono, correo, direccion) VALUES
  ('TechSupply SA', 'Juan Pérez', '+52 55 1234 5678', 'contacto@techsupply.com', 'Av. Tecnología 123, CDMX'),
  ('Office Solutions', 'María García', '+52 55 8765 4321', 'ventas@officesol.com', 'Calle Oficina 456, Monterrey'),
  ('Alimentos del Norte', 'Carlos López', '+52 81 2345 6789', 'pedidos@alimentosnorte.com', 'Blvd. Industrial 789, Guadalajara')
ON CONFLICT DO NOTHING;

-- =====================================================
-- NOTA IMPORTANTE
-- =====================================================
-- Los usuarios de prueba se crearán a través de la API de autenticación
-- Ver el archivo USUARIOS-PRUEBA.md para las credenciales
-- =====================================================

-- =====================================================
-- MIGRACIÓN: mover columnas legacy de `ventas` a `detalles_venta` (si existen)
-- Este bloque detecta columnas antiguas como `id_producto` o `producto_id`,
-- junto con variantes de `cantidad` y `precio`. Inserta filas en
-- `detalles_venta` sólo si no existen ya detalles para esa venta+producto.
-- Es idempotente: si ya existen detalles no insertará duplicados.
-- Ejecuta primero en modo lectura (hacer un BACKUP previo recomendado),
-- revisa los resultados y después procede a ejecutar en producción.
DO $$
DECLARE
  idprod_col TEXT;
  qty_col TEXT;
  price_col TEXT;
  subtotal_col TEXT;
  sql TEXT;
BEGIN
  -- Detectar columna de producto en ventas
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ventas' AND column_name='id_producto') THEN
    idprod_col := 'id_producto';
  ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ventas' AND column_name='producto_id') THEN
    idprod_col := 'producto_id';
  ELSE
    idprod_col := NULL;
  END IF;

  IF idprod_col IS NOT NULL THEN
    -- Detectar columna de cantidad
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ventas' AND column_name='cantidad') THEN
      qty_col := 'cantidad';
    ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ventas' AND column_name='cantidad_producto') THEN
      qty_col := 'cantidad_producto';
    ELSE
      qty_col := NULL;
    END IF;

    -- Detectar columna de precio
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ventas' AND column_name='precio_unitario') THEN
      price_col := 'precio_unitario';
    ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ventas' AND column_name='precio') THEN
      price_col := 'precio';
    ELSE
      price_col := NULL;
    END IF;

    -- Detectar columna subtotal si existe
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ventas' AND column_name='subtotal') THEN
      subtotal_col := 'subtotal';
    ELSE
      subtotal_col := NULL;
    END IF;

    IF qty_col IS NULL THEN
      RAISE NOTICE 'No se encontró columna de cantidad en ventas; se omite la migración de ítems legacy.';
    ELSE
      -- Construir y ejecutar el INSERT dinámico
      sql := 'INSERT INTO detalles_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal, created_at) ' ||
             'SELECT v.id_venta, v.' || idprod_col || ', v.' || qty_col || ', ' ||
             CASE WHEN price_col IS NOT NULL THEN 'v.' || price_col ELSE '0' END || ', ' ||
             CASE WHEN subtotal_col IS NOT NULL THEN 'v.' || subtotal_col ELSE 'COALESCE(v.' || qty_col || ' * ' || (CASE WHEN price_col IS NOT NULL THEN 'v.' || price_col ELSE '0' END) || ', 0)' END ||
             ', NOW() FROM ventas v WHERE v.' || idprod_col || ' IS NOT NULL ' ||
             'AND NOT EXISTS (SELECT 1 FROM detalles_venta dv WHERE dv.id_venta = v.id_venta AND dv.id_producto = v.' || idprod_col || ');';
      EXECUTE sql;
    END IF;
  ELSE
    RAISE NOTICE 'No se detectó columna de producto legacy en ventas; nada que migrar.';
  END IF;
END$$;

