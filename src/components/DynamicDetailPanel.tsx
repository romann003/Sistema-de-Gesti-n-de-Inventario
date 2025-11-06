import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Separator } from './ui/separator';
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Building2,
  Tag,
  Layers,
  Edit,
  Box
} from 'lucide-react';

interface DetailAction {
  type: 'edit' | 'email' | 'call' | 'link' | 'custom';
  label?: string;
  href?: string;
  onClick?: () => void;
}

interface DetailItem {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: {
    text: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  };
  actions?: DetailAction[];
}

interface DynamicDetailPanelProps {
  title: string;
  items: DetailItem[];
  isVisible: boolean;
}

export function DynamicDetailPanel({ title, items, isVisible }: DynamicDetailPanelProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <Card className="mt-4 border border-gray-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Layers className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-semibold">{title}</span>
          </CardTitle>
        </CardHeader>
        <Separator className="mb-3" />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item, index) => {
              const Icon = item.icon;
              const renderActions = (it: DetailItem) => {
                const actions: DetailAction[] = [];

                // prefer explicit actions if provided
                if (it.actions && it.actions.length) {
                  actions.push(...it.actions);
                } else {
                  const str = String(it.value || '').trim();
                  if (str.includes('@')) actions.push({ type: 'email', href: `mailto:${str}` });
                  // simple phone detection: digits, plus or common separators
                  else if (/^[+\d().\-\s]{6,}$/.test(str)) actions.push({ type: 'call', href: `tel:${str.replace(/[^+\d]/g, '')}` });
                }

                return (
                  <div className="ml-auto flex items-center gap-2">
                    {actions.map((a, idx) => {
                      const key = `${a.type}-${idx}`;
                      if (a.href) {
                        return (
                          <a key={key} href={a.href} target="_blank" rel="noreferrer" className="inline-block">
                            <Button asChild size="icon" variant="ghost">
                              <span title={a.label || a.type}>
                                {a.type === 'email' && <Mail className="h-4 w-4 text-gray-600" />}
                                {a.type === 'call' && <Phone className="h-4 w-4 text-gray-600" />}
                                {a.type === 'link' && <Layers className="h-4 w-4 text-gray-600" />}
                              </span>
                            </Button>
                          </a>
                        );
                      }

                      return (
                        <Button key={key} size="icon" variant="ghost" onClick={a.onClick}>
                          {a.type === 'edit' && <Edit className="h-4 w-4 text-gray-600" />}
                          {a.type === 'custom' && <Layers className="h-4 w-4 text-gray-600" />}
                        </Button>
                      );
                    })}
                  </div>
                );
              };

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: index * 0.03 }}
                  className="flex items-start gap-3 p-3 rounded-md bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors"
                >
                  {Icon ? (
                    <div className="shrink-0 p-2 rounded-md bg-white border border-gray-100">
                      <Icon className="h-4 w-4 text-blue-600" />
                    </div>
                  ) : (
                    <div className="w-8" />
                  )}

                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 truncate">{item.label}</p>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm font-medium text-gray-900 wrap-break-word truncate max-w-[26rem] cursor-help">{item.value}</p>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={4} className="max-w-xs">
                          <div className="text-xs">{String(item.value)}</div>
                        </TooltipContent>
                      </Tooltip>
                      {item.badge && (
                        <Badge
                          variant={item.badge.variant}
                          className="ml-1 py-0.5 px-2 text-xs"
                        >
                          {item.badge.text}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {renderActions(item)}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Specific detail panels for common use cases

interface ProductDetailPanelProps {
  product: {
    name: string;
    sku: string;
    category: string;
    currentStock: number;
    minStock: number;
    unitPrice: number;
    supplierNames?: string[];
  } | null;
}

export function ProductDetailPanel({ product }: ProductDetailPanelProps) {
  if (!product) return null;

  const stockStatus = product.currentStock <= product.minStock ? 'danger' : 
                      product.currentStock <= product.minStock * 1.5 ? 'warning' : 'success';
  
  const stockBadge = {
    danger: { text: 'Stock Bajo', variant: 'destructive' as const },
    warning: { text: 'Stock Medio', variant: 'warning' as const },
    success: { text: 'Stock Normal', variant: 'success' as const },
  };

  const items: DetailItem[] = [
    { label: 'Nombre', value: product.name, icon: Package },
    { label: 'SKU', value: product.sku, icon: Tag },
    { label: 'Categoría', value: product.category, icon: Layers },
    { 
      label: 'Stock Actual', 
      value: product.currentStock,
      icon: Box,
      badge: stockBadge[stockStatus]
    },
    { label: 'Stock Mínimo', value: product.minStock, icon: AlertTriangle },
    { label: 'Precio Unitario', value: `$${product.unitPrice.toFixed(2)}`, icon: DollarSign },
  ];

  if (product.supplierNames && product.supplierNames.length > 0) {
    items.push({
      label: 'Proveedor(es)',
      value: product.supplierNames.join(', '),
      icon: Building2,
    });
  }

  return (
    <DynamicDetailPanel
      title="Detalles del Producto"
      items={items}
      isVisible={true}
    />
  );
}

interface CustomerDetailPanelProps {
  customer: {
    name: string;
    contactName: string;
    email: string;
    phone: string;
    address?: string;
    status: string;
  } | null;
}

export function CustomerDetailPanel({ customer }: CustomerDetailPanelProps) {
  if (!customer) return null;

  const items: DetailItem[] = [
    { label: 'Cliente', value: customer.name, icon: Building2 },
    { label: 'Contacto', value: customer.contactName, icon: User },
    { label: 'Email', value: customer.email, icon: Mail },
    { label: 'Teléfono', value: customer.phone, icon: Phone },
  ];

  if (customer.address) {
    items.push({ label: 'Dirección', value: customer.address, icon: MapPin });
  }

  // Removed: 'Compras Totales' is intentionally omitted from the customer detail panel

  items.push({
    label: 'Estado',
    value: customer.status === 'activo' ? 'Activo' : 'Inactivo',
    badge: {
      text: customer.status === 'activo' ? 'Activo' : 'Inactivo',
      variant: customer.status === 'activo' ? 'success' : 'secondary',
    },
  });

  return (
    <DynamicDetailPanel
      title="Detalles del Cliente"
      items={items}
      isVisible={true}
    />
  );
}

interface SupplierDetailPanelProps {
  supplier: {
    name: string;
    contactName: string;
    email: string;
    phone: string;
    address?: string;
  } | null;
}

export function SupplierDetailPanel({ supplier }: SupplierDetailPanelProps) {
  if (!supplier) return null;

  const items: DetailItem[] = [
    { label: 'Proveedor', value: supplier.name, icon: Building2 },
    { label: 'Contacto', value: supplier.contactName, icon: User },
    { label: 'Email', value: supplier.email, icon: Mail },
    { label: 'Teléfono', value: supplier.phone, icon: Phone },
  ];

  if (supplier.address) {
    items.push({ label: 'Dirección', value: supplier.address, icon: MapPin });
  }

  return (
    <DynamicDetailPanel
      title="Detalles del Proveedor"
      items={items}
      isVisible={true}
    />
  );
}
