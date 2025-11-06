-- =====================================================
-- Script: actualizar-passwords-cifradas.sql
-- Uso: actualizar hash de contraseñas en la tabla `usuarios` si necesitas reemplazarlas
-- NOTA: Este script asume que tienes los hashes SHA-256 listos (en hex) y que la columna password_hash contiene dichos hashes.
-- =====================================================

-- Ejemplo: actualizar el hash del usuario 'demo'
-- UPDATE usuarios SET password_hash = '<NUEVO_HASH_SHA256>' WHERE nombre_usuario = 'demo';

-- Para generar hashes localmente, usa la utilidad `src/generar-hashes.html` o cualquier script/herramienta que produzca SHA-256 en hex.

-- Verificación
-- SELECT nombre_usuario, substr(password_hash,1,6) as hash_preview FROM usuarios LIMIT 10;
