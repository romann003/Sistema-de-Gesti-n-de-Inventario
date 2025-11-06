# Correcciones Pendientes

## 1. Categorías - Cantidad de Productos
✅ Corregido en `/lib/api.ts` - getCategories() ahora calcula productCount

## 2. Proveedores en Vista de Producto
⏳ Necesita: Cambiar líneas 484-502 en ProductsManagement.tsx para mostrar tabla de proveedores

## 3. Inventario - Error "No user logged in"  
✅ Corregido - se actualizó para usar currentUser del prop

## 4. Reportes - Filtros de Fecha
⏳ Verificar funcionamiento

## 5. Auditorías
✅ Agregada función createAuditLog en api.ts

## 6-8. Clientes y Ventas
⏳ Cambiar Sheet a Dialog, corregir edición, agregar productos en nueva venta

## 9. Usuarios
✅ Ya usa Sheet correctamente

## 10. Cifrado de Contraseñas
✅ Agregadas funciones hashPassword y verifyPassword en api.ts
