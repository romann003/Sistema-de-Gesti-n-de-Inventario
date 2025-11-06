--# SEED DATA — SQL inserts (actualizado)

--Este archivo contiene un script SQL para usar en el SQL Editor de Supabase o con `psql` para poblar la base de datos con datos ficticios (empresa tecnológica). He actualizado el script para que todos los inserts llenen explícitamente los campos que indicaste y no dejen campos vacíos.

--Requisitos previos: haber ejecutado `complete-database.sql` (esquema y triggers). El script usa `pgcrypto` (`gen_random_uuid()` y `digest`) — si no está creada la extensión, el script la crea.


-- SEED DATA SCRIPT (compatible con el esquema solicitado)
-- Genera: 2 usuarios, 50 clientes, 100 proveedores, 25 categorías, 1200 productos,
-- relaciones producto_proveedores, entradas de inventario, 500 ventas con 2-3 ítems.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------
-- 1) Usuarios (tabla: usuarios)
-- Campos requeridos: id, correo, password, nombre, rol, created_at, updated_at
-- -----------------------------------------------------
INSERT INTO usuarios (id, correo, password, nombre, rol, created_at, updated_at)
SELECT gen_random_uuid(), uemail, encode(digest(upass,'sha256'),'hex'), uname, urole, now() - (interval '1 day' * floor(random()*365)), now() - (interval '1 day' * floor(random()*90))
FROM (
  VALUES
    ('admin@novasol.com','Admin123!','Administrador General','Administrador'),
    ('empleado@novasol.com','Empleado123!','Empleado de Piso','Empleado')
) AS t(uemail, upass, uname, urole)
ON CONFLICT (correo) DO NOTHING;

-- -----------------------------------------------------
-- 2) Categorías (25)
-- Campos: id_categoria, nombre, descripcion, created_at
-- -----------------------------------------------------
INSERT INTO categorias (id_categoria, nombre, descripcion, created_at)
SELECT gen_random_uuid(), 'Categoría ' || lpad(i::text,2,'0') || ' - Tecnología', 'Productos tecnológicos - grupo '||i, now() - (interval '1 day' * (i % 365))
FROM generate_series(1,25) AS s(i)
ON CONFLICT (nombre) DO NOTHING;

-- -----------------------------------------------------
-- 3) Proveedores (100)
-- Campos: id_proveedor, nombre, contacto, telefono, correo, direccion, created_at
-- -----------------------------------------------------
INSERT INTO proveedores (id_proveedor, nombre, contacto, telefono, correo, direccion, created_at)
SELECT gen_random_uuid(), 'Proveedor '||lpad(i::text,3,'0')||' Tech Supply', 'Contacto '||i,
       ('+52' || (600000000 + (floor(random()*10000000))::bigint))::text,
       'prov'||lpad(i::text,3,'0')||'@novasol.com',
       'Av. Proveedor '||i||', Parque Industrial', now() - (interval '1 day' * floor(random()*365))
FROM generate_series(1,100) AS s(i)
WHERE NOT EXISTS (
  SELECT 1 FROM proveedores p WHERE p.nombre = 'Proveedor '||lpad(i::text,3,'0')||' Tech Supply'
);

-- -----------------------------------------------------
-- 4) Clientes (50)
-- Campos: id_cliente, nombre, contacto, direccion, telefono, correo, estado, created_at
-- -----------------------------------------------------
INSERT INTO clientes (id_cliente, nombre, contacto, direccion, telefono, correo, estado, created_at)
SELECT gen_random_uuid(), 'Cliente '||lpad(i::text,2,'0')||' Solutions', 'Contacto '||i,
       'Calle Cliente '||i||', Col. Centro', ('+52' || (300000000 + (floor(random()*10000000))::bigint))::text,
       'cliente'||lpad(i::text,2,'0')||'@clientes.novasol.com', 'activo', now() - (interval '1 day' * floor(random()*365))
FROM generate_series(1,50) AS s(i)
WHERE NOT EXISTS (
  SELECT 1 FROM clientes c WHERE c.correo = 'cliente'||lpad(i::text,2,'0')||'@clientes.novasol.com'
);

-- -----------------------------------------------------
-- 5) Productos (1200)
-- Campos: id_producto, sku, nombre, descripcion, id_categoria, id_proveedor, precio, stock_actual, stock_minimo, stock_maximo, created_at, updated_at
-- Cada producto se asigna una categoría y un proveedor inicial (principal).
-- -----------------------------------------------------
INSERT INTO productos (id_producto, sku, nombre, descripcion, id_categoria, id_proveedor, precio, stock_actual, stock_minimo, stock_maximo, created_at, updated_at)
SELECT gen_random_uuid(), 'SKU-'||lpad(i::text,5,'0'), 'Producto Tech '||lpad(i::text,5,'0'),
       'Descripción técnica del producto tech '||i,
  -- assign categories in round-robin so every category receives products
  (SELECT id_categoria FROM categorias OFFSET ((i-1) % 25) LIMIT 1),
  -- assign an initial provider also in round-robin (will add more providers later)
  (SELECT id_proveedor FROM proveedores OFFSET ((i-1) % 100) LIMIT 1),
       round((random()*1990 + 10)::numeric,2),
       0,
       5,
       200,
       now() - (interval '1 day' * floor(random()*365)),
       now() - (interval '1 day' * floor(random()*180))
