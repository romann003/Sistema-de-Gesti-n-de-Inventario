import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Create Supabase admin client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Helper function to get authenticated user
async function getAuthenticatedUser(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return null;
  }
  return user;
}

// Helper function to get user profile with role
async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.log('Error getting user profile:', error);
    return null;
  }
  return data;
}

// Database initialization endpoint (deprecated - tables should be created manually)
app.post("/make-server-8ec75d71/init-database", async (c) => {
  // This endpoint is kept for backward compatibility but does nothing
  // Tables should be created manually through Supabase UI
  return c.json({ success: true, message: 'Database ready' });
});

// Health check endpoint
app.get("/make-server-8ec75d71/health", (c) => {
  return c.json({ status: "ok" });
});

// ==================== AUTH ROUTES ====================

// Sign up
app.post("/make-server-8ec75d71/auth/signup", async (c) => {
  try {
    const { email, password, nombre, rol } = await c.req.json();

    if (!email || !password || !nombre) {
      return c.json({ error: 'Email, password and nombre are required' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        nombre: nombre,
        rol: rol || 'Empleado'
      },
      email_confirm: true // Auto-confirm since email server is not configured
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: data.user.id,
      accion: 'create',
      descripcion: `Usuario registrado: ${email}`,
      entidad: 'user',
      entidad_id: data.user.id
    });

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get current user profile
app.get("/make-server-8ec75d71/auth/profile", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    return c.json({ 
      id: user.id,
      email: user.email,
      ...profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== CATEGORIAS ROUTES ====================

app.get("/make-server-8ec75d71/categorias", async (c) => {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre');

    if (error) throw error;

    // Add product count for each category
    const categoriesWithCount = await Promise.all(
      data.map(async (cat) => {
        const { count } = await supabase
          .from('productos')
          .select('*', { count: 'exact', head: true })
          .eq('id_categoria', cat.id_categoria);
        
        return {
          id: cat.id_categoria,
          name: cat.nombre,
          description: cat.descripcion || '',
          productCount: count || 0,
          createdAt: cat.created_at
        };
      })
    );

    return c.json(categoriesWithCount);
  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-8ec75d71/categorias", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (profile?.rol !== 'Administrador') {
      return c.json({ error: 'Only administrators can create categories' }, 403);
    }

    const { nombre, descripcion } = await c.req.json();

    const { data, error } = await supabase
      .from('categorias')
      .insert({ nombre, descripcion })
      .select()
      .single();

    if (error) throw error;

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'create',
      descripcion: `Categoría creada: ${nombre}`,
      entidad: 'categoria',
      entidad_id: data.id_categoria
    });

    return c.json({
      id: data.id_categoria,
      name: data.nombre,
      description: data.descripcion || '',
      productCount: 0,
      createdAt: data.created_at
    });
  } catch (error) {
    console.error('Create category error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put("/make-server-8ec75d71/categorias/:id", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (profile?.rol !== 'Administrador') {
      return c.json({ error: 'Only administrators can update categories' }, 403);
    }

    const id = c.req.param('id');
    const { nombre, descripcion } = await c.req.json();

    const { data, error } = await supabase
      .from('categorias')
      .update({ nombre, descripcion })
      .eq('id_categoria', id)
      .select()
      .single();

    if (error) throw error;

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'edit',
      descripcion: `Categoría actualizada: ${nombre}`,
      entidad: 'categoria',
      entidad_id: id
    });

    return c.json({
      id: data.id_categoria,
      name: data.nombre,
      description: data.descripcion || '',
      createdAt: data.created_at
    });
  } catch (error) {
    console.error('Update category error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-8ec75d71/categorias/:id", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (profile?.rol !== 'Administrador') {
      return c.json({ error: 'Only administrators can delete categories' }, 403);
    }

    const id = c.req.param('id');

    // Get category name before deletion
    const { data: category } = await supabase
      .from('categorias')
      .select('nombre')
      .eq('id_categoria', id)
      .single();

    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id_categoria', id);

    if (error) throw error;

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'delete',
      descripcion: `Categoría eliminada: ${category?.nombre || id}`,
      entidad: 'categoria',
      entidad_id: id
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== PROVEEDORES ROUTES ====================

app.get("/make-server-8ec75d71/proveedores", async (c) => {
  try {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('nombre');

    if (error) throw error;

    const suppliersWithCount = await Promise.all(
      data.map(async (prov) => {
        const { count } = await supabase
          .from('productos')
          .select('*', { count: 'exact', head: true })
          .eq('id_proveedor', prov.id_proveedor);
        
        return {
          id: prov.id_proveedor,
          name: prov.nombre,
          contactName: prov.contacto,
          phone: prov.telefono || '',
          email: prov.correo || '',
          address: prov.direccion || '',
          productsCount: count || 0,
          createdAt: prov.created_at
        };
      })
    );

    return c.json(suppliersWithCount);
  } catch (error) {
    console.error('Get suppliers error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-8ec75d71/proveedores", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (profile?.rol !== 'Administrador') {
      return c.json({ error: 'Only administrators can create suppliers' }, 403);
    }

    const { nombre, contacto, telefono, correo, direccion } = await c.req.json();

    const { data, error } = await supabase
      .from('proveedores')
      .insert({ nombre, contacto, telefono, correo, direccion })
      .select()
      .single();

    if (error) throw error;

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'create',
      descripcion: `Proveedor creado: ${nombre}`,
      entidad: 'proveedor',
      entidad_id: data.id_proveedor
    });

    return c.json({
      id: data.id_proveedor,
      name: data.nombre,
      contactName: data.contacto,
      phone: data.telefono || '',
      email: data.correo || '',
      address: data.direccion || '',
      productsCount: 0,
      createdAt: data.created_at
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put("/make-server-8ec75d71/proveedores/:id", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (profile?.rol !== 'Administrador') {
      return c.json({ error: 'Only administrators can update suppliers' }, 403);
    }

    const id = c.req.param('id');
    const { nombre, contacto, telefono, correo, direccion } = await c.req.json();

    const { data, error } = await supabase
      .from('proveedores')
      .update({ nombre, contacto, telefono, correo, direccion })
      .eq('id_proveedor', id)
      .select()
      .single();

    if (error) throw error;

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'edit',
      descripcion: `Proveedor actualizado: ${nombre}`,
      entidad: 'proveedor',
      entidad_id: id
    });

    return c.json({
      id: data.id_proveedor,
      name: data.nombre,
      contactName: data.contacto,
      phone: data.telefono || '',
      email: data.correo || '',
      address: data.direccion || '',
      createdAt: data.created_at
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-8ec75d71/proveedores/:id", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (profile?.rol !== 'Administrador') {
      return c.json({ error: 'Only administrators can delete suppliers' }, 403);
    }

    const id = c.req.param('id');

    // Get supplier name before deletion
    const { data: supplier } = await supabase
      .from('proveedores')
      .select('nombre')
      .eq('id_proveedor', id)
      .single();

    const { error } = await supabase
      .from('proveedores')
      .delete()
      .eq('id_proveedor', id);

    if (error) throw error;

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'delete',
      descripcion: `Proveedor eliminado: ${supplier?.nombre || id}`,
      entidad: 'proveedor',
      entidad_id: id
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete supplier error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== PRODUCTOS ROUTES ====================

app.get("/make-server-8ec75d71/productos", async (c) => {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        categorias(id_categoria, nombre),
        proveedores(id_proveedor, nombre)
      `)
      .order('nombre');

    if (error) throw error;

    const products = data.map(prod => ({
      id: prod.id_producto,
      sku: prod.sku,
      name: prod.nombre,
      description: prod.descripcion || '',
      category: prod.categorias?.nombre || '',
      categoryId: prod.categorias?.id_categoria || '',
      currentStock: prod.stock_actual,
      minStock: prod.stock_minimo,
      maxStock: prod.stock_maximo,
      unitPrice: parseFloat(prod.precio),
      supplierIds: prod.proveedores ? [prod.proveedores.id_proveedor] : [],
      supplierNames: prod.proveedores ? [prod.proveedores.nombre] : [],
      createdAt: prod.created_at,
      updatedAt: prod.updated_at
    }));

    return c.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-8ec75d71/productos", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (profile?.rol !== 'Administrador') {
      return c.json({ error: 'Only administrators can create products' }, 403);
    }

    const { sku, nombre, descripcion, id_categoria, id_proveedor, precio, stock_minimo, stock_maximo } = await c.req.json();

    const { data, error } = await supabase
      .from('productos')
      .insert({ 
        sku, 
        nombre, 
        descripcion, 
        id_categoria, 
        id_proveedor, 
        precio,
        stock_minimo: stock_minimo || 0,
        stock_maximo: stock_maximo || 100,
        stock_actual: 0
      })
      .select(`
        *,
        categorias(id_categoria, nombre),
        proveedores(id_proveedor, nombre)
      `)
      .single();

    if (error) throw error;

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'create',
      descripcion: `Producto creado: ${nombre} (SKU: ${sku})`,
      entidad: 'producto',
      entidad_id: data.id_producto
    });

    return c.json({
      id: data.id_producto,
      sku: data.sku,
      name: data.nombre,
      description: data.descripcion || '',
      category: data.categorias?.nombre || '',
      categoryId: data.categorias?.id_categoria || '',
      currentStock: data.stock_actual,
      minStock: data.stock_minimo,
      maxStock: data.stock_maximo,
      unitPrice: parseFloat(data.precio),
      supplierIds: data.proveedores ? [data.proveedores.id_proveedor] : [],
      supplierNames: data.proveedores ? [data.proveedores.nombre] : [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    console.error('Create product error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put("/make-server-8ec75d71/productos/:id", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (profile?.rol !== 'Administrador') {
      return c.json({ error: 'Only administrators can update products' }, 403);
    }

    const id = c.req.param('id');
    const { sku, nombre, descripcion, id_categoria, id_proveedor, precio, stock_minimo, stock_maximo } = await c.req.json();

    const { data, error } = await supabase
      .from('productos')
      .update({ 
        sku, 
        nombre, 
        descripcion, 
        id_categoria, 
        id_proveedor, 
        precio,
        stock_minimo,
        stock_maximo,
        updated_at: new Date().toISOString()
      })
      .eq('id_producto', id)
      .select(`
        *,
        categorias(id_categoria, nombre),
        proveedores(id_proveedor, nombre)
      `)
      .single();

    if (error) throw error;

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'edit',
      descripcion: `Producto actualizado: ${nombre} (SKU: ${sku})`,
      entidad: 'producto',
      entidad_id: id
    });

    return c.json({
      id: data.id_producto,
      sku: data.sku,
      name: data.nombre,
      description: data.descripcion || '',
      category: data.categorias?.nombre || '',
      categoryId: data.categorias?.id_categoria || '',
      currentStock: data.stock_actual,
      minStock: data.stock_minimo,
      maxStock: data.stock_maximo,
      unitPrice: parseFloat(data.precio),
      supplierIds: data.proveedores ? [data.proveedores.id_proveedor] : [],
      supplierNames: data.proveedores ? [data.proveedores.nombre] : [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error) {
    console.error('Update product error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-8ec75d71/productos/:id", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (profile?.rol !== 'Administrador') {
      return c.json({ error: 'Only administrators can delete products' }, 403);
    }

    const id = c.req.param('id');

    // Get product name before deletion
    const { data: product } = await supabase
      .from('productos')
      .select('nombre, sku')
      .eq('id_producto', id)
      .single();

    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id_producto', id);

    if (error) throw error;

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'delete',
      descripcion: `Producto eliminado: ${product?.nombre || ''} (SKU: ${product?.sku || id})`,
      entidad: 'producto',
      entidad_id: id
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== CLIENTES ROUTES ====================

app.get("/make-server-8ec75d71/clientes", async (c) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre');

    if (error) throw error;

    const customersWithPurchases = await Promise.all(
      data.map(async (cliente) => {
        const { data: ventas } = await supabase
          .from('ventas')
          .select('total')
          .eq('id_cliente', cliente.id_cliente);
        
        const totalPurchases = ventas?.reduce((sum, v) => sum + parseFloat(v.total), 0) || 0;
        
        return {
          id: cliente.id_cliente,
          name: cliente.nombre,
          contactName: cliente.contacto,
          phone: cliente.telefono || '',
          email: cliente.correo || '',
          address: cliente.direccion || '',
          status: cliente.estado,
          totalPurchases,
          createdAt: cliente.created_at
        };
      })
    );

    return c.json(customersWithPurchases);
  } catch (error) {
    console.error('Get customers error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-8ec75d71/clientes", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { nombre, contacto, telefono, correo, direccion, estado } = await c.req.json();

    const { data, error } = await supabase
      .from('clientes')
      .insert({ nombre, contacto, telefono, correo, direccion, estado: estado || 'activo' })
      .select()
      .single();

    if (error) throw error;

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'create',
      descripcion: `Cliente creado: ${nombre}`,
      entidad: 'cliente',
      entidad_id: data.id_cliente
    });

    return c.json({
      id: data.id_cliente,
      name: data.nombre,
      contactName: data.contacto,
      phone: data.telefono || '',
      email: data.correo || '',
      address: data.direccion || '',
      status: data.estado,
      totalPurchases: 0,
      createdAt: data.created_at
    });
  } catch (error) {
    console.error('Create customer error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put("/make-server-8ec75d71/clientes/:id", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const { nombre, contacto, telefono, correo, direccion, estado } = await c.req.json();

    const { data, error } = await supabase
      .from('clientes')
      .update({ nombre, contacto, telefono, correo, direccion, estado })
      .eq('id_cliente', id)
      .select()
      .single();

    if (error) throw error;

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'edit',
      descripcion: `Cliente actualizado: ${nombre}`,
      entidad: 'cliente',
      entidad_id: id
    });

    return c.json({
      id: data.id_cliente,
      name: data.nombre,
      contactName: data.contacto,
      phone: data.telefono || '',
      email: data.correo || '',
      address: data.direccion || '',
      status: data.estado,
      createdAt: data.created_at
    });
  } catch (error) {
    console.error('Update customer error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-8ec75d71/clientes/:id", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');

    // Get customer name before deletion
    const { data: customer } = await supabase
      .from('clientes')
      .select('nombre')
      .eq('id_cliente', id)
      .single();

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id_cliente', id);

    if (error) throw error;

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'delete',
      descripcion: `Cliente eliminado: ${customer?.nombre || id}`,
      entidad: 'cliente',
      entidad_id: id
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete customer error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== MOVIMIENTOS INVENTARIO ROUTES ====================

app.get("/make-server-8ec75d71/movimientos", async (c) => {
  try {
    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select(`
        *,
        productos(id_producto, nombre, sku),
        perfiles!movimientos_inventario_id_usuario_fkey(nombre)
      `)
      .order('fecha', { ascending: false });

    if (error) throw error;

    const movements = data.map(mov => ({
      id: mov.id_movimiento,
      productId: mov.productos?.id_producto || '',
      productName: mov.productos?.nombre || '',
      sku: mov.productos?.sku || '',
      type: mov.tipo.toLowerCase() as 'entrada' | 'salida',
      quantity: mov.cantidad,
      reason: mov.motivo,
      performedBy: mov.perfiles?.nombre || 'Usuario',
      date: mov.fecha,
      notes: mov.notas || ''
    }));

    return c.json(movements);
  } catch (error) {
    console.error('Get movements error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-8ec75d71/movimientos", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { id_producto, tipo, cantidad, motivo, notas } = await c.req.json();

    const { data, error } = await supabase
      .from('movimientos_inventario')
      .insert({ 
        id_producto, 
        tipo: tipo.charAt(0).toUpperCase() + tipo.slice(1), // Capitalize first letter
        cantidad, 
        motivo, 
        notas,
        id_usuario: user.id
      })
      .select(`
        *,
        productos(id_producto, nombre, sku),
        perfiles!movimientos_inventario_id_usuario_fkey(nombre)
      `)
      .single();

    if (error) throw error;

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'movement',
      descripcion: `Movimiento registrado: ${tipo} de ${cantidad} unidades - ${data.productos?.nombre}`,
      entidad: 'inventario',
      entidad_id: data.id_movimiento
    });

    return c.json({
      id: data.id_movimiento,
      productId: data.productos?.id_producto || '',
      productName: data.productos?.nombre || '',
      sku: data.productos?.sku || '',
      type: data.tipo.toLowerCase() as 'entrada' | 'salida',
      quantity: data.cantidad,
      reason: data.motivo,
      performedBy: data.perfiles?.nombre || 'Usuario',
      date: data.fecha,
      notes: data.notas || ''
    });
  } catch (error) {
    console.error('Create movement error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== VENTAS ROUTES ====================

app.get("/make-server-8ec75d71/ventas", async (c) => {
  try {
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        *,
        clientes(id_cliente, nombre),
        productos(id_producto, nombre, sku),
        perfiles!ventas_id_usuario_fkey(nombre)
      `)
      .order('fecha', { ascending: false });

    if (error) throw error;

    // Group sales by customer and date to create Sale objects
    const salesMap = new Map();
    
    data.forEach(venta => {
      const key = `${venta.id_cliente}-${venta.fecha}`;
      
      if (!salesMap.has(key)) {
        salesMap.set(key, {
          id: venta.id_venta,
          customerId: venta.clientes?.id_cliente || '',
          customerName: venta.clientes?.nombre || '',
          items: [],
          total: 0,
          date: venta.fecha,
          performedBy: venta.perfiles?.nombre || 'Usuario',
          notes: venta.notas || ''
        });
      }
      
      const sale = salesMap.get(key);
      sale.items.push({
        productId: venta.productos?.id_producto || '',
        productName: venta.productos?.nombre || '',
        sku: venta.productos?.sku || '',
        quantity: venta.cantidad,
        unitPrice: parseFloat(venta.precio_unitario),
        subtotal: parseFloat(venta.total)
      });
      sale.total += parseFloat(venta.total);
    });

    return c.json(Array.from(salesMap.values()));
  } catch (error) {
    console.error('Get sales error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-8ec75d71/ventas", async (c) => {
  try {
    const user = await getAuthenticatedUser(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { id_cliente, items, notas } = await c.req.json();

    // Insert each item as a separate sale record
    const salesPromises = items.map((item: any) => 
      supabase.from('ventas').insert({
        id_cliente,
        id_producto: item.productId,
        cantidad: item.quantity,
        precio_unitario: item.unitPrice,
        notas,
        id_usuario: user.id
      }).select(`
        *,
        clientes(id_cliente, nombre),
        productos(id_producto, nombre, sku),
        perfiles!ventas_id_usuario_fkey(nombre)
      `)
    );

    const results = await Promise.all(salesPromises);
    const firstSale = results[0].data?.[0];

    if (!firstSale) {
      throw new Error('Failed to create sale');
    }

    // Calculate total
    let total = 0;
    const saleItems = results.map(result => {
      const venta = result.data?.[0];
      const subtotal = parseFloat(venta.total);
      total += subtotal;
      
      return {
        productId: venta.productos?.id_producto || '',
        productName: venta.productos?.nombre || '',
        sku: venta.productos?.sku || '',
        quantity: venta.cantidad,
        unitPrice: parseFloat(venta.precio_unitario),
        subtotal
      };
    });

    // Register audit log
    await supabase.from('auditoria').insert({
      id_usuario: user.id,
      accion: 'sale',
      descripcion: `Venta registrada a ${firstSale.clientes?.nombre} por $${total.toFixed(2)}`,
      entidad: 'venta',
      entidad_id: firstSale.id_venta
    });

    return c.json({
      id: firstSale.id_venta,
      customerId: firstSale.clientes?.id_cliente || '',
      customerName: firstSale.clientes?.nombre || '',
      items: saleItems,
      total,
      date: firstSale.fecha,
      performedBy: firstSale.perfiles?.nombre || 'Usuario',
      notes: firstSale.notas || ''
    });
  } catch (error) {
    console.error('Create sale error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== AUDITORIA ROUTES ====================

app.get("/make-server-8ec75d71/auditoria", async (c) => {
  try {
    const { data, error } = await supabase
      .from('auditoria')
      .select(`
        *,
        perfiles!auditoria_id_usuario_fkey(nombre)
      `)
      .order('fecha', { ascending: false });

    if (error) throw error;

    const logs = data.map(log => ({
      id: log.id_auditoria,
      userId: log.id_usuario,
      userName: log.perfiles?.nombre || 'Usuario',
      action: log.accion as 'create' | 'edit' | 'delete' | 'sale' | 'movement',
      entity: log.entidad as 'product' | 'user' | 'supplier' | 'customer' | 'inventory' | 'category',
      entityId: log.entidad_id || '',
      entityName: log.entidad || '',
      details: log.descripcion,
      timestamp: log.fecha
    }));

    return c.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== DASHBOARD STATS ====================

app.get("/make-server-8ec75d71/dashboard/stats", async (c) => {
  try {
    // Get total products
    const { count: totalProducts } = await supabase
      .from('productos')
      .select('*', { count: 'exact', head: true });

    // Get low stock items
    const { data: products } = await supabase
      .from('productos')
      .select('stock_actual, stock_minimo, stock_maximo');

    const lowStockItems = products?.filter(p => p.stock_actual <= p.stock_minimo).length || 0;
    const highStockItems = products?.filter(p => p.stock_actual >= p.stock_maximo).length || 0;

    // Get today's movements
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: movementsToday } = await supabase
      .from('movimientos_inventario')
      .select('*', { count: 'exact', head: true })
      .gte('fecha', today.toISOString());

    // Get recent sales
    const { data: recentSales } = await supabase
      .from('ventas')
      .select(`
        *,
        clientes(nombre),
        productos(nombre)
      `)
      .order('fecha', { ascending: false })
      .limit(5);

    // Get recent movements
    const { data: recentMovements } = await supabase
      .from('movimientos_inventario')
      .select(`
        *,
        productos(nombre)
      `)
      .order('fecha', { ascending: false })
      .limit(5);

    return c.json({
      totalProducts: totalProducts || 0,
      lowStockItems,
      highStockItems,
      movementsToday: movementsToday || 0,
      recentSales: recentSales || [],
      recentMovements: recentMovements || []
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);
