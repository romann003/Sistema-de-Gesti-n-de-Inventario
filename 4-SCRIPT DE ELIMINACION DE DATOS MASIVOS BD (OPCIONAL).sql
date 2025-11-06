-- seed-cleanup.sql
-- Purpose: Truncate application tables to get a clean database before running seed data.
-- WARNING: This will permanently delete data. Run only against dev/test databases. Make a backup before running on anything important.
-- Run as a privileged role (DB owner / service_role for Supabase) so RLS doesn't block the operation.

-- We use a DO block to check table existence before truncating because
-- PostgreSQL does not support `TRUNCATE TABLE IF EXISTS ...`.
-- Run this as a privileged role (DB owner / service_role) so RLS doesn't block the operations.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'detalles_venta') THEN
    EXECUTE 'TRUNCATE TABLE detalles_venta RESTART IDENTITY CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'movimientos_inventario') THEN
    EXECUTE 'TRUNCATE TABLE movimientos_inventario RESTART IDENTITY CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'productos_proveedores') THEN
    EXECUTE 'TRUNCATE TABLE productos_proveedores RESTART IDENTITY CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas') THEN
    EXECUTE 'TRUNCATE TABLE ventas RESTART IDENTITY CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'productos') THEN
    EXECUTE 'TRUNCATE TABLE productos RESTART IDENTITY CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proveedores') THEN
    EXECUTE 'TRUNCATE TABLE proveedores RESTART IDENTITY CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categorias') THEN
    EXECUTE 'TRUNCATE TABLE categorias RESTART IDENTITY CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes') THEN
    EXECUTE 'TRUNCATE TABLE clientes RESTART IDENTITY CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditoria') THEN
    EXECUTE 'TRUNCATE TABLE auditoria RESTART IDENTITY CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'perfiles') THEN
    EXECUTE 'TRUNCATE TABLE perfiles RESTART IDENTITY CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') THEN
    EXECUTE 'TRUNCATE TABLE usuarios RESTART IDENTITY CASCADE';
  END IF;
END$$;

-- Notes:
-- * This script omits truncating `auth.users` (Supabase auth) on purpose. If you need to clear auth users,
--   do that manually with caution (and be aware of Supabase-specific protection and backups).
-- * If your environment has Row Level Security (RLS) enabled, run this as a privileged role (e.g. service_role)
--   or temporarily disable RLS on those tables before running.
-- * If a table in this list does not exist in your schema, TRUNCATE ... IF EXISTS will silently skip it.
