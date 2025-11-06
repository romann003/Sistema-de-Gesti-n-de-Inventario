--Script completo de inicialización (creación de todas las tablas, índices, funciones, RLS, triggers y auditoría)

-- 0) Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 1) SCHEMAS AUXILIARES
CREATE SCHEMA IF NOT EXISTS audit;

-- 2) TABLAS PRINCIPALES (se usan IF NOT EXISTS para no sobrescribir datos existentes)

-- categorias
CREATE TABLE IF NOT EXISTS public.categorias (
  id_categoria uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  descripcion text,
  created_at timestamptz DEFAULT now()
);

-- proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
  id_proveedor uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  contacto text,
  telefono text,
  correo text,
  direccion text,
  created_at timestamptz DEFAULT now()
);

-- productos
CREATE TABLE IF NOT EXISTS public.productos (
  id_producto uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  id_categoria uuid REFERENCES public.categorias(id_categoria) ON DELETE SET NULL,
  id_proveedor uuid REFERENCES public.proveedores(id_proveedor) ON DELETE SET NULL,
  precio numeric NOT NULL DEFAULT 0,
  stock_actual integer DEFAULT 0,
  stock_minimo integer DEFAULT 0,
  stock_maximo integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id_cliente uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  contacto text,
  direccion text,
  telefono text,
  correo text,
  estado text DEFAULT 'activo' CHECK (estado = ANY (ARRAY['activo','inactivo'])),
  created_at timestamptz DEFAULT now()
);

-- usuarios (tabla de usuarios internos)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correo text UNIQUE,
  password text,
  nombre text,
  rol text CHECK (rol = ANY (ARRAY['Administrador','Empleado'])),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- movimientos_inventario
CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
  id_movimiento uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['Entrada','Ajuste','Salida'])),
  cantidad integer NOT NULL,
  motivo text,
  id_producto uuid REFERENCES public.productos(id_producto) ON DELETE SET NULL,
  id_usuario uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha timestamptz DEFAULT now(),
  notas text,
  id_usuario_temp uuid,
  id_proveedor uuid REFERENCES public.proveedores(id_proveedor) ON DELETE SET NULL
);

-- ventas
CREATE TABLE IF NOT EXISTS public.ventas (
  id_venta uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid REFERENCES public.clientes(id_cliente) ON DELETE SET NULL,
  id_usuario uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha timestamptz DEFAULT now(),
  notas text,
  id_usuario_temp uuid,
  total numeric DEFAULT 0
);

-- detalles_venta
CREATE TABLE IF NOT EXISTS public.detalles_venta (
  id_detalle uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_venta uuid REFERENCES public.ventas(id_venta) ON DELETE CASCADE,
  id_producto uuid REFERENCES public.productos(id_producto) ON DELETE SET NULL,
  cantidad integer NOT NULL,
  precio_unitario numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- productos_proveedores (relación many-to-many)
CREATE SEQUENCE IF NOT EXISTS public.productos_proveedores_id_seq;
CREATE TABLE IF NOT EXISTS public.productos_proveedores (
  id integer PRIMARY KEY DEFAULT nextval('public.productos_proveedores_id_seq'),
  id_producto uuid REFERENCES public.productos(id_producto) ON DELETE CASCADE,
  id_proveedor uuid REFERENCES public.proveedores(id_proveedor) ON DELETE CASCADE,
  es_principal boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- auditoria (tabla de auditoría en schema audit)
CREATE TABLE IF NOT EXISTS audit.auditoria (
  id_auditoria uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario uuid,
  accion text NOT NULL,
  descripcion text,
  entidad text,
  entidad_id text,
  fecha timestamptz DEFAULT now(),
  id_usuario_temp uuid
);

-- 3) ÍNDICES RECOMENDADOS
CREATE INDEX IF NOT EXISTS idx_productos_id_categoria ON public.productos(id_categoria);
CREATE INDEX IF NOT EXISTS idx_productos_id_proveedor ON public.productos(id_proveedor);
CREATE INDEX IF NOT EXISTS idx_mov_inv_id_producto ON public.movimientos_inventario(id_producto);
CREATE INDEX IF NOT EXISTS idx_mov_inv_id_usuario ON public.movimientos_inventario(id_usuario);
CREATE INDEX IF NOT EXISTS idx_ventas_id_cliente ON public.ventas(id_cliente);
CREATE INDEX IF NOT EXISTS idx_detalles_id_venta ON public.detalles_venta(id_venta);
CREATE INDEX IF NOT EXISTS idx_prodprov_id_producto ON public.productos_proveedores(id_producto);
CREATE INDEX IF NOT EXISTS idx_prodprov_id_proveedor ON public.productos_proveedores(id_proveedor);

-- 4) FUNCIONES HELPERS SEGURAS (SECURITY DEFINER)
-- Función genérica para obtener usuario actual (ejemplo: si vinculas con auth.uid())
CREATE OR REPLACE FUNCTION public.current_user_uid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.current_user_uid() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_uid() FROM anon, authenticated;

