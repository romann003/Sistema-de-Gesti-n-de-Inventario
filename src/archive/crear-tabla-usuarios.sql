-- =====================================================
-- Script: crear-tabla-usuarios.sql
-- Crea la tabla `usuarios` que usa la app para autenticación local
-- =====================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_usuario TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre_completo TEXT,
  rol TEXT DEFAULT 'user',
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE usuarios IS 'Usuarios locales para acceso administrativo/legacy. Preferible usar Supabase Auth en producción.';

-- Ejemplo de inserción (hashes deben generarse con la utilidad proporcionada en generar-hashes.html)
-- INSERT INTO usuarios (nombre_usuario, password_hash, nombre_completo, rol)
-- VALUES ('admin', '<SHA256-HEX-HASH>', 'Administrador del sistema', 'admin');

-- Verificación
-- SELECT * FROM usuarios LIMIT 5;
