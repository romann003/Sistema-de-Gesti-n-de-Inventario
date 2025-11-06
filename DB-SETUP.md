# DB-SETUP — Instalación de la base de datos (Supabase / Postgres)

Este documento describe los pasos mínimos para instalar y poner en marcha la base de datos usada por la app "Sistema de Gestión de Inventario" en otra máquina o en un proyecto Supabase nuevo.

Resumen rápido (orden recomendado):
1. Crear proyecto en Supabase (o una instancia PostgreSQL).
2. Ejecutar `database-setup.sql` (crea tablas, índices, funciones y triggers).
3. Ejecutar `crear-tabla-usuarios.sql` y añadir usuarios locales (opcional).
4. Ejecutar migraciones: `database-add-proveedor-to-movements.sql`, `database-update-proveedores.sql`.
5. Ejecutar scripts de datos de ejemplo que provea el repo (si los hay).
6. Revisar RLS / Policies y roles si usas Supabase Auth.

Archivos relevantes (en el repo `src/` y `src/archive/`):
- src/archive/database-setup.sql — Script principal con esquema y triggers.
- src/archive/crear-tabla-usuarios.sql — Tabla de usuarios locales (legacy).
- src/archive/database-add-proveedor-to-movements.sql — Migración para movimientos_inventario.
- src/archive/database-update-proveedores.sql — Migraciones adicionales para proveedores.
- src/archive/actualizar-passwords-cifradas.sql — Plantilla para actualizar hashes de contraseñas.
- src/generar-hashes.html — Utilidad local para generar hashes SHA-256 (útil para contraseñas de ejemplo).

Requisitos previos
- Supabase (recomendado) o PostgreSQL >= 13
- psql (cliente) o acceso al SQL Editor de Supabase
- (Opcional) supabase CLI si quieres automatizar deploy

Instalación con Supabase (GUI)

1. Crea un nuevo proyecto en https://app.supabase.io (elige región y plan según tus necesidades).

2. Abre el SQL Editor del proyecto (Sidebar > SQL Editor).

3. Ejecuta los scripts en este orden (puedes pegarlos en el editor y ejecutarlos uno por uno). Si ves errores relacionados con triggers o referencias, ejecuta primero las CREATE TABLE, luego funciones/triggers y por último los INSERTs/migraciones.

   a) `src/archive/database-setup.sql` — esquema principal (tablas, índices, funciones, triggers). Si es muy largo, pega y ejecuta secciones en este orden:
      - Extensiones y configuraciones (p. ej. `CREATE EXTENSION IF NOT EXISTS pgcrypto;`).
      - `CREATE TABLE` (todas las tablas).
      - `CREATE INDEX` y constraint adicionales.
      - Funciones y `CREATE TRIGGER`.
      - Inserts de datos de prueba.

   b) `src/archive/crear-tabla-usuarios.sql` — opcional: tabla `usuarios` (legacy) y ejemplo de inserción.

   c) Migraciones (si aplica):
      - `src/archive/database-add-proveedor-to-movements.sql`
      - `src/archive/database-update-proveedores.sql`

4. Verificaciones rápidas en el SQL Editor (ejecuta cada consulta y revisa resultados):

   - SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
   - SELECT count(*) FROM productos;
   - SELECT count(*) FROM movimientos_inventario;
   - SELECT * FROM proveedores LIMIT 5;

5. RLS / Policies: si el script crea policies, revísalas en Settings > Auth > Policies (o busca las definiciones en el `database-setup.sql`). Para pruebas rápidas puedes deshabilitar temporalmente RLS en una tabla con:

   ALTER TABLE <tabla> DISABLE ROW LEVEL SECURITY;

   (No dejar así en producción.)

Instalación con psql (Postgres local / VPS)

1. Crear la base de datos y habilitar extensiones necesarias (ejemplo en PowerShell):

   # Crear la base de datos (ejecutar desde PowerShell)
   createdb inventario_db

   # Conectarse y crear la extensión pgcrypto (si `database-setup.sql` no la crea)
   psql -d inventario_db -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

