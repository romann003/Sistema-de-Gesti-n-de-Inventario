import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Plus, TrendingUp, TrendingDown, ArrowUpDown, Package, AlertTriangle, Tag, DollarSign, Layers, Truck, Eye } from 'lucide-react';
import { Product, InventoryMovement, User, Supplier } from '../types';
import { COMPANY } from '../config/company';
import { SupplierDetailPanel } from './DynamicDetailPanel';
import { toast } from 'sonner';

interface InventoryManagementProps {
  products: Product[];
  suppliers: Supplier[];
  movements: InventoryMovement[];
  currentUser: User;
  onProductsChange: (products: Product[]) => void;
  onMovementsChange: (movements: InventoryMovement[]) => void;
}

export function InventoryManagement({
  products,
  suppliers,
  movements,
  currentUser,
  onProductsChange,
  onMovementsChange,
}: InventoryManagementProps) {
  const [activeView, setActiveView] = useState<'entradas' | 'salidas'>('entradas');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Company information imported from shared config
  const [formData, setFormData] = useState({
    productId: '',
    supplierId: '',
    type: 'entrada' as 'entrada' | 'salida' | '',
    quantity: '',
    reason: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [movementDetails, setMovementDetails] = useState<any | null>(null);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.productId) newErrors.productId = 'Selecciona un producto';
    if (!formData.supplierId) newErrors.supplierId = 'Selecciona un proveedor';
    if (!formData.quantity || parseFloat(formData.quantity) <= 0)
      newErrors.quantity = 'Cantidad inválida';
    if (!formData.reason.trim()) newErrors.reason = 'El motivo es requerido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenDialog = () => {
    setFormData({
      productId: '',
      supplierId: '',
      type: 'entrada',
      quantity: '',
      reason: '',
      notes: '',
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  // Save handler for the new movement dialog (minimal, client-side only)
  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      const qty = Number(formData.quantity) || 0;
      const newMovement: any = {
        id: `local-${Date.now()}`,
        productId: formData.productId,
        productName: selectedProduct?.name || '',
        sku: selectedProduct?.sku || '',
        type: formData.type || 'entrada',
        quantity: qty,
        reason: formData.reason,
        notes: formData.notes,
        date: new Date(),
        performedBy: currentUser?.id || '',
        performedByName: currentUser?.name || currentUser?.email || '',
        _raw: {},
      };

      // Update movements in parent/state
      try {
        onMovementsChange([...(movements || []), newMovement]);
      } catch (err) {
        console.debug('onMovementsChange error', err);
      }

      // Update product stock locally (best-effort)
      if (newMovement.type === 'entrada' && selectedProduct) {
        try {
          const updatedProducts = products.map((p) => p.id === selectedProduct.id ? { ...p, currentStock: (p.currentStock || 0) + qty } : p);
          onProductsChange(updatedProducts);
        } catch (err) {
          console.debug('onProductsChange error', err);
        }
      }

      setIsDialogOpen(false);
      toast.success('Movimiento registrado');
    } catch (err) {
      console.error('Error saving movement', err);
      toast.error('Error al registrar movimiento');
    }
  };

  const selectedProduct = formData.productId ? products.find((p) => p.id === formData.productId) : null;
  const selectedSupplier = formData.supplierId ? suppliers.find((s) => s.id === formData.supplierId) : null;

  // Helper to normalize movement objects coming from API or older code
  const normalizeMovement = (m: any) => {
    if (!m) return null;
    const raw = m._raw || m;
    let productName = m.productName ?? raw.productos?.nombre ?? raw.nombre_producto ?? raw.nombre ?? raw.product_name ?? '';
    // If productName is object (unexpected), try to extract a meaningful string
    if (productName && typeof productName === 'object') {
      productName = productName.nombre || productName.name || productName.label || JSON.stringify(productName);
    }

    let sku = m.sku ?? raw.productos?.sku ?? raw.sku ?? raw.codigo ?? '';
    if (sku && typeof sku === 'object') {
      sku = sku.toString();
    }

    const date = m.date ? (m.date instanceof Date ? m.date : new Date(m.date)) : (raw.fecha ? new Date(raw.fecha) : new Date());
    const type = (m.type || raw.tipo || raw.tipo_movimiento || '').toString().toLowerCase();
  const quantity = Number((m.quantity ?? raw.cantidad ?? raw.cant) || 0);
  const reason = m.reason || raw.motivo || raw.descripcion || raw.observaciones || '';
  const performedBy = m.performedBy || raw.performedBy || raw.realizado_por || raw.id_usuario || raw.performed_by || '';
  const performedByName = m.performedByName || raw.usuarios?.nombre || raw.performedByName || undefined;

  const productPrice = m.productPrice ?? raw.productos?.precio ?? raw.precio ?? undefined;
  const stockActual = m.stockActual ?? raw.productos?.stock_actual ?? raw.stock_actual ?? undefined;
  const stockMin = m.stockMin ?? raw.productos?.stock_minimo ?? raw.stock_minimo ?? undefined;
  const stockMax = m.stockMax ?? raw.productos?.stock_maximo ?? raw.stock_maximo ?? undefined;

    // Normalize cliente information from multiple possible shapes
    const clienteRaw = m.cliente || raw.cliente || raw.clientes || (Array.isArray(raw.clientes) ? raw.clientes[0] : undefined) || raw;
    const cliente = {
      id: m.customerId || raw.id_cliente || raw.cliente_id || clienteRaw?.id || clienteRaw?.id_cliente || null,
      name: m.customerName || clienteRaw?.nombre || clienteRaw?.name || clienteRaw?.razon_social || raw.nombre_cliente || raw.cliente_nombre || '',
      contactName: clienteRaw?.contacto || clienteRaw?.contactName || clienteRaw?.contacto_nombre || raw.contacto_cliente || '',
      email: clienteRaw?.correo || clienteRaw?.email || raw.correo_cliente || raw.cliente_correo || '',
      phone: clienteRaw?.telefono || clienteRaw?.phone || raw.telefono_cliente || raw.cliente_telefono || '',
      address: clienteRaw?.direccion || clienteRaw?.address || raw.direccion_cliente || raw.cliente_direccion || '',
      rfc: clienteRaw?.rfc || raw.rfc_cliente || raw.cliente_rfc || '',
      razon_social: clienteRaw?.razon_social || '',
      _raw: clienteRaw,
    };

    return {
      id: m.id || raw.id_movimiento || raw.id || String(raw.id_movimiento || raw.id || ''),
      productId: m.productId || raw.productos?.id_producto || raw.id_producto || raw.productId || null,
      productName: productName || '',
      sku: sku || '',
      productCategory: m.productCategory || raw.productos?.categorias?.nombre || raw.categoria || null,
      type: type === 'salida' ? 'salida' : 'entrada',
      quantity,
      reason,
      performedBy,
      performedByName,
      date,
      // Normalize notes: prefer textual fields and avoid showing numeric IDs.
      notes: (() => {
        const pick = (v: any) => (v === null || v === undefined ? '' : String(v));
        const candidates = [m.notes, raw.notas, raw.observaciones, raw.descripcion, raw.note, raw.notes, raw.meta?.nota, raw.meta?.notes, raw.data?.notas, raw.data?.note];
        const isLikelyId = (val: string) => {
          if (!val) return false;
          // numeric or very short numeric string likely an id
          if (/^\d+$/.test(val) && val.length <= 6) return true;
          return false;
        };
        const isSaleReference = (val: string) => {
          if (!val) return false;
          // UUID-like reference or explicit 'venta' mention with an id should be considered a sale reference
          const uuidRe = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
          if (uuidRe.test(val)) return true;
          if (/\bventa\b/i.test(val) && /\b(id|id:|venta id|venta_id)\b/i.test(val)) return true;
          return false;
        };

        for (const c of candidates) {
          if (c === undefined || c === null) continue;
          const s = pick(c).trim();
          if (!s) continue;
          if (isLikelyId(s)) continue; // skip candidate that looks like an id
          if (isSaleReference(s)) continue; // skip strings that are only a sale reference
          return s;
        }
        // Last resort: if there is any notas-like field that is NOT a sale reference, return it
        const last = pick(m.notes ?? raw.notas ?? raw.notes ?? '');
        return isSaleReference(last) ? '' : (last || '');
      })(),
      productPrice: productPrice !== undefined ? Number(productPrice) : undefined,
      stockActual: stockActual !== undefined ? Number(stockActual) : undefined,
      stockMin: stockMin !== undefined ? Number(stockMin) : undefined,
      stockMax: stockMax !== undefined ? Number(stockMax) : undefined,
      proveedor: m.proveedor || raw.proveedor || raw.id_proveedor || null,
      cliente,
      _raw: raw,
    } as InventoryMovement;
  };

  const getStockStatus = (product: Product) => {
    if (product.currentStock < product.minStock) {
      return { label: 'Bajo Stock', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    } else if (product.currentStock > product.maxStock) {
      return { label: 'Sobrestock', color: 'bg-red-100 text-red-800 border-red-300' };
    }
    return { label: 'Normal', color: 'bg-green-100 text-green-800 border-green-300' };
  };

  // Pre-normalize movements for display and filtering (memoized)
  const normalizedMovements = useMemo(() => {
    return (movements || []).map((m) => normalizeMovement(m)).filter(Boolean) as InventoryMovement[];
  }, [movements]);

  // Split movements into entradas / salidas for easier rendering
  const entradas = normalizedMovements.filter((m) => (m.type || '').toString().toLowerCase() === 'entrada');
  const salidas = normalizedMovements.filter((m) => (m.type || '').toString().toLowerCase() === 'salida');

  // Enrich salidas that already include detalles in their payload by expanding them
  // into a flattened list so the table can render a parent row followed by detail rows.
  const [displayMovements, setDisplayMovements] = useState<InventoryMovement[]>(() => normalizedMovements.slice());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pool = activeView === 'entradas' ? entradas : salidas;
        const expanded: InventoryMovement[] = [];
        for (const m of pool) {
          const detalles = (m as any).detalles_venta || (m as any)._raw?.detalles_venta || (m as any)._raw?.detalles || null;
          if (m.type === 'salida' && Array.isArray(detalles) && detalles.length > 0) {
            expanded.push(m);
            detalles.forEach((d: any, idx: number) => {
              expanded.push({
                ...m,
                id: `${m.id}-detail-${idx}`,
                productName: d.nombre || d.productos?.nombre || d.product_name || d.producto_nombre || '—',
                sku: d.productos?.sku || d.sku || '—',
                quantity: Number(d.cantidad ?? d.quantity ?? d.qty ?? 0),
                _isDetail: true,
                _detailRaw: d,
              } as InventoryMovement);
            });
          } else {
            expanded.push(m);
          }
        }
        if (mounted) setDisplayMovements(expanded);
      } catch (err) {
        console.error('Error enriching movements', err);
      }
    })();
    return () => { mounted = false; };
  }, [normalizedMovements, activeView]);

  // If some salidas only reference a sale via notas (UUID) and lack detalles_venta,
  // fetch sales once and enrich those movements so the list can show product rows.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Collect sale UUIDs referenced in movimientos' notas for the active view
        const pool = (activeView === 'entradas' ? entradas : salidas) || [];
        const saleIds = new Set<string>();
        const uuidRe = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
        pool.forEach((m) => {
          try {
            const rawNotas = String((m as any)._raw?.notas ?? (m as any).notes ?? '');
            const match = rawNotas.match(uuidRe);
            if (match && match.length > 0) {
              match.forEach((id) => saleIds.add(id.toLowerCase()));
            }
          } catch (e) {
            // ignore
          }
        });

        if (saleIds.size === 0) return;

        const { getSales } = await import('../lib/api');
        const sales = (await getSales()) || [];
        if (!Array.isArray(sales) || !mounted) return;

        const saleById = new Map<string, any>();
        sales.forEach((s: any) => {
          const id = String(s.id_venta ?? s.id ?? '').toLowerCase();
          if (id) saleById.set(id, s);
        });

        // Build enriched display list: for salidas, if we find a sale attachment, expand detalles
        const enriched: InventoryMovement[] = [];
        for (const m of (activeView === 'entradas' ? entradas : salidas)) {
          const mm: any = m;
          const rawNotas = String(mm._raw?.notas ?? mm.notes ?? '');
          const found = (rawNotas.match(uuidRe) || []).map((s: string) => s.toLowerCase()).find((id: string) => saleById.has(id));
          if (mm.type === 'salida' && !Array.isArray(mm.detalles_venta) && found) {
            const sale = saleById.get(found);
            const detalles = sale?.detalles_venta || sale?.detalles || sale?.items || [];
            enriched.push(mm);
            detalles.forEach((d: any, idx: number) => {
              enriched.push({
                ...mm,
                id: `${mm.id}-detail-${idx}`,
                productName: d.nombre || d.productos?.nombre || d.product_name || '—',
                sku: d.productos?.sku || d.sku || '—',
                quantity: Number(d.cantidad ?? d.quantity ?? d.qty ?? 0),
                _isDetail: true,
                _detailRaw: d,
              } as InventoryMovement);
            });
          } else {
            enriched.push(mm);
          }
        }

        if (mounted) setDisplayMovements(enriched);
      } catch (err) {
        console.debug('Error enriching salidas with sales details', err);
      }
    })();
    return () => { mounted = false; };
  }, [normalizedMovements, activeView]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Movimientos de Inventario</CardTitle>
              <CardDescription>Registra entradas y revisa salidas</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'entradas' | 'salidas')}>
                <TabsList className="rounded-lg">
                  <TabsTrigger value="entradas" className="rounded-lg">Entradas</TabsTrigger>
                  <TabsTrigger value="salidas" className="rounded-lg">Salidas</TabsTrigger>
                </TabsList>
              </Tabs>
              {activeView === 'entradas' ? (
                <Button
                  onClick={handleOpenDialog}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Entrada
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Realizado por</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {normalizedMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      <ArrowUpDown className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      No hay movimientos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  // Render only parent rows (skip detail rows that were expanded into displayMovements)
                  displayMovements
                    .filter((mv) => !(mv as any)._isDetail)
                    .map((movement) => {
                      const m = movement as any;
                      // Try to collect detalles from movement payload or from expanded detail rows
                      let detalles: any[] | null = null;
                      if (Array.isArray(m.detalles_venta) && m.detalles_venta.length > 0) {
                        detalles = m.detalles_venta;
                      } else if (Array.isArray(m._raw?.detalles_venta) && m._raw.detalles_venta.length > 0) {
                        detalles = m._raw.detalles_venta;
                      } else {
                        // Look for expanded detail rows that were added to displayMovements
                        const prefix = `${m.id}-detail-`;
                        const found = displayMovements.filter((d) => String(d.id).startsWith(prefix));
                        if (found.length > 0) {
                          detalles = found.map((f) => (f as any)._detailRaw || { nombre: f.productName, sku: f.sku, cantidad: f.quantity });
                        }
                      }

                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div className="text-sm">
                              <p>{m.date.toLocaleDateString()}</p>
                              <p className="text-xs text-gray-500">{m.date.toLocaleTimeString()}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={m.type === 'entrada' ? 'default' : 'secondary'} className="flex items-center gap-1 w-fit">
                              {m.type === 'entrada' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {m.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {m.type === 'salida' && Array.isArray(detalles) && detalles.length > 0 ? (
                              <div className="text-sm space-y-1">
                                {detalles.map((d: any, idx: number) => {
                                  const name = d.nombre || d.productos?.nombre || d.product_name || d.productName || m.productName || '—';
                                  return (
                                    <div key={idx} className="truncate"><span className="font-semibold">{name}</span></div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span>{m.productName}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {m.type === 'salida' && Array.isArray(detalles) && detalles.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {detalles.map((d: any, idx: number) => {
                                  const sku = d.productos?.sku || d.sku || d.codigo || '—';
                                  return (
                                    <Badge key={idx} variant="outline" className="text-xs">{sku}</Badge>
                                  );
                                })}
                              </div>
                            ) : (
                              <Badge variant="outline">{m.sku}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {m.type === 'salida' && Array.isArray(detalles) && detalles.length > 0 ? (
                              <div className="flex flex-col gap-1 items-end">
                                {detalles.map((d: any, idx: number) => {
                                  const qty = Number(d.cantidad ?? d.quantity ?? d.qty ?? d.cant ?? 0);
                                  return (
                                    <span key={idx} className="text-sm text-right text-gray-700">x{qty}</span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className={m.type === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                                {m.type === 'entrada' ? '+' : '-'}{m.quantity}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{m.reason}</p>
                              {m.notes && <p className="text-xs text-gray-500">{m.notes}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{m.performedByName || m.performedBy}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="ghost" onClick={async () => {
                              try {
                                const { getMovementById, getSales, getCustomers } = await import('../lib/api');
                                const rawId = m.id || m._raw?.id_movimiento || m._raw?.id;
                                if (!rawId) {
                                  console.warn('No movement id available for detail view', m);
                                  toast.error('ID de movimiento no disponible');
                                  return;
                                }

                                const data = await getMovementById(String(rawId));
                                let normalized: any = normalizeMovement(data) || {};

                                // If this is a salida and we don't have cliente info, try to recover it
                                // by parsing a Venta ID from notas and fetching the sale.
                                const isSalida = ((normalized?.tipo || normalized?.type) || '').toString().toLowerCase() === 'salida';
                                const hasClienteName = !!(normalized?.cliente && normalized?.cliente.name);
                                if (isSalida && !hasClienteName) {
                                  const rawNotas = String(data?.notas ?? data?._raw?.notas ?? '');
                                  const uuidMatch = rawNotas.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
                                  if (uuidMatch) {
                                    try {
                                      const saleId = uuidMatch[0];
                                      // getSales exists; find the specific sale
                                      const sales = await getSales();
                                      const sale: any = (sales || []).find((s: any) => String(s.id_venta || s.id || s.id || '').toLowerCase() === String(saleId).toLowerCase());
                                      if (sale) {
                                        // sale.clientes may be an object with limited fields (id, nombre).
                                        // Prefer enriching client contact info from the customers table if available.
                                        const saleClienteRaw: any = sale.clientes || sale.cliente || sale.customer || sale._raw || sale;
                                        const clienteFromSale: any = {
                                          id: saleClienteRaw?.id || saleClienteRaw?.id_cliente || sale.id_cliente || null,
                                          name: saleClienteRaw?.nombre || saleClienteRaw?.name || saleClienteRaw?.razon_social || saleClienteRaw?.cliente_nombre || sale.cliente_nombre || '',
                                          contactName: saleClienteRaw?.contacto || saleClienteRaw?.contactName || '',
                                          email: saleClienteRaw?.correo || saleClienteRaw?.email || saleClienteRaw?.cliente_correo || '',
                                          phone: saleClienteRaw?.telefono || saleClienteRaw?.phone || saleClienteRaw?.cliente_telefono || '',
                                          address: saleClienteRaw?.direccion || saleClienteRaw?.address || saleClienteRaw?.cliente_direccion || '',
                                          rfc: saleClienteRaw?.rfc || '',
                                          razon_social: saleClienteRaw?.razon_social || '',
                                          _raw: saleClienteRaw,
                                        };

                                        // If contact info missing, try loading the full customer record
                                        if ((!clienteFromSale.email || !clienteFromSale.phone || !clienteFromSale.address) && (clienteFromSale.id || sale.id_cliente || sale.id_cliente)) {
                                          try {
                                            const customers = await getCustomers();
                                            const custId = clienteFromSale.id || sale.id_cliente || sale.cliente_id || sale.id_cliente || null;
                                            if (custId) {
                                              const fullCust: any = (customers || []).find((c: any) => String(c.id) === String(custId) || String(c.id) === String(custId));
                                              if (fullCust) {
                                                clienteFromSale.email = clienteFromSale.email || fullCust.email || '';
                                                clienteFromSale.phone = clienteFromSale.phone || fullCust.phone || '';
                                                clienteFromSale.address = clienteFromSale.address || fullCust.address || '';
                                              }
                                            }
                                          } catch (custErr) {
                                            console.debug('Could not fetch customers to enrich sale cliente', custErr);
                                          }
                                        }

                                        normalized.cliente = { ...(normalized.cliente || {}), ...clienteFromSale };

                                        const detalles: any = sale.detalles_venta || sale.detalles || sale.items || sale.detalles || null;
                                        if (Array.isArray(detalles) && detalles.length > 0) {
                                          (normalized as any).detalles_venta = detalles;
                                        }

                                        // Prefer the sale's notas (general sale notes) over the movimiento's notas (which may contain only the sale id)
                                        const saleNotesCandidates = [
                                          sale?.notas,
                                          sale?.nota,
                                          sale?.notes,
                                          sale?.descripcion,
                                          sale?.observaciones,
                                          sale?.meta?.nota,
                                          sale?._raw?.notas,
                                          sale?._raw?.nota,
                                        ];
                                        const saleNotes = saleNotesCandidates.find((s: any) => typeof s === 'string' && s.trim()) || null;
                                        if (saleNotes) {
                                          (normalized as any).saleNotes = String(saleNotes).trim();
                                          normalized.notes = String(saleNotes).trim();
                                        } else {
                                          // If there's no sale-level notes, avoid showing a raw sale-id reference
                                          const rawNotasStr = String(rawNotas || '').trim();
                                          const uuidRe = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
                                          const isSaleRef = uuidRe.test(rawNotasStr) || (/\bventa\b/i.test(rawNotasStr) && /\b(id|id:|venta id|venta_id)\b/i.test(rawNotasStr));
                                          if (!isSaleRef) {
                                            // only set raw notas when it's not just a sale reference
                                            normalized.notes = normalized.notes || rawNotasStr || '';
                                          } else {
                                            // suppress showing the sale-id reference as notes
                                            normalized.notes = normalized.notes || '';
                                          }
                                        }
                                      }
                                    } catch (errSale: any) {
                                      console.debug('Could not fetch sale for movement notas UUID', errSale?.message || errSale);
                                    }
                                  }
                                }

                                setMovementDetails(normalized);
                                setIsMovementDialogOpen(true);
                              } catch (err: any) {
                                console.error('Error loading movement details', err);
                                toast.error(err?.message || 'Error al cargar detalle');
                              }
                            }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para Nuevo Movimiento */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-full sm:max-w-4xl rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Entrada de Inventario</DialogTitle>
            <DialogDescription>
              Registra la compra o ingreso de productos desde proveedores
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product">Producto *</Label>
              <Select
                value={formData.productId}
                onValueChange={(value: string) =>
                  setFormData({ ...formData, productId: value, supplierId: '' })
                }
              >
                <SelectTrigger id="product" className="rounded-lg py-6 px-2">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex flex-col py-2 gap-1 px-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium truncate">{product.name}</span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">SKU: {product.sku}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 gap-3">
                          <span className="truncate">Stock: {product.currentStock}</span>
                          <span className="truncate">{product.category}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.productId && (
                <p className="text-xs text-red-600">{errors.productId}</p>
              )}
            </div>

            {selectedProduct && selectedProduct.supplierIds.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor * (compra desde)</Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, supplierId: value })
                  }
                >
                  <SelectTrigger id="supplier" className="rounded-lg py-2 px-2">
                    <SelectValue placeholder="Selecciona el proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                      {selectedProduct.supplierIds.map((supplierId, index) => {
                      const sup = suppliers.find((s) => s.id === supplierId);
                      return (
                          <SelectItem key={supplierId} value={supplierId}>
                            <div className="flex items-center justify-between py-2 gap-2 px-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{selectedProduct.supplierNames[index]}</span>
                                {index === 0 && (
                                  <Badge variant="secondary" className="text-xs">Principal</Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 truncate">{sup?.contactName || ''}</div>
                            </div>
                          </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.supplierId && (
                  <p className="text-xs text-red-600">{errors.supplierId}</p>
                )}
              </div>
            )}

            {selectedProduct && (
              <Card className="border border-gray-200 bg-white shadow-sm rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-md border border-gray-100">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-medium truncate">{selectedProduct.name}</h3>
                      <p className="text-sm text-gray-600 truncate">{selectedProduct.description}</p>
                    </div>
                  </div>
                  <Badge className={getStockStatus(selectedProduct).color}>
                    {getStockStatus(selectedProduct).label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">SKU</p>
                    <p className="text-sm font-medium">{selectedProduct.sku}</p>
                  </div>

                  <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Categoría</p>
                    <p className="text-sm font-medium">{selectedProduct.category}</p>
                  </div>

                  <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Proveedores</p>
                    <p className="text-sm truncate">{selectedProduct.supplierNames.join(', ') || 'Sin proveedor'}</p>
                  </div>

                  <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Stock Actual</p>
                    <p className="text-lg font-medium text-green-700">{selectedProduct.currentStock}</p>
                  </div>

                  <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Stock Mínimo</p>
                    <p className="text-lg font-medium text-yellow-700">{selectedProduct.minStock}</p>
                  </div>

                  <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Stock Máximo</p>
                    <p className="text-lg font-medium text-red-700">{selectedProduct.maxStock}</p>
                  </div>

                  <div className="bg-gray-50 rounded-md p-4 border border-gray-100 md:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Precio Unitario</p>
                    <p className="text-xl font-medium text-purple-700">${selectedProduct.unitPrice.toFixed(2)}</p>
                  </div>
                </div>

                {selectedSupplier && (
                  <div className="mt-3">
                    <SupplierDetailPanel supplier={selectedSupplier} />
                  </div>
                )}
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad a Ingresar *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                className="rounded-lg"
                placeholder="Ej: 10"
              />
              {errors.quantity && (
                <p className="text-xs text-red-600">{errors.quantity}</p>
              )}
              {selectedProduct && formData.quantity && (
                <p className="text-xs text-gray-600">
                  Stock después de la entrada: <span className="text-green-600">{selectedProduct.currentStock + parseInt(formData.quantity || '0')}</span> unidades
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo *</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Ej: Compra a proveedor, Reposición de stock"
                className="rounded-lg"
              />
              {errors.reason && (
                <p className="text-xs text-red-600">{errors.reason}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Información adicional..."
                className="rounded-lg"
                rows={3}
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
              Registrar Entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver detalle de movimiento */}
  <Dialog open={isMovementDialogOpen} onOpenChange={(open: boolean) => { if (!open) { setMovementDetails(null); } setIsMovementDialogOpen(open); }}>
        <DialogContent className="w-full sm:max-w-2xl rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Movimiento</DialogTitle>
            <DialogDescription>Información completa del movimiento seleccionado</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {movementDetails ? (
              <div className="space-y-4">
                {/* Invoice-like header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold">{COMPANY.name}</h3>
                    <p className="text-sm text-gray-500">RFC: {COMPANY.rfc}</p>
                    <p className="text-sm text-gray-500">{COMPANY.address}</p>
                    <p className="text-sm text-gray-500">{COMPANY.email} • {COMPANY.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Movimiento</p>
                    <p className="font-mono">#{movementDetails.id}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(movementDetails.fecha || movementDetails.date || Date.now()).toLocaleString()}</p>
                    <Badge className="mt-2">{(movementDetails.tipo || movementDetails.type || '').toString()}</Badge>
                  </div>
                </div>

                <Separator />

                {/* Invoice recipient / from - varies depending on movement type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">De</p>
                    {(() => {
                      // If entrada: show proveedor (or performer). If salida: show our company
                      if ((movementDetails.tipo || movementDetails.type || '').toString().toLowerCase() === 'entrada') {
                        return movementDetails.proveedor ? (
                          <>
                            <p className="font-medium">{movementDetails.proveedor.nombre || movementDetails.proveedor.name}</p>
                            <p className="text-sm text-gray-500">{movementDetails.proveedor.correo || movementDetails.proveedor.email}</p>
                          </>
                        ) : (
                          <p className="font-medium">{movementDetails.performedByName || movementDetails.performedBy || '—'}</p>
                        );
                      }
                      // salida -> De = our company
                      return (
                        <>
                          <p className="font-medium">{COMPANY.name}</p>
                          <p className="text-sm text-gray-500">RFC: {COMPANY.rfc}</p>
                          {/* Seller / vendedor below company for salidas */}
                          <p className="text-sm text-gray-700 mt-2">Vendedor: {movementDetails.performedByName || movementDetails.performedBy || (movementDetails._raw?.usuarios?.nombre) || '—'}</p>
                        </>
                      );
                    })()}
                  </div>

                  <div className="text-right md:flex md:flex-col md:items-end md:justify-start">
                    <p className="text-xs text-gray-500">Para</p>
                    {(() => {
                      // If entrada: Para = our company. If salida: Para = cliente / receiver
                      const isEntrada = (movementDetails.tipo || movementDetails.type || '').toString().toLowerCase() === 'entrada';
                      if (isEntrada) {
                        return (
                          <>
                            <p className="font-medium">Almacén Central</p>
                            <p className="text-sm text-gray-500">{COMPANY.email}</p>
                          </>
                        );
                      }

                      const cliente = movementDetails.cliente || {};
                      const raw = movementDetails._raw || {};
                      // Render full client details for salidas, with robust fallbacks to raw payload
                      const name = cliente.name || cliente.nombre || raw?.clientes?.nombre || raw?.nombre_cliente || raw?.cliente_nombre || raw?.clientes?.razon_social || 'Cliente';
                      const contact = cliente.contactName || cliente.contacto || raw?.clientes?.contacto || raw?.contacto_cliente || raw?.cliente_contacto || '';
                      const email = cliente.email || cliente.correo || raw?.clientes?.correo || raw?.correo_cliente || raw?.cliente_correo || '';
                      const phone = cliente.phone || cliente.telefono || raw?.clientes?.telefono || raw?.telefono_cliente || raw?.cliente_telefono || '';
                      const address = cliente.address || cliente.direccion || raw?.clientes?.direccion || raw?.direccion_cliente || raw?.cliente_direccion || '';
                      const rfc = cliente.rfc || raw?.clientes?.rfc || raw?.rfc_cliente || raw?.cliente_rfc || '';
                      const razon = cliente.razon_social || raw?.clientes?.razon_social || raw?.cliente_razon_social || '';

                      return (
                        <>
                          <p className="font-medium">{name}</p>
                          {contact && <p className="text-sm text-gray-600">Contacto: {contact}</p>}
                          {email && <p className="text-sm text-gray-500">{email}</p>}
                          {phone && <p className="text-sm text-gray-500">{phone}</p>}
                          {address && <p className="text-sm text-gray-500 truncate">{address}</p>}
                          {(rfc || razon) && <p className="text-xs text-gray-400 mt-1">{razon}{razon && rfc ? ' · ' : ''}{rfc}</p>}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full mt-4 table-auto border-collapse">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b">
                        <th className="py-2">Producto</th>
                        <th className="py-2">SKU</th>
                        <th className="py-2 text-right">Cantidad</th>
                        <th className="py-2 text-right">Precio unit.</th>
                        <th className="py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const detalles = movementDetails?.detalles_venta || movementDetails?.detalles || movementDetails?._raw?.detalles_venta || movementDetails?._raw?.detalles || (movementDetails?.productos ? [movementDetails] : []);
                        if (!Array.isArray(detalles) || detalles.length === 0) return (
                          <tr className="border-b">
                            <td className="py-3 align-top">{movementDetails.productos?.nombre || movementDetails.productName || '—'}</td>
                            <td className="py-3 align-top">{movementDetails.productos?.sku || movementDetails.sku || '—'}</td>
                            <td className="py-3 align-top text-right">{((movementDetails.cantidad ?? movementDetails.quantity) || 0)}</td>
                            <td className="py-3 align-top text-right">{movementDetails.productPrice !== undefined ? `$${Number(movementDetails.productPrice).toFixed(2)}` : '—'}</td>
                            <td className="py-3 align-top text-right">{movementDetails.productPrice !== undefined ? `$${(Number(movementDetails.productPrice) * Number((movementDetails.cantidad ?? movementDetails.quantity) || 0)).toFixed(2)}` : '—'}</td>
                          </tr>
                        );

                        return detalles.map((d: any, idx: number) => {
                          const name = d.nombre || d.productos?.nombre || d.product_name || d.productName || d.nombre_producto || movementDetails.productName || '—';
                          const sku = d.sku || d.productos?.sku || movementDetails.sku || '—';
                          const qty = Number(d.cantidad ?? d.quantity ?? d.qty ?? movementDetails.cantidad ?? movementDetails.quantity ?? 0);
                          const price = Number(d.precio_unitario ?? d.unit_price ?? d.precio ?? d.price ?? movementDetails.productPrice ?? 0);
                          const subtotal = d.subtotal !== undefined ? Number(d.subtotal) : (price && qty ? price * qty : undefined);

                          return (
                            <tr className="border-b" key={idx}>
                              <td className="py-3 align-top"><span className="font-semibold">{name}</span></td>
                              <td className="py-3 align-top">{sku}</td>
                              <td className="py-3 align-top text-right">{qty}</td>
                              <td className="py-3 align-top text-right">{Number.isFinite(price) ? `$${price.toFixed(2)}` : '—'}</td>
                              <td className="py-3 align-top text-right">{subtotal !== undefined ? `$${Number(subtotal).toFixed(2)}` : '—'}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="w-full sm:w-1/3">
                    {(() => {
                      const detalles = movementDetails?.detalles_venta || movementDetails?.detalles || movementDetails?._raw?.detalles_venta || movementDetails?._raw?.detalles || (movementDetails?.productos ? [movementDetails] : []);
                      const rows = Array.isArray(detalles) && detalles.length > 0 ? detalles : [movementDetails];
                      const subtotalSum = rows.reduce((sum: number, d: any) => {
                        const qty = Number(d.cantidad ?? d.quantity ?? d.qty ?? movementDetails.cantidad ?? movementDetails.quantity ?? 0);
                        const price = Number(d.precio_unitario ?? d.unit_price ?? d.precio ?? d.price ?? movementDetails.productPrice ?? 0);
                        const st = d.subtotal !== undefined ? Number(d.subtotal) : (price && qty ? price * qty : 0);
                        return sum + (isNaN(st) ? 0 : st);
                      }, 0);

                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-medium">{rows.length ? `$${subtotalSum.toFixed(2)}` : '—'}</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-500">Impuestos</span>
                            <span className="font-medium">$0.00</span>
                          </div>
                          <div className="flex justify-between text-lg font-semibold mt-2">
                            <span>Total</span>
                            <span>{rows.length ? `$${subtotalSum.toFixed(2)}` : '—'}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Notes below totals */}
                <div className="mt-4">
                  <p className="text-xs text-gray-500">Notas</p>
                  <p className="text-sm">{(movementDetails.saleNotes && movementDetails.saleNotes !== '') ? movementDetails.saleNotes : (movementDetails.notes || '—')}</p>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => window.print()} className="rounded-lg">Imprimir</Button>
                  <Button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(movementDetails._raw || movementDetails)); toast.success('Copiado al portapapeles'); }} className="rounded-lg">Exportar</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Cargando...</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)} className="rounded-lg">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
