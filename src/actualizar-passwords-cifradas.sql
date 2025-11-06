-- Script para actualizar las contraseñas a formato cifrado (SHA-256)
-- IMPORTANTE: Ejecutar este script SOLO SI ya tienes usuarios con contraseñas en texto plano

-- Las contraseñas cifradas usando SHA-256:
-- admin123 -> 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
-- empleado123 -> 6cdc55d93c80c5a2c25bef4fc89e3e0e4f42e6a5e9a9fc8e48d0e0b1c2b88f1f

-- Actualizar contraseña del administrador
UPDATE usuarios 
SET password = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
WHERE correo = 'admin@inventario.com';

-- Actualizar contraseña del empleado  
UPDATE usuarios
SET password = '6cdc55d93c80c5a2c25bef4fc89e3e0e4f42e6a5e9a9fc8e48d0e0b1c2b88f1f'
WHERE correo = 'empleado@inventario.com';

-- Verificar actualización
SELECT 
  nombre,
  correo,
  rol,
  CASE 
    WHEN LENGTH(password) = 64 THEN '✅ Cifrada (SHA-256)'
    ELSE '❌ Texto plano'
  END as estado_password,
  created_at
FROM usuarios
ORDER BY created_at;

-- NOTA: Si el script crear-tabla-usuarios.sql ya crea las contraseñas cifradas,
-- NO ES NECESARIO ejecutar este script.
