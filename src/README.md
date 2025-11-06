# 📦 Sistema de Gestión de Inventario para PyME

Sistema completo de gestión de inventario con autenticación segura, control de usuarios, gestión de productos, movimientos de inventario, ventas y reportes.

**Estado:** ✅ COMPLETAMENTE FUNCIONAL | **Versión:** 3.0 | **Última actualización:** 5 Nov 2025

---

## ⚡ INICIO RÁPIDO (30 Segundos)

### Ya Configurado:
```
Login: admin@inventario.com
Password: admin123
```

### Primera Vez:
1. Conecta Supabase (botón arriba derecha)
2. SQL Editor → Ejecuta `database-setup.sql`
3. SQL Editor → Ejecuta `crear-tabla-usuarios.sql`
4. Login con credenciales arriba ✅

---

## 🚀 Configuración Inicial

### Paso 1: Ejecutar Scripts SQL

En el SQL Editor de Supabase, ejecuta en orden:

1. **`database-setup.sql`** (obligatorio)
   - Crea todas las tablas
   - Configura triggers automáticos
   - Carga datos de ejemplo

2. **`crear-tabla-usuarios.sql`** (obligatorio)
   - Crea sistema de autenticación independiente
   - Carga 5 usuarios de prueba
   - Configura permisos

### Paso 2: Iniciar Sesión

```
Administrador:
  admin@inventario.com / admin123
  maria@inventario.com / maria123

Empleado:
  empleado@inventario.com / empleado123
  carlos@inventario.com / carlos123
  ana@inventario.com / ana123
```

### Paso 3: ¡Usar el Sistema!

Todo listo. Explora todas las funcionalidades. ✅

## ✨ Novedades v3.0

### 🎯 Mejoras en Interfaz
- ✅ **Ventanas emergentes a pantalla completa** con Sheet
- ✅ **Vista master-detail** para ver información detallada
- ✅ **Botón de Vista** (👁️) para ver detalles sin editar
- ✅ **Mensajes mejorados** cuando no hay datos en las tablas
- ✅ **Carga de usuarios** corregida en el sistema

### 🧹 Optimizaciones
- ✅ **Archivos de documentación** eliminados (reducción de archivos innecesarios)
- ✅ **Código optimizado** en componentes principales
- ✅ **Mapeo de datos** corregido desde la base de datos
- ✅ **Estados de carga** mejorados en todas las operaciones

## 📋 Estructura de la Base de Datos

### Tablas Principales

- **usuarios** - Sistema de autenticación independiente
- **perfiles** - Información de usuarios (legacy, opcional)
- **productos** - Catálogo de productos
- **categorias** - Categorías de productos
- **proveedores** - Información de proveedores
- **clientes** - Gestión de clientes
- **movimientos_inventario** - Entradas y ajustes de stock
- **ventas** - Registro de ventas
- **auditoria** - Historial de acciones

### Roles de Usuario

- **Administrador**: Acceso completo al sistema
- **Empleado**: Acceso limitado (lectura y ventas)

## 🔐 Autenticación

El sistema utiliza:
- Tabla `usuarios` independiente para autenticación
- localStorage para mantener sesiones
- Validación de contraseñas
- Control de roles y permisos

## 🛠️ Características

### Dashboard
- KPIs en tiempo real
- Gráficos interactivos
- Alertas de stock bajo
- Métricas de ventas

### Gestión de Productos
- CRUD completo con interfaz moderna
- Vista detallada de productos
- Control de stock automático
- Alertas de stock bajo/alto
- Búsqueda y filtros avanzados
- Gestión de proveedores múltiples

### Gestión de Usuarios (Solo Administradores)
- CRUD completo de usuarios
- Vista detallada de cada usuario
- Asignación de roles
- Control de estado (activo/inactivo)
- Validaciones de seguridad

### Inventario
- Movimientos de entrada
- Ajustes de stock
- Historial completo
- Auditoría de cambios