-- 5) FUNCIONES DE AUDITORÍA
CREATE OR REPLACE FUNCTION audit.log_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit.auditoria(id_usuario, accion, descripcion, entidad, entidad_id, fecha, id_usuario_temp)
  VALUES (
    COALESCE(current_setting('jwt.claims.user_id', true)::uuid, NULL),
    TG_OP,
    TG_TABLE_NAME || ' ' || COALESCE(NEW::text, OLD::text),
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text, COALESCE(NEW.id_venta::text, OLD.id_venta::text, COALESCE(NEW.id_detalle::text, OLD.id_detalle::text))),
    now(),
    COALESCE(NEW.id_usuario_temp::uuid, OLD.id_usuario_temp::uuid)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE EXECUTE ON FUNCTION audit.log_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION audit.log_changes() FROM anon, authenticated;

-- Attach triggers for audit on tables of interest
DROP TRIGGER IF EXISTS categorias_audit_trigger ON public.categorias;
CREATE TRIGGER categorias_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.categorias
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

DROP TRIGGER IF EXISTS proveedores_audit_trigger ON public.proveedores;
CREATE TRIGGER proveedores_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

DROP TRIGGER IF EXISTS productos_audit_trigger ON public.productos;
CREATE TRIGGER productos_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

DROP TRIGGER IF EXISTS clientes_audit_trigger ON public.clientes;
CREATE TRIGGER clientes_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

DROP TRIGGER IF EXISTS usuarios_audit_trigger ON public.usuarios;
CREATE TRIGGER usuarios_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

DROP TRIGGER IF EXISTS movimientos_inventario_audit_trigger ON public.movimientos_inventario;
CREATE TRIGGER movimientos_inventario_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.movimientos_inventario
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

DROP TRIGGER IF EXISTS ventas_audit_trigger ON public.ventas;
CREATE TRIGGER ventas_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.ventas
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

DROP TRIGGER IF EXISTS detalles_venta_audit_trigger ON public.detalles_venta;
CREATE TRIGGER detalles_venta_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.detalles_venta
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

DROP TRIGGER IF EXISTS productos_proveedores_audit_trigger ON public.productos_proveedores;
CREATE TRIGGER productos_proveedores_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.productos_proveedores
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

-- 6) TRIGGERS Y FUNCIONES PARA BROADCAST (Realtime)
CREATE OR REPLACE FUNCTION public.broadcast_changes_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    TG_TABLE_NAME || ':' || COALESCE(CAST(COALESCE(NEW.id, NEW.id_producto, NEW.id_venta, NEW.id_detalle, NEW.id_categoria, NEW.id_proveedor)::text, COALESCE(OLD.id::text, OLD.id_producto::text, OLD.id_venta::text)), 'none'),
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.broadcast_changes_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.broadcast_changes_trigger() FROM anon, authenticated;

-- Attach broadcast trigger to tables where realtime is useful
DROP TRIGGER IF EXISTS productos_broadcast_trigger ON public.productos;
CREATE TRIGGER productos_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_changes_trigger();

DROP TRIGGER IF EXISTS movimientos_broadcast_trigger ON public.movimientos_inventario;
CREATE TRIGGER movimientos_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.movimientos_inventario
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_changes_trigger();

DROP TRIGGER IF EXISTS ventas_broadcast_trigger ON public.ventas;
CREATE TRIGGER ventas_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.ventas
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_changes_trigger();

DROP TRIGGER IF EXISTS clientes_broadcast_trigger ON public.clientes;
CREATE TRIGGER clientes_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_changes_trigger();

-- 7) HABILITAR RLS y POLÍTICAS BÁSICAS
-- Habilitar RLS en tablas que contienen datos sensibles / multi-usuario
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalles_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos_proveedores ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: ejemplo conservador que permite a roles 'authenticated' ver datos no restringidos.
-- Ajusta las políticas según cómo gestionas auth.uid() o tus claims JWT.

-- usuarios: solo admins pueden ver todos; cada usuario ve su propio registro
CREATE POLICY IF NOT EXISTS "usuarios_is_self_or_admin" ON public.usuarios
  FOR ALL
  TO authenticated
  USING (
    (current_setting('jwt.claims.role', true) = 'admin') OR (id = (SELECT auth.uid()))
  )
  WITH CHECK (
    (current_setting('jwt.claims.role', true) = 'admin') OR (id = (SELECT auth.uid()))
  );

-- productos: permitir SELECT a authenticated, pero solo modificaciones a admins
CREATE POLICY IF NOT EXISTS "productos_select_authenticated" ON public.productos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "productos_mod_admin" ON public.productos
  FOR ALL
  TO authenticated
  USING (current_setting('jwt.claims.role', true) = 'admin')
  WITH CHECK (current_setting('jwt.claims.role', true) = 'admin');

-- movimientos_inventario: permitimos SELECT a authenticated; INSERT/UPDATE/DELETE a admins o usuarios con claim 'manage_inventory'
CREATE POLICY IF NOT EXISTS "mov_inv_select" ON public.movimientos_inventario
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "mov_inv_write" ON public.movimientos_inventario
  FOR INSERT, UPDATE, DELETE
  TO authenticated
  USING (current_setting('jwt.claims.role', true) = 'admin' OR current_setting('jwt.claims.manage_inventory', true) = 'true')
  WITH CHECK (current_setting('jwt.claims.role', true) = 'admin' OR current_setting('jwt.claims.manage_inventory', true) = 'true');

