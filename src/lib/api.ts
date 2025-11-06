import { createClient } from '../utils/supabase/client';

// Get the Supabase client instance
function getSupabase() {
  return createClient();
}

// Get access token from Supabase session
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Get current user
export async function getCurrentUser() {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Auth APIs
export async function signUp(email: string, password: string, nombre: string, rol: 'Administrador' | 'Empleado') {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre,
        rol,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function getUserProfile() {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('No user logged in');

  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}

// Categories APIs
export async function getCategories() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw error;
  
  // Get product counts for each category
  const { data: products } = await supabase
    .from('productos')
    .select('id_categoria');
  
  const productCounts: Record<string, number> = {};
  products?.forEach((p: any) => {
    productCounts[p.id_categoria] = (productCounts[p.id_categoria] || 0) + 1;
  });
  
  // Map database fields to Category type
  return (data || []).map((category: any) => ({
    id: category.id_categoria,
    name: category.nombre,
    description: category.descripcion || '',
    productCount: productCounts[category.id_categoria] || 0,
    createdAt: new Date(category.created_at),
  }));
}

export async function createCategory(categoryData: { nombre: string; descripcion?: string }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('categorias')
    .insert([categoryData])
    .select()
    .single();

  if (error) throw error;
  
  // Try to create audit log (best-effort)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'create',
      entidad: 'category',
      entidad_id: data.id_categoria,
      descripcion: `Creada categoría ${data.nombre}`,
    });
  } catch (e) {
    console.warn('createCategory: failed to create audit log', e);
  }

  // Map to Category type
  return {
    id: data.id_categoria,
    name: data.nombre,
    description: data.descripcion || '',
    productCount: 0,
    createdAt: new Date(data.created_at),
  };
}

export async function updateCategory(id: string, categoryData: { nombre: string; descripcion?: string }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('categorias')
    .update(categoryData)
    .eq('id_categoria', id)
    .select()
    .single();

  if (error) throw error;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'edit',
      entidad: 'category',
      entidad_id: id,
      descripcion: `Actualizada categoría ${data.nombre}`,
    });
  } catch (e) {
    console.warn('updateCategory: failed to create audit log', e);
  }

  // Map to Category type
  return {
    id: data.id_categoria,
    name: data.nombre,
    description: data.descripcion || '',
    productCount: 0,
    createdAt: new Date(data.created_at),
  };
}

export async function deleteCategory(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('categorias')
    .delete()
    .eq('id_categoria', id);

  if (error) throw error;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'delete',
      entidad: 'category',
      entidad_id: id,
      descripcion: `Eliminada categoría ${id}`,
    });
  } catch (e) {
    console.warn('deleteCategory: failed to create audit log', e);
  }
  return { success: true };
}

// Suppliers APIs
export async function getSuppliers() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw error;
  
  // Map database fields to Supplier type
  return (data || []).map((supplier: any) => ({
    id: supplier.id_proveedor,
    name: supplier.nombre,
    contactName: supplier.contacto,
    phone: supplier.telefono || '',
    email: supplier.correo || '',
    address: supplier.direccion || '',
    productsCount: 0, // This would need a separate query
    createdAt: new Date(supplier.created_at),
  }));
}

export async function createSupplier(supplierData: {
  nombre: string;
  contacto: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('proveedores')
    .insert([supplierData])
    .select()
    .single();

  if (error) throw error;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'create',
      entidad: 'supplier',
      entidad_id: data.id_proveedor,
      descripcion: `Creado proveedor ${data.nombre}`,
    });
  } catch (e) {
    console.warn('createSupplier: failed to create audit log', e);
  }

  // Map to Supplier type
  return {
    id: data.id_proveedor,
    name: data.nombre,
    contactName: data.contacto,
    phone: data.telefono || '',
    email: data.correo || '',
    address: data.direccion || '',
    productsCount: 0,
    createdAt: new Date(data.created_at),
  };
}

export async function updateSupplier(id: string, supplierData: {
  nombre: string;
  contacto: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('proveedores')
    .update(supplierData)
    .eq('id_proveedor', id)
    .select()
    .single();

  if (error) throw error;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'edit',
      entidad: 'supplier',
      entidad_id: id,
      descripcion: `Actualizado proveedor ${data.nombre}`,
    });
  } catch (e) {
    console.warn('updateSupplier: failed to create audit log', e);
  }

  // Map to Supplier type
  return {
    id: data.id_proveedor,
    name: data.nombre,
    contactName: data.contacto,
    phone: data.telefono || '',
    email: data.correo || '',
    address: data.direccion || '',
    productsCount: 0,
    createdAt: new Date(data.created_at),
  };
}

export async function deleteSupplier(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('proveedores')
    .delete()
    .eq('id_proveedor', id);

  if (error) throw error;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'delete',
      entidad: 'supplier',
      entidad_id: id,
      descripcion: `Eliminado proveedor ${id}`,
    });
  } catch (e) {
    console.warn('deleteSupplier: failed to create audit log', e);
  }
  return { success: true };
}

