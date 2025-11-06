export type UserRole = 'Administrador' | 'Empleado';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  fullName: string;
  email: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  categoryId: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  supplierIds: string[];
  supplierNames: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'entrada' | 'salida';
  quantity: number;
  reason: string;
  performedBy: string;
  date: Date;
  notes?: string;
  customerId?: string;
  customerName?: string;
  // Optional enriched fields (may come from different API shapes)
  performedByName?: string;
  proveedor?: string | { id?: string; name?: string } | null;
  cliente?: any;
  productCategory?: string | null;
  productPrice?: number;
  stockActual?: number;
  stockMin?: number;
  stockMax?: number;
  detalles_venta?: any[];
  // Raw payload as received from the backend (keeps original fields)
  _raw?: any;
  // UI helpers for expanded rows
  _isDetail?: boolean;
  _detailRaw?: any;
}

export interface QualityMetric {
  category: string;
  metric: string;
  value: number;
  target: number;
  unit: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  movementsToday: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address?: string;
  productsCount: number;
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address?: string;
  status: 'activo' | 'inactivo';
  totalPurchases: number;
  createdAt: Date;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  total: number;
  date: Date;
  performedBy: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  productCount: number;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'edit' | 'delete' | 'sale' | 'movement';
  entity: 'product' | 'user' | 'supplier' | 'customer' | 'inventory' | 'category';
  entityId: string;
  entityName: string;
  details: string;
  timestamp: Date;
  // Optional structured deltas when available
  before?: any;
  after?: any;
}
