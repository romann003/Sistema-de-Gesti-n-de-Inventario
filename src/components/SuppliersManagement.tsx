import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Textarea } from './ui/textarea';
import { Search, Plus, Edit, Trash2, Building2, Phone, Mail } from 'lucide-react';
import { Supplier } from '../types';
import { toast } from 'sonner';
import { motion } from 'motion/react';

interface SuppliersManagementProps {
  suppliers: Supplier[];
  onSuppliersChange: (suppliers: Supplier[]) => void;
}

export function SuppliersManagement({ suppliers, onSuppliersChange }: SuppliersManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredSuppliers = suppliers.filter((s) =>
    s?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s?.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute products count per supplier (best-effort) by fetching products and counting supplierIds.
  const [supplierCounts, setSupplierCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { getProducts } = await import('../lib/api');
        const prods: any[] = await getProducts();
        if (!mounted || !Array.isArray(prods)) return;
        const counts: Record<string, number> = {};
        prods.forEach((p: any) => {
          const ids: string[] = Array.isArray(p.supplierIds) ? p.supplierIds : (p.supplier_ids || p.proveedor_ids || []);
          (ids || []).forEach((id: any) => {
            const key = String(id);
            counts[key] = (counts[key] || 0) + 1;
          });
        });
        if (mounted) setSupplierCounts(counts);
      } catch (e) {
        // best-effort: if fetching products fails, leave counts as-is
        console.debug('SuppliersManagement: could not compute supplier product counts', e);
      }
    })();
    return () => { mounted = false; };
  }, [suppliers]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.contactName.trim()) newErrors.contactName = 'El contacto es requerido';
    if (!formData.phone.trim()) newErrors.phone = 'El teléfono es requerido';
    if (!formData.email.trim()) newErrors.email = 'El email es requerido';
    if (formData.email && !formData.email.includes('@')) newErrors.email = 'Email inválido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contactName: supplier.contactName,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address || '',
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
      });
    }
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Por favor, corrige los errores en el formulario');
      return;
    }

    try {
      const supplierDbData = {
        nombre: formData.name,
        contacto: formData.contactName,
        telefono: formData.phone,
        correo: formData.email,
        direccion: formData.address,
      };

      if (editingSupplier) {
        // Update supplier in Supabase
        const { updateSupplier } = await import('../lib/api');
        const updated = await updateSupplier(editingSupplier.id, supplierDbData);
        
        // Update local state
        onSuppliersChange(
          suppliers.map((s) => (s.id === editingSupplier.id ? {
            id: updated.id,
            name: updated.name,
            contactName: updated.contactName,
            phone: updated.phone,
            email: updated.email,
            address: updated.address,
            productsCount: editingSupplier.productsCount,
            createdAt: updated.createdAt,
          } : s))
        );
        toast.success('Proveedor actualizado correctamente');
      } else {
        // Create supplier in Supabase
        const { createSupplier } = await import('../lib/api');
        const created = await createSupplier(supplierDbData);
        
        // Update local state
        onSuppliersChange([...suppliers, {
          id: created.id,
          name: created.name,
          contactName: created.contactName,
          phone: created.phone,
          email: created.email,
          address: created.address,
          productsCount: 0,
          createdAt: created.createdAt,
        }]);
        toast.success('Proveedor creado correctamente');
      }

      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      toast.error(error.message || 'Error al guardar el proveedor');
    }
  };

  const handleDelete = async () => {
    if (deleteSupplier) {
      try {
        // Delete supplier in Supabase
        const { deleteSupplier: deleteSupplierApi } = await import('../lib/api');
        await deleteSupplierApi(deleteSupplier.id);
        
        // Update local state
        onSuppliersChange(suppliers.filter((s) => s.id !== deleteSupplier.id));
        toast.success('Proveedor eliminado correctamente');
        setDeleteSupplier(null);
      } catch (error: any) {
        console.error('Error deleting supplier:', error);
        toast.error(error.message || 'Error al eliminar el proveedor');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Gestión de Proveedores</h1>
        <p className="text-gray-600">
          Administra la información de tus proveedores
        </p>
      </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Proveedores</p>
                  <p className="text-3xl mt-1">{suppliers.length}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Removed 'Productos Total' and 'Promedio Productos' cards as requested. */}
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle>Lista de Proveedores</CardTitle>
              <CardDescription>
                Gestiona la información de contacto de tus proveedores
              </CardDescription>
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="rounded-lg bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proveedor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar proveedores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-lg"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Productos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      No se encontraron proveedores
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier, index) => (
                    <motion.tr
                      key={supplier.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <Building2 className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm">{supplier.name}</p>
                            {supplier.address && (
                              <p className="text-xs text-gray-500">{supplier.address}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{supplier.contactName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {supplier.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-gray-400" />
                          {supplier.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{supplier.productsCount || supplierCounts[supplier.id] || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(supplier)}
                            className="rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteSupplier(supplier)}
                            className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para Crear/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? 'Modifica los datos del proveedor'
                : 'Completa la información del nuevo proveedor'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Proveedor *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-lg"
                placeholder="Ej: Tech Distributors SA"
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Nombre de Contacto *</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) =>
                  setFormData({ ...formData, contactName: e.target.value })
                }
                className="rounded-lg"
                placeholder="Ej: Roberto Martínez"
              />
              {errors.contactName && (
                <p className="text-xs text-red-600">{errors.contactName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="rounded-lg"
                  placeholder="+1-555-0000"
                />
                {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="rounded-lg"
                  placeholder="contacto@empresa.com"
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección (opcional)</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="rounded-lg"
                placeholder="Dirección completa del proveedor"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-lg"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} className="rounded-lg bg-blue-600 hover:bg-blue-700">
              {editingSupplier ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmación de Eliminación */}
      <AlertDialog
        open={!!deleteSupplier}
        onOpenChange={() => setDeleteSupplier(null)}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El proveedor "{deleteSupplier?.name}"
              será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-lg bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
