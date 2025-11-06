import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Product } from '../../types';
import { toast } from 'sonner';

interface LowStockPanelProps {
  products: Product[];
  onCreateOrder?: (product: Product) => void;
  onView?: (product: Product) => void;
  onNotify?: (product: Product) => void;
}

export default function LowStockPanel({ products, onCreateOrder, onView, onNotify }: LowStockPanelProps) {
  const low = products.filter((p) => p.currentStock <= p.minStock);

  if (low.length === 0) return null;

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Productos con Stock Bajo</CardTitle>
        <CardDescription>Productos que han alcanzado o están por debajo del stock mínimo</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {low.map((product) => (
            <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50 border-orange-200">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm">{product.name}</p>
                  <Badge variant="outline" className="text-xs">{product.sku}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xs text-gray-600">Stock actual: {product.currentStock}</p>
                  <p className="text-xs text-gray-600">Mínimo: {product.minStock}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => { onView?.(product); toast('Abriendo producto...'); }}>Ver</Button>
                <Button size="sm" onClick={() => { onCreateOrder?.(product); toast.success('Pedido creado (simulado)'); }}>Crear pedido</Button>
                <Button size="sm" variant="outline" onClick={() => { onNotify?.(product); toast('Proveedor notificado (simulado)'); }}>Notificar</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