// Products APIs
export async function getProducts() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('productos')
    .select(`
      *,
      categorias (id_categoria, nombre)
    `)
    .order('nombre', { ascending: true });

  if (error) throw error;
  
  // Try to get all product-supplier relationships (productos_proveedores may not exist)
  let productSuppliersRaw: any[] = [];
  try {
    const { data: psData, error: psError } = await supabase
      .from('productos_proveedores')
      .select('id_producto, id_proveedor');
    if (psError) {
      console.warn('getProducts: productos_proveedores not available or inaccessible:', psError.message || psError);
    }
    productSuppliersRaw = psData || [];
  } catch (e) {
    console.warn('getProducts: error querying productos_proveedores (table may not exist):', e);
    productSuppliersRaw = [];
  }

  // Build a set of all supplier IDs referenced either from relaciones or from the producto.id_proveedor field
  const supplierIdsFromRelations = productSuppliersRaw.map((r: any) => String(r.id_proveedor)).filter(Boolean);
  const supplierIdsFromProductField = (data || []).map((p: any) => p.id_proveedor).filter(Boolean).map((id: any) => String(id));
  const allSupplierIds = Array.from(new Set([...supplierIdsFromRelations, ...supplierIdsFromProductField]));

  let supplierIdToName: Record<string, string> = {};
  if (allSupplierIds.length > 0) {
    const { data: suppliersRows, error: sError } = await supabase
      .from('proveedores')
      .select('id_proveedor, nombre')
      .in('id_proveedor', allSupplierIds);

    if (sError) {
      console.warn('getProducts: unable to load proveedores for mapping:', sError.message || sError);
    }

    (suppliersRows || []).forEach((s: any) => {
      supplierIdToName[String(s.id_proveedor)] = s.nombre;
    });
  }

  // Map database fields to Product type
  return (data || []).map((product: any) => {
    // Find related supplier rows for this product (from relaciones table)
    const related = productSuppliersRaw.filter((ps: any) => String(ps.id_producto) === String(product.id_producto));
    let supplierIds = related.map((ps: any) => String(ps.id_proveedor)).filter(Boolean);

    // Fallback: if no relaciones found but product has id_proveedor (single supplier column), use it
    if (supplierIds.length === 0 && product.id_proveedor) {
      supplierIds = [String(product.id_proveedor)];
    }

    const supplierNames = supplierIds.map((id: string) => supplierIdToName[id]).filter(Boolean as any);
    
    return {
      id: product.id_producto,
      sku: product.sku,
      name: product.nombre,
      description: product.descripcion || '',
      category: product.categorias?.nombre || 'Sin categoría',
      categoryId: product.id_categoria,
      currentStock: product.stock_actual || 0,
      minStock: product.stock_minimo || 0,
      maxStock: product.stock_maximo || 100,
      unitPrice: parseFloat(product.precio) || 0,
      supplierIds,
      supplierNames,
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at || product.created_at),
    };
  });
}

export async function createProduct(productData: {
  sku: string;
  nombre: string;
  descripcion?: string;
  id_categoria: string;
  supplierIds: string[];
  precio: number;
  stock_minimo?: number;
  stock_maximo?: number;
}) {
  const supabase = getSupabase();
  
  // Extract supplierIds from productData and normalize to strings
  const { supplierIds, ...productDataWithoutSuppliers } = productData;
  const supplierIdsNormalized = (supplierIds || []).map((id) => String(id));

  // Set first supplier as the main one in productos table for compatibility
  const productToInsert = {
    ...productDataWithoutSuppliers,
    id_proveedor: supplierIdsNormalized.length > 0 ? supplierIdsNormalized[0] : null,
  };
  
  const { data, error } = await supabase
    .from('productos')
    .insert([productToInsert])
    .select(`
      *,
      categorias (id_categoria, nombre)
    `)
    .single();

  if (error) throw error;
  
  // Insert product-supplier relationships
  if (supplierIdsNormalized.length > 0) {
    const productSupplierRelations = supplierIdsNormalized.map((supplierId, index) => ({
      id_producto: data.id_producto,
      id_proveedor: supplierId,
      es_principal: index === 0, // First supplier is the main one
    }));

    await supabase
      .from('productos_proveedores')
      .insert(productSupplierRelations);
  }

  // Get supplier names
  const { data: suppliers } = await supabase
    .from('proveedores')
    .select('id_proveedor, nombre')
    .in('id_proveedor', supplierIdsNormalized);

  const supplierNames = suppliers?.map((s: any) => s.nombre) || [];
  
  // Map to Product type
  const mapped = {
    id: data.id_producto,
    sku: data.sku,
    name: data.nombre,
    description: data.descripcion || '',
    category: data.categorias?.nombre || 'Sin categoría',
    categoryId: data.id_categoria,
    currentStock: data.stock_actual || 0,
    minStock: data.stock_minimo || 0,
    maxStock: data.stock_maximo || 100,
    unitPrice: parseFloat(data.precio) || 0,
    supplierIds,
    supplierNames,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at || data.created_at),
  };

  // Try to write an audit log (best-effort) including the performing user when available
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'create',
      entidad: 'product',
      entidad_id: String(data.id_producto),
      descripcion: `Creado producto ${data.nombre || data.id_producto}`,
    });
  } catch (e) {
    console.warn('createProduct: failed to create audit log', e);
  }

  return mapped;
}

