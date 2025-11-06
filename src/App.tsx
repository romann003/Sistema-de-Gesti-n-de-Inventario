import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { InitialSetup } from './components/InitialSetup';
import { DatabaseSetupGuide } from './components/DatabaseSetupGuide';
import { EnhancedDashboard } from './components/EnhancedDashboard';
import { ProductsManagement } from './components/ProductsManagement';
import { InventoryManagement } from './components/InventoryManagement';
import { UsersManagement } from './components/UsersManagement';
import { AdvancedSearch } from './components/AdvancedSearch';
import { AuditLog } from './components/AuditLog';
import { SuppliersManagement } from './components/SuppliersManagement';
import { CustomersAndSales } from './components/CustomersAndSales';
import { CategoriesManagement } from './components/CategoriesManagement';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';
import { Toaster } from './components/ui/sonner';
import {
  LayoutDashboard,
  Package,
  ArrowUpDown,
  Users,
  LogOut,
  Menu,
  X,
  Search,
  History,
  Building2,
  ShoppingCart,
  FolderOpen,
  Database,
  AlertCircle,
} from 'lucide-react';
import { User, Product, InventoryMovement, Supplier, Customer, Sale, AuditLog as AuditLogType, Category } from './types';
import {
  mockQualityMetrics,
} from './lib/mockData';
import { motion } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createClient } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';
import { COMPANY } from './config/company';
import { getProducts, getCategories, getSuppliers, getCustomers, getMovements, getSales, getAuditLogs, getUsers } from './lib/api';
import { toast } from 'sonner';
import { useAuth, RequireRole } from './contexts/AuthContext';
import { NotAuthorized } from './components/NotAuthorized';
import { useNavigate, useLocation, Routes, Route, Link } from 'react-router-dom';

