import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import {
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Activity,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Product, InventoryMovement, QualityMetric } from '../types';
import KpiRow from './dashboard/KpiRow';
import LowStockPanel from './dashboard/LowStockPanel';

interface DashboardProps {
  products: Product[];
  movements: InventoryMovement[];
  qualityMetrics: QualityMetric[];
}

export function Dashboard({ products, movements, qualityMetrics }: DashboardProps) {
  const lowStockProducts = products.filter((p) => p.currentStock <= p.minStock);
  const totalValue = products.reduce((sum, p) => sum + p.currentStock * p.unitPrice, 0);
  const todayMovements = movements.filter(
    (m) => m.date.toDateString() === new Date().toDateString()
  );

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

  const getProgressColor = (value: number, target: number) => {
    const percentage = (value / target) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-blue-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Panel de Control</h1>
        <p className="text-gray-600">
          Resumen general del sistema de gestión de inventario
        </p>
      </div>

      {/* Alertas de Stock Bajo */}
      {lowStockProducts.length > 0 && (
        <Alert className="rounded-xl border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900">
            Alerta de Stock Bajo
          </AlertTitle>
          <AlertDescription className="text-orange-800">
            {lowStockProducts.length} producto(s) con stock por debajo del mínimo.
            Revisa la sección de productos para más detalles.
          </AlertDescription>
        </Alert>
      )}

      {/* Estadísticas Principales (KPI Row) */}
      <KpiRow
        products={products}
        movements={movements}
        onCardClick={(key) => {
          // quick interaction: scroll to relevant section or open modal
          if (key === 'low_stock') {
            const el = document.querySelector('[data-low-stock]');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }}
      />

      {/* Productos con Stock Bajo (panel con acciones) */}
      <div data-low-stock>
        <LowStockPanel
          products={products}
          onView={(p) => {
            // open product quick view - simple fallback
            window.alert(`Ver producto: ${p.name} (SKU: ${p.sku})`);
          }}
          onCreateOrder={(p) => {
            // simulated action
            console.log('Crear pedido para', p.id);
          }}
          onNotify={(p) => {
            console.log('Notificar proveedor de', p.id);
          }}
        />
      </div>

      {/* Métricas de Calidad del Sistema */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Métricas de Calidad del Sistema (SQA)
          </CardTitle>
          <CardDescription>
            Indicadores de rendimiento, fiabilidad y usabilidad en tiempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Rendimiento */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm">Rendimiento</h3>
              </div>
              <div className="space-y-3">
                {qualityMetrics
                  .filter((m) => m.category === 'Rendimiento')
                  .map((metric, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{metric.metric}</span>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(metric.status)}>
                            {metric.value} {metric.unit}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(metric.value / metric.target) * 100}
                          className="h-2"
                        />
                        <span className="text-xs text-gray-500 min-w-fit">
                          Meta: {metric.target} {metric.unit}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Fiabilidad */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <h3 className="text-sm">Fiabilidad</h3>
              </div>
              <div className="space-y-3">
                {qualityMetrics
                  .filter((m) => m.category === 'Fiabilidad')
                  .map((metric, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{metric.metric}</span>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(metric.status)}>
                            {metric.value} {metric.unit}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min((metric.value / metric.target) * 100, 100)}
                          className="h-2"
                        />
                        <span className="text-xs text-gray-500 min-w-fit">
                          Meta: {metric.target} {metric.unit}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Usabilidad */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm">Usabilidad</h3>
              </div>
              <div className="space-y-3">
                {qualityMetrics
                  .filter((m) => m.category === 'Usabilidad')
                  .map((metric, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{metric.metric}</span>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(metric.status)}>
                            {metric.value} {metric.unit}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(metric.value / metric.target) * 100}
                          className="h-2"
                        />
                        <span className="text-xs text-gray-500 min-w-fit">
                          Meta: {metric.target} {metric.unit}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movimientos Recientes */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Movimientos Recientes</CardTitle>
          <CardDescription>Últimas transacciones de inventario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {movements.slice(0, 5).map((movement) => (
              <div
                key={movement.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm">{movement.productName}</p>
                    <Badge
                      variant={movement.type === 'entrada' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {movement.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{movement.reason}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    {movement.type === 'entrada' ? '+' : '-'}
                    {movement.quantity}
                  </p>
                  <p className="text-xs text-gray-500">
                    {movement.date.toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