2. Ejecutar los scripts con `psql`. En PowerShell (asegúrate de usar rutas con \):

   # Ejecutar el script principal
   psql -d inventario_db -f "src\archive\database-setup.sql"

   # Opcional: tabla de usuarios local
   psql -d inventario_db -f "src\archive\crear-tabla-usuarios.sql"

   # Migraciones
   psql -d inventario_db -f "src\archive\database-add-proveedor-to-movements.sql"
   psql -d inventario_db -f "src\archive\database-update-proveedores.sql"

   Nota: si algún script falla por sintaxis específica (p. ej. soporte de `IF NOT EXISTS` en ADD COLUMN depende de la versión), puedes editar temporalmente la línea problemática o ejecutar la operación en dos pasos (crear columna sin IF NOT EXISTS, capturar error si ya existe).

Notas sobre RLS / Policies y Supabase Auth

- Si usas Supabase Auth, revisa las policies definidas en `database-setup.sql` (si las hay). Las policies se aplican a roles como `anon` y `authenticated`.
- Para desarrollo rápido puedes desactivar RLS temporalmente (no recomendado para producción):

   ALTER TABLE <tabla> DISABLE ROW LEVEL SECURITY;

- Si prefieres pruebas con un token de servicio (service_role) usa ese rol para ejecutar queries de verificación desde tu backend. No expongas service_role en el frontend.

Usuarios y contraseñas
- Si necesitas insertar contraseñas de ejemplo en `usuarios.password_hash`, usa `src/generar-hashes.html` para generar SHA-256 hex y copia el resultado.
- Ejemplo de inserción (reemplaza <HASH>):
  INSERT INTO usuarios (nombre_usuario, password_hash, nombre_completo, rol) VALUES ('admin', '<HASH>', 'Administrador', 'admin');

Validaciones y checks post-instalación
- Ejecuta estas consultas para validar:
  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
  SELECT count(*) FROM productos;
  SELECT count(*) FROM movimientos_inventario;

Migraciones futuras
- Mantén los scripts de migración en `src/archive/` y crea una copia con timestamp para cada cambio (p. ej. `migrations/2025-11-06-add-col-proveedor.sql`).
- Considera usar supabase CLI o una herramienta de migraciones (sqitch, flyway) para entornos más grandes.

Problemas comunes y soluciones

- Error de permisos al crear extensión: ejecuta como superuser o usa Supabase (la mayoría ya incluye `pgcrypto`).
- Sintaxis `ADD COLUMN IF NOT EXISTS` y variaciones: algunos linters o versiones de Postgres pueden quejarse sobre `IF NOT EXISTS` en `ADD COLUMN`. Si tu servidor da error, usa la alternativa segura:

   -- Verificar si la columna existe y sólo entonces agregarla
   DO $$
   BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimientos_inventario' AND column_name='id_proveedor') THEN
         ALTER TABLE movimientos_inventario ADD COLUMN id_proveedor UUID REFERENCES proveedores(id_proveedor) ON DELETE SET NULL;
      END IF;
   END$$;

- Triggers referencian columnas que no existen: si obtienes errores al crear triggers/fn, asegúrate de ejecutar primero las CREATE TABLE correspondientes.
- Si recibes errores SQL en el SQL Editor de Supabase debido a tamaño del script, corta y ejecuta por bloques (tablas -> índices -> funciones -> datos).

Contacto y notas finales
- Si al ejecutar el script encuentras errores SQL por dialecto (ej. `ADD COLUMN IF NOT EXISTS`), revisa la versión de Postgres y ajusta la sintaxis según sea necesario.
- Conservar siempre una copia de seguridad antes de aplicar migraciones en producción.

---
Generado automáticamente — si quieres que adapte este README a un proveedor concreto (Supabase o Postgres en Debian/Windows) dímelo y lo detallo con comandos concretos y scripts de ejemplo.
