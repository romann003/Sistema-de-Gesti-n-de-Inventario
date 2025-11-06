import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { DollarSign, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { Product, InventoryMovement } from '../../types';

interface KpiRowProps {
  products: Product[];
  movements: InventoryMovement[];
  onCardClick?: (key: string) => void;
}

export default function KpiRow({ products, movements, onCardClick }: KpiRowProps) {
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('today');

  const now = Date.now();
  const periodStart = useMemo(() => {
    switch (period) {
      case '7d':
        return new Date(now - 1000 * 60 * 60 * 24 * 7);
      case '30d':
        return new Date(now - 1000 * 60 * 60 * 24 * 30);
      case 'today':
      default:
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }
  }, [period, now]);

  const totalValue = useMemo(
    () => products.reduce((sum, p) => sum + p.currentStock * p.unitPrice, 0),
    [products]
  );

  const lowStockCount = useMemo(
    () => products.filter((p) => p.currentStock <= p.minStock).length,
    [products]
  );

  const movementsInPeriod = useMemo(
    () => movements.filter((m) => new Date(m.date) >= periodStart),
    [movements, periodStart]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Resumen</h2>
          <div className="text-sm text-gray-500">Periodo:</div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="today">Hoy</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl cursor-pointer" onClick={() => onCardClick?.('total_products')}>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm">Total de Productos</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{products.length}</div>
            <p className="text-xs text-gray-600 mt-1">En el sistema</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl cursor-pointer" onClick={() => onCardClick?.('total_value')}>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-1">Inventario actual</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl cursor-pointer" onClick={() => onCardClick?.('low_stock')}>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{lowStockCount}</div>
            <p className="text-xs text-gray-600 mt-1">Requieren atención</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl cursor-pointer" onClick={() => onCardClick?.('movements')}>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm">Movimientos</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{movementsInPeriod.length}</div>
            <p className="text-xs text-gray-600 mt-1">Entradas y salidas ({period === 'today' ? 'Hoy' : period})</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
