const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read projectId and publicAnonKey from src/utils/supabase/info.tsx
const infoPath = path.join(__dirname, '..', 'src', 'utils', 'supabase', 'info.tsx');
const infoRaw = fs.readFileSync(infoPath, 'utf8');
const projectIdMatch = infoRaw.match(/export const projectId = "([^"]+)"/);
const publicKeyMatch = infoRaw.match(/export const publicAnonKey = "([^"]+)"/);
if (!projectIdMatch || !publicKeyMatch) {
  console.error('Failed to read Supabase projectId/publicAnonKey from info.tsx');
  process.exit(1);
}
const projectId = projectIdMatch[1];
const publicAnonKey = publicKeyMatch[1];

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabase = createClient(supabaseUrl, publicAnonKey, {
  global: {
    headers: {
      'apikey': publicAnonKey,
      'Authorization': `Bearer ${publicAnonKey}`,
    }
  }
});

(async () => {
  try {
    console.log('Connecting to Supabase:', supabaseUrl);

    // Count products
    const { error: pError, count: pCount } = await supabase
      .from('productos')
      .select('*', { count: 'exact', head: true });
    if (pError) throw pError;
    console.log('productos count:', pCount);

    // Count movimientos
    const { error: mErr, count: mCount } = await supabase
      .from('movimientos_inventario')
      .select('*', { count: 'exact', head: true });
    if (mErr) throw mErr;
    console.log('movimientos_inventario count:', mCount);

    // Count entradas
    const { data: entradasChunk, error: eErr, count: eCount } = await supabase
      .from('movimientos_inventario')
      .select('*', { count: 'exact' })
      .ilike('tipo', '%entrada%')
      .limit(1);
    if (eErr) throw eErr;
    console.log('entradas (count via ilike):', eCount);

    // Page through productos using range and count fetched
    const pageSize = 1000;
    let from = 0;
    let totalFetched = 0;
    while (true) {
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true })
        .range(from, to);
      if (error) throw error;
      const chunk = data || [];
      totalFetched += chunk.length;
      console.log(`Fetched productos range ${from}-${to}, got ${chunk.length}`);
      if (chunk.length < pageSize) break;
      from += pageSize;
    }
    console.log('Total productos fetched via paged ranges:', totalFetched);

    // Distinct products referenced in movimientos
    const { data: referenced, error: refErr } = await supabase
      .from('movimientos_inventario')
      .select('id_producto')
      .not('id_producto', 'is', null);
    if (refErr) throw refErr;
    const distinct = new Set((referenced || []).map(r => r.id_producto));
    console.log('Distinct product IDs in movimientos:', distinct.size);

      // Fetch full products and movements for computing dashboard datasets
      const { data: products } = await supabase.from('productos').select('*').order('nombre', { ascending: true });
      const { data: movements } = await supabase.from('movimientos_inventario').select('*').order('fecha', { ascending: false });

    // Inspect categorias table
    const { data: categoriasRows } = await supabase.from('categorias').select('*').limit(10);
    console.log('categorias sample:', categoriasRows);

    // Build categoryId -> name mapping and compute categoriesData similar to dashboard
    const categoryIdToName = {};
    (categoriasRows || []).forEach(c => { categoryIdToName[String(c.id_categoria)] = c.nombre; });
    const categoriesSet = Array.from(new Set((products || []).map(p => categoryIdToName[String(p.id_categoria)] || p.id_categoria || 'Sin categoría')));
    const categoriesData = categoriesSet.map(category => {
      const categoryProducts = (products || []).filter(p => (categoryIdToName[String(p.id_categoria)] || p.id_categoria || 'Sin categoría') === category);
      const cantidad = categoryProducts.length;
      const valor = categoryProducts.reduce((sum, p) => sum + (Number(p.stock_actual || p.stock || 0) * Number(p.precio || 0)), 0);
      return { name: category, cantidad, valor };
    });
      console.log('categoriesData sample (first 5):', categoriesData.slice(0,5));

      // Compute last7Days movementsByDay
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date;
      });
      const movementsByDay = last7Days.map(date => {
        const dayMovements = (movements || []).filter(m => {
          try {
            const d = m.fecha ? new Date(m.fecha) : (m.created_at ? new Date(m.created_at) : null);
            return d && d.toDateString() === date.toDateString();
          } catch (e) { return false; }
        });
        const entradas = dayMovements.filter(m => (String(m.tipo || '').toLowerCase().includes('entrada'))).length;
        const salidas = dayMovements.filter(m => (String(m.tipo || '').toLowerCase().includes('salida'))).length;
        return { dia: date.toLocaleDateString('es', { weekday: 'short' }), entradas, salidas };
      });
      console.log('movementsByDay:', movementsByDay);

      // Compute rotationData per category
    // Dump some sample salida movimientos with id_producto to inspect fields
    const { data: salidaSamples } = await supabase.from('movimientos_inventario').select('*').ilike('tipo', '%salida%').not('id_producto','is',null).limit(5);
    console.log('salida sample rows (with id_producto):', salidaSamples);

  const rotationData = categoriesSet.map(category => {
    const categoryProducts = (products || []).filter(p => (categoryIdToName[String(p.id_categoria)] || p.id_categoria || 'Sin categoría') === category);
        const totalStock = categoryProducts.reduce((s, p) => s + Number(p.stock_actual || p.stock || 0), 0);
        const productIdsInCategory = new Set(categoryProducts.map(p => String(p.id_producto)));
        const totalSold = (movements || []).filter(m => String(m.tipo || '').toLowerCase().includes('salida') && productIdsInCategory.has(String(m.id_producto))).reduce((s, m) => s + Number(m.cantidad || m.quantity || 0), 0);
        return { name: category, rotacion: totalStock > 0 ? Math.round((totalSold / totalStock) * 100) : 0 };
      });
      console.log('rotationData sample (first 10):', rotationData.slice(0,10));

      // Top products by sold quantity
      const productSales = new Map();
      (movements || []).filter(m => String(m.tipo || '').toLowerCase().includes('salida')).forEach(m => {
        const qty = Number(m.cantidad || m.quantity || 0);
        const pid = m.id_producto || m.productos?.id_producto || null;
        const key = pid ? String(pid) : String(m.nombre_producto || m.productos?.nombre || 'sin-nombre');
        productSales.set(key, (productSales.get(key) || 0) + qty);
      });
      const topProducts = Array.from(productSales.entries()).sort((a,b) => b[1]-a[1]).slice(0,10).map(([k,q]) => ({ key: k, quantity: q }));
      console.log('Top products sample:', topProducts.slice(0,10));
    console.log('Done.');
  } catch (err) {
    console.error('Error while validating DB:', err.message || err);
    process.exit(1);
  }
})();