// Add audit logging for product operations

export async function updateProduct(id: string, productData: {
  sku: string;
  nombre: string;
  descripcion?: string;
  id_categoria: string;
  supplierIds: string[];
  precio: number;
  stock_minimo?: number;
  stock_maximo?: number;
}) {
  const supabase = getSupabase();
  // Fetch existing product before update (best-effort) to capture 'before' state
  let beforeProduct: any = null;
  try {
    const { data: existing } = await supabase
      .from('productos')
      .select('*')
      .eq('id_producto', id)
      .single();
    beforeProduct = existing;
  } catch (e) {
    // ignore
  }
  
  // Extract supplierIds from productData and normalize to strings
  const { supplierIds, ...productDataWithoutSuppliers } = productData;
  const supplierIdsNormalized = (supplierIds || []).map((id) => String(id));

  // Set first supplier as the main one in productos table for compatibility
  const productToUpdate = {
    ...productDataWithoutSuppliers,
    id_proveedor: supplierIdsNormalized.length > 0 ? supplierIdsNormalized[0] : null,
  };
  
  const { data, error } = await supabase
    .from('productos')
    .update(productToUpdate)
    .eq('id_producto', id)
    .select(`
      *,
      categorias (id_categoria, nombre)
    `)
    .single();

  if (error) throw error;
  
  // Delete existing product-supplier relationships
  await supabase
    .from('productos_proveedores')
    .delete()
    .eq('id_producto', id);
  
  // Insert new product-supplier relationships
  if (supplierIdsNormalized.length > 0) {
    const productSupplierRelations = supplierIdsNormalized.map((supplierId, index) => ({
      id_producto: id,
      id_proveedor: supplierId,
      es_principal: index === 0, // First supplier is the main one
    }));

    await supabase
      .from('productos_proveedores')
      .insert(productSupplierRelations);
  }

  // Get supplier names
  const { data: suppliers } = await supabase
    .from('proveedores')
    .select('id_proveedor, nombre')
    .in('id_proveedor', supplierIdsNormalized);

  const supplierNames = suppliers?.map((s: any) => s.nombre) || [];
  
  // Map to Product type
  const mapped = {
    id: data.id_producto,
    sku: data.sku,
    name: data.nombre,
    description: data.descripcion || '',
    category: data.categorias?.nombre || 'Sin categoría',
    categoryId: data.id_categoria,
    currentStock: data.stock_actual || 0,
    minStock: data.stock_minimo || 0,
    maxStock: data.stock_maximo || 100,
    unitPrice: parseFloat(data.precio) || 0,
    supplierIds,
    supplierNames,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at || data.created_at),
  };

  // Best-effort audit log for product update
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'edit',
      entidad: 'product',
      entidad_id: String(data.id_producto || id),
      descripcion: `Actualizado producto ${data.nombre || id}`,
      before: beforeProduct,
      after: data,
    });
  } catch (e) {
    console.warn('updateProduct: failed to create audit log', e);
  }

  return mapped;
}

// Add audit log for product update
export async function updateProductWithAudit(id: string, productData2: any) {
  const result = await updateProduct(id, productData2);
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'edit',
      entidad: 'product',
      entidad_id: String(id),
      descripcion: `Actualizado producto ${result?.name || id}`,
    });
  } catch (e) {
    console.warn('updateProductWithAudit: failed to create audit log', e);
  }
  return result;
}

export async function deleteProduct(id: string) {
  const supabase = getSupabase();
  // First, remove any product-supplier relationship rows to avoid FK constraint errors
  try {
    await supabase
      .from('productos_proveedores')
      .delete()
      .eq('id_producto', id);
  } catch (e) {
    // ignore - best-effort cleanup
    console.warn('deleteProduct: failed to remove product-supplier relations', e);
  }

  // Fetch product before deleting so we can include 'before' data in audit
  let beforeProduct: any = null;
  try {
    const { data: existing } = await supabase
      .from('productos')
      .select('*')
      .eq('id_producto', id)
      .single();
    beforeProduct = existing;
  } catch (e) {
    // ignore
  }

  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id_producto', id);

  if (error) throw error;

  try {
    // Try to resolve the performing user (best-effort)
    let performerId: string | undefined;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      performerId = user?.id;
    } catch (_) {
      // fallback to reading localStorage if available (frontend)
      try {
        const raw = (globalThis as any).localStorage?.getItem?.('currentUser');
        if (raw) {
          const cu = JSON.parse(raw);
          performerId = cu?.id;
        }
      } catch (__e) {
        // ignore
      }
    }

    await createAuditLog({
      id_usuario: performerId,
      accion: 'delete',
      entidad: 'product',
      entidad_id: id,
      descripcion: `Eliminado producto ${id}`,
      before: beforeProduct,
    });
  } catch (e) {
    console.warn('deleteProduct: failed to create audit log', e);
  }
  return { success: true };
}