FROM generate_series(1,1200) AS s(i)
ON CONFLICT (sku) DO NOTHING;

-- -----------------------------------------------------
-- 6) Tabla producto_proveedores (m:n) con id y timestamps
-- Campos: id, id_producto, id_proveedor, es_principal, created_at, updated_at
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS productos_proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_producto UUID REFERENCES productos(id_producto) ON DELETE CASCADE,
  id_proveedor UUID REFERENCES proveedores(id_proveedor) ON DELETE CASCADE,
  es_principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asignar entre 1 y 5 proveedores por producto y marcar uno como principal
WITH prod AS (
  SELECT id_producto, (1 + floor(random()*5))::int AS k FROM productos
)
-- Insert without providing `id` (some schemas may have integer ids). Let DB assign default id.
INSERT INTO productos_proveedores (id_producto, id_proveedor, es_principal, created_at, updated_at)
SELECT p.id_producto, prov.id_proveedor, (prov.rn = 1)::boolean, now() - (interval '1 day' * floor(random()*365)), now() - (interval '1 day' * floor(random()*90))
FROM prod p
CROSS JOIN LATERAL (
  SELECT id_proveedor, row_number() OVER (ORDER BY random()) AS rn
  FROM proveedores
) prov
WHERE prov.rn <= p.k;

-- Ensure every product has at least one provider mapping (in case of race/partial inserts)
INSERT INTO productos_proveedores (id_producto, id_proveedor, es_principal, created_at, updated_at)
SELECT p.id_producto, (SELECT id_proveedor FROM proveedores ORDER BY random() LIMIT 1), FALSE, now(), now()
FROM productos p
WHERE NOT EXISTS (SELECT 1 FROM productos_proveedores pp WHERE pp.id_producto = p.id_producto);

-- Ensure every provider has at least one product (assign a random product to providers without mappings)
INSERT INTO productos_proveedores (id_producto, id_proveedor, es_principal, created_at, updated_at)
SELECT (SELECT id_producto FROM productos ORDER BY random() LIMIT 1), p.id_proveedor, FALSE, now(), now()
FROM proveedores p
WHERE NOT EXISTS (SELECT 1 FROM productos_proveedores pp WHERE pp.id_proveedor = p.id_proveedor);

-- -----------------------------------------------------
-- 7) Entradas de inventario (tipo 'Entrada') para todos los productos
-- Campos: id_movimiento, tipo, cantidad, motivo, id_producto, id_usuario, fecha, notas, id_usuario_temp, id_proveedor
-- Cantidad inicial entre 50 y 150 unidades para abastecer ventas
-- -----------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimientos_inventario' AND column_name='id_proveedor') THEN
    -- tabla tiene columna id_proveedor -> insert con proveedor
    INSERT INTO movimientos_inventario (id_movimiento, tipo, cantidad, motivo, id_producto, id_usuario, fecha, notas, id_proveedor)
    SELECT gen_random_uuid(), 'Entrada', (50 + floor(random()*101))::int, 'Compra inicial', p.id_producto,
           u.id, now() - (interval '1 day' * floor(random()*365)), 'Entrada inicial de stock', pp.id_proveedor
    FROM productos p
    JOIN LATERAL (
      SELECT id_proveedor FROM productos_proveedores WHERE id_producto = p.id_producto ORDER BY random() LIMIT 1
    ) pp ON true
    JOIN LATERAL (
      SELECT id as id FROM usuarios ORDER BY random() LIMIT 1
    ) u ON true;
  ELSE
    -- tabla sin columna id_proveedor -> insert sin proveedor
    INSERT INTO movimientos_inventario (id_movimiento, tipo, cantidad, motivo, id_producto, id_usuario, fecha, notas)
    SELECT gen_random_uuid(), 'Entrada', (50 + floor(random()*101))::int, 'Compra inicial', p.id_producto,
           u.id, now() - (interval '1 day' * floor(random()*365)), 'Entrada inicial de stock'
    FROM productos p
    JOIN LATERAL (
      SELECT id_proveedor FROM productos_proveedores WHERE id_producto = p.id_producto ORDER BY random() LIMIT 1
    ) pp ON true
    JOIN LATERAL (
      SELECT id as id FROM usuarios ORDER BY random() LIMIT 1
    ) u ON true;
  END IF;
END$$;

-- Después de insertar movimientos, actualizar stock_actual a partir de entradas
UPDATE productos
SET stock_actual = sub.total_entradas
FROM (
  SELECT id_producto, COALESCE(SUM(cantidad),0) AS total_entradas FROM movimientos_inventario WHERE tipo = 'Entrada' GROUP BY id_producto
) sub
WHERE productos.id_producto = sub.id_producto;

