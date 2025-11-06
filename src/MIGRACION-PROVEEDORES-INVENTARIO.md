# 🔄 Migración: Agregar Proveedores a Movimientos de Inventario

## 📋 Descripción

Esta migración agrega la columna `id_proveedor` a la tabla `movimientos_inventario` para poder registrar de qué proveedor proviene cada entrada de inventario.

## ⚠️ ¿Necesitas ejecutar esta migración?

**SÍ, necesitas ejecutarla** si:
- Estás obteniendo el error: `Could not find a relationship between 'movimientos_inventario' and 'proveedores'`
- Quieres registrar entradas de inventario desde proveedores específicos

## 📝 Instrucciones

### Paso 1: Abre el SQL Editor en Supabase

1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. En el menú lateral izquierdo, haz clic en **SQL Editor**
4. Haz clic en **New query**

### Paso 2: Ejecuta el Script de Migración

1. Abre el archivo `database-add-proveedor-to-movements.sql` en tu proyecto
2. Copia **TODO** el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **Run** (o presiona `Ctrl+Enter` / `Cmd+Enter`)

### Paso 3: Verifica que la Migración Funcionó

Ejecuta este query en el SQL Editor para verificar:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'movimientos_inventario'
ORDER BY ordinal_position;
```

Deberías ver la columna `id_proveedor` en la lista.

## ✅ Después de la Migración

Una vez completada la migración:

1. **Recarga la aplicación** en tu navegador
2. Ve a **Gestión de Inventario**
3. Intenta registrar una nueva entrada de inventario
4. Ahora podrás seleccionar el proveedor de donde proviene el producto

## 🔧 ¿Qué hace esta migración?

```sql
-- Agrega la columna id_proveedor
ALTER TABLE movimientos_inventario 
ADD COLUMN id_proveedor UUID REFERENCES proveedores(id_proveedor) ON DELETE SET NULL;

-- Crea un índice para mejorar el rendimiento
CREATE INDEX idx_movimientos_proveedor ON movimientos_inventario(id_proveedor);
```

## 📊 Impacto en los Datos Existentes

- Los movimientos de inventario existentes tendrán `id_proveedor` como `NULL`
- No se perderá ningún dato
- Los nuevos movimientos podrán incluir la referencia al proveedor

## 🆘 Solución de Problemas

### Error: "column already exists"

Si obtienes este error, significa que la columna ya existe. Puedes ignorar este error de manera segura.

### Error: "permission denied"

Asegúrate de tener permisos de administrador en tu proyecto de Supabase.

## 📞 ¿Necesitas Ayuda?

Si tienes problemas ejecutando esta migración:

1. Verifica que estés conectado al proyecto correcto de Supabase
2. Asegúrate de tener permisos de administrador
3. Revisa la consola del SQL Editor para ver mensajes de error específicos
4. Verifica que la tabla `movimientos_inventario` y `proveedores` existan

---

**Fecha de creación:** 2025-01-05  
**Versión:** 1.0  
**Prioridad:** Alta