type Section =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'sales'
  | 'search'
  | 'audit'
  | 'suppliers'
  | 'customers'
  | 'users';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogType[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showDatabaseGuide, setShowDatabaseGuide] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  // Initialize database and check session on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('\n' + '🚀 Sistema de Inventario - PyME');
        console.log('='.repeat(60));
        console.log('🔄 Iniciando sistema...');
        
        // Check for existing session in localStorage (nuevo sistema de usuarios)
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          try {
            const user: User = JSON.parse(savedUser);
            console.log('✅ Sesión encontrada en localStorage:', user.fullName);
            setCurrentUser(user);
            setIsInitializing(false);
            return;
          } catch (parseError) {
            console.error('❌ Error al parsear usuario guardado:', parseError);
            localStorage.removeItem('currentUser');
          }
        }
        
        // Check for existing session
        const supabase = createClient();
        console.log('✓ Cliente Supabase creado');
        console.log(`📡 Conectado a: https://${projectId}.supabase.co`);
        
        // Verificar si la tabla usuarios existe
        try {
          const { count, error: countError } = await supabase
            .from('usuarios')
            .select('*', { count: 'exact', head: true });
          
          if (countError) {
            if (countError.code === '42P01') {
              console.warn('⚠️  Tabla usuarios no existe - ejecuta crear-tabla-usuarios.sql');
              setDatabaseError('database_not_configured');
              setShowDatabaseGuide(true);
            }
          } else {
            console.log(`✓ Tabla usuarios encontrada: ${count} usuarios registrados`);
          }
        } catch (checkError: any) {
          console.error('❌ Error al verificar tabla usuarios:', checkError);
          if (checkError.message?.includes('Failed to fetch')) {
            setDatabaseError('connection_error');
            setShowDatabaseGuide(true);
          }
        }
        
        // No hay sesión guardada, continuar al login
        if (false) {
          // Check if we need to show setup (no users exist)
          // This is checked when there's no session
          const setupNeeded = localStorage.getItem('setup_completed') !== 'true';
          if (setupNeeded) {
            try {
              console.log('🔍 Verificando si existen perfiles...');
              const { count, error: countError } = await supabase
                .from('perfiles')
                .select('*', { count: 'exact', head: true });
              
              if (countError) {
                console.error('❌ Error al contar perfiles:', countError);
                if (countError.code === '42P01') {
                  console.warn('⚠️  Tabla perfiles no existe - ejecuta database-setup.sql');
                  setDatabaseError('database_not_configured');
                  setShowDatabaseGuide(true);
                } else if (countError.message?.includes('Failed to fetch')) {
                  console.warn('⚠️  Error de conexión - verifica tu configuración de Supabase');
                  setDatabaseError('connection_error');
                  setShowDatabaseGuide(true);
                }
              } else {
                console.log(`✓ Perfiles encontrados: ${count}`);
                if (count === 0) {
                  console.log('📋 Mostrando pantalla de setup inicial');
                  setShowSetup(true);
                }
              }
            } catch (checkError: any) {
              console.error('❌ Error al verificar perfiles:', checkError);
              if (checkError.message?.includes('Failed to fetch')) {
                setDatabaseError('connection_error');
                setShowDatabaseGuide(true);
              }
            }
          }
        }
      } catch (error: any) {
        console.error('❌ Error de inicialización:', error);
        if (error.message?.includes('Failed to fetch')) {
          console.error('\n' + '='.repeat(60));
          console.error('⚠️  ERROR DE CONEXIÓN DETECTADO');
          console.error('='.repeat(60));
          console.log('\n🔍 Diagnóstico:');
          console.log('   El sistema no puede conectarse a Supabase.');
          console.log('\n📋 Posibles causas:');
          console.log('   1. Eliminaste el proyecto anterior y creaste uno nuevo');
          console.log('   2. La base de datos no está configurada');
          console.log('   3. Error en las credenciales de conexión');
          console.log('\n✅ SOLUCIÓN RÁPIDA:');
          console.log('   1. Busca el botón "Connect Supabase" (arriba a la derecha)');
          console.log('   2. Selecciona tu proyecto correcto');
          console.log('   3. Ejecuta database-setup.sql en SQL Editor');
          console.log('   4. Recarga la página (F5)');
          console.log('\n📚 Documentación de ayuda:');
          console.log('   • PROYECTO-NUEVO.md - Si cambiaste de proyecto');
          console.log('   • SETUP-FACIL.md - Guía paso a paso');
          console.log('   • EMPIEZA-AQUI.md - Inicio rápido');
          console.log('\n💡 TIP: Haz click en "Ayuda con Base de Datos" para guía visual');
          console.log('='.repeat(60) + '\n');
        }
        // Don't show error toast on initial load, just log it
      } finally {
        setIsInitializing(false);
        console.log('✓ Inicialización completada');
        console.log('='.repeat(60) + '\n');
      }
    };

    initialize();
  }, []);

  // Load data when user logs in
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      console.log('📊 Cargando datos del sistema...');
      
      // Load data with individual error handling
      const loadWithFallback = async <T,>(
        promise: Promise<T>, 
        name: string, 
        fallback: T
      ): Promise<T> => {
        try {
          const data = await promise;
          return data || fallback;
        } catch (err: any) {
          console.warn(`⚠️  Error al cargar ${name}:`, err.message || err);
          return fallback;
        }
      };

      const [
        productsData,
        categoriesData,
        suppliersData,
        customersData,
        movementsData,
        salesData,
        auditLogsData,
        usersData
      ] = await Promise.all([
        loadWithFallback(getProducts(), 'productos', []),
        loadWithFallback(getCategories(), 'categorías', []),
        loadWithFallback(getSuppliers(), 'proveedores', []),
        loadWithFallback(getCustomers(), 'clientes', []),
        loadWithFallback(getMovements(), 'movimientos', []),
        loadWithFallback(getSales(), 'ventas', []),
        loadWithFallback(getAuditLogs(), 'auditoría', []),
        loadWithFallback(getUsers(), 'usuarios', [])
      ]);

      // Normalize products: if supplierNames are empty, derive them from suppliersData using supplierIds
      const suppliersMap = (suppliersData || []).reduce<Record<string, string>>((acc, s) => {
        acc[String(s.id)] = s.name;
        return acc;
      }, {});

      const productsNormalized = (productsData || []).map((p: any) => {
        // If supplierNames already present, keep them. Otherwise derive from supplierIds.
        if (p.supplierNames && p.supplierNames.length > 0) return p;
        const ids: string[] = (p.supplierIds || []).map((id: any) => String(id));
        const names = ids.map((id) => suppliersMap[id]).filter(Boolean);
        return { ...p, supplierIds: ids, supplierNames: names };
      });

      setProducts(productsNormalized);
      setCategories(categoriesData);
      setSuppliers(suppliersData);
      setCustomers(customersData);
      setMovements(movementsData);

      // Normalize raw ventas into frontend Sale shape.
      // The API may return either:
      //  - an array of ventas where each venta has a `detalles_venta` array (current), or
      //  - flattened rows (one per detalle) where we need to group by id_venta (legacy).
      const salesNormalized: Sale[] = [];
      try {
        const rows: any[] = salesData || [];
        const usersMap = (usersData || []).reduce<Record<string, string>>((acc, u: any) => {
          acc[String(u.id)] = u.fullName || u.nombre || `${u.firstName || ''} ${u.lastName || ''}`.trim();
          return acc;
        }, {});

        // Detect first entry shape
        if (rows.length > 0 && Array.isArray(rows[0].detalles_venta)) {
          // Newer shape: each element is a venta with nested detalles_venta
          rows.forEach((v: any) => {
            const items = (v.detalles_venta || []).map((d: any) => ({
              productId: d.id_producto || d.producto_id || d.productos?.id_producto || '',
              productName: d.productos?.nombre || d.nombre_producto || d.producto_nombre || '',
              sku: d.productos?.sku || '',
              quantity: Number(d.cantidad || d.cantidad_producto || 0),
              unitPrice: Number(d.precio_unitario ?? d.precio ?? 0),
              subtotal: Number(d.subtotal ?? (Number(d.cantidad || 0) * Number(d.precio_unitario ?? d.precio ?? 0))),
            }));

            const total = Number(v.total ?? items.reduce((s: number, it: any) => s + it.subtotal, 0));
            const saleObj: Sale = {
              id: String(v.id_venta || v.id || ''),
              customerId: v.id_cliente || '',
              customerName: v.clientes?.nombre || v.nombre_cliente || '',
              items,
              total,
              date: v.fecha ? new Date(v.fecha) : new Date(),
              performedBy: v.usuarios?.nombre || usersMap[String(v.id_usuario)] || v.performed_by || String(v.id_usuario) || '',
              notes: v.notas || v.notes || '',
            };

            salesNormalized.push(saleObj);
          });
        } else {
          // Legacy flattened rows: group by sale id and build items from rows
          const grouped: Record<string, any[]> = {};
          rows.forEach((r: any) => {
            const key = String(r.id_venta || r.id || r.id_venta || '');
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(r);
          });

          Object.keys(grouped).forEach((key) => {
            const group = grouped[key];
            const first = group[0] || {};
            const items = group.map((row: any) => ({
              productId: row.id_producto || row.producto_id || '',
              productName: row.productos?.nombre || row.nombre_producto || '',
              sku: row.productos?.sku || '',
              quantity: Number(row.cantidad || 0),
              unitPrice: Number(row.precio_unitario ?? row.precio ?? 0),
              subtotal: Number((row.cantidad || 0) * (row.precio_unitario ?? row.precio ?? 0)),
            }));

            const total = Number(first.total ?? items.reduce((s: number, it: any) => s + it.subtotal, 0));
            const saleObj: Sale = {
              id: key,
              customerId: first.id_cliente || '',
              customerName: first.clientes?.nombre || first.nombre_cliente || '',
              items,
              total,
              date: first.fecha ? new Date(first.fecha) : new Date(),
              performedBy: first.usuarios?.nombre || usersMap[String(first.id_usuario)] || first.performed_by || String(first.id_usuario) || '',
              notes: first.notas || first.notes || '',
            };

            salesNormalized.push(saleObj);
          });
        }
      } catch (e) {
        console.warn('Failed to normalize sales data:', e);
      }

      setSales(salesNormalized);
      setAuditLogs(auditLogsData);
      setUsers(usersData);
      
      console.log('✅ Datos cargados exitosamente');
      console.log(`   - Productos: ${productsData.length}`);
      console.log(`   - Categorías: ${categoriesData.length}`);
      console.log(`   - Proveedores: ${suppliersData.length}`);
      console.log(`   - Clientes: ${customersData.length}`);
      console.log(`   - Movimientos: ${movementsData.length}`);
      console.log(`   - Ventas: ${salesData.length}`);
      console.log(`   - Auditoría: ${auditLogsData.length}`);
      console.log(`   - Usuarios: ${usersData.length}`);
    } catch (error: any) {
      console.error('❌ Error crítico al cargar datos:', error);
      toast.error('Error al cargar los datos del sistema');
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    console.log('✅ Usuario autenticado:', user.fullName, `(${user.role})`);
  };

  // Auth hooks used to properly clear context and navigate
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Clear auth state and app data, then navigate to login
    try { localStorage.removeItem('currentUser'); } catch (e) {}
    setCurrentUser(null);
    // navigation handled by router
    setProducts([]);
    setCategories([]);
    setMovements([]);
    setSuppliers([]);
    setCustomers([]);
    setSales([]);
    setAuditLogs([]);
    console.log('👋 Sesión cerrada correctamente');
    toast.success('Sesión cerrada correctamente');
    try {
      // Clear AuthContext as well so AppWrapper will redirect immediately
      try { logout(); } catch (e) { /* ignore */ }
      // Replace history entry and navigate to /login so back button won't return to protected pages
      if (typeof window !== 'undefined' && window.location) {
        window.location.replace('/login');
      } else {
        navigate('/login', { replace: true });
      }
    } catch (e) {
      // fallback: reload to ensure state cleared
      window.location.reload();
    }
  };
  
  const currentPathSegment = location.pathname.split('/')[1] || 'dashboard';
  const currentSection = ((): Section => {
    switch (currentPathSegment) {
      case 'products': return 'products';
      case 'categories': return 'categories';
      case 'inventory': return 'inventory';
      case 'sales': return 'sales';
      case 'search': return 'search';
      case 'suppliers': return 'suppliers';
      case 'customers': return 'customers';
      case 'audit': return 'audit';
      case 'users': return 'users';
      case 'dashboard':
      case '':
      default: return 'dashboard';
    }
  })();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inicializando sistema...</p>
        </div>
      </div>
    );
  }

  // Show database setup guide if needed
  if (showDatabaseGuide) {
    return (
      <DatabaseSetupGuide
        onComplete={() => {
          setShowDatabaseGuide(false);
          setDatabaseError(null);
          window.location.reload();
        }}
      />
    );
  }

  // Show setup page if needed
  if (showSetup && !currentUser) {
    return (
      <InitialSetup
        onComplete={() => {
          setShowSetup(false);
          localStorage.setItem('setup_completed', 'true');
        }}
      />
    );
  }

  // At this point App is rendered only for authenticated users (top-level router)
  // so currentUser should be present. If not, render nothing.
  if (!currentUser) return null;

  const navigationItems = [
    {
      id: 'dashboard' as Section,
      label: 'Dashboard',
      icon: LayoutDashboard,
      available: true,
    },
    {
      id: 'products' as Section,
      label: 'Productos',
      icon: Package,
      available: true,
    },
    {
      id: 'categories' as Section,
      label: 'Categorías',
      icon: FolderOpen,
      available: true,
    },
    {
      id: 'inventory' as Section,
      label: 'Inventario',
      icon: ArrowUpDown,
      available: true,
    },
    {
      id: 'sales' as Section,
      label: 'Ventas',
      icon: ShoppingCart,
      available: true,
    },
    {
      id: 'search' as Section,
      label: 'Búsqueda Avanzada',
      icon: Search,
      available: true,
    },
    {
      id: 'suppliers' as Section,
      label: 'Proveedores',
      icon: Building2,
      available: true,
    },
    {
      id: 'customers' as Section,
      label: 'Clientes',
      icon: Users,
      available: true,
    },
    {
      id: 'audit' as Section,
      label: 'Auditoría',
      icon: History,
      available: true,
    },
    {
      id: 'users' as Section,
      label: 'Usuarios',
      icon: Users,
      available: currentUser.role === 'Administrador',
    },
  ];

  const categoryNames = Array.from(new Set(products.map((p) => p.category)));
  const supplierNames = suppliers.map((s) => s.name);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-white">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden rounded-lg"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
              <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg">{COMPANY.name}</h1>
                <p className="text-xs text-gray-600">{COMPANY.address}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm">{currentUser.fullName}</p>
              <p className="text-xs text-gray-600">{currentUser.role}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="flex">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5 }}
          className={`
            fixed lg:sticky top-[57px] left-0 h-[calc(100vh-57px)] bg-white border-r border-gray-200 
            transition-transform duration-300 z-30 w-64 shadow-lg lg:shadow-none
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-4 space-y-1 overflow-y-auto h-full">
            {navigationItems
              .filter((item) => item.available)
              .map((item, index) => {
                const Icon = item.icon;
                const to = item.id === 'dashboard' ? '/' : `/${item.id}`;
                const isActive = item.id === 'dashboard'
                  ? (currentPathSegment === 'dashboard' || currentPathSegment === '')
                  : currentPathSegment === item.id;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link
                      to={to}
                      className={`w-full block rounded-lg no-underline ${isActive ? 'shadow-md' : 'hover:bg-gray-100'}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className={`flex items-center gap-2 px-3 py-2 ${isActive ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'text-gray-800'}`}>
                        <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                        <span className={isActive ? 'text-white font-semibold' : ''}>{item.label}</span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
          </nav>
        </motion.aside>

        {/* Overlay para móvil */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <motion.div
            key={currentSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Routes>
              <Route index element={<EnhancedDashboard products={products} movements={movements} qualityMetrics={mockQualityMetrics} sales={sales} />} />
              <Route path="dashboard" element={<EnhancedDashboard products={products} movements={movements} qualityMetrics={mockQualityMetrics} sales={sales} />} />
              <Route path="products" element={<ProductsManagement products={products} categories={categories} suppliers={suppliers} onProductsChange={setProducts} onCategoriesChange={setCategories} />} />
              <Route path="categories" element={<CategoriesManagement categories={categories} onCategoriesChange={setCategories} />} />
              <Route path="inventory" element={<InventoryManagement products={products} suppliers={suppliers} movements={movements} currentUser={currentUser} onProductsChange={setProducts} onMovementsChange={setMovements} />} />
              <Route path="search" element={<AdvancedSearch products={products} suppliers={suppliers} categories={categoryNames} />} />
              <Route path="suppliers" element={<SuppliersManagement suppliers={suppliers} onSuppliersChange={setSuppliers} />} />
              <Route path="customers" element={<CustomersAndSales customers={customers} sales={sales} products={products} currentUserName={currentUser.fullName} currentUser={currentUser} onCustomersChange={setCustomers} onSalesChange={setSales} onProductsChange={setProducts} onMovementsChange={setMovements} movements={movements} showOnly={"customers"} />} />
              <Route path="sales" element={<CustomersAndSales customers={customers} sales={sales} products={products} currentUserName={currentUser.fullName} currentUser={currentUser} onCustomersChange={setCustomers} onSalesChange={setSales} onProductsChange={setProducts} onMovementsChange={setMovements} movements={movements} showOnly={"sales"} />} />
              <Route path="audit" element={
                <RequireRole roles={["Administrador"]}>
                  <AuditLog auditLogs={auditLogs} />
                </RequireRole>
              } />
              <Route path="users" element={
                <RequireRole roles={["Administrador"]}>
                  <UsersManagement users={users} currentUser={currentUser} onUsersChange={setUsers} />
                </RequireRole>
              } />
              <Route path="not-authorized" element={<NotAuthorized />} />
            </Routes>
          </motion.div>
        </main>
      </div>
      </div>
    </ErrorBoundary>
  );
}