// Customers APIs
export async function getCustomers() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw error;
  
  // Map database fields to Customer type
  return (data || []).map((customer: any) => ({
    id: customer.id_cliente,
    name: customer.nombre,
    contactName: customer.contacto,
    phone: customer.telefono || '',
    email: customer.correo || '',
    address: customer.direccion || '',
    status: customer.estado || 'activo',
    totalPurchases: 0, // This would need to be calculated from sales
    createdAt: new Date(customer.created_at),
  }));
}

export async function createCustomer(customerData: {
  nombre: string;
  contacto: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  estado?: 'activo' | 'inactivo';
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('clientes')
    .insert([customerData])
    .select()
    .single();

  if (error) throw error;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'create',
      entidad: 'customer',
      entidad_id: data.id_cliente,
      descripcion: `Creado cliente ${data.nombre}`,
    });
  } catch (e) {
    console.warn('createCustomer: failed to create audit log', e);
  }

  // Map to Customer type
  return {
    id: data.id_cliente,
    name: data.nombre,
    contactName: data.contacto,
    phone: data.telefono || '',
    email: data.correo || '',
    address: data.direccion || '',
    status: data.estado || 'activo',
    totalPurchases: 0,
    createdAt: new Date(data.created_at),
  };
}

export async function updateCustomer(id: string, customerData: {
  nombre: string;
  contacto: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  estado?: 'activo' | 'inactivo';
}) {
  const supabase = getSupabase();
  // Fetch existing customer to capture before state
  let beforeCustomer: any = null;
  try {
    const { data: existing } = await supabase
      .from('clientes')
      .select('*')
      .eq('id_cliente', id)
      .single();
    beforeCustomer = existing;
  } catch (e) {
    // ignore
  }

  const { data, error } = await supabase
    .from('clientes')
    .update(customerData)
    .eq('id_cliente', id)
    .select()
    .single();

  if (error) throw error;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'edit',
      entidad: 'customer',
      entidad_id: id,
      descripcion: `Actualizado cliente ${data.nombre}`,
      before: beforeCustomer,
      after: data,
    });
  } catch (e) {
    console.warn('updateCustomer: failed to create audit log', e);
  }

  // Map to Customer type
  return {
    id: data.id_cliente,
    name: data.nombre,
    contactName: data.contacto,
    phone: data.telefono || '',
    email: data.correo || '',
    address: data.direccion || '',
    status: data.estado || 'activo',
    totalPurchases: 0,
    createdAt: new Date(data.created_at),
  };
}

export async function deleteCustomer(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id_cliente', id);

  if (error) throw error;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'delete',
      entidad: 'customer',
      entidad_id: id,
      descripcion: `Eliminado cliente ${id}`,
    });
  } catch (e) {
    console.warn('deleteCustomer: failed to create audit log', e);
  }
  return { success: true };
}

