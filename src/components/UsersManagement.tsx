import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Plus, Edit, Trash2, Users as UsersIcon, ShieldAlert, Eye } from 'lucide-react';
import { User, UserRole } from '../types';
import { toast } from 'sonner';
import { createUser, updateUser, deleteUser as deleteUserAPI } from '../lib/api';

interface UsersManagementProps {
  users: User[];
  currentUser: User;
  onUsersChange: (users: User[]) => void;
}

export function UsersManagement({
  users,
  currentUser,
  onUsersChange,
}: UsersManagementProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailView, setIsDetailView] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: '' as UserRole | '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Verificar si el usuario actual es administrador
  if (currentUser.role !== 'Administrador') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl mb-2">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra los usuarios del sistema</p>
        </div>

        <Alert variant="destructive" className="rounded-xl">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            No tienes permisos para acceder a esta sección. Solo los
            administradores pueden gestionar usuarios.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) newErrors.username = 'El usuario es requerido';
    if (!editingUser && !formData.password.trim())
      newErrors.password = 'La contraseña es requerida';
    if (!formData.fullName.trim())
      newErrors.fullName = 'El nombre completo es requerido';
    if (!formData.email.trim()) newErrors.email = 'El email es requerido';
    if (!formData.email.includes('@'))
      newErrors.email = 'Email inválido';
    if (!formData.role) newErrors.role = 'Selecciona un rol';

    // Validar username único
    if (!editingUser || formData.username !== editingUser.username) {
      const existingUser = users.find((u) => u.username === formData.username);
      if (existingUser) {
        newErrors.username = 'Este nombre de usuario ya existe';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenSheet = (user?: User, viewOnly: boolean = false) => {
    if (viewOnly && user) {
      setSelectedUser(user);
      setIsDetailView(true);
      setEditingUser(null);
    } else if (user) {
      setEditingUser(user);
      setSelectedUser(null);
      setIsDetailView(false);
      setFormData({
        username: user.username,
        password: '',
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setSelectedUser(null);
      setIsDetailView(false);
      setFormData({
        username: '',
        password: '',
        fullName: '',
        email: '',
        role: '',
      });
    }
    setErrors({});
    setIsSheetOpen(true);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Por favor, corrige los errores en el formulario');
      return;
    }

    setIsLoading(true);

    try {
      const { hashPassword } = await import('../lib/api');
      
      if (editingUser) {
        // Update user
        const updateData: any = {
          correo: formData.email,
          nombre: formData.fullName,
          rol: formData.role as 'Administrador' | 'Empleado',
        };

        let passwordChanged = false;
        if (formData.password) {
          updateData.password = await hashPassword(formData.password);
          passwordChanged = true;
        }

        const updated = await updateUser(editingUser.id, updateData);
        
        // Update local state
        const updatedUser: User = {
          ...editingUser,
          username: formData.username,
          password: formData.password || editingUser.password,
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role as UserRole,
        };
        
        onUsersChange(users.map((u) => (u.id === editingUser.id ? updatedUser : u)));
        toast.success('Usuario actualizado correctamente');
        // Registrar cambio de contraseña si aplica (best-effort)
        if (passwordChanged) {
          try {
            const { createAuditLog } = await import('../lib/api');
            await createAuditLog({
              id_usuario: currentUser.id,
              accion: 'password_change',
              entidad: 'user',
              entidad_id: editingUser.id,
              descripcion: `Contraseña cambiada para usuario ${editingUser.username} por ${currentUser.username}`,
            });
          } catch (e) {
            console.warn('UsersManagement: failed to create audit log for password change', e);
          }
        }
      } else {
        // Create user
        const hashedPassword = await hashPassword(formData.password);
        const newUser = await createUser({
          correo: formData.email,
          password: hashedPassword,
          nombre: formData.fullName,
          rol: formData.role as 'Administrador' | 'Empleado',
        });

        const newUserAny: any = newUser;
        const userData: User = {
          id: newUserAny.id,
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role as UserRole,
          createdAt: new Date(newUserAny.created_at),
        };
        
        onUsersChange([...users, userData]);
        toast.success('Usuario creado correctamente');
      }

      setIsSheetOpen(false);
    } catch (error: any) {
      console.error('Error al guardar usuario:', error);
      toast.error(error.message || 'Error al guardar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteUser) {
      if (deleteUser.id === currentUser.id) {
        toast.error('No puedes eliminar tu propio usuario');
        setDeleteUser(null);
        return;
      }

      setIsLoading(true);

      try {
        await deleteUserAPI(deleteUser.id);
        onUsersChange(users.filter((u) => u.id !== deleteUser.id));
        toast.success('Usuario eliminado correctamente');
        setDeleteUser(null);
      } catch (error: any) {
        console.error('Error al eliminar usuario:', error);
        toast.error(error.message || 'Error al eliminar usuario');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Gestión de Usuarios</h1>
        <p className="text-gray-600">Administra los usuarios del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Card className="rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Usuarios</p>
                  <p className="text-3xl mt-1">{users.length}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle>Lista de Usuarios</CardTitle>
              <CardDescription>
                Total de usuarios registrados: {users.length}
              </CardDescription>
            </div>
            <Button
              onClick={() => handleOpenSheet()}
              className="rounded-lg bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                      <UsersIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">No hay usuarios registrados</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Haz clic en "Nuevo Usuario" para crear el primero
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.username}
                          {user.id === currentUser.id && (
                            <Badge variant="outline" className="text-xs">
                              Tú
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === 'Administrador' ? 'default' : 'secondary'
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenSheet(user, true)}
                            className="rounded-lg"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenSheet(user)}
                            className="rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteUser(user)}
                            disabled={user.id === currentUser.id}
                            className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog centered para Ver/Crear/Editar usuarios */}
      <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DialogContent className="w-full max-w-3xl rounded-xl p-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isDetailView ? 'Detalles del Usuario' : editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
            <DialogDescription>
              {isDetailView
                ? 'Información completa del usuario'
                : editingUser
                ? 'Modifica los datos del usuario'
                : 'Completa la información del nuevo usuario'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {isDetailView && selectedUser ? (
              // Vista de detalles (solo lectura)
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      {selectedUser.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg">{selectedUser.fullName}</h3>
                      <p className="text-sm text-gray-600">@{selectedUser.username}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-600">Email</Label>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      {selectedUser.email}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-600">Rol</Label>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <Badge
                        variant={
                          selectedUser.role === 'Administrador' ? 'default' : 'secondary'
                        }
                      >
                        {selectedUser.role}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-600">Fecha de Creación</Label>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      {selectedUser.createdAt.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-600">Usuario</Label>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      {selectedUser.username}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      setIsSheetOpen(false);
                      setTimeout(() => handleOpenSheet(selectedUser), 300);
                    }}
                    className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Usuario
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsSheetOpen(false)}
                    className="flex-1 rounded-lg"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            ) : (
              // Formulario de edición/creación
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="rounded-lg"
                    placeholder="nombre_usuario"
                  />
                  {errors.username && (
                    <p className="text-xs text-red-600">{errors.username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    Contraseña {editingUser && '(dejar vacío para no cambiar)'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="rounded-lg"
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="text-xs text-red-600">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="rounded-lg"
                    placeholder="Juan Pérez"
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-600">{errors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="rounded-lg"
                    placeholder="usuario@ejemplo.com"
                  />
                  {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: string) =>
                      setFormData({ ...formData, role: value as UserRole })
                    }
                  >
                    <SelectTrigger id="role" className="rounded-lg">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Administrador">Administrador</SelectItem>
                      <SelectItem value="Empleado">Empleado</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && <p className="text-xs text-red-600">{errors.role}</p>}
                </div>
              </div>
            )}
          </div>

          {!isDetailView && (
            <DialogFooter className="flex-col sm:flex-row gap-2 px-4">
              <Button
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
                className="rounded-lg w-full sm:w-auto"
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                className="rounded-lg bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>{editingUser ? 'Actualizar' : 'Crear'}</>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmación de Eliminación */}
      <AlertDialog
        open={!!deleteUser}
        onOpenChange={() => setDeleteUser(null)}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario "{deleteUser?.username}"
              será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg" disabled={isLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-lg bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