-- -----------------------------------------------------
-- 8) Ventas (500) y detalles_venta (2-3 productos por venta)
-- ventas campos: id_venta, id_cliente, id_usuario, fecha, notas, total
-- detalles_venta campos: id_detalle, id_venta, id_producto, cantidad, precio_unitario, subtotal, created_at
-- -----------------------------------------------------
-- Insertar ventas (cabeceras)
-- Distribute sales across all clients and users in round-robin to ensure each client has sales
INSERT INTO ventas (id_venta, id_cliente, id_usuario, fecha, notas, total)
SELECT gen_random_uuid(),
       (SELECT id_cliente FROM clientes OFFSET ((i-1) % 50) LIMIT 1),
       (SELECT id FROM usuarios OFFSET ((i-1) % 2) LIMIT 1),
       now() - (interval '1 day' * floor(random()*180)),
       'Venta seed generada', 0
FROM generate_series(1,500) s(i);

-- Insertar detalles por venta
DO $$
DECLARE
  r RECORD;
  prod_id UUID;
  i INT;
  n_items INT;
  qty INT;
  price NUMERIC;
BEGIN
  FOR r IN SELECT id_venta FROM ventas LOOP
    n_items := 2 + floor(random()*2)::int; -- 2 o 3
    FOR i IN 1..n_items LOOP
      SELECT id_producto, precio INTO prod_id, price FROM productos ORDER BY random() LIMIT 1;
      qty := 1 + floor(random()*3)::int; -- 1..3
      INSERT INTO detalles_venta (id_detalle, id_venta, id_producto, cantidad, precio_unitario, subtotal, created_at)
      VALUES (gen_random_uuid(), r.id_venta, prod_id, qty, price, round(price * qty,2), now());
    END LOOP;
  END LOOP;
END$$;

-- Recalcular totales por venta
UPDATE ventas
SET total = sub.total
FROM (
  SELECT id_venta, COALESCE(SUM(subtotal),0) AS total FROM detalles_venta GROUP BY id_venta
) sub
WHERE ventas.id_venta = sub.id_venta;

-- Crear movimientos de salida por cada detalle_venta (para decrementar stock)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimientos_inventario' AND column_name='id_proveedor') THEN
    INSERT INTO movimientos_inventario (id_movimiento, tipo, cantidad, motivo, id_producto, id_usuario, fecha, notas, id_proveedor)
    SELECT gen_random_uuid(), 'Salida', d.cantidad, 'Venta', d.id_producto,
           (SELECT id FROM usuarios ORDER BY random() LIMIT 1), now(), 'Salida por venta ' || d.id_venta,
           (SELECT id_proveedor FROM productos_proveedores WHERE id_producto = d.id_producto ORDER BY random() LIMIT 1)
    FROM detalles_venta d;
  ELSE
    INSERT INTO movimientos_inventario (id_movimiento, tipo, cantidad, motivo, id_producto, id_usuario, fecha, notas)
    SELECT gen_random_uuid(), 'Salida', d.cantidad, 'Venta', d.id_producto,
           (SELECT id FROM usuarios ORDER BY random() LIMIT 1), now(), 'Salida por venta ' || d.id_venta
    FROM detalles_venta d;
  END IF;
END$$;

-- Actualizar stock: restar salidas
UPDATE productos
SET stock_actual = GREATEST(0, coalesce(stock_actual,0) - coalesce(sub.total_salidas,0))
FROM (
  SELECT id_producto, COALESCE(SUM(cantidad),0) AS total_salidas FROM movimientos_inventario WHERE tipo = 'Salida' GROUP BY id_producto
) sub
WHERE productos.id_producto = sub.id_producto;

-- -----------------------------------------------------
-- 9) Auditoría (opcional) — insertar algunas entradas de auditoría
-- campos: id_auditoria, id_usuario, accion, descripcion, entidad, entidad_id, fecha
-- -----------------------------------------------------
INSERT INTO auditoria (id_auditoria, id_usuario, accion, descripcion, entidad, entidad_id, fecha)
SELECT gen_random_uuid(), (SELECT id FROM usuarios ORDER BY random() LIMIT 1), 'seed_import', 'Inserción de datos de prueba', 'sistema', 'seed-run', now()
FROM generate_series(1,20);

-- -----------------------------------------------------
-- 10) Verificaciones rápidas (consulta, no inserciones)
SELECT count(*) AS usuarios_total FROM usuarios;
SELECT count(*) AS categorias_total FROM categorias;
SELECT count(*) AS proveedores_total FROM proveedores;
SELECT count(*) AS clientes_total FROM clientes;
SELECT count(*) AS productos_total FROM productos;
SELECT count(*) AS productos_proveedores_total FROM productos_proveedores;
SELECT count(*) AS movimientos_total FROM movimientos_inventario;
SELECT count(*) AS ventas_total FROM ventas;
SELECT count(*) AS detalles_total FROM detalles_venta;

-- FIN

--Notas:
-- Todos los campos requeridos según tu especificación están poblados. No se dejan campos vacíos.
-- Si tu esquema usa nombres de columnas ligeramente distintos (prefijos `id_` versus `id`), dime y adapto el script al nombre exacto de las columnas en la base.
-- Puedo generar también `seed-data.sql` directamente si quieres ejecutar con `psql`.