// Inventory Movements APIs
export async function getMovements() {
  const supabase = getSupabase();
  // Try the rich select first (includes nested producto and usuario). If it fails
  // (missing relationships or permission issues), fallback to a simple select.
  let data: any[] | null = null;
  try {
    const res = await supabase
      .from('movimientos_inventario')
      .select(`
        *,
        productos (id_producto, nombre, sku, precio, stock_actual, stock_minimo, stock_maximo, categorias (id_categoria, nombre)),
        usuarios (id, nombre)
      `)
      .order('fecha', { ascending: false });
    if (res.error) throw res.error;
    data = res.data as any[];
  } catch (err) {
    console.warn('getMovements: rich select failed, attempting simple select fallback:', (err as any)?.message || err);
    try {
      const res2 = await supabase
        .from('movimientos_inventario')
        .select('*')
        .order('fecha', { ascending: false });
      if (res2.error) throw res2.error;
      data = res2.data as any[];
    } catch (err2) {
      console.error('getMovements: both rich and simple selects failed:', (err2 as any)?.message || err2);
      // Let the caller handle empty fallback
      throw err2;
    }
  }

  // If some rows lack nested product details, batch-fetch those products as a fallback
  const rows: any[] = data || [];
  const missingProductIds = new Set<string>();
  rows.forEach((r: any) => {
    const prod = r.productos || {};
    const pid = prod.id_producto || r.id_producto || null;
    // If no product name or category available, mark for fetching
    if (pid && (!prod.nombre || !prod.categorias)) missingProductIds.add(String(pid));
  });

  let fetchedProductsMap: Record<string, any> = {};
  if (missingProductIds.size > 0) {
    try {
      const ids = Array.from(missingProductIds);
      const { data: fetched } = await supabase
        .from('productos')
        .select('id_producto, nombre, sku, precio, stock_actual, stock_minimo, stock_maximo, id_categoria, categorias (id_categoria, nombre)')
        .in('id_producto', ids);
      (fetched || []).forEach((p: any) => {
        fetchedProductsMap[String(p.id_producto)] = p;
      });
    } catch (e) {
      // ignore and let rows render with best-effort data
      console.warn('Failed to batch fetch products for movements fallback', e);
    }
  }

  // Batch fetch users (performers) when nested usuarios relation isn't present
  const missingUserIds = new Set<string>();
  rows.forEach((r: any) => {
    const uid = r.id_usuario || r.performed_by || r.usuario || null;
    if (uid && !r.usuarios) missingUserIds.add(String(uid));
  });

  let fetchedUsersMap: Record<string, any> = {};
  if (missingUserIds.size > 0) {
    try {
      const uids = Array.from(missingUserIds);
      const { data: fetchedUsers } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .in('id', uids);
      (fetchedUsers || []).forEach((u: any) => {
        fetchedUsersMap[String(u.id)] = u;
      });
    } catch (e) {
      console.warn('Failed to batch fetch users for movements fallback', e);
    }
  }

  // Normalize rows to frontend InventoryMovement shape and ensure Date objects
  return rows.map((row: any) => {
    const product = row.productos || {};
    // prefer nested product, else use fetched product if available
    const pid = product.id_producto || row.id_producto || null;
    const fetched = pid ? fetchedProductsMap[String(pid)] : null;
    const prod = Object.keys(product || {}).length ? product : (fetched || {});
    const rawDate = row.fecha || row.created_at || row.updated_at || null;
    let dateObj: Date | null = null;
    try {
      dateObj = rawDate ? new Date(rawDate) : null;
      if (dateObj && isNaN(dateObj.getTime())) dateObj = null;
    } catch (e) {
      dateObj = null;
    }

    const tipo = String(row.tipo || row.tipo_movimiento || '').toLowerCase();
    const type: 'entrada' | 'salida' = tipo.includes('salida') ? 'salida' : 'entrada';

    const performedId = row.id_usuario || row.performed_by || row.usuario || null;
    return {
      id: row.id_movimiento || row.id || String(row.id_movimiento || row.id),
      productId: prod.id_producto || row.id_producto || null,
      productName: prod.nombre || row.product_name || row.nombre_producto || '',
      sku: prod.sku || row.sku || '',
      productCategory: prod.categorias?.nombre || prod.nombre_categoria || row.categoria || row.id_categoria || null,
      type,
      quantity: Number(row.cantidad || row.quantity || 0),
      reason: row.motivo || row.reason || '',
      performedBy: performedId || '',
      performedByName: row.usuarios?.nombre || (performedId ? (fetchedUsersMap[String(performedId)]?.nombre) : undefined) || undefined,
      productPrice: prod.precio ? Number(prod.precio) : undefined,
      stockActual: prod.stock_actual ?? undefined,
      stockMin: prod.stock_minimo ?? undefined,
      stockMax: prod.stock_maximo ?? undefined,
      date: dateObj || new Date(),
      notes: row.notas || row.notes || '',
      customerId: row.id_cliente || undefined,
      customerName: row.nombre_cliente || undefined,
      // keep raw row for advanced debugging if needed
      _raw: row,
    } as any;
  });
}

