import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Search, X, Filter, Package, Eye, Tag, DollarSign, Layers, Truck, AlertTriangle, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { Product, Supplier } from '../types';
import { motion } from 'motion/react';

interface AdvancedSearchProps {
  products: Product[];
  // Ahora recibimos el array completo de proveedores para mostrar
  // información detallada en la vista de detalles del producto.
  suppliers: Supplier[];
  categories: string[];
}

export function AdvancedSearch({ products, suppliers, categories }: AdvancedSearchProps) {
  const [filters, setFilters] = useState({
    name: '',
    category: '',
    supplier: '',
    minPrice: '',
    maxPrice: '',
    minStock: '',
    maxStock: '',
  });

  const [results, setResults] = useState<Product[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const handleSearch = () => {
    let filtered = products;

    if (filters.name) {
      filtered = filtered.filter(
        (p) =>
          p?.name?.toLowerCase().includes(filters.name.toLowerCase()) ||
          p?.sku?.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    if (filters.category) {
      filtered = filtered.filter((p) => p.category === filters.category);
    }

    if (filters.supplier) {
      filtered = filtered.filter((p) => p.supplierNames.includes(filters.supplier));
    }

    if (filters.minPrice) {
      filtered = filtered.filter((p) => p.unitPrice >= parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      filtered = filtered.filter((p) => p.unitPrice <= parseFloat(filters.maxPrice));
    }

    if (filters.minStock) {
      filtered = filtered.filter((p) => p.currentStock >= parseInt(filters.minStock));
    }

    if (filters.maxStock) {
      filtered = filtered.filter((p) => p.currentStock <= parseInt(filters.maxStock));
    }

    setResults(filtered);
    setHasSearched(true);
  };

  const handleClearFilters = () => {
    setFilters({
      name: '',
      category: '',
      supplier: '',
      minPrice: '',
      maxPrice: '',
      minStock: '',
      maxStock: '',
    });
    setResults([]);
    setHasSearched(false);
  };

  const activeFiltersCount = Object.values(filters).filter((v) => v !== '').length;

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailDialogOpen(true);
  };

  const getStockStatus = (product: Product) => {
    if (product.currentStock < product.minStock) {
      return { label: 'Bajo Stock', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: AlertTriangle };
    } else if (product.currentStock > product.maxStock) {
      return { label: 'Sobrestock', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle };
    }
    return { label: 'Normal', color: 'bg-green-100 text-green-800 border-green-300', icon: Package };
  };

  const getStockPercentage = (product: Product) => {
    const range = product.maxStock - product.minStock;
    const current = product.currentStock - product.minStock;
    return Math.max(0, Math.min(100, (current / range) * 100));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Búsqueda Avanzada</h1>
        <p className="text-gray-600">Encuentra productos con filtros múltiples</p>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                Filtros de Búsqueda
              </CardTitle>
              <CardDescription>
                Aplica uno o más filtros para refinar tu búsqueda
              </CardDescription>
            </div>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-sm">
                {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} activo
                {activeFiltersCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre o SKU</Label>
              <Input
                id="name"
                placeholder="Buscar..."
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(value: string) => setFilters({ ...filters, category: value === 'all' ? '' : value })}
              >
                <SelectTrigger id="category" className="rounded-lg">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.filter(cat => cat).map((cat, index) => (
                    <SelectItem key={`cat-${cat}-${index}`} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor</Label>
              <Select
                value={filters.supplier || 'all'}
                onValueChange={(value: string) => setFilters({ ...filters, supplier: value === 'all' ? '' : value })}
              >
                <SelectTrigger id="supplier" className="rounded-lg">
                  <SelectValue placeholder="Todos los proveedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {suppliers.map((s, index) => (
                    <SelectItem key={`sup-${s.id}-${index}`} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minPrice">Precio Mínimo</Label>
              <Input
                id="minPrice"
                type="number"
                step="0.01"
                placeholder="$0.00"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPrice">Precio Máximo</Label>
              <Input
                id="maxPrice"
                type="number"
                step="0.01"
                placeholder="$999,999"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStock">Stock Mínimo</Label>
              <Input
                id="minStock"
                type="number"
                placeholder="0"
                value={filters.minStock}
                onChange={(e) => setFilters({ ...filters, minStock: e.target.value })}
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxStock">Stock Máximo</Label>
              <Input
                id="maxStock"
                type="number"
                placeholder="999"
                value={filters.maxStock}
                onChange={(e) => setFilters({ ...filters, maxStock: e.target.value })}
                className="rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              className="rounded-lg bg-blue-600 hover:bg-blue-700"
            >
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                onClick={handleClearFilters}
                variant="outline"
                className="rounded-lg"
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {hasSearched && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>
                Resultados ({results.length})
              </CardTitle>
              <CardDescription>
                {results.length === 0
                  ? 'No se encontraron productos con los filtros aplicados'
                  : `Se encontraron ${results.length} producto${results.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((product) => (
                        <motion.tr
                          key={product.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <TableCell>
                            <Badge variant="outline">{product.sku}</Badge>
                          </TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {product.supplierNames.join(', ')}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.currentStock} / {product.maxStock}
                          </TableCell>
                          <TableCell className="text-right">
                            ${product.unitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStockStatus(product).color}>
                              {getStockStatus(product).label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(product)}
                              className="rounded-lg"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Detalles
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>No se encontraron productos</p>
                  <p className="text-sm mt-2">
                    Intenta ajustar los filtros de búsqueda
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Modal de Detalles del Producto */}
    <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
  <DialogContent className="inline-block w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-white border border-gray-100 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Detalles Completos del Producto</DialogTitle>
            <DialogDescription>
              Información completa, historial y métricas del producto seleccionado
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6 py-4">
              {/* Encabezado del Producto */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-100 rounded-xl">
                      <Package className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl mb-1">{selectedProduct.name}</h2>
                      <p className="text-gray-600">{selectedProduct.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-sm">
                          <Tag className="h-3 w-3 mr-1" />
                          {selectedProduct.sku}
                        </Badge>
                        <Badge className={getStockStatus(selectedProduct).color}>
                          {React.createElement(getStockStatus(selectedProduct).icon, { className: 'h-3 w-3 mr-1' })}
                          {getStockStatus(selectedProduct).label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Precio Unitario</p>
                    <p className="text-3xl text-blue-700">${selectedProduct.unitPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Información General */}
              <div>
                <h3 className="text-lg mb-3 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-600" />
                  Información General
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Card className="rounded-xl bg-white border border-gray-100">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <Layers className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Categoría</p>
                            <p className="text-sm font-medium">{selectedProduct.category}</p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">&nbsp;</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 rounded-lg">
                            <Package className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Stock Actual</p>
                            <p className="text-sm font-medium">{selectedProduct.currentStock}</p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">&nbsp;</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-50 rounded-lg">
                            <Truck className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Proveedores</p>
                            <p className="text-sm font-medium">{selectedProduct.supplierNames.length} proveedor{selectedProduct.supplierNames.length !== 1 ? 'es' : ''}</p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">&nbsp;</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tarjeta separada para Última Actualización */}
                  <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <Calendar className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Última Actualización</p>
                          <p className="text-sm font-medium">{selectedProduct.updatedAt.toLocaleDateString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Sección: Tabla detallada de proveedores */}
              <div>
                <h3 className="text-lg mb-3 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-purple-600" />
                  Proveedores del Producto
                </h3>

                  <Card className="rounded-xl">
                  <CardContent className="p-0">
                    <div className="w-full overflow-x-auto overflow-y-auto px-4 py-3 max-h-[45vh]">
                      <table className="table-auto border-separate border-spacing-0 text-sm w-full">
                        <caption className="sr-only">Proveedores del Producto</caption>
                        <thead>
                          <tr className="bg-white">
                            <th className="px-4 py-3 text-left text-xs text-gray-600 whitespace-normal sticky top-0 bg-white z-10">#</th>
                            <th className="px-4 py-3 text-left text-xs text-gray-600 whitespace-normal sticky top-0 bg-white z-10">Nombre del Proveedor</th>
                            <th className="px-4 py-3 text-left text-xs text-gray-600 whitespace-normal sticky top-0 bg-white z-10">Rol</th>
                            <th className="px-4 py-3 text-left text-xs text-gray-600 whitespace-normal sticky top-0 bg-white z-10">Contacto</th>
                            <th className="px-4 py-3 text-left text-xs text-gray-600 whitespace-normal sticky top-0 bg-white z-10">Teléfono</th>
                            <th className="px-4 py-3 text-left text-xs text-gray-600 whitespace-normal sticky top-0 bg-white z-10">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProduct.supplierNames.map((supName, idx) => {
                            const supplierObj = suppliers.find((s) => s.name === supName);
                            const isPrincipal = !!(
                              selectedProduct.supplierIds && supplierObj && selectedProduct.supplierIds[0] === supplierObj.id
                            );
                            return (
                              <tr key={`detsup-${supName}-${idx}`} className="border-b last:border-b-0">
                                <td className="px-4 py-3 align-middle whitespace-normal">{idx + 1}</td>
                                <td className="px-4 py-3 align-middle whitespace-normal">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-50 rounded-md">
                                      <Truck className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{supName}</span>
                                      {supplierObj?.address && (
                                        <span className="text-xs text-gray-500">{supplierObj.address}</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 align-middle">
                                  {isPrincipal ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-black text-white text-xs font-medium">Principal</span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Secundario</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 align-middle whitespace-normal">{supplierObj?.contactName || '-'}</td>
                                <td className="px-4 py-3 align-middle whitespace-normal">{supplierObj?.phone || '-'}</td>
                                <td className="px-4 py-3 align-middle wrap-break-word max-w-[260px]">{supplierObj?.email || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Niveles de Stock */}
              <div>
                <h3 className="text-lg mb-3 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Niveles de Stock
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card className="rounded-xl border-yellow-200 bg-yellow-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Stock Mínimo</p>
                          <p className="text-2xl text-yellow-700">{selectedProduct.minStock}</p>
                        </div>
                        <div className="p-3 bg-yellow-100 rounded-lg">
                          <AlertTriangle className="h-6 w-6 text-yellow-600" />
                        </div>
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
                        <div className="p-3 bg-green-100 rounded-lg">
                          <Package className="h-6 w-6 text-green-600" />
                        </div>
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
                        <div className="p-3 bg-red-100 rounded-lg">
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Barra de Progreso del Stock */}
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Nivel de Stock</span>
                    <span className="text-sm">{selectedProduct.currentStock} / {selectedProduct.maxStock} unidades</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        selectedProduct.currentStock < selectedProduct.minStock
                          ? 'bg-yellow-500'
                          : selectedProduct.currentStock > selectedProduct.maxStock
                          ? 'bg-red-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${(selectedProduct.currentStock / selectedProduct.maxStock) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>Mín: {selectedProduct.minStock}</span>
                    <span>Máx: {selectedProduct.maxStock}</span>
                  </div>
                </div>
              </div>

              {/* Alertas y Recomendaciones */}
              {(selectedProduct.currentStock < selectedProduct.minStock || selectedProduct.currentStock > selectedProduct.maxStock) && (
                <div>
                  <h3 className="text-lg mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Alertas y Recomendaciones
                  </h3>
                  <div className="space-y-2">
                    {selectedProduct.currentStock < selectedProduct.minStock && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="text-sm">
                              <span className="text-yellow-800">Stock Bajo:</span> El inventario actual ({selectedProduct.currentStock}) está por debajo del nivel mínimo ({selectedProduct.minStock}).
                            </p>
                            <p className="text-sm text-yellow-700 mt-1">
                              Recomendación: Solicitar reposición de {selectedProduct.minStock * 2 - selectedProduct.currentStock} unidades para alcanzar el nivel óptimo.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedProduct.currentStock > selectedProduct.maxStock && (
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                          <div>
                            <p className="text-sm">
                              <span className="text-red-800">Sobrestock:</span> El inventario actual ({selectedProduct.currentStock}) supera el nivel máximo ({selectedProduct.maxStock}).
                            </p>
                            <p className="text-sm text-red-700 mt-1">
                              Recomendación: Considerar promociones o descuentos para reducir el inventario en {selectedProduct.currentStock - selectedProduct.maxStock} unidades.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Métricas de Rotación */}
              <div>
                <h3 className="text-lg mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Métricas de Rotación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-50 rounded-lg">
                          <DollarSign className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Valor en Inventario</p>
                          <p className="text-xl text-indigo-700">
                            ${(selectedProduct.currentStock * selectedProduct.unitPrice).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-50 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Rotación Estimada</p>
                          <p className="text-xl text-green-700">
                            {selectedProduct.currentStock > 0 ? 'Media' : 'Sin stock'}
                          </p>
                          <p className="text-xs text-gray-500">Basado en niveles actuales</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
