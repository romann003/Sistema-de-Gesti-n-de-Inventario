# Documentación del proyecto: Sistema de Gestión de Inventario

Este documento resume la arquitectura, instalación, uso y detalles importantes del proyecto "Sistema de Gestión de Inventario". Está escrito en español y listo para copiar/pegar en Word.

---

## Índice
- Resumen del proyecto
- Stack tecnológico
- Estructura del repositorio (resumen)
- Cómo ejecutar en desarrollo
- Cómo generar build de producción
- Base de datos y scripts SQL incluidos
- Autenticación y roles
- Políticas de permisos implementadas
- API / patrones de datos importantes
- Componentes y archivos clave
- Notas sobre UI y librerías
- Tests, lint y build
- Tareas pendientes y siguientes pasos
- Cómo copiar a Word

---

## Resumen del proyecto

Aplicación web (frontend) para gestionar inventarios, productos, proveedores, ventas y movimientos. Está diseñada para PyMEs y contiene páginas para dashboard, gestión de productos, proveedores, clientes, movimientos de inventario, auditoría y usuarios.

La aplicación se conecta a Supabase (Postgres + PostgREST) y consume datos mediante funciones en `src/lib/api.ts`.

## Stack tecnológico

- Frontend: React + TypeScript (Vite, SWC)
- Estilos: Tailwind CSS + componentes shadcn + Flowbite-React
- Gráficos: Recharts
- Autenticación / Backend: Supabase (PostgREST / supabase-js)
- Build: Vite

## Estructura principal del repositorio

- `index.html`, `package.json`, `vite.config.ts`
- `src/`
  - `main.tsx` - entrada de la app
  - `App.tsx` - enrutado principal y menú/side bar
  - `components/` - componentes React (páginas y UI)
    - `EnhancedDashboard.tsx` - dashboard interactivo
    - `ProductsManagement.tsx`, `InventoryManagement.tsx`, `SuppliersManagement.tsx`, `CustomersAndSales.tsx`, `UsersManagement.tsx`, `AuditLog.tsx`, etc.
    - `ui/` - componentes compartidos (button, input, table...)
  - `lib/` - `api.ts` y utilidades de mock
  - `utils/` - helpers (por ejemplo `supabase/client.tsx`, y `permissions.tsx`)
  - `types/` - definiciones de TypeScript
  - `styles/` - `globals.css` y configuración de Tailwind
  - múltiples scripts SQL para creación/actualización de la BD (`*.sql`)

## Cómo ejecutar en desarrollo (Windows PowerShell)

1. Instalar dependencias:

```powershell
npm install
```

2. Ejecutar en modo desarrollo:

```powershell
npm run dev
```

Abre http://localhost:5173 (o la URL que Vite muestre) para ver la app.

## Cómo generar build de producción

```powershell
npm run build
```

El build se genera en `build/`.

## Base de datos y scripts SQL incluidos

Hay varios archivos SQL en `src/`:
- `database-setup.sql` - scripts de migración / creación de tablas básicas
- `crear-tabla-usuarios.sql` - script para crear la tabla de usuarios
- `tabla-auditoria.sql` - esquema de auditoría
- `actualizar-passwords-cifradas.sql` - utilidades para hashes
- `generar-hashes.html` - pequeña herramienta para generar hashes en el navegador

Si necesitas crear cuentas de prueba, revisa `crear-tabla-usuarios.sql` y `generar-hashes.html` para preparar contraseñas. El proyecto no contiene credenciales secretas; configura conexión en `src/utils/supabase/info.tsx` y `src/utils/supabase/client.tsx` según tu proyecto Supabase.

> Nota: El UI muestra credenciales de ejemplo (admin@novasol.com / Admin123!, empleado@novasol.com / Empleado123!) — asegúrate de crear esas cuentas en la BD si quieres probar login con ellas.

## Autenticación y roles

- La app usa un `AuthContext` (en `src/contexts`) y guarda el usuario en `localStorage` para sesión.
- Tipos de rol: `Administrador` y `Empleado` (ver `src/types/index.ts`).

## Políticas de permisos implementadas