export async function getMovementById(id: string) {
  const supabase = getSupabase();
  // Try rich select first (with nested producto and usuario). If it fails
  // because there is no relationship defined in DB, fallback to simple select
  let mv: any = null;
  try {
    const { data: movement, error } = await supabase
      .from('movimientos_inventario')
      .select(`*, productos (id_producto, nombre, sku, precio, stock_actual, stock_minimo, stock_maximo, categorias (id_categoria, nombre)), usuarios (id, nombre)`)
      .eq('id_movimiento', id)
      .single();
    if (error) throw error;
    mv = movement || {};
  } catch (err) {
    console.warn('getMovementById: rich select failed, falling back to simple select:', (err as any)?.message || err);
    const { data: movement, error } = await supabase
      .from('movimientos_inventario')
      .select('*')
      .eq('id_movimiento', id)
      .single();
    if (error) throw error;
    mv = movement || {};

    // If product data missing, fetch product separately
    const pid = mv.id_producto || mv.productos?.id_producto || null;
    if (pid && !mv.productos) {
      try {
        const { data: prod } = await supabase
          .from('productos')
          .select('id_producto, nombre, sku, precio, stock_actual, stock_minimo, stock_maximo, id_categoria, categorias (id_categoria, nombre)')
          .eq('id_producto', pid)
          .single();
        if (prod) mv.productos = prod;
      } catch (e) {
        console.warn('Failed to fetch product for movement fallback', e);
      }
    }

    // If usuario info missing, fetch usuario separately
    const uid = mv.id_usuario || mv.performed_by || mv.usuario || null;
    if (uid && !mv.usuarios) {
      try {
        const { data: usr } = await supabase
          .from('usuarios')
          .select('id, nombre')
          .eq('id', uid)
          .single();
        if (usr) mv.usuarios = usr;
      } catch (e) {
        console.warn('Failed to fetch usuario for movement fallback', e);
      }
    }

    // If there's an id_proveedor, try to fetch supplier details separately
    if (mv.id_proveedor) {
      try {
        const { data: supplier } = await supabase
          .from('proveedores')
          .select('id_proveedor, nombre, contacto, correo, telefono, direccion')
          .eq('id_proveedor', mv.id_proveedor)
          .single();
        if (supplier) mv.proveedor = supplier;
      } catch (supError) {
        console.warn('Supplier fetch error for movement (fallback)', (supError as any)?.message || supError);
      }
    }
  }

  // Normalize the returned movement shape to match frontend types and ensure date is a Date
  const prod = mv.productos || {};
  const rawDate = mv.fecha || mv.created_at || mv.updated_at || null;
  let dateObj: Date | null = null;
  try {
    dateObj = rawDate ? new Date(rawDate) : null;
    if (dateObj && isNaN(dateObj.getTime())) dateObj = null;
  } catch (e) {
    dateObj = null;
  }

  const tipo = String(mv.tipo || mv.tipo_movimiento || '').toLowerCase();
  const type: 'entrada' | 'salida' = tipo.includes('salida') ? 'salida' : 'entrada';

  const mapped = {
    id: mv.id_movimiento || mv.id || String(mv.id_movimiento || mv.id),
    productId: prod.id_producto || mv.id_producto || null,
    productName: prod.nombre || mv.product_name || mv.nombre_producto || '',
    sku: prod.sku || mv.sku || '',
    productCategory: prod.categorias?.nombre || mv.categoria || null,
    productPrice: prod.precio ? Number(prod.precio) : undefined,
    stockActual: prod.stock_actual ?? undefined,
    stockMin: prod.stock_minimo ?? undefined,
    stockMax: prod.stock_maximo ?? undefined,
    type,
    quantity: Number(mv.cantidad || mv.quantity || 0),
    reason: mv.motivo || mv.reason || '',
    performedBy: mv.id_usuario || mv.performed_by || mv.usuario || '',
    performedByName: mv.usuarios?.nombre || undefined,
    date: dateObj || new Date(),
    notes: mv.notas || mv.notes || '',
    proveedor: mv.proveedor,
    _raw: mv,
  } as any;

  return mapped;
}

export async function createMovement(movementData: {
  id_producto: string;
  tipo: 'Entrada' | 'Ajuste';
  cantidad: number;
  motivo: string;
  notas?: string;
  id_proveedor?: string;
  id_usuario?: string;
}) {
  const supabase = getSupabase();
  
  // Get user ID - either from parameter or Supabase Auth (for compatibility)
  let userId = movementData.id_usuario;
  
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');
    userId = user.id;
  }

  const { id_usuario: _, ...dataWithoutUserId } = movementData;

  const { data, error } = await supabase
    .from('movimientos_inventario')
    .insert([{
      ...dataWithoutUserId,
      id_usuario: userId,
    }])
    .select(`
      *,
      productos (id_producto, nombre, sku)
    `)
    .single();

  if (error) throw error;
  return data;
}