### Ventas
- Registro de ventas
- Gestión de clientes
- Reportes descargables
- Métricas en tiempo real

### Administración
- Gestión de categorías
- Gestión de proveedores
- Registro de auditoría completa

## 📊 Reportes

El sistema genera reportes en:
- PDF
- Excel

Tipos de reportes:
- Inventario actual
- Productos con stock bajo
- Histórico de movimientos
- Histórico de ventas

## 🎨 Diseño

- **Colores**: Azul claro, gris y blanco
- **Tipografía**: Sistema por defecto (Inter/Poppins)
- **Componentes**: Shadcn/UI con Tailwind CSS
- **Animaciones**: Motion/React para transiciones suaves
- **Responsive**: Totalmente adaptable a móvil, tablet y desktop
- **Ventanas**: Sheet pantalla completa para formularios y detalles

## 🔧 Solución de Problemas

### ❌ Error: "Failed to fetch"
**Causa**: Proyecto Supabase no conectado  
**Solución**: Click en "Connect Supabase" (arriba derecha)

### ❌ Error: "Tabla no existe"
**Causa**: Scripts SQL no ejecutados  
**Solución**: Ejecuta `database-setup.sql` y `crear-tabla-usuarios.sql`

### ❌ Error: "Could not find a relationship between 'movimientos_inventario' and 'proveedores'"
**Causa**: Falta migración para agregar proveedores a movimientos  
**Solución**: Ejecuta `database-add-proveedor-to-movements.sql` (ver `MIGRACION-PROVEEDORES-INVENTARIO.md`)

### ❌ Las tablas están vacías
**Causa**: Los datos no se están cargando correctamente  
**Solución**: Ya está corregido en v3.0, recarga la aplicación

### ❓ No puedo iniciar sesión
**Causa**: Tabla usuarios no existe  
**Solución**: Ejecuta `crear-tabla-usuarios.sql` en SQL Editor

### 🔐 Cambiar rol de un usuario

En la aplicación:
- Login como Administrador
- Ve a "Usuarios" en el menú
- Click en el ícono de editar (✏️)
- Cambia el rol
- Guarda

O en SQL Editor:
```sql
UPDATE usuarios 
SET rol = 'Administrador' 
WHERE correo = 'usuario@ejemplo.com';
```

## 📁 Archivos Importantes

### Scripts SQL:
- `database-setup.sql` - Setup principal (obligatorio)
- `crear-tabla-usuarios.sql` - Sistema de usuarios (obligatorio)
- `database-add-proveedor-to-movements.sql` - Migración para proveedores en inventario (recomendado)

### Código:
- `App.tsx` - Componente principal
- `/components/UsersManagement.tsx` - Gestión de usuarios (v3.0)
- `/components/ProductsManagement.tsx` - Gestión de productos (v3.0)
- `/lib/api.ts` - API de Supabase con mapeo de datos
- `/types/index.ts` - Tipos TypeScript

## 🔄 Triggers Automáticos

El sistema incluye triggers que automatizan:
- ✅ Actualización de stock en movimientos
- ✅ Reducción de stock en ventas
- ✅ Actualización de timestamps
- ✅ Registro de auditoría

## 💡 Tips de Uso

### Ver Detalles de un Registro
1. Haz click en el ícono del ojo (👁️) en cualquier fila
2. Se abrirá una vista detallada a pantalla completa
3. Desde ahí puedes editarlo o cerrarlo

### Editar un Registro
1. Haz click en el ícono de editar (✏️) o
2. Desde la vista de detalles, click en "Editar"
3. Modifica los campos necesarios
4. Guarda los cambios

### Buscar Productos
- Usa la barra de búsqueda en Productos
- Puedes buscar por nombre o SKU
- Los resultados se filtran en tiempo real

## 📝 Licencia

Este proyecto es de código abierto para uso educativo y comercial.

---

**Desarrollado con React + Supabase + Tailwind CSS**
**v3.0 - Noviembre 2025**
