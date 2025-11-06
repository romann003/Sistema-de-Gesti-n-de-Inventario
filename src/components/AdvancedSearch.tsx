// AdvancedSearch feature removed
// The AdvancedSearch component was deprecated and its route/navigation
// entries have been removed from the app. This file kept as a small
// placeholder to avoid accidental imports; it renders nothing.

import React from 'react';

export function AdvancedSearch() {
  // intentionally render nothing — feature removed per project settings
  return null;
}
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
