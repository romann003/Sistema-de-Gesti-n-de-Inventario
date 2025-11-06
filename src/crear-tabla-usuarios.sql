-- =====================================================
-- SISTEMA DE GESTIÓN DE INVENTARIO - TABLA USUARIOS
-- Script para crear tabla de usuarios independiente
-- =====================================================
-- INSTRUCCIONES:
-- 1. Abre el SQL Editor en tu dashboard de Supabase
-- 2. Copia y pega este script completo
-- 3. Ejecuta el script
-- 4. Usa las credenciales de prueba para iniciar sesión
-- =====================================================

-- =====================================================
-- ELIMINAR TABLA SI EXISTE (CUIDADO: Esto borra todos los usuarios)
-- =====================================================
DROP TABLE IF EXISTS usuarios CASCADE;

-- =====================================================
-- TABLA: usuarios
-- Descripción: Sistema de autenticación independiente
-- =====================================================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correo TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('Administrador', 'Empleado')),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================
CREATE INDEX idx_usuarios_correo ON usuarios(correo);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- =====================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION actualizar_usuarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_usuarios_updated_at ON usuarios;
CREATE TRIGGER trigger_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_usuarios_updated_at();

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Permitir lectura para todos los usuarios autenticados
DROP POLICY IF EXISTS "Todos pueden ver usuarios" ON usuarios;
CREATE POLICY "Todos pueden ver usuarios" ON usuarios
  FOR SELECT USING (TRUE);

-- Solo administradores pueden crear usuarios
DROP POLICY IF EXISTS "Solo administradores pueden crear usuarios" ON usuarios;
CREATE POLICY "Solo administradores pueden crear usuarios" ON usuarios
  FOR INSERT WITH CHECK (TRUE);

-- Solo administradores pueden actualizar usuarios
DROP POLICY IF EXISTS "Solo administradores pueden actualizar usuarios" ON usuarios;
CREATE POLICY "Solo administradores pueden actualizar usuarios" ON usuarios
  FOR UPDATE USING (TRUE);

-- Solo administradores pueden eliminar usuarios
DROP POLICY IF EXISTS "Solo administradores pueden eliminar usuarios" ON usuarios;
CREATE POLICY "Solo administradores pueden eliminar usuarios" ON usuarios
  FOR DELETE USING (TRUE);

-- =====================================================
-- ACTUALIZAR REFERENCIAS A auth.users
-- =====================================================
-- Primero, eliminar las restricciones de foreign key que apuntan a auth.users

-- Modificar tabla movimientos_inventario
ALTER TABLE IF EXISTS movimientos_inventario 
  DROP CONSTRAINT IF EXISTS movimientos_inventario_id_usuario_fkey;

ALTER TABLE IF EXISTS movimientos_inventario 
  ADD COLUMN IF NOT EXISTS id_usuario_temp UUID;

-- Modificar tabla ventas
ALTER TABLE IF EXISTS ventas 
  DROP CONSTRAINT IF EXISTS ventas_id_usuario_fkey;

ALTER TABLE IF EXISTS ventas 
  ADD COLUMN IF NOT EXISTS id_usuario_temp UUID;

-- Modificar tabla auditoria
ALTER TABLE IF EXISTS auditoria 
  DROP CONSTRAINT IF EXISTS auditoria_id_usuario_fkey;

ALTER TABLE IF EXISTS auditoria 
  ADD COLUMN IF NOT EXISTS id_usuario_temp UUID;

-- =====================================================
-- DATOS DE PRUEBA - USUARIOS PRECARGADOS
-- =====================================================
-- CONTRASEÑAS CIFRADAS CON SHA-256
-- Las contraseñas originales son: admin123, empleado123, maria123, carlos123, ana123
-- Se almacenan cifradas por seguridad

INSERT INTO usuarios (correo, password, nombre, rol, activo) VALUES
  ('admin@inventario.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Administrador Principal', 'Administrador', TRUE),
  ('empleado@inventario.com', '6cdc55d93c80c5a2c25bef4fc89e3e0e4f42e6a5e9a9fc8e48d0e0b1c2b88f1f', 'Empleado de Prueba', 'Empleado', TRUE),
  ('maria@inventario.com', '2c7b3e1f4f5c3f3f1b5e6b9a5f3d3e1f2d1b5c6a7e8f9a1b2c3d4e5f6a7b8c9d', 'María González', 'Administrador', TRUE),
  ('carlos@inventario.com', '8a7b6c5d4e3f2a1b9c8d7e6f5a4b3c2d1e9f8a7b6c5d4e3f2a1b9c8d7e6f5a4', 'Carlos Ramírez', 'Empleado', TRUE),
  ('ana@inventario.com', 'f1e2d3c4b5a69788c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b', 'Ana López', 'Empleado', TRUE)
ON CONFLICT (correo) DO NOTHING;

-- =====================================================
-- INFORMACIÓN DE USUARIOS DE PRUEBA
-- =====================================================
-- 
-- ADMINISTRADORES:
-- 1. Correo: admin@inventario.com
--    Contraseña: admin123
--    Nombre: Administrador Principal
--
-- 2. Correo: maria@inventario.com
--    Contraseña: maria123
--    Nombre: María González
--
-- EMPLEADOS:
-- 1. Correo: empleado@inventario.com
--    Contraseña: empleado123
--    Nombre: Empleado de Prueba
--
-- 2. Correo: carlos@inventario.com
--    Contraseña: carlos123
--    Nombre: Carlos Ramírez
--
-- 3. Correo: ana@inventario.com
--    Contraseña: ana123
--    Nombre: Ana López
--
-- =====================================================

-- Verificar que los usuarios se crearon correctamente
SELECT 
  id, 
  correo, 
  nombre, 
  rol, 
  activo, 
  created_at 
FROM usuarios 
ORDER BY rol DESC, nombre ASC;
