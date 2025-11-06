import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { createClient } from '../utils/supabase/client';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validación de campos vacíos
    if (!email.trim() || !password.trim()) {
      setError('Por favor, completa todos los campos');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      
      // Autenticación directa con la tabla usuarios
      const { data: usuarios, error: queryError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('correo', email.trim().toLowerCase())
        .eq('activo', true)
        .single();

      if (queryError) {
        console.error('Query error:', queryError);
        
        if (queryError.code === 'PGRST116') {
          setError('Usuario no encontrado. Verifica tu correo electrónico.');
        } else if (queryError.message.includes('Failed to fetch')) {
          setError('Error de conexión. Verifica tu conexión a internet y la configuración de Supabase.');
        } else {
          setError('Error al buscar usuario. Contacta al administrador.');
        }
        setIsLoading(false);
        return;
      }

      if (!usuarios) {
        setError('Usuario no encontrado o inactivo.');
        setIsLoading(false);
        return;
      }

  // Verificar contraseña con hash
  const { verifyPassword } = await import('../lib/api');
  const usuariosAny: any = usuarios;
  const isPasswordValid = await verifyPassword(password, usuariosAny.password);
      
      if (!isPasswordValid) {
        // Registrar intento de login fallido (best-effort)
        try {
          const { createAuditLog } = await import('../lib/api');
          await createAuditLog({
            accion: 'login_failed',
            entidad: 'auth',
            descripcion: `Intento de login fallido para ${email}`,
          });
        } catch (e) {
          console.warn('LoginPage: failed to create audit log for failed login', e);
        }

        setError('Contraseña incorrecta. Por favor, intenta de nuevo.');
        setIsLoading(false);
        return;
      }

      // Crear objeto de usuario
      const user: User = {
        id: usuariosAny.id,
        username: usuariosAny.correo.split('@')[0],
        password: '', // No almacenar contraseña
        role: usuariosAny.rol as 'Administrador' | 'Empleado',
        fullName: usuariosAny.nombre,
        email: usuariosAny.correo,
        createdAt: new Date(usuariosAny.created_at),
      };

      // Guardar usuario en localStorage para persistencia
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      // Crear registro de auditoría: login exitoso (best-effort)
      try {
        const { createAuditLog } = await import('../lib/api');
        await createAuditLog({
          id_usuario: user.id,
          accion: 'login',
          entidad: 'auth',
          descripcion: `Login exitoso para ${user.email}`,
        });
      } catch (e) {
        console.warn('LoginPage: failed to create audit log for login', e);
      }

      console.log('✅ Login exitoso:', user.fullName, `(${user.role})`);
      onLogin(user);
      
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.message?.includes('Failed to fetch')) {
        setError('Error de conexión con Supabase. Verifica que la URL y las credenciales sean correctas.');
      } else {
        setError('Error inesperado al iniciar sesión. Por favor, intenta de nuevo.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <Card className="w-full max-w-md rounded-xl shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-blue-100 rounded-full">
              <ShieldCheck className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Sistema de Gestión de Inventario</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg"
                disabled={isLoading}
              />
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                  {(error.includes('Usuario no encontrado') || error.includes('tabla')) && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="font-semibold mb-2">💡 Solución Rápida:</p>
                      <ol className="text-xs space-y-1 list-decimal list-inside">
                        <li>Abre el <strong>SQL Editor</strong> en Supabase</li>
                        <li>Ejecuta el archivo <code className="bg-red-100 px-1 rounded">crear-tabla-usuarios.sql</code></li>
                        <li>Los usuarios de prueba se crearán automáticamente</li>
                      </ol>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg space-y-3">
            <div>
              <p className="text-sm text-gray-700 mb-2">👤 Usuarios de Prueba:</p>
              <div className="bg-white rounded p-3 text-xs space-y-2">
                <div className="border-b pb-2">
                  <p className="font-semibold text-blue-700">👨‍💼 Administrador:</p>
                  <p className="text-gray-600">Correo: <code className="bg-gray-100 px-1 rounded">admin@inventario.com</code></p>
                  <p className="text-gray-600">Contraseña: <code className="bg-gray-100 px-1 rounded">admin123</code></p>
                </div>
                <div>
                  <p className="font-semibold text-green-700">👤 Empleado:</p>
                  <p className="text-gray-600">Correo: <code className="bg-gray-100 px-1 rounded">empleado@inventario.com</code></p>
                  <p className="text-gray-600">Contraseña: <code className="bg-gray-100 px-1 rounded">empleado123</code></p>
                </div>
              </div>
            </div>
            <details className="mt-2">
              <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                🔧 Información técnica
              </summary>
              <div className="mt-2 p-2 bg-white rounded text-xs space-y-1">
                <p><strong>Tabla:</strong> usuarios (autenticación independiente)</p>
                <p><strong>Script:</strong> crear-tabla-usuarios.sql</p>
                <p className="text-gray-500 mt-2">
                  Si necesitas crear más usuarios:
                </p>
                <ol className="list-decimal list-inside text-gray-600 ml-2">
                  <li>Abre SQL Editor en Supabase</li>
                  <li>Ejecuta: INSERT INTO usuarios...</li>
                  <li>O usa la interfaz de gestión de usuarios</li>
                </ol>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
