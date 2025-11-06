import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import {
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  Users,
  ShoppingCart,
  BarChart3,
} from 'lucide-react';
import { Product, InventoryMovement, QualityMetric, Sale } from '../types';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface EnhancedDashboardProps {
  products: Product[];
  movements: InventoryMovement[];
  qualityMetrics: QualityMetric[];
  sales: Sale[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function EnhancedDashboard({
  products,
  movements,
  qualityMetrics,
  sales,
}: EnhancedDashboardProps) {
  const lowStockProducts = products.filter((p) => p.currentStock <= p.minStock);
  const totalValue = products.reduce((sum, p) => sum + p.currentStock * p.unitPrice, 0);
  const todayMovements = movements.filter(
    (m) => m.date.toDateString() === new Date().toDateString()
  );
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);

  // Datos para gráfico de categorías
  const categoriesData = Array.from(new Set(products.map((p) => p.category))).map(
    (category) => {
      const categoryProducts = products.filter((p) => p.category === category);
      return {
        name: category,
        cantidad: categoryProducts.length,
        valor: categoryProducts.reduce((sum, p) => sum + p.currentStock * p.unitPrice, 0),
      };
    }
  );

  // Productos más vendidos
  const productSales = new Map<string, number>();
  movements
    .filter((m) => m.type === 'salida')
    .forEach((m) => {
      productSales.set(m.productName, (productSales.get(m.productName) || 0) + m.quantity);
    });

  const topProducts = Array.from(productSales.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, quantity]) => ({ name, quantity }));

  // Rotación de inventario por categoría
  const rotationData = Array.from(new Set(products.map((p) => p.category))).map(
    (category) => {
      const categoryProducts = products.filter((p) => p.category === category);
      const totalStock = categoryProducts.reduce((sum, p) => sum + p.currentStock, 0);
      const totalSold = movements
        .filter((m) => m.type === 'salida' && categoryProducts.some((p) => p.id === m.productId))
        .reduce((sum, m) => sum + m.quantity, 0);
      
      return {
        name: category,
        rotacion: totalStock > 0 ? Math.round((totalSold / totalStock) * 100) : 0,
      };
    }
  );

  // Movimientos por día (últimos 7 días)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  const movementsByDay = last7Days.map((date) => {
    const dayMovements = movements.filter(
      (m) => m.date.toDateString() === date.toDateString()
    );
    const entradas = dayMovements.filter((m) => m.type === 'entrada').length;
    const salidas = dayMovements.filter((m) => m.type === 'salida').length;

    return {
      dia: date.toLocaleDateString('es', { weekday: 'short' }),
      entradas,
      salidas,
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-50';
      case 'good':
        return 'text-blue-600 bg-blue-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Dashboard Interactivo</h1>
        <p className="text-gray-600">
          Visualización en tiempo real de estadísticas y KPIs del inventario
        </p>
      </div>

      {/* Alertas de Stock Bajo */}
      {lowStockProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Alert className="rounded-xl border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-900">
              ⚠️ Alerta de Stock Bajo
            </AlertTitle>
            <AlertDescription className="text-orange-800">
              {lowStockProducts.length} producto(s) requieren reposición urgente
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Total Productos',
            value: products.length,
            subtitle: 'En el sistema',
            icon: Package,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
          },
          {
            title: 'Valor Total',
            value: `$${totalValue.toLocaleString()}`,
            subtitle: 'Inventario actual',
            icon: DollarSign,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
          },
          {
            title: 'Stock Bajo',
            value: lowStockProducts.length,
            subtitle: 'Requieren atención',
            icon: AlertTriangle,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
          },
          {
            title: 'Ventas Totales',
            value: `$${totalSales.toLocaleString()}`,
            subtitle: 'Acumulado',
            icon: ShoppingCart,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
          },
        ].map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={index}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">{kpi.title}</p>
                    <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                      <Icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                  </div>
                  <p className="text-3xl mb-1">{kpi.value}</p>
                  <p className="text-xs text-gray-500">{kpi.subtitle}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Gráficos Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos por Categoría */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Inventario por Categoría
              </CardTitle>
              <CardDescription>Distribución de productos y valor</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#3b82f6" name="Productos" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Productos Más Vendidos */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Top 5 Productos Más Vendidos
              </CardTitle>
              <CardDescription>Productos con mayor salida</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topProducts}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name.substring(0, 15)}... ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="quantity"
                  >
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Movimientos Últimos 7 Días */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Movimientos (Últimos 7 Días)
              </CardTitle>
              <CardDescription>Tendencia de entradas y salidas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={movementsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="entradas"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Entradas"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="salidas"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Salidas"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rotación de Inventario */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                Rotación de Inventario
              </CardTitle>
              <CardDescription>Porcentaje de rotación por categoría</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rotationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="rotacion" fill="#f59e0b" name="Rotación %" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Productos con Stock Bajo */}
      {lowStockProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Alertas de Reposición
              </CardTitle>
              <CardDescription>
                Productos que han alcanzado el stock mínimo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lowStockProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-4 border rounded-lg bg-gradient-to-br from-orange-50 to-white border-orange-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm mb-1">{product.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {product.sku}
                        </Badge>
                      </div>
                      <Badge variant="destructive">¡Urgente!</Badge>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Stock: {product.currentStock}</span>
                        <span>Mín: {product.minStock}</span>
                      </div>
                      <Progress
                        value={(product.currentStock / product.minStock) * 100}
                        className="h-2"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Métricas de Calidad (SQA) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
      >
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Métricas de Calidad del Sistema (SQA)
            </CardTitle>
            <CardDescription>
              Indicadores de rendimiento, fiabilidad y usabilidad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['Rendimiento', 'Fiabilidad', 'Usabilidad'].map((category, catIndex) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    {catIndex === 0 && <Activity className="h-4 w-4 text-blue-600" />}
                    {catIndex === 1 && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {catIndex === 2 && <Users className="h-4 w-4 text-purple-600" />}
                    <h3 className="text-sm">{category}</h3>
                  </div>
                  <div className="space-y-3">
                    {qualityMetrics
                      .filter((m) => m.category === category)
                      .map((metric, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: catIndex * 0.1 + idx * 0.05 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-700">{metric.metric}</span>
                            <Badge className={getStatusColor(metric.status)} variant="outline">
                              {metric.value} {metric.unit}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={Math.min((metric.value / metric.target) * 100, 100)}
                              className="h-1.5"
                            />
                            <span className="text-xs text-gray-500 min-w-fit">
                              {metric.target} {metric.unit}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
