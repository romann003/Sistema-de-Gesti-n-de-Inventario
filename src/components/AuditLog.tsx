import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  Search,
  FileText,
  Edit,
  Trash2,
  ShoppingCart,
  Package,
  User,
  Building2,
  Users,
  Activity,
  FolderOpen,
} from 'lucide-react';
import { AuditLog as AuditLogType } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { motion } from 'motion/react';

interface AuditLogProps {
  auditLogs: AuditLogType[];
}

export function AuditLog({ auditLogs }: AuditLogProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLogType | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log?.entityName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log?.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log?.userName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = !actionFilter || log.action === actionFilter;
    const matchesEntity = !entityFilter || log.entity === entityFilter;
    const matchesUser = !userFilter || log.userName === userFilter;

    return matchesSearch && matchesAction && matchesEntity && matchesUser;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <FileText className="h-4 w-4" />;
      case 'edit':
        return <Edit className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      case 'sale':
        return <ShoppingCart className="h-4 w-4" />;
      case 'movement':
        return <Package className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'edit':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'delete':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'sale':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'movement':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: 'Crear',
      edit: 'Editar',
      delete: 'Eliminar',
      sale: 'Venta',
      movement: 'Movimiento',
    };
    return labels[action] || action;
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'product':
        return <Package className="h-4 w-4" />;
      case 'category':
        return <FolderOpen className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      case 'supplier':
        return <Building2 className="h-4 w-4" />;
      case 'customer':
        return <Users className="h-4 w-4" />;
      case 'inventory':
        return <Activity className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const uniqueUsers = Array.from(new Set(auditLogs.map((log) => log.userName)));

  // Estadísticas
  const stats = {
    total: auditLogs.length,
    today: auditLogs.filter(
      (log) => log.timestamp.toDateString() === new Date().toDateString()
    ).length,
    thisWeek: auditLogs.filter((log) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return log.timestamp >= weekAgo;
    }).length,
  };

  return (
    <>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Historial y Auditoría</h1>
        <p className="text-gray-600">
          Registro completo de todas las acciones realizadas en el sistema
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Eventos</p>
                  <p className="text-3xl mt-1">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Eventos Hoy</p>
                  <p className="text-3xl mt-1">{stats.today}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Esta Semana</p>
                  <p className="text-3xl mt-1">{stats.thisWeek}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
          <CardDescription>
            Filtra los eventos por acción, entidad o usuario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Buscar en eventos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Acción</Label>
              <Select value={actionFilter || 'all'} onValueChange={(value: string) => setActionFilter(value === 'all' ? '' : value)}>
                <SelectTrigger id="action" className="rounded-lg">
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="create">Crear</SelectItem>
                  <SelectItem value="edit">Editar</SelectItem>
                  <SelectItem value="delete">Eliminar</SelectItem>
                  <SelectItem value="sale">Venta</SelectItem>
                  <SelectItem value="movement">Movimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity">Entidad</Label>
              <Select value={entityFilter || 'all'} onValueChange={(value: string) => setEntityFilter(value === 'all' ? '' : value)}>
                <SelectTrigger id="entity" className="rounded-lg">
                  <SelectValue placeholder="Todas las entidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="product">Producto</SelectItem>
                  <SelectItem value="category">Categoría</SelectItem>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="supplier">Proveedor</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                  <SelectItem value="inventory">Inventario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user">Usuario</Label>
              <Select value={userFilter || 'all'} onValueChange={(value: string) => setUserFilter(value === 'all' ? '' : value)}>
                <SelectTrigger id="user" className="rounded-lg">
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user} value={user}>
                      {user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Registro de Actividad ({filteredLogs.length})</CardTitle>
          <CardDescription>
            Eventos ordenados cronológicamente (más recientes primero)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Activity className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>No se encontraron eventos</p>
                <p className="text-sm mt-2">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                  >
                    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg border ${getActionColor(log.action)}`}>
                            {getActionIcon(log.action)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {getActionLabel(log.action)}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                {getEntityIcon(log.entity)}
                                <span>{log.entity}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {log.userName}
                              </Badge>
                            </div>

                            <p className="text-sm mb-1">
                              <span className="text-gray-900">{log.entityName}</span>
                            </p>

                            <p className="text-xs text-gray-600 mb-2">{log.details}</p>

                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>
                                {log.timestamp.toLocaleDateString('es', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                              <span>•</span>
                              <span>
                                {log.timestamp.toLocaleTimeString('es', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedLog(log); setIsDetailOpen(true); }} className="rounded-lg">
                            Ver más detalles
                          </Button>
                        </div>
                      </div>
                    </div>

                    {index < filteredLogs.length - 1 && <Separator className="my-4" />}
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
      {/* Detail dialog for selected audit log */}
  <Dialog open={isDetailOpen} onOpenChange={(open: boolean) => { if (!open) setSelectedLog(null); setIsDetailOpen(open); }}>
        <DialogContent className="w-full sm:max-w-4xl overflow-y-auto max-w-2xl rounded-xl p-6">
          <DialogHeader>
            <DialogTitle>Detalle de Auditoría</DialogTitle>
            <DialogDescription>Información detallada del evento seleccionado</DialogDescription>
          </DialogHeader>

          {selectedLog ? (() => {
            const s = selectedLog!;
            return (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Acción</div>
                    <div className="font-semibold">{s.action}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Entidad</div>
                    <div className="font-semibold">{s.entity} {s.entityId ? `(#${String(s.entityId).slice(-8)})` : ''}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Usuario</div>
                    <div className="font-semibold">{s.userName || s.userId || 'Sistema'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Fecha</div>
                    <div className="font-semibold">{s.timestamp.toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Descripción</div>
                  <div className="mt-1 p-4 bg-gray-50 rounded text-sm whitespace-pre-wrap">{s.details}</div>
                </div>

                {s.before && (
                  <div>
                    <div className="text-xs text-gray-500">Valores anteriores</div>
                    <pre className="mt-1 p-3 bg-white border rounded text-xs overflow-auto max-h-48">{JSON.stringify(s.before, null, 2)}</pre>
                  </div>
                )}

                {s.after && (
                  <div>
                    <div className="text-xs text-gray-500">Valores nuevos</div>
                    <pre className="mt-1 p-3 bg-white border rounded text-xs overflow-auto max-h-48">{JSON.stringify(s.after, null, 2)}</pre>
                  </div>
                )}

                <div>
                  <div className="text-xs text-gray-500">JSON raw</div>
                  <pre className="mt-1 p-3 bg-black text-white rounded text-xs overflow-auto max-h-48">{JSON.stringify(s, null, 2)}</pre>
                </div>
              </div>
            );
          })() : (
            <p>No hay registro seleccionado</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