// Sales APIs
export async function getSales() {
  const supabase = getSupabase();
  // Fetch sales header with nested detalles and product info
  const { data, error } = await supabase
    .from('ventas')
    .select(`
      *,
      clientes (id_cliente, nombre),
      detalles_venta ( *, productos (id_producto, nombre, sku) )
    `)
    .order('fecha', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createSale(saleData: {
  id_cliente: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  notas?: string;
  id_usuario?: string;
}) {
  const supabase = getSupabase();
  
  // Get user ID - either from parameter or Supabase Auth (for compatibility)
  let userId = saleData.id_usuario;
  
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');
    userId = user.id;
  }

  // Calculate total locally
  const total = saleData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  // Insert sale header WITHOUT providing `total` explicitly. Some DB schemas may
  // define `total` as a generated column or restrict direct inserts; to avoid
  // the "cannot insert a non-DEFAULT value into column \"total\"" error we
  // insert the header first and then update the total after inserting detalles.
  const { data: saleHeader, error: headerError } = await supabase
    .from('ventas')
    .insert([{ id_cliente: saleData.id_cliente, id_usuario: userId, notas: saleData.notas }])
    .select()
    .single();

  if (headerError) throw headerError;

  const saleId = saleHeader?.id_venta || saleHeader?.id;

  // Prepare detalles_venta rows
  const detalleRows = saleData.items.map((it: any) => ({
    id_venta: saleId,
    id_producto: it.productId,
    cantidad: it.quantity,
    precio_unitario: it.unitPrice,
    subtotal: Number((it.quantity * it.unitPrice).toFixed(2)),
  }));

  // Insert detalles (this trigger will reduce stock via 'reducir_stock_por_detalle')
  const { error: detalleError } = await supabase
    .from('detalles_venta')
    .insert(detalleRows as any);

  if (detalleError) throw detalleError;

  // Update the ventas.total AFTER inserting detalles. Use the computed `total`
  // from above. This avoids inserting into a possibly-generated column.
  try {
    const { error: updateError } = await supabase
      .from('ventas')
      .update({ total: Number(total.toFixed(2)) })
      .eq('id_venta', saleId);
    if (updateError) {
      // Don't fail the whole operation solely because updating the total failed;
      // log and continue — caller can re-fetch or re-sync as needed.
      console.warn('createSale: failed to update ventas.total', updateError);
    }
  } catch (e) {
    console.warn('createSale: exception while updating ventas.total', e);
  }

  // Fetch complete sale with nested detalles and product info
  const { data: completeSale, error: fetchError } = await supabase
    .from('ventas')
    .select(`
      *,
      clientes (id_cliente, nombre),
      detalles_venta ( *, productos (id_producto, nombre, sku) )
    `)
    .eq('id_venta', saleId)
    .single();

  if (fetchError) throw fetchError;

  // Create audit log for sale (best-effort)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const customerName = completeSale?.clientes?.nombre || '';
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'sale',
      entidad: 'sale',
      entidad_id: saleId,
      descripcion: `Venta registrada ${saleId} - cliente: ${customerName} - total: ${total}`,
    });
  } catch (e) {
    console.warn('createSale: failed to create audit log', e);
  }

  return completeSale;
}

// Audit Logs APIs
export async function getAuditLogs() {
  const supabase = getSupabase();
  // Try to fetch audit logs including the related usuario (if permissions allow).
  let data: any[] | null = null;
  try {
    const res = await supabase
      .from('auditoria')
      .select('*, usuarios(id, nombre)')
      .order('fecha', { ascending: false })
      .limit(100);
    if (res.error) throw res.error;
    data = res.data as any[];
  } catch (err) {
    // Fallback to a simple select if the richer join fails (e.g., missing relation or perms)
    const res2 = await supabase
      .from('auditoria')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(100);
    if (res2.error) {
      console.error('Error loading audit logs:', res2.error);
      return [];
    }
    data = res2.data as any[];
  }
  
  // Transform data to match AuditLog type
  const transformedData = data?.map((log: any) => ({
    id: log.id_auditoria,
    userId: log.id_usuario || (log.usuarios ? log.usuarios.id : 'system'),
    userName: (log.usuarios && log.usuarios.nombre) || (log.descripcion || '').match(/usuario:\s*([^,]+)/i)?.[1] || 'Usuario del Sistema',
    action: log.accion || 'edit',
    entity: log.entidad || 'product',
    entityId: log.entidad_id || '',
    entityName: (log.descripcion || '').split('\n\n---DATA_DELTA---\n')[0] || 'Registro',
    details: (log.descripcion || '').split('\n\n---DATA_DELTA---\n')[0] || '',
    // Try to parse optional DATA_DELTA JSON appended to descripcion
    before: (() => {
      try {
        const parts = (log.descripcion || '').split('\n\n---DATA_DELTA---\n');
        if (parts.length > 1) {
          const parsed = JSON.parse(parts.slice(1).join('\n\n---DATA_DELTA---\n'));
          return parsed.before;
        }
      } catch (e) {
        // ignore
      }
      return undefined;
    })(),
    after: (() => {
      try {
        const parts = (log.descripcion || '').split('\n\n---DATA_DELTA---\n');
        if (parts.length > 1) {
          const parsed = JSON.parse(parts.slice(1).join('\n\n---DATA_DELTA---\n'));
          return parsed.after;
        }
      } catch (e) {
        // ignore
      }
      return undefined;
    })(),
    timestamp: new Date(log.fecha),
  })) || [];
  
  return transformedData;
}