Se centralizaron helpers RBAC en `src/utils/permissions.tsx`. Políticas actuales (configurables):

- `Administrador`: acceso completo.
- `Empleado`: lectura de la mayoría de vistas, puede registrar movimientos de inventario (entradas/salidas) y ver productos, clientes y ventas. No puede crear/editar/eliminar productos, proveedores, categorías o usuarios. No puede ver auditoría.

Controles aplicados:

- Sidebar y rutas: `src/App.tsx` filtra entradas del menú según `isAdmin(currentUser)` y envuelve rutas sensibles con `RequireRole`.
- UI: componentes (p. ej. `ProductsManagement.tsx`, `CustomersAndSales.tsx`) usan `permissions.tsx` para deshabilitar/ocultar botones de crear/editar/eliminar.

Si quieres cambiar la política, edita `src/utils/permissions.tsx` (funciones: `isAdmin`, `isEmployee`, `canCreateMovement`, `canEditProduct`, etc.).

## API / patrones de datos importantes

- `src/lib/api.ts` centraliza llamadas a PostgREST / Supabase. Notas importantes:
  - Evita nested-selects costosos en PostgREST (generaba 400s). En su lugar, se realiza select simple y enriquecimiento manual en frontend.
  - Para tablas grandes, se usa paginación `.range()` para evitar pérdidas de filas.
  - Se añadieron cabeceras globales (apikey y Authorization) en `src/utils/supabase/client.tsx` para asegurar que REST no devuelva "No API key found in request".

## Componentes y archivos clave (guía rápida)

- `src/App.tsx` — enrutado, menú, carga inicial de datos.
- `src/components/EnhancedDashboard.tsx` — dashboard, métricas dinámicas (ahora calcula SQA a partir de products/movements/sales).
- `src/components/ProductsManagement.tsx` — CRUD de productos y lista; protegido por permisos.
- `src/components/InventoryManagement.tsx` — Movimientos de inventario (entradas/salidas); formulario de registro.
- `src/components/CustomersAndSales.tsx` — gestión de clientes y ventas; eliminación de clientes protegida a admins.
- `src/lib/api.ts` — funciones de acceso a datos (getProducts, getMovements, createMovement, createSale, etc.).
- `src/utils/permissions.tsx` — lógica RBAC centralizada.

## Notas sobre UI y librerías

- Se usa Tailwind CSS con componentes shadcn (carpeta `src/components/ui`) y Flowbite-React.
- Antes se probó MUI; luego se eliminó y la app quedó con Tailwind/Flowbite.

## Tests, lint y build

- No hay suite de tests extensa presente en el repo (puedo añadir tests unitarios o e2e si lo deseas).
- Comandos principales:

```powershell
npm install
npm run dev    # desarrollo
npm run build  # producción
```

## Tareas pendientes / Recomendaciones

- Añadir validación de permisos del lado servidor (API) — defensa en profundidad.
- Añadir memoización (`useMemo`) en el dashboard para métricas si el dataset crece (> 5k filas).
- Añadir endpoints paginados y filtros server-side para tablas grandes (Products, Movements) si necesitas rendimiento.
- Añadir tests unitarios para `lib/api.ts` y helpers en `utils/`.

## Cómo copiar este documento a Word

1. Abre este archivo `PROJECT_DOCUMENTATION.md` en tu editor (o en GitHub/VSCode).
2. Selecciona todo el texto (Ctrl+A) y cópialo (Ctrl+C).
3. Abre Microsoft Word y pega (Ctrl+V). Word soporta Markdown copiado como texto; si quieres convertir a formato Word nativo, pega y usa estilos.

Alternativa: abre el markdown en un renderizador (GitHub o VSCode Preview), luego selecciona y copia desde la vista renderizada para una mejor correspondencia visual.

---

Si quieres, puedo:

- generar una versión en DOCX directamente (requiere instalar una herramienta o librería). 
- agregar capturas de pantalla y diagramas al documento.
- convertir las secciones a una plantilla corporativa (encabezado, logo, firmas).

Indícame cómo prefieres la siguiente versión: más detallada (por archivo), o un resumen ejecutivo más corto para presentar a stakeholders.
