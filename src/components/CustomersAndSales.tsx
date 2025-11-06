import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, Plus, Edit, Trash2, Users, ShoppingCart, DollarSign, TrendingUp, Package, AlertTriangle, Tag, Layers, Truck, Phone, Mail, MapPin, History, Eye } from 'lucide-react';
import { Customer, Sale, Product, InventoryMovement, User } from '../types';
import { COMPANY } from '../config/company';
import { getUsers } from '../lib/api';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { CustomerDetailPanel, ProductDetailPanel } from './DynamicDetailPanel';
import { createCustomer, updateCustomer, deleteCustomer as deleteCustomerAPI, createSale, createMovement, getMovements, getSales, getProducts } from '../lib/api';

interface CustomersAndSalesProps {
  customers: Customer[];
  sales: Sale[];
  products: Product[];
  currentUserName: string;
  currentUser?: User;
  onCustomersChange: (customers: Customer[]) => void;
  onSalesChange: (sales: Sale[]) => void;
  onProductsChange: (products: Product[]) => void;
  onMovementsChange?: (movements: InventoryMovement[]) => void;
  movements?: InventoryMovement[];
  showOnly?: 'customers' | 'sales';
}

export function CustomersAndSales({
  customers,
  sales,
  products,
  currentUserName,
  currentUser,
  onCustomersChange,
  onSalesChange,
  onProductsChange,
  onMovementsChange,
  movements = [],
  showOnly,
}: CustomersAndSalesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'customers' | 'sales'>(showOnly ?? 'customers');
  const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);
  const [isSaleDetailOpen, setIsSaleDetailOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSaleCustomer, setSelectedSaleCustomer] = useState<Customer | null>(null);
  const [selectedSaleProduct, setSelectedSaleProduct] = useState<Product | null>(null);
  
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    status: 'activo' as 'activo' | 'inactivo',
  });

  const [saleFormData, setSaleFormData] = useState({
    customerId: '',
    productId: '',
    quantity: '',
    notes: '',
  });

  const [saleItems, setSaleItems] = useState<Array<{
    productId: string;
    productName: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>>([]);

  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [pickerProductId, setPickerProductId] = useState<string>('');
  const [pickerQuantity, setPickerQuantity] = useState<number>(1);
  const [pickerUnitPrice, setPickerUnitPrice] = useState<number>(0);
  const [pickerTargetIndex, setPickerTargetIndex] = useState<number | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Flags derived from prop: allow showing only customers or only sales when requested
  const showCustomers = !showOnly || showOnly === 'customers';
  const showSales = !showOnly || showOnly === 'sales';

  // Update selected customer for sale when customerId changes
  useEffect(() => {
    // if showOnly is provided, force activeTab accordingly
    if (showOnly) setActiveTab(showOnly);
  }, [showOnly]);

  useEffect(() => {
    if (saleFormData.customerId) {
      const customer = customers.find((c) => c.id === saleFormData.customerId);
      setSelectedSaleCustomer(customer || null);
    } else {
      setSelectedSaleCustomer(null);
    }
  }, [saleFormData.customerId, customers]);

  // Update selected product for sale when productId changes
  useEffect(() => {
    if (saleFormData.productId) {
      const product = products.find((p) => p.id === saleFormData.productId);
      setSelectedSaleProduct(product || null);
    } else {
      setSelectedSaleProduct(null);
    }
  }, [saleFormData.productId, products]);

  const filteredCustomers = customers.filter((c) =>
    (c?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c?.contactName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c?.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSales = sales.filter((s) =>
    (s?.customerName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s?.id ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateCustomerForm = () => {
    const newErrors: Record<string, string> = {};

    if (!customerFormData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!customerFormData.contactName.trim())
      newErrors.contactName = 'El contacto es requerido';
    if (!customerFormData.phone.trim()) newErrors.phone = 'El teléfono es requerido';
    if (!customerFormData.email.trim()) newErrors.email = 'El email es requerido';
    if (customerFormData.email && !customerFormData.email.includes('@'))
      newErrors.email = 'Email inválido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSaleForm = () => {
    const newErrors: Record<string, string> = {};

    if (!saleFormData.customerId) newErrors.customerId = 'Selecciona un cliente';
    if (!saleItems || saleItems.length === 0) newErrors.productId = 'Agrega al menos un producto a la venta';

    // Validate each line item
    saleItems.forEach((it, idx) => {
      if (!it.productId) newErrors[`item_${idx}`] = 'Producto inválido';
      if (!it.quantity || it.quantity <= 0) newErrors[`item_${idx}`] = 'Cantidad inválida';
      const p = products.find((p) => p.id === it.productId);
      if (p && it.quantity > p.currentStock) newErrors[`item_${idx}`] = 'Stock insuficiente';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenCustomerSheet = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerFormData({
        name: customer.name,
        contactName: customer.contactName,
        phone: customer.phone,
        email: customer.email,
        address: customer.address || '',
        status: customer.status,
      });
    } else {
      setEditingCustomer(null);
      setCustomerFormData({
        name: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        status: 'activo',
      });
    }
    setErrors({});
    setIsCustomerSheetOpen(true);
  };

  const handleOpenCustomerDetails = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerFormData({
      name: customer.name,
      contactName: customer.contactName,
      phone: customer.phone,
      email: customer.email,
      address: customer.address || '',
      status: customer.status,
    });
    setIsCustomerDetailOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!validateCustomerForm()) {
      toast.error('Por favor, corrige los errores en el formulario');
      return;
    }

    setIsLoading(true);

    try {
      const customerPayload = {
        nombre: customerFormData.name,
        contacto: customerFormData.contactName,
        telefono: customerFormData.phone,
        correo: customerFormData.email,
        direccion: customerFormData.address || undefined,
        estado: customerFormData.status,
      };

      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, customerPayload);
        // Reload customers
        const customerData: Customer = {
          id: editingCustomer.id,
          name: customerFormData.name,
          contactName: customerFormData.contactName,
          phone: customerFormData.phone,
          email: customerFormData.email,
          address: customerFormData.address || undefined,
          status: customerFormData.status,
          totalPurchases: editingCustomer.totalPurchases,
          createdAt: editingCustomer.createdAt,
        };
        onCustomersChange(
          customers.map((c) => (c.id === editingCustomer.id ? customerData : c))
        );
        toast.success('Cliente actualizado correctamente');
      } else {
        const result = await createCustomer(customerPayload);
        const newId = (result as any).id_cliente || (result as any).id || (result as any).id_cliente;
        const createdAtRaw = (result as any).created_at || (result as any).createdAt || new Date();
        const customerData: Customer = {
          id: newId,
          name: customerFormData.name,
          contactName: customerFormData.contactName,
          phone: customerFormData.phone,
          email: customerFormData.email,
          address: customerFormData.address || undefined,
          status: customerFormData.status,
          totalPurchases: 0,
          createdAt: new Date(createdAtRaw),
        };
        onCustomersChange([...customers, customerData]);
        toast.success('Cliente creado correctamente');
      }

      setIsCustomerSheetOpen(false);
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Error al guardar el cliente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (deleteCustomer) {
      setIsLoading(true);
      try {
        await deleteCustomerAPI(deleteCustomer.id);
        onCustomersChange(customers.filter((c) => c.id !== deleteCustomer.id));
        toast.success('Cliente eliminado correctamente');
        setDeleteCustomer(null);
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error('Error al eliminar el cliente');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOpenSaleDialog = () => {
    setSaleFormData({
      customerId: '',
      productId: '',
      quantity: '',
      notes: '',
    });
    setErrors({});
    setIsSaleDialogOpen(true);
  };

  const handleOpenSaleDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsSaleDetailOpen(true);
  };

  // Load users map to translate id -> name for displayed 'performedBy'
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const users = await getUsers();
        if (!mounted) return;
        const map: Record<string, string> = {};
        (users || []).forEach((u: any) => {
          map[String(u.id)] = u.nombre || u.fullName || u.username || '';
        });
        setUsersMap(map);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSaveSale = async () => {
    if (!validateSaleForm()) {
      toast.error('Por favor, corrige los errores en el formulario');
      return;
    }
    const customer = customers.find((c) => c.id === saleFormData.customerId);
    if (!customer) return;
    if (!currentUser) {
      toast.error('No hay usuario autenticado');
      return;
    }

    setIsLoading(true);
    try {
      // Build items payload from saleItems
      const itemsPayload = saleItems.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      }));

      // Create sale in Supabase (this will insert detalles_venta which triggers stock reduction)
      await createSale({
        id_cliente: customer.id,
        items: itemsPayload,
        notas: saleFormData.notes || undefined,
        id_usuario: currentUser.id,
      });

      // NOTE: stock is reduced by the DB trigger on `ventas` (trigger_reducir_stock),
      // so we should NOT use `movimientos_inventario` with tipo='Ajuste' and negative
      // cantidad for sales — that table and its trigger are intended for 'Entrada' or
      // 'Ajuste' (absolute set). If you want a movement record for sales, either
      // extend the DB to support tipo='Salida' or create an audit entry. For now we
      // skip creating a movimiento to avoid incorrect stock writes.

      // Refresh data from server
      const [updatedSales, updatedMovements, updatedProducts] = await Promise.all([
        getSales(),
        getMovements(),
        getProducts(),
      ]);
      // Also refresh customers in case derived fields changed (e.g., totals)
      let updatedCustomers: any[] = [];
      try {
        const cs = await (await import('../lib/api')).getCustomers();
        updatedCustomers = cs || [];
      } catch (e) {
        // ignore - best effort
      }

      // Map movements to local format
      const mappedMovements = updatedMovements.map((m: any) => ({
        id: m.id_movimiento,
        productId: m.id_producto,
        productName: m.productos?.nombre || '',
        sku: m.productos?.sku || '',
  type: (m.tipo ?? '').toLowerCase() as 'entrada' | 'salida',
        quantity: m.cantidad,
        reason: m.motivo,
        performedBy: currentUserName,
        date: new Date(m.fecha),
        notes: m.notas,
      }));

      // Normalize updatedSales (raw DB rows) into frontend Sale shape before updating parent state
      const normalizeSales = (rows: any[]) => {
        if (!rows || rows.length === 0) return [];

        // If API returns headers with nested detalles_venta, map directly
        if (rows[0].detalles_venta !== undefined) {
          return (rows || []).map((r: any) => {
              const items = (r.detalles_venta || []).map((d: any) => ({
              productId: d.id_producto || '',
              productName: d.productos?.nombre || d.nombre_producto || `Producto ${d.id_producto || ''}`,
              sku: d.productos?.sku || d.sku || '',
              quantity: Number(d.cantidad || 0),
              unitPrice: Number(d.precio_unitario || d.precio || 0),
              subtotal: Number(d.subtotal || (d.cantidad || 0) * (d.precio_unitario || d.precio || 0)),
            }));
            return {
              id: r.id_venta || r.id || '',
              customerId: r.id_cliente || '',
              customerName: r.clientes?.nombre || r.nombre_cliente || '',
              items,
              total: Number(r.total ?? items.reduce((s: number, it: any) => s + it.subtotal, 0)),
              date: r.fecha ? new Date(r.fecha) : new Date(),
              performedBy: r.usuarios?.nombre || usersMap[String(r.id_usuario)] || (String(r.id_usuario) === String(currentUser?.id) ? currentUserName : String(r.id_usuario) || ''),
              notes: r.notas || r.notes || '',
            } as Sale;
          });
        }

        // Fallback: older flat row grouping (each row is a product-row for a sale)
        const grouped: Record<string, any[]> = {};
        (rows || []).forEach((r: any) => {
          const key = String(r.id_venta || r.id || r.id_venta);
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(r);
        });
        const normalized: Sale[] = Object.keys(grouped).map((key) => {
          const group = grouped[key];
          const first = group[0] || {};
          const items = group.map((row: any) => ({
            productId: row.id_producto || row.producto_id || '',
            productName: row.productos?.nombre || row.nombre_producto || `Producto ${row.id_producto || row.producto_id || ''}`,
            sku: row.productos?.sku || row.sku || '',
            quantity: Number(row.cantidad || 0),
            unitPrice: Number(row.precio_unitario ?? row.precio ?? 0),
            subtotal: Number((row.cantidad || 0) * (row.precio_unitario ?? row.precio ?? 0)),
          }));
          const total = Number(first.total ?? items.reduce((s: number, it: any) => s + it.subtotal, 0));
          return {
            id: key,
            customerId: first.id_cliente || '',
            customerName: first.clientes?.nombre || first.nombre_cliente || '',
            items,
            total,
            date: first.fecha ? new Date(first.fecha) : new Date(),
            performedBy:
              first.usuarios?.nombre ||
              usersMap[String(first.id_usuario)] ||
              (String(first.id_usuario) === String(currentUser?.id) ? currentUserName : String(first.id_usuario) || ''),
            notes: first.notas || first.notes || '',
          } as Sale;
        });
        return normalized;
      };

      onSalesChange(normalizeSales(updatedSales));
  if (updatedCustomers.length > 0) onCustomersChange(updatedCustomers);
      onMovementsChange?.(mappedMovements);
      onProductsChange(updatedProducts);

      // Verificar alerta de stock
      // If any product stock fell below thresholds, show warnings for each
      saleItems.forEach((line) => {
        const updatedProduct = updatedProducts.find((p: Product) => p.id === line.productId);
        const oldProduct = products.find((p) => p.id === line.productId);
        const newStock = updatedProduct?.currentStock || 0;
        const productName = updatedProduct?.name || oldProduct?.name || '';
        if (newStock < (updatedProduct?.minStock ?? oldProduct?.minStock ?? 0)) {
          toast.warning(
            `Venta registrada. Alerta: ${productName} tiene stock bajo (${newStock} unidades)`
          );
        }
      });
      toast.success('Venta registrada correctamente. Stock actualizado automáticamente.');

      // Clear form
      setSaleItems([]);
      setSaleFormData({ customerId: '', productId: '', quantity: '', notes: '' });

      setIsSaleDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving sale:', error);
      toast.error(error.message || 'Error al registrar la venta');
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToSale = () => {
    const product = products.find((p) => p.id === saleFormData.productId);
    if (!product) {
      setErrors((s) => ({ ...s, productId: 'Selecciona un producto' }));
      return;
    }
    const qty = parseInt(String(saleFormData.quantity || '0')) || 0;
    if (qty <= 0) {
      setErrors((s) => ({ ...s, quantity: 'Cantidad inválida' }));
      return;
    }
    if (qty > product.currentStock) {
      setErrors((s) => ({ ...s, quantity: 'Stock insuficiente' }));
      return;
    }

    setSaleItems((prev) => {
      const existingIndex = prev.findIndex((it) => it.productId === product.id);
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex].quantity += qty;
        copy[existingIndex].subtotal = parseFloat((copy[existingIndex].quantity * copy[existingIndex].unitPrice).toFixed(2));
        return copy;
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: qty,
          unitPrice: product.unitPrice,
          subtotal: parseFloat((qty * product.unitPrice).toFixed(2)),
        },
      ];
    });

    // clear product/quantity inputs
    setSaleFormData((s) => ({ ...s, productId: '', quantity: '' }));
    setErrors((s) => {
      const copy = { ...s } as Record<string, string>;
      delete copy.productId;
      delete copy.quantity;
      return copy;
    });
  };

  const removeItemFromSale = (productKey: string) => {
    setSaleItems((prev) => {
      if (productKey && productKey.startsWith('new-')) {
        const idx = parseInt(productKey.split('-')[1] || '-1', 10);
        if (!isNaN(idx)) {
          const copy = [...prev];
          copy.splice(idx, 1);
          return copy;
        }
      }
      // remove by productId
      return prev.filter((it) => it.productId !== productKey);
    });
  };

  const updateItemQuantity = (productKey: string, quantity: number) => {
    setSaleItems((prev) => {
      const copy = prev.map((it) => ({ ...it }));
      let idx = copy.findIndex((c) => c.productId === productKey);
      if (idx === -1 && productKey && productKey.startsWith('new-')) {
        idx = parseInt(productKey.split('-')[1] || '-1', 10);
      }
      if (idx >= 0 && idx < copy.length) {
        copy[idx].quantity = quantity;
        copy[idx].subtotal = parseFloat((copy[idx].quantity * (copy[idx].unitPrice || 0)).toFixed(2));
      }
      return copy;
    });
  };



  const getStockStatus = (product: Product) => {
    if (product.currentStock < product.minStock) {
      return { label: 'Bajo Stock', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    } else if (product.currentStock > product.maxStock) {
      return { label: 'Sobrestock', color: 'bg-red-100 text-red-800 border-red-300' };
    }
    return { label: 'Normal', color: 'bg-green-100 text-green-800 border-green-300' };
  };

  const getCustomerSales = (customerId: string) => {
    return sales.filter(s => s.customerId === customerId);
  };

  const totalSalesAmount = sales.reduce((sum, s) => sum + s.total, 0);

  const showingCustomers = activeTab === 'customers';
  const showingSales = activeTab === 'sales';

  // Available products for the product picker: exclude products already added to the sale
  // If the picker targets an existing empty row, allow the current product in that row to appear
  const availableProductsForPicker = products.filter((p) => {
    if (pickerTargetIndex !== null && saleItems[pickerTargetIndex] && saleItems[pickerTargetIndex].productId === p.id) {
      return true; // allow the product already assigned to the targeted row so it remains selectable
    }
    return !saleItems.some((it) => it.productId === p.id && it.productId !== '');
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">{showOnly ? (showOnly === 'customers' ? 'Clientes' : 'Ventas') : 'Clientes y Ventas'}</h1>
        <p className="text-gray-600">
          {showOnly ? (showOnly === 'customers' ? 'Gestiona clientes' : 'Registra las ventas del negocio') : 'Gestiona clientes y registra las ventas del negocio'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {showingSales && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Ventas</p>
                    <p className="text-3xl mt-1">{sales.length}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {showingSales && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Monto Total</p>
                    <p className="text-3xl mt-1">${totalSalesAmount.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {showingCustomers && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Clientes</p>
                    <p className="text-3xl mt-1">{customers.length}</p>
                  </div>
                  <div className="p-3 bg-sky-50 rounded-lg">
                    <Users className="h-6 w-6 text-sky-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* keep grid sizing consistent */}
        <div className="hidden md:block" />
      </div>

      <Card className="rounded-xl">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
              {!showOnly ? (
                <TabsList className="rounded-lg">
                  <TabsTrigger value="customers" className="rounded-lg">
                    Clientes
                  </TabsTrigger>
                  <TabsTrigger value="sales" className="rounded-lg">
                    Ventas
                  </TabsTrigger>
                </TabsList>
              ) : (
                <div>
                  <h2 className="text-lg font-semibold">{showOnly === 'customers' ? 'Clientes' : 'Ventas'}</h2>
                </div>
              )}

              <div className="flex gap-2">
                {showCustomers && activeTab === 'customers' && (
                  <Button
                    onClick={() => handleOpenCustomerSheet()}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Cliente
                  </Button>
                )}
                {showSales && (
                  <Button
                    onClick={handleOpenSaleDialog}
                    className="rounded-lg bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Venta
                  </Button>
                )}
              </div>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-lg"
                />
              </div>
            </div>

            {showCustomers ? (
              <TabsContent value="customers" className="mt-0">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                  
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          No se encontraron clientes
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer, index) => (
                        <motion.tr
                          key={customer.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-blue-50 rounded-lg">
                                <Users className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm">{customer.name}</p>
                                {customer.address && (
                                  <p className="text-xs text-gray-500">{customer.address}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{customer.contactName}</TableCell>
                          <TableCell>{customer.phone}</TableCell>
                          <TableCell>{customer.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={customer.status === 'activo' ? 'default' : 'secondary'}
                            >
                              {customer.status === 'activo' ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenCustomerDetails(customer)}
                                className="rounded-lg"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenCustomerSheet(customer)}
                                className="rounded-lg"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteCustomer(customer)}
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
              </TabsContent>
            ) : null}

            {showSales ? (
              <TabsContent value="sales" className="mt-0">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Venta</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          No se encontraron ventas
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSales.map((sale, index) => (
                        <motion.tr
                          key={sale.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                          <TableCell>
                            <Badge variant="outline">#{(sale.id ?? '').slice(-6)}</Badge>
                          </TableCell>
                          <TableCell>{sale.customerName}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {sale.items.map((item, idx) => (
                                <div key={idx} className="text-xs">
                                  {item.productName} x{item.quantity}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{sale.date.toLocaleDateString()}</p>
                              <p className="text-xs text-gray-500">
                                {sale.date.toLocaleTimeString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{sale.performedBy}</TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-green-50 text-green-700">
                              ${sale.total.toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenSaleDetails(sale)}
                                className="rounded-lg"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            ) : null}
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog Cliente - centered modal, preview only when editing */}
      <Dialog open={isCustomerSheetOpen} onOpenChange={setIsCustomerSheetOpen}>
        <DialogContent className="w-full max-w-3xl rounded-xl max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <p className="text-sm text-gray-500">{editingCustomer ? 'Modifica los datos del cliente' : 'Completa la información del nuevo cliente'}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:flex-1">
              <Card className="border-l-4 border-sky-400 bg-white">
                <CardHeader>
                  <CardTitle className="text-sky-800">Información</CardTitle>
                  <CardDescription className="text-xs">Datos básicos del cliente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nombre del Cliente *</Label>
                      <Input id="name" value={customerFormData.name} onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })} className="rounded-lg" placeholder="Ej: Empresa XYZ" />
                      {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                    </div>

                    <div>
                      <Label htmlFor="contactName">Nombre de Contacto *</Label>
                      <Input id="contactName" value={customerFormData.contactName} onChange={(e) => setCustomerFormData({ ...customerFormData, contactName: e.target.value })} className="rounded-lg" placeholder="Ej: Pedro Sánchez" />
                      {errors.contactName && <p className="text-xs text-red-600">{errors.contactName}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Teléfono *</Label>
                        <Input id="phone" value={customerFormData.phone} onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })} className="rounded-lg" placeholder="+1-555-0000" />
                        {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" type="email" value={customerFormData.email} onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })} className="rounded-lg" placeholder="correo@empresa.com" />
                        {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address">Dirección (opcional)</Label>
                      <Textarea id="address" value={customerFormData.address} onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })} className="rounded-lg" placeholder="Dirección completa" rows={3} />
                    </div>

                    <div>
                      <Label htmlFor="status">Estado *</Label>
                      <Select value={customerFormData.status} onValueChange={(value: 'activo' | 'inactivo') => setCustomerFormData({ ...customerFormData, status: value })}>
                        <SelectTrigger id="status" className="rounded-lg">
                          <SelectValue placeholder="Selecciona el estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="activo">Activo</SelectItem>
                          <SelectItem value="inactivo">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-end items-center">
                <Button variant="outline" onClick={() => setIsCustomerSheetOpen(false)} className="rounded-lg w-full sm:w-auto" disabled={isLoading}>Cancelar</Button>
                <Button onClick={handleSaveCustomer} className="rounded-lg bg-blue-600 hover:bg-blue-700 w-full sm:w-auto" disabled={isLoading}>
                  {isLoading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Guardando...</>) : (editingCustomer ? 'Actualizar' : 'Crear')}
                </Button>
              </div>
            </div>

            {/* preview moved to a separate dialog opened via 'Ver detalles' button */}
          </div>
        </DialogContent>
      </Dialog>

        {/* Dialog: Customer Details (opened from 'Ver detalles' button) */}
        <Dialog open={isCustomerDetailOpen} onOpenChange={setIsCustomerDetailOpen}>
          <DialogContent className="w-full sm:max-w-4xl overflow-y-auto rounded-xl p-4">
            <DialogHeader>
              <DialogTitle>Detalles del Cliente</DialogTitle>
              <DialogDescription>Información completa del cliente</DialogDescription>
            </DialogHeader>

            <div className="pt-2">
              {editingCustomer ? (
                <div>
                  <CustomerDetailPanel customer={{
                    name: editingCustomer.name,
                    contactName: editingCustomer.contactName,
                    email: editingCustomer.email,
                    phone: editingCustomer.phone,
                    address: editingCustomer.address || undefined,
                    status: editingCustomer.status,
                    totalPurchases: editingCustomer.totalPurchases,
                  }} />

                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={() => setIsCustomerDetailOpen(false)} className="rounded-lg">Cerrar</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay cliente seleccionado</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

      
  {/* Dialog: Crear Venta */}
  <Dialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen}>
    <DialogContent className="w-full sm:max-w-4xl rounded-xl overflow-y-auto max-h-[90vh] p-6">
      <DialogHeader>
        <DialogTitle>Registrar Venta</DialogTitle>
        <DialogDescription>Registra una venta para un cliente y añade múltiples productos.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col md:flex-row gap-6">

      {/* Middle: Customer column (md:flex-1) */}
              <div className="md:flex-1 min-w-0">
                <Card className="border border-gray-200 bg-white shadow-sm rounded-lg p-0">
                  <CardHeader>
                    <CardTitle className="text-emerald-800 font-semibold">Cliente</CardTitle>
                    <CardDescription className="text-xs">Selecciona el cliente</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Select value={saleFormData.customerId} onValueChange={(value: string) => setSaleFormData({ ...saleFormData, customerId: value })}>
                        <SelectTrigger id="customerId" className="rounded-lg py-2 px-2">
                          <SelectValue placeholder="Selecciona un cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.filter(c => c.status === 'activo').map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>{customer.name} - {customer.contactName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.customerId && <p className="text-xs text-red-600">{errors.customerId}</p>}

                      {selectedSaleCustomer && (
                        <div className="mt-3">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-md border border-gray-100">
                                <Users className="h-6 w-6 text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-lg font-medium truncate">{selectedSaleCustomer.name}</h3>
                                <p className="text-sm text-gray-600 truncate">{selectedSaleCustomer.contactName}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <div className="flex-1 min-w-[160px] bg-gray-50 rounded-md p-4 border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Contacto</p>
                              <p className="text-sm">{selectedSaleCustomer.contactName || '—'}</p>
                            </div>

                            <div className="flex-1 min-w-[180px] bg-gray-50 rounded-md p-4 border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Email</p>
                              <p className="text-sm">{selectedSaleCustomer.email || '—'}</p>
                            </div>

                            <div className="flex-1 min-w-[140px] bg-gray-50 rounded-md p-4 border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Teléfono</p>
                              <p className="text-sm">{selectedSaleCustomer.phone || '—'}</p>
                            </div>

                            <div className="flex-1 min-w-[200px] bg-gray-50 rounded-md p-4 border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">Dirección</p>
                              <p className="text-sm truncate">{selectedSaleCustomer.address || '—'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Sale details (md:w-80) */}
              <div className="md:w-80 min-w-0">
                <Card className="border-l-4 border-amber-400 bg-amber-50">
                  <CardHeader>
                    <CardTitle className="text-amber-800 font-semibold">Venta</CardTitle>
                    <CardDescription className="text-xs">Resumen y confirmación</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div>
                        {/* Inline product selector removed — use the product picker modal or "Agregar fila" */}
                        <div className="text-xs text-gray-500">Producto: usa el botón <strong>Agregar fila</strong> para añadir ítems a la venta.</div>
                        {errors.productId && <p className="text-xs text-red-600">{errors.productId}</p>}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button onClick={() => {
                          // open product picker modal to ADD a new item
                          setPickerTargetIndex(null);
                          setPickerProductId('');
                          setPickerQuantity(1);
                          setPickerUnitPrice(0);
                          setIsProductPickerOpen(true);
                        }} className="rounded-lg bg-amber-500 hover:bg-amber-600 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Productos
                        </Button>
                      </div>

                      {/* Items list */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500 mb-2">Items añadidos</div>
                        <div>
                          <Button size="sm" variant="ghost" onClick={() => {
                            // add an empty editable row (user can then select product via picker or edit)
                            setSaleItems(prev => ([...prev, { productId: '', productName: '', sku: '', quantity: 1, unitPrice: 0, subtotal: 0 }]));
                          }}>Agregar fila</Button>
                        </div>
                      </div>

                      {saleItems.length > 0 ? (
                        <div className="mt-2">
                          <div className="max-h-48 overflow-y-auto">
                            <Table>
                                  <TableHeader>
                                      <TableRow className="bg-amber-50">
                                        <TableHead className="text-xs text-gray-500 uppercase tracking-wide">Producto</TableHead>
                                        <TableHead className="text-xs text-gray-500 uppercase tracking-wide text-right">Cant.</TableHead>
                                        <TableHead className="text-xs text-gray-500 uppercase tracking-wide text-right">P.Unit</TableHead>
                                        <TableHead className="text-xs text-gray-500 uppercase tracking-wide text-right">Subtotal</TableHead>
                                        <TableHead className="text-xs" />
                                      </TableRow>
                                    </TableHeader>
                              <TableBody>
                                {saleItems.map((it, index) => {
                                  const prod = products.find((p) => p.id === it.productId);
                                  const stock = prod?.currentStock ?? 0;
                                  const insufficient = it.quantity > stock;
                                  return (
                                    <TableRow key={it.productId || `new-${index}`} className={`${insufficient ? 'bg-red-50' : prod && prod.currentStock < (prod.minStock ?? 0) ? 'bg-yellow-50' : 'hover:bg-slate-50'} transition-colors` }>
                                      <TableCell>
                                        {it.productId ? (
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <div className="font-medium">{it.productName}</div>
                                              {prod?.sku && <div className="text-xs text-gray-400">SKU: {prod.sku}</div>}
                                            </div>
                                            <div className="ml-2 text-right">
                                              <div className="text-xs text-gray-500">Stock: <span className={`px-2 py-0.5 rounded-full text-xs ${stock === 0 ? 'bg-red-100 text-red-700' : stock <= (prod?.minStock ?? 0) ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{stock}</span></div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <div className="text-xs text-gray-500">Fila vacía</div>
                                            <Button size="sm" onClick={() => {
                                              // open product picker and target this row
                                              setPickerTargetIndex(index);
                                              setPickerProductId('');
                                              setPickerQuantity(1);
                                              setPickerUnitPrice(0);
                                              setIsProductPickerOpen(true);
                                            }}>Seleccionar</Button>
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <Input type="number" min={1} max={stock || 9999} value={String(it.quantity)} onChange={(e) => updateItemQuantity(it.productId || `new-${index}`, Math.max(1, Number(e.target.value || 0)))} className={`w-20 text-right ${insufficient ? 'border-red-300' : ''}`} disabled={!it.productId} />
                                          <div className="text-xs text-gray-500">stk: {stock}</div>
                                        </div>
                                        {insufficient && <div className="text-xs text-red-600">Stock insuficiente</div>}
                                      </TableCell>
                                      <TableCell className="text-right text-sm text-gray-700">${it.unitPrice.toFixed(2)}</TableCell>
                                      <TableCell className="text-right font-medium text-green-700">${it.subtotal.toFixed(2)}</TableCell>
                                      <TableCell className="text-right">
                                        <Button variant="ghost" onClick={() => removeItemFromSale(it.productId || `new-${index}`)} title="Eliminar" aria-label="Eliminar línea">
                                          <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200 text-right">
                            <div className="text-sm text-gray-600">Total</div>
                            <div className="text-2xl text-green-700 font-bold">${saleItems.reduce((s, it) => s + it.subtotal, 0).toFixed(2)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-gray-500">No hay productos añadidos aún</div>
                      )}
                      {/* Notes moved below the items table as requested */}
                      <div className="mt-4">
                        <Label htmlFor="notes">Notas (opcional)</Label>
                        <Textarea id="notes" value={saleFormData.notes} onChange={(e) => setSaleFormData({ ...saleFormData, notes: e.target.value })} className="rounded-lg" rows={3} />
                      </div>

                    </div>
                  </CardContent>
                </Card>
              </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 px-4">
            <Button variant="outline" onClick={() => setIsSaleDialogOpen(false)} className="rounded-lg w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSaveSale} className="rounded-lg bg-green-600 hover:bg-green-700 w-full sm:w-auto" disabled={isLoading || saleItems.length === 0 || saleItems.some(it => {
              const prod = products.find(p => p.id === it.productId);
              return (prod && it.quantity > (prod.currentStock ?? 0));
            })}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product picker modal */}
      <Dialog open={isProductPickerOpen} onOpenChange={setIsProductPickerOpen}>
        <DialogContent className="w-full max-w-3xl rounded-xl p-4">
          <DialogHeader>
            <DialogTitle>Seleccionar producto</DialogTitle>
            <DialogDescription>Elige un producto, ajusta precio y cantidad, y confírmalo para añadir a la venta.</DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            <div className="max-h-56 overflow-y-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableProductsForPicker.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => {
                      setPickerProductId(p.id);
                      setPickerUnitPrice(p.unitPrice || 0);
                    }}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right">${(p.unitPrice || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{p.currentStock}</TableCell>
                      <TableCell className="text-right">
                        <Button variant={pickerProductId === p.id ? 'default' : 'ghost'} onClick={(e: any) => { e.stopPropagation(); setPickerProductId(p.id); setPickerUnitPrice(p.unitPrice || 0); }}>Seleccionar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {availableProductsForPicker.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-gray-500 py-4">Todos los productos disponibles ya fueron añadidos a la venta.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label>Producto seleccionado</Label>
                  {pickerProductId ? (
                    <div className="mt-2 p-3 bg-white rounded-lg border shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold text-sky-800">{products.find(p => p.id === pickerProductId)?.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{products.find(p => p.id === pickerProductId)?.sku || ''}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Precio</div>
                          <div className="text-xl font-bold text-emerald-700">${(products.find(p => p.id === pickerProductId)?.unitPrice || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mt-1">—</div>
                  )}
                </div>

                <div>
                  {/* Product detail panel with more information */}
                  {(() => {
                    const p = products.find(p => p.id === pickerProductId) || null;
                    if (!p) return null;
                    return (
                      <ProductDetailPanel product={{
                        name: p.name,
                        sku: p.sku,
                        category: p.category || '',
                        currentStock: p.currentStock,
                        minStock: p.minStock,
                        unitPrice: p.unitPrice,
                        supplierNames: p.supplierNames || [],
                      }} />
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsProductPickerOpen(false)}>Cancelar</Button>
            <Button disabled={!pickerProductId} variant="outline" onClick={() => {
              // Add picked product to table but keep modal open
              if (!pickerProductId) return;
              const p = products.find(px => px.id === pickerProductId);
              const price = p?.unitPrice || 0; // non-editable price
              const qty = 1; // quantity editable only from main table
              const subtotal = parseFloat((price * qty).toFixed(2));

              if (pickerTargetIndex !== null && pickerTargetIndex >= 0) {
                setSaleItems(prev => {
                  const copy = prev.map(it => ({ ...it }));
                  if (pickerTargetIndex >= copy.length) {
                    copy.push({ productId: pickerProductId, productName: p?.name || '', sku: p?.sku, quantity: qty, unitPrice: price, subtotal });
                  } else {
                    copy[pickerTargetIndex] = { productId: pickerProductId, productName: p?.name || '', sku: p?.sku, quantity: qty, unitPrice: price, subtotal };
                  }
                  return copy;
                });
              } else {
                setSaleItems(prev => {
                  const existing = prev.find(it => it.productId === pickerProductId);
                  if (existing) {
                    return prev.map(it => it.productId === pickerProductId ? ({ ...it, quantity: it.quantity + qty, subtotal: parseFloat(((it.quantity + qty) * price).toFixed(2)) }) : it);
                  }
                  return [...prev, { productId: pickerProductId, productName: p?.name || '', sku: p?.sku, quantity: qty, unitPrice: price, subtotal }];
                });
              }

              // keep modal open so user can add more; reset selection
              setPickerProductId('');
              setPickerQuantity(1);
              setPickerUnitPrice(0);
              setPickerTargetIndex(null);
            }} className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white hover:text-white">Agregar a la tabla</Button>

            <Button disabled={!pickerProductId} onClick={() => {
              // Confirm: add and close
              if (!pickerProductId) return;
              const p = products.find(px => px.id === pickerProductId);
              const price = p?.unitPrice || 0;
              const qty = 1;
              const subtotal = parseFloat((price * qty).toFixed(2));

              if (pickerTargetIndex !== null && pickerTargetIndex >= 0) {
                setSaleItems(prev => {
                  const copy = prev.map(it => ({ ...it }));
                  if (pickerTargetIndex >= copy.length) {
                    copy.push({ productId: pickerProductId, productName: p?.name || '', sku: p?.sku, quantity: qty, unitPrice: price, subtotal });
                  } else {
                    copy[pickerTargetIndex] = { productId: pickerProductId, productName: p?.name || '', sku: p?.sku, quantity: qty, unitPrice: price, subtotal };
                  }
                  return copy;
                });
              } else {
                setSaleItems(prev => {
                  const existing = prev.find(it => it.productId === pickerProductId);
                  if (existing) {
                    return prev.map(it => it.productId === pickerProductId ? ({ ...it, quantity: it.quantity + qty, subtotal: parseFloat(((it.quantity + qty) * price).toFixed(2)) }) : it);
                  }
                  return [...prev, { productId: pickerProductId, productName: p?.name || '', sku: p?.sku, quantity: qty, unitPrice: price, subtotal }];
                });
              }

              setPickerTargetIndex(null);
              setPickerProductId('');
              setPickerQuantity(1);
              setPickerUnitPrice(0);
              setIsProductPickerOpen(false);
            }} className="rounded-lg bg-amber-500 hover:bg-amber-600">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar Cliente */}
      <AlertDialog
        open={!!deleteCustomer}
        onOpenChange={() => setDeleteCustomer(null)}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El cliente "{deleteCustomer?.name}" será
              eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="rounded-lg bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Sale Details (opened from 'Ver detalles' button in sales table) */}
      <Dialog open={isSaleDetailOpen} onOpenChange={setIsSaleDetailOpen}>
        <DialogContent className="w-full max-w-3xl rounded-xl p-4">
            <DialogHeader>
              <DialogTitle>Factura de Venta</DialogTitle>
              <DialogDescription>Vista detallada de la venta con formato de factura</DialogDescription>
            </DialogHeader>

            <div className="pt-2">
              {selectedSale ? (
                <div className="bg-white border rounded-lg shadow-sm p-6">
                  {/* Company header */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-sky-800">{COMPANY.name}</h3>
                      <p className="text-sm text-gray-600">{COMPANY.address}</p>
                      <p className="text-sm text-gray-600">{COMPANY.email} · RFC {COMPANY.rfc}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-gray-500">Factura</div>
                      <div className="text-lg font-semibold">#{(selectedSale.id ?? '').slice(-8)}</div>
                      <div className="text-xs text-gray-500">{selectedSale.date ? selectedSale.date.toLocaleDateString() : ''} · {selectedSale.date ? selectedSale.date.toLocaleTimeString() : ''}</div>
                    </div>
                  </div>

                  {/* Bill to / Seller */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div>
                        <div className="text-xs text-gray-500">Facturar a</div>
                        <div className="font-semibold text-sm">{selectedSale.customerName || '—'}</div>
                        {selectedSale.customerId && <div className="text-xs text-gray-500">ID: {selectedSale.customerId}</div>}
                        {/* Try to display email/phone by looking up the customer record passed as prop */}
                        {(() => {
                          const c = customers.find(cust => String(cust.id) === String(selectedSale.customerId));
                          if (!c) return null;
                          return (
                            <div className="mt-2 text-sm text-gray-600">
                              {c.email && <div>{c.email}</div>}
                              {c.phone && <div>{c.phone}</div>}
                            </div>
                          );
                        })()}
                      </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Vendedor</div>
                      <div className="font-semibold text-sm">{selectedSale.performedBy || '—'}</div>
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-3 text-sm text-gray-600">Descripción</th>
                          <th className="p-3 text-sm text-gray-600">SKU</th>
                          <th className="p-3 text-sm text-gray-600 text-right">Cantidad</th>
                          <th className="p-3 text-sm text-gray-600 text-right">Precio Unit.</th>
                          <th className="p-3 text-sm text-gray-600 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.items.map((it, i) => (
                          <tr key={i} className="border-b">
                            <td className="p-3 align-top">
                              <div className="font-medium">{it.productName}</div>
                              {(it as any).description && <div className="text-xs text-gray-500">{(it as any).description}</div>}
                            </td>
                            <td className="p-3 align-top text-sm text-gray-600">{it.sku || '—'}</td>
                            <td className="p-3 align-top text-right">{it.quantity}</td>
                            <td className="p-3 align-top text-right">${(it.unitPrice || 0).toFixed(2)}</td>
                            <td className="p-3 align-top text-right font-medium">${(((it.quantity || 0) * (it.unitPrice || 0))).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="mt-6 flex justify-end">
                    <div className="w-full max-w-sm bg-gray-50 p-4 rounded">
                      <div className="flex justify-between py-1"><span className="text-sm text-gray-600">Subtotal</span><span className="font-medium">${selectedSale.total ? (selectedSale.total - 0).toFixed(2) : '0.00'}</span></div>
                      <div className="flex justify-between py-1"><span className="text-sm text-gray-600">Impuestos</span><span className="font-medium">$0.00</span></div>
                      <div className="flex justify-between py-4 border-t"><span className="text-lg font-semibold">Total</span><span className="text-xl font-bold text-green-700">${selectedSale.total ? selectedSale.total.toFixed(2) : '0.00'}</span></div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedSale.notes && (
                    <div className="mt-6 bg-gray-50 p-4 rounded">
                      <div className="text-xs text-gray-500 mb-1">Notas</div>
                      <div className="text-sm">{selectedSale.notes}</div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsSaleDetailOpen(false)} className="rounded-lg">Cerrar</Button>
                    <Button className="rounded-lg bg-green-600 hover:bg-green-700" onClick={() => window.print()}>Imprimir</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay venta seleccionada</p>
              )}
            </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