-- ventas y detalles: permisos similares (ajusta según tu flujo)
CREATE POLICY IF NOT EXISTS "ventas_select" ON public.ventas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "ventas_write" ON public.ventas
  FOR INSERT, UPDATE, DELETE
  TO authenticated
  USING (current_setting('jwt.claims.role', true) = 'admin' OR current_setting('jwt.claims.sales', true) = 'true')
  WITH CHECK (current_setting('jwt.claims.role', true) = 'admin' OR current_setting('jwt.claims.sales', true) = 'true');

CREATE POLICY IF NOT EXISTS "detalles_venta_select" ON public.detalles_venta
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "detalles_venta_write" ON public.detalles_venta
  FOR INSERT, UPDATE, DELETE
  TO authenticated
  USING (current_setting('jwt.claims.role', true) = 'admin' OR current_setting('jwt.claims.sales', true) = 'true')
  WITH CHECK (current_setting('jwt.claims.role', true) = 'admin' OR current_setting('jwt.claims.sales', true) = 'true');

-- clientes/proveedores/categorias: lectura abierta a authenticated, escrituras a roles con claims apropiados
CREATE POLICY IF NOT EXISTS "catalogs_select" ON public.clientes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "catalogs_write" ON public.clientes
  FOR INSERT, UPDATE, DELETE TO authenticated
  USING (current_setting('jwt.claims.role', true) = 'admin' OR current_setting('jwt.claims.manage_customers', true) = 'true')
  WITH CHECK (current_setting('jwt.claims.role', true) = 'admin' OR current_setting('jwt.claims.manage_customers', true) = 'true');

CREATE POLICY IF NOT EXISTS "proveedores_select" ON public.proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "proveedores_write" ON public.proveedores FOR INSERT, UPDATE, DELETE TO authenticated
  USING (current_setting('jwt.claims.role', true) = 'admin' OR current_setting('jwt.claims.manage_suppliers', true) = 'true')
  WITH CHECK (current_setting('jwt.claims.role', true) = 'admin' OR current_setting('jwt.claims.manage_suppliers', true) = 'true');

CREATE POLICY IF NOT EXISTS "categorias_select" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "categorias_write" ON public.categorias FOR INSERT, UPDATE, DELETE TO authenticated
  USING (current_setting('jwt.claims.role', true) = 'admin')
  WITH CHECK (current_setting('jwt.claims.role', true) = 'admin');

CREATE POLICY IF NOT EXISTS "productos_proveedores_select" ON public.productos_proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "productos_proveedores_write" ON public.productos_proveedores FOR INSERT, UPDATE, DELETE TO authenticated
  USING (current_setting('jwt.claims.role', true) = 'admin')
  WITH CHECK (current_setting('jwt.claims.role', true) = 'admin');

-- 8) TRIGGERS DE NEGOCIO
-- Ejemplo: actualizar stock_actual en productos al insertar un movimiento de inventario
CREATE OR REPLACE FUNCTION public.update_stock_on_movimiento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.id_producto IS NOT NULL THEN
      IF NEW.tipo = 'Entrada' THEN
        UPDATE public.productos SET stock_actual = COALESCE(stock_actual,0) + NEW.cantidad, updated_at = now() WHERE id_producto = NEW.id_producto;
      ELSIF NEW.tipo = 'Salida' THEN
        UPDATE public.productos SET stock_actual = COALESCE(stock_actual,0) - NEW.cantidad, updated_at = now() WHERE id_producto = NEW.id_producto;
      ELSIF NEW.tipo = 'Ajuste' THEN
        -- si el motivo incluye símbolo +/- puedes implementar parseo, por defecto no cambia
        NULL;
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Opcional: ajustar stock según diferencia entre OLD y NEW si cambió cantidad/tipo
    NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_stock_on_movimiento() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_stock_on_movimiento() FROM anon, authenticated;

DROP TRIGGER IF EXISTS movimientos_update_stock_trigger ON public.movimientos_inventario;
CREATE TRIGGER movimientos_update_stock_trigger
  AFTER INSERT ON public.movimientos_inventario
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_on_movimiento();

-- 9) VALIDACIONES Y DEFAULTS ADICIONALES
-- Trigger para mantener updated_at en tablas que lo usan
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at = now();
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach updated_at triggers
DROP TRIGGER IF EXISTS productos_set_updated_at ON public.productos;
CREATE TRIGGER productos_set_updated_at
  BEFORE UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS productos_proveedores_set_updated_at ON public.productos_proveedores;
CREATE TRIGGER productos_proveedores_set_updated_at
  BEFORE UPDATE ON public.productos_proveedores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS usuarios_set_updated_at ON public.usuarios;
CREATE TRIGGER usuarios_set_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10) COMPROBACIÓN FINAL: listar tablas creadas en public
SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;