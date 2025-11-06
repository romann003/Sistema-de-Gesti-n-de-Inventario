-- Script inicial para configurar una base de datos Supabase/Postgres
-- Incluye: extensiones, roles mínimos, políticas RLS ejemplo, funciones helper seguras,
-- índices recomendados y triggers para realtime.broadcast_changes.
-- ADAPTAR: reemplaza nombres de tablas/columnas/claims según tu modelo.

-- 1) EXTENSIONES ÚTILES
-- Habilitar extensiones comunes
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 2) ROLES Y PRIVILEGIOS (opcional — revisar según modelo)
-- Nota: en Supabase los roles anon / authenticated / service_role existen.
-- Aquí solo creamos un rol de solo-lectura ejemplo para integraciones internas.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'read_only') THEN
    CREATE ROLE read_only NOLOGIN;
  END IF;
END$$;

-- Conceder SELECT en esquema público al rol read_only (modifica según necesidades)
GRANT USAGE ON SCHEMA public TO read_only;
-- Para conceder select en todas las tablas actuales y futuras:
GRANT SELECT ON ALL TABLES IN SCHEMA public TO read_only;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO read_only;

-- 3) MÉTRICAS Y MONITOREO (opcional)
-- Habilitar trackeo de consultas pesadas: pg_stat_statements ya activo arriba.
-- Crear tabla de auditoría mínima (ejemplo)
CREATE TABLE IF NOT EXISTS audit.log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  username text,
  action text,
  object_type text,
  object_id text,
  detail jsonb
);

-- 4) TABLAS EJEMPLO (estructura base multi-tenant + ownership)
-- Cambia nombres y tipos según tu dominio. Mantengo un patrón tenant_id y user_id.

-- users_profiles: almacena información del usuario vinculada al auth.uid()
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE, -- debe coincidir con auth.uid()
  email citext,
  full_name text,
  tenant_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- organizations/tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ejemplo de datos multi-tenant (recursos)
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  title text,
  content text,
  is_private boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5) ÍNDICES RECOMENDADOS (rendimiento para RLS y búsquedas)
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON public.user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner_user_id ON public.documents(owner_user_id);

-- 6) FUNCIONES HELPER SEGURAS (SECURITY DEFINER)
-- Función para devolver el tenant_id del usuario a partir de user_profiles
CREATE OR REPLACE FUNCTION public.get_user_tenant()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.user_profiles WHERE auth_user_id = auth.uid();
$$;

-- Restringir ejecución a roles de servicio (revocar de anon/authenticated)
REVOKE EXECUTE ON FUNCTION public.get_user_tenant() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant() FROM anon, authenticated;

-- 7) HABILITAR RLS Y POLÍTICAS (por tabla)
-- Habilitar RLS en tablas sensibles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- user_profiles: solo el usuario (auth.uid()) o roles de servicio pueden ver/editar su perfil
CREATE POLICY IF NOT EXISTS "user_profiles_owner_select" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = auth_user_id);

CREATE POLICY IF NOT EXISTS "user_profiles_owner_insert" ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = auth_user_id);

CREATE POLICY IF NOT EXISTS "user_profiles_owner_update" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = auth_user_id)
  WITH CHECK ((SELECT auth.uid()) = auth_user_id);

-- documents: acceso por tenant y por propietario
CREATE POLICY IF NOT EXISTS "documents_tenant_select" ON public.documents
  FOR SELECT
  TO authenticated
  USING (tenant_id = (SELECT get_user_tenant()));

CREATE POLICY IF NOT EXISTS "documents_owner_select" ON public.documents
  FOR SELECT
  TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

CREATE POLICY IF NOT EXISTS "documents_tenant_insert" ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (SELECT get_user_tenant()) AND owner_user_id = (SELECT auth.uid()));

CREATE POLICY IF NOT EXISTS "documents_owner_update" ON public.documents
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()) AND tenant_id = (SELECT get_user_tenant()));

CREATE POLICY IF NOT EXISTS "documents_owner_delete" ON public.documents
  FOR DELETE
  TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

-- tenants: solo usuarios con tenant_id igual pueden ver su tenant (ajustar según roles administrativos)
CREATE POLICY IF NOT EXISTS "tenants_tenant_select" ON public.tenants
  FOR SELECT
  TO authenticated
  USING (id = (SELECT get_user_tenant()));

-- 8) AUDITORÍA TRIGGER (ejemplo ligero)
-- función para insertar en audit.log
CREATE OR REPLACE FUNCTION audit.log_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO audit.log(username, action, object_type, object_id, detail)
  VALUES (
    current_user,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    to_jsonb(COALESCE(NEW, OLD))
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear triggers de auditoría para las tablas importantes
DROP TRIGGER IF EXISTS user_profiles_audit_trigger ON public.user_profiles;
CREATE TRIGGER user_profiles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

DROP TRIGGER IF EXISTS documents_audit_trigger ON public.documents;
CREATE TRIGGER documents_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

-- 9) TRIGGERS PARA BROADCAST (Realtime)
-- Función genérica para usar realtime.broadcast_changes (segura)
CREATE OR REPLACE FUNCTION public.broadcast_changes_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'tenant:' || COALESCE(NEW.tenant_id, OLD.tenant_id)::text,
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

-- Revoke execute from public roles to be seguro
REVOKE EXECUTE ON FUNCTION public.broadcast_changes_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.broadcast_changes_trigger() FROM anon, authenticated;

-- Attach trigger a documents (ajusta si hay tablas sin tenant)
DROP TRIGGER IF EXISTS documents_broadcast_trigger ON public.documents;
CREATE TRIGGER documents_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_changes_trigger();

-- 10) EJEMPLOS DE POLÍTICAS DE STORAGE (si usas storage.objects)
-- Estas políticas asumen que usas bucket 'user-uploads' y que la primera carpeta es el auth uid
-- No se crean aquí las tablas de storage (ya administradas por Supabase), pero mostramos políticas recomendadas.

-- SELECT policy: usuarios pueden ver sus archivos
-- CREATE POLICY "User file access" ON storage.objects FOR SELECT TO authenticated
-- USING (bucket_id = 'user-uploads' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- INSERT policy: usuarios solo insertan en su carpeta
-- CREATE POLICY "User uploads" ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'user-uploads' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- 11) OTROS AJUSTES / RECOMENDACIONES
--  - Revisa y añade índices según consultas reales.
--  - Mantén funciones SECURITY DEFINER con permisos revocados a anon/authenticated.
--  - Considera crear roles/claims custom en el JWT (ej: user_role, tenant_id) y adaptar policies a auth.jwt() ->> 'claim'.
--  - Hacer pruebas con usuarios distintos (anon / authenticated / service_role) para validar políticas RLS.

-- 12) VALIDACIONES FINALES
-- Comprobación rápida: listar tablas creadas en public
SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- FIN DEL SCRIPT