// Dashboard Stats APIs
export async function getDashboardStats() {
  const supabase = getSupabase();

  try {
    // Get product count
    const { count: productCount } = await supabase
      .from('productos')
      .select('*', { count: 'exact', head: true });

    // Get low stock products (stock_actual < stock_minimo)
    const { data: allProducts } = await supabase
      .from('productos')
      .select('*');

    const lowStockProducts = allProducts?.filter(
      product => product.stock_actual < product.stock_minimo
    ) || [];

    // Get recent sales (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentSales } = await supabase
      .from('ventas')
      .select('total, fecha')
      .gte('fecha', thirtyDaysAgo.toISOString());

    const totalRevenue = recentSales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;

    // Get customer count
    const { count: customerCount } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'activo');

    // Get recent movements
    const { data: recentMovements } = await supabase
      .from('movimientos_inventario')
      .select(`
        *,
        productos (nombre)
      `)
      .order('fecha', { ascending: false })
      .limit(10);

    return {
      productCount: productCount || 0,
      lowStockCount: lowStockProducts.length,
      totalRevenue,
      customerCount: customerCount || 0,
      recentMovements: recentMovements || [],
      lowStockProducts: lowStockProducts,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}

// Inventory API
export async function getInventory() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('productos')
    .select(`
      *,
      categorias (id_categoria, nombre),
      proveedores (id_proveedor, nombre)
    `)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
}

// Users management (admin only) - Nueva tabla usuarios
export async function getUsers() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw error;

  return (data || []).map((user: any) => ({
    id: user.id,
    username: user.correo?.split('@')[0] || user.nombre,
    password: user.password || '',
    fullName: user.nombre,
    email: user.correo,
    role: user.rol,
    createdAt: new Date(user.created_at),
  }));
}

export async function createUser(userData: {
  correo: string;
  password: string;
  nombre: string;
  rol: 'Administrador' | 'Empleado';
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('usuarios')
    .insert([{
      ...userData,
      activo: true,
    }])
    .select()
    .single();

  if (error) throw error;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'create',
      entidad: 'user',
      entidad_id: data.id,
      descripcion: `Creado usuario ${data.nombre || data.correo || data.id}`,
    });
  } catch (e) {
    console.warn('createUser: failed to create audit log', e);
  }
  return data;
}

export async function updateUser(id: string, userData: {
  correo?: string;
  password?: string;
  nombre?: string;
  rol?: 'Administrador' | 'Empleado';
  activo?: boolean;
}) {
  const supabase = getSupabase();
  // Fetch existing user for 'before' state
  let beforeUser: any = null;
  try {
    const { data: existing } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();
    beforeUser = existing;
  } catch (e) {
    // ignore
  }
  const { data, error } = await supabase
    .from('usuarios')
    .update(userData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'edit',
      entidad: 'user',
      entidad_id: id,
      descripcion: `Actualizado usuario ${data?.nombre || id}`,
      before: beforeUser,
      after: data,
    });
  } catch (e) {
    console.warn('updateUser: failed to create audit log', e);
  }
  return data;
}

export async function deleteUser(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('usuarios')
    .delete()
    .eq('id', id);

  if (error) throw error;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createAuditLog({
      id_usuario: user?.id,
      accion: 'delete',
      entidad: 'user',
      entidad_id: id,
      descripcion: `Eliminado usuario ${id}`,
    });
  } catch (e) {
    console.warn('deleteUser: failed to create audit log', e);
  }
  return { success: true };
}

export async function toggleUserStatus(id: string, activo: boolean) {
  return updateUser(id, { activo });
}

// Password encryption using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === hashedPassword;
}

// Audit Log APIs
export async function createAuditLog(auditData: {
  id_usuario?: string;
  accion: string;
  entidad: string;
  entidad_id?: string;
  descripcion: string;
  before?: any;
  after?: any;
  metadata?: any;
}) {
  const supabase = getSupabase();
  
  try {
    // Resolve performer id if not provided: try Supabase auth, then localStorage 'currentUser'
    if (!auditData.id_usuario) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) auditData.id_usuario = user.id;
      } catch (e) {
        // ignore and try fallback
      }
    }

    if (!auditData.id_usuario) {
      try {
        const raw = (globalThis as any).localStorage?.getItem?.('currentUser');
        if (raw) {
          const cu = JSON.parse(raw);
          if (cu?.id) auditData.id_usuario = cu.id;
        }
      } catch (e) {
        // ignore
      }
    }

    // If structured before/after were provided, append them to the descripcion as a JSON block
    let payload = { ...auditData } as any;
    if (auditData.before !== undefined || auditData.after !== undefined || auditData.metadata !== undefined) {
      const delta = { before: auditData.before, after: auditData.after, metadata: auditData.metadata };
      payload.descripcion = `${auditData.descripcion}\n\n---DATA_DELTA---\n${JSON.stringify(delta)}`;
      // Remove structured fields from the top-level payload to avoid PostgREST type mismatch
      delete payload.before;
      delete payload.after;
      delete payload.metadata;
    }

    const { data, error } = await supabase
      .from('auditoria')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error creating audit log:', error);
      // Don't throw error, just log it
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating audit log:', error);
    return null;
  }
}
