import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Search, Plus, Edit, Trash2, AlertTriangle, Package, Eye, Layers, Truck, Tag, Building2 } from 'lucide-react';
import { Product, Category, Supplier, User } from '../types';
import { isAdmin, canEditProduct } from '../utils/permissions';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { createProduct, updateProduct, deleteProduct as deleteProductAPI } from '../lib/api';
import { SupplierDetailPanel } from './DynamicDetailPanel';

interface ProductsManagementProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  onProductsChange: (products: Product[]) => void;
  onCategoriesChange: (categories: Category[]) => void;
  currentUser?: User | null;
}

export function ProductsManagement({
  products,
  categories,
  suppliers,
  onProductsChange,
  onCategoriesChange,
  currentUser,
}: ProductsManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailView, setIsDetailView] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    currentStock: '',
    minStock: '',
    maxStock: '',
    unitPrice: '',
    supplierIds: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Supplier[]>([]);

  const filteredProducts = products.filter(
    (p) =>
      p?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p?.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.sku.trim()) newErrors.sku = 'El SKU es requerido';
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.categoryId) newErrors.categoryId = 'La categoría es requerida';
    if (!formData.minStock || parseFloat(formData.minStock) < 0)
      newErrors.minStock = 'Stock mínimo inválido';
    if (!formData.maxStock || parseFloat(formData.maxStock) < 0)
      newErrors.maxStock = 'Stock máximo inválido';
    if (parseFloat(formData.minStock) > parseFloat(formData.maxStock))
      newErrors.maxStock = 'El stock máximo debe ser mayor al mínimo';
    if (!formData.unitPrice || parseFloat(formData.unitPrice) < 0)
      newErrors.unitPrice = 'Precio inválido';
    if (formData.supplierIds.length === 0)
      newErrors.supplierIds = 'Selecciona al menos un proveedor';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenSheet = (product?: Product, viewOnly: boolean = false) => {
    if (viewOnly && product) {
      setSelectedProduct(product);
      setIsDetailView(true);
      setEditingProduct(null);
    } else if (product) {
      setEditingProduct(product);
      setSelectedProduct(null);
      setIsDetailView(false);
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        currentStock: product.currentStock.toString(),
        minStock: product.minStock.toString(),
        maxStock: product.maxStock.toString(),
        unitPrice: product.unitPrice.toString(),
        supplierIds: product.supplierIds,
      });
    } else {
      setEditingProduct(null);
      setSelectedProduct(null);
      setIsDetailView(false);
      setFormData({
        sku: '',
        name: '',
        description: '',
        categoryId: '',
        currentStock: '0',
        minStock: '',
        maxStock: '',
        unitPrice: '',
        supplierIds: [],
      });
    }
    setErrors({});
    setIsSheetOpen(true);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Por favor, corrige los errores en el formulario');
      return;
    }

    setIsLoading(true);

    try {
      const productPayload = {
        sku: formData.sku,
        nombre: formData.name,
        descripcion: formData.description,
        id_categoria: formData.categoryId,
        supplierIds: formData.supplierIds,
        precio: parseFloat(formData.unitPrice),
        stock_minimo: parseFloat(formData.minStock),
        stock_maximo: parseFloat(formData.maxStock),
      };

      let savedProduct;
      if (editingProduct) {
        savedProduct = await updateProduct(editingProduct.id, productPayload);
        onProductsChange(
          products.map((p) => (p.id === editingProduct.id ? savedProduct : p))
        );
        toast.success('Producto actualizado correctamente');
      } else {
        savedProduct = await createProduct(productPayload);
        onProductsChange([...products, savedProduct]);
        toast.success('Producto creado correctamente');
      }

      setIsSheetOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar el producto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteProduct) {
      setIsLoading(true);

      try {
        await deleteProductAPI(deleteProduct.id);
        onProductsChange(products.filter((p) => p.id !== deleteProduct.id));
        toast.success('Producto eliminado correctamente');
        setDeleteProduct(null);
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Error al eliminar el producto');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleSupplier = (supplierId: string) => {
    setFormData((prev) => ({
      ...prev,
      supplierIds: prev.supplierIds.includes(supplierId)
        ? prev.supplierIds.filter((id) => id !== supplierId)
        : [...prev.supplierIds, supplierId],
    }));
  };

  // Update selected category when categoryId changes
  useEffect(() => {
    if (formData.categoryId) {
      const category = categories.find((c) => c.id === formData.categoryId);
      setSelectedCategory(category || null);
    } else {
      setSelectedCategory(null);
    }
  }, [formData.categoryId, categories]);

  // Update selected suppliers when supplierIds change
  useEffect(() => {
    const selected = suppliers.filter((s) => formData.supplierIds.includes(s.id));
    setSelectedSuppliers(selected);
  }, [formData.supplierIds, suppliers]);

  const getStockStatus = (product: Product) => {
    if (product.currentStock < product.minStock) {
      return { label: 'Bajo Stock', variant: 'destructive' as const, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    } else if (product.currentStock > product.maxStock) {
      return { label: 'Sobrestock', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 border-red-300' };
    }
    return { label: 'Normal', variant: 'default' as const, color: 'bg-green-100 text-green-800 border-green-300' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Gestión de Productos</h1>
        <p className="text-gray-600">
          Administra el catálogo de productos del inventario
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
                  <p className="text-sm text-gray-600">Total Productos</p>
                  <p className="text-3xl mt-1">{products.length}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle>Lista de Productos</CardTitle>
              <CardDescription>
                Busca, edita o elimina productos del sistema
              </CardDescription>
            </div>
            {canEditProduct(currentUser) ? (
              <Button
                onClick={() => handleOpenSheet()}
                className="rounded-lg bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Button>
            ) : (
              <Button disabled title="No autorizado" className="rounded-lg opacity-60 cursor-not-allowed" variant="secondary">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o SKU..."
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
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">No se encontraron productos</p>
                      <p className="text-sm text-gray-400 mt-2">
                        {products.length === 0 
                          ? 'Haz clic en "Nuevo Producto" para crear el primero'
                          : 'Intenta con otro término de búsqueda'
                        }
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product, index) => {
                    const status = getStockStatus(product);
                    return (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <TableCell>
                          <Badge variant="outline">{product.sku}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-gray-500 truncate max-w-xs">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm">
                            <p>{product.currentStock}</p>
                            <p className="text-xs text-gray-500">
                              Min: {product.minStock}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ${product.unitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>
                            {(product.currentStock < product.minStock || product.currentStock > product.maxStock) && (
                              <AlertTriangle className="h-3 w-3 mr-1" />
                            )}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenSheet(product, true)}
                              className="rounded-lg"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (canEditProduct(currentUser)) handleOpenSheet(product);
                                else toast.error('No tienes permiso para editar productos');
                              }}
                              className={`rounded-lg ${canEditProduct(currentUser) ? '' : 'opacity-50 cursor-not-allowed'}`}
                              disabled={!canEditProduct(currentUser)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (isAdmin(currentUser)) setDeleteProduct(product);
                                else toast.error('No tienes permiso para eliminar productos');
                              }}
                              className={`rounded-lg ${isAdmin(currentUser) ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'opacity-50 cursor-not-allowed'}`}
                              disabled={!isAdmin(currentUser)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sheet pantalla completa para Ver/Crear/Editar */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {isDetailView ? 'Detalles del Producto' : editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </SheetTitle>
            <SheetDescription>
              {isDetailView
                ? 'Información completa del producto'
                : editingProduct
                ? 'Modifica los datos del producto'
                : 'Completa la información del nuevo producto'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 p-6">
            {isDetailView && selectedProduct ? (
              // Vista de detalles (solo lectura) - Mejorada
              <div className="space-y-6">
                {/* Encabezado del producto con diseño mejorado */}
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-white rounded-xl shadow-sm">
                        <Package className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl mb-1">{selectedProduct.name}</h3>
                        <div className="flex gap-2 items-center">
                          <Badge variant="outline" className="text-sm">
                            <Tag className="h-3 w-3 mr-1" />
                            {selectedProduct.sku}
                          </Badge>
                          <Badge className={getStockStatus(selectedProduct).color}>
                            {getStockStatus(selectedProduct).label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-600 mb-1">Precio Unitario</p>
                      <p className="text-3xl text-blue-700">${selectedProduct.unitPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  {selectedProduct.description && (
                    <div className="bg-white/70 rounded-lg p-4 mt-4">
                      <p className="text-sm text-gray-700">{selectedProduct.description}</p>
                    </div>
                  )}
                </div>

                {/* Información en cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="rounded-xl border-blue-200 bg-blue-50/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Layers className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Categoría</p>
                          <p className="text-base">{selectedProduct.category}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl border-green-200 bg-green-50/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                          <Package className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Stock Actual</p>
                          <p className="text-xl">{selectedProduct.currentStock}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl border-purple-200 bg-purple-50/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg">
                          <Truck className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Proveedores</p>
                          <p className="text-sm">
                            {selectedProduct.supplierNames.length > 0 
                              ? `${selectedProduct.supplierNames.length} proveedor${selectedProduct.supplierNames.length > 1 ? 'es' : ''}`
                              : 'Sin proveedores'
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabla de Proveedores */}
                {selectedProduct.supplierNames.length > 0 && (
                  <div>
                    <h4 className="text-lg mb-4 flex items-center gap-2">
                      <Truck className="h-5 w-5 text-purple-600" />
                      Proveedores del Producto
                    </h4>
                    <Card className="rounded-xl">
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Nombre del Proveedor</TableHead>
                              <TableHead>Rol</TableHead>
                              <TableHead>Contacto</TableHead>
                              <TableHead>Teléfono</TableHead>
                              <TableHead>Email</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedProduct.supplierIds.map((supplierId, index) => {
                              const supplier = suppliers.find(s => s.id === supplierId);
                              if (!supplier) return null;
                              return (
                                <TableRow key={supplierId}>
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-purple-600" />
                                      <span>{supplier.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={index === 0 ? "default" : "secondary"}>
                                      {index === 0 ? 'Principal' : 'Secundario'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{supplier.contactName}</TableCell>
                                  <TableCell>{supplier.phone || 'N/A'}</TableCell>
                                  <TableCell>{supplier.email || 'N/A'}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Rangos de Stock */}
                <div>
                  <h4 className="text-lg mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Niveles de Inventario
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="rounded-xl border-yellow-200 bg-yellow-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Stock Mínimo</p>
                            <p className="text-2xl text-yellow-700">{selectedProduct.minStock}</p>
                          </div>
                          <AlertTriangle className="h-6 w-6 text-yellow-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Stock Actual</p>
                            <p className="text-2xl text-green-700">{selectedProduct.currentStock}</p>
                          </div>
                          <Package className="h-6 w-6 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Stock Máximo</p>
                            <p className="text-2xl text-red-700">{selectedProduct.maxStock}</p>
                          </div>
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mt-4 bg-gray-100 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Nivel de Stock</span>
                      <span className="text-sm">{selectedProduct.currentStock} / {selectedProduct.maxStock} unidades</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          selectedProduct.currentStock < selectedProduct.minStock
                            ? 'bg-yellow-500'
                            : selectedProduct.currentStock > selectedProduct.maxStock
                            ? 'bg-red-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, (selectedProduct.currentStock / selectedProduct.maxStock) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : isDetailView ? null : (
              // Formulario de edición/creación
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="rounded-lg"
                    placeholder="Ej: LAP-001"
                  />
                  {errors.sku && <p className="text-xs text-red-600">{errors.sku}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="rounded-lg"
                    placeholder="Ej: Laptop Dell Inspiron 15"
                  />
                  {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="rounded-lg"
                    placeholder="Descripción del producto..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value: string) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                  >
                    <SelectTrigger id="category" className="rounded-lg">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 text-center">
                          No hay categorías disponibles
                        </div>
                      ) : (
                        categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.categoryId && (
                    <p className="text-xs text-red-600">{errors.categoryId}</p>
                  )}
                  
                  {/* Panel de detalles de categoría */}
                  {selectedCategory && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.26 }}
                      className="mt-3"
                    >
                      <Card className="border border-gray-200 bg-white shadow-sm">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 p-2 rounded-md bg-white border border-gray-100">
                              <Layers className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500">Categoría seleccionada</p>
                              <p className="text-sm font-medium text-gray-900">{selectedCategory.name}</p>
                              {selectedCategory.description && (
                                <p className="text-xs text-gray-500 mt-1">{selectedCategory.description}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Precio Unitario *</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, unitPrice: e.target.value })
                    }
                    className="rounded-lg"
                    placeholder="0.00"
                  />
                  {errors.unitPrice && (
                    <p className="text-xs text-red-600">{errors.unitPrice}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minStock">Stock Mínimo *</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: e.target.value })
                    }
                    className="rounded-lg"
                    placeholder="0"
                  />
                  {errors.minStock && (
                    <p className="text-xs text-red-600">{errors.minStock}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxStock">Stock Máximo *</Label>
                  <Input
                    id="maxStock"
                    type="number"
                    min="0"
                    value={formData.maxStock}
                    onChange={(e) =>
                      setFormData({ ...formData, maxStock: e.target.value })
                    }
                    className="rounded-lg"
                    placeholder="0"
                  />
                  {errors.maxStock && (
                    <p className="text-xs text-red-600">{errors.maxStock}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Proveedores * (selecciona uno o varios)</Label>
                  <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto bg-gray-50">
                    {suppliers.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2">
                        No hay proveedores disponibles
                      </p>
                    ) : (
                      suppliers.map((supplier) => (
                        <div
                          key={supplier.id}
                          className="flex items-center space-x-2 p-2 hover:bg-white rounded-lg transition-colors"
                        >
                          <Checkbox
                            id={`supplier-${supplier.id}`}
                            checked={formData.supplierIds.includes(supplier.id)}
                            onCheckedChange={() => toggleSupplier(supplier.id)}
                          />
                          <label
                            htmlFor={`supplier-${supplier.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {supplier.name}
                            <span className="text-xs text-gray-500 ml-2">
                              ({supplier.contactName})
                            </span>
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  {errors.supplierIds && (
                    <p className="text-xs text-red-600">{errors.supplierIds}</p>
                  )}

                  {/* Panel de detalles de proveedores seleccionados */}
                  {selectedSuppliers.length > 0 && (
                    <div className="space-y-3 mt-3">
                      {selectedSuppliers.map((supplier) => (
                        <SupplierDetailPanel
                          key={supplier.id}
                          supplier={{
                            name: supplier.name,
                            contactName: supplier.contactName,
                            email: supplier.email,
                            phone: supplier.phone,
                            address: supplier.address,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {editingProduct && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Stock Actual</Label>
                    <div className="p-3 bg-gray-100 rounded-lg border text-gray-600">
                      {formData.currentStock} unidades (se actualiza desde inventario y ventas)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {isDetailView && selectedProduct ? (
            <SheetFooter className="flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
                className="rounded-lg w-full sm:w-auto"
              >
                Cerrar
              </Button>
              {/* Edit button intentionally removed for detail-only view per policy */}
            </SheetFooter>
          ) : !isDetailView && (
            <SheetFooter className="flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
                className="rounded-lg w-full sm:w-auto"
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                className="rounded-lg bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>{editingProduct ? 'Actualizar' : 'Crear'}</>
                )}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de Confirmación de Eliminación */}
      <AlertDialog
        open={!!deleteProduct}
        onOpenChange={() => setDeleteProduct(null)}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto "{deleteProduct?.name}"
              será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg" disabled={isLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-lg bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
