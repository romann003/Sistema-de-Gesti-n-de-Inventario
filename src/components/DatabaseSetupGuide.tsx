import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Database, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';

interface DatabaseSetupGuideProps {
  onComplete: () => void;
}

export function DatabaseSetupGuide({ onComplete }: DatabaseSetupGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showReconnectButton, setShowReconnectButton] = useState(false);
  
  const supabaseUrl = `https://${projectId}.supabase.co`;
  const dashboardUrl = `https://supabase.com/dashboard/project/${projectId}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Configuración de Base de Datos</CardTitle>
              <CardDescription>
                Sigue estos pasos para configurar tu sistema de inventario
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error detectado:</strong> No se puede conectar a la base de datos.
              {projectId === 'zqdgbunpbzeoqkzcslkl' && (
                <div className="mt-3 p-3 bg-orange-50 rounded border border-orange-200">
                  <p className="text-sm mb-2">
                    ⚠️ <strong>Proyecto antiguo detectado:</strong> El sistema está apuntando a un proyecto que ya no existe.
                  </p>
                  <p className="text-sm text-orange-800">
                    Si eliminaste tu proyecto anterior y creaste uno nuevo (como "Sistema de Inventario"), 
                    necesitas <strong>PRIMERO reconectar</strong> tu nuevo proyecto de Supabase.
                  </p>
                </div>
              )}
              <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Proyecto actual conectado:</p>
                <p className="text-xs font-mono break-all">{supabaseUrl}</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Step 0 - Reconnect */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > 0 ? <CheckCircle className="w-5 h-5" /> : '0'}
              </div>
              <h3 className="font-semibold text-lg">¿Creaste un nuevo proyecto de Supabase?</h3>
            </div>
            <div className="ml-11 space-y-3">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <strong>¡IMPORTANTE!</strong> Si eliminaste tu base de datos anterior y creaste una nueva 
                  (por ejemplo: "Sistema de Inventario"), necesitas reconectar el proyecto.
                </AlertDescription>
              </Alert>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Opción A:</strong> Si tienes un proyecto nuevo, haz click en "Reconectar Supabase"</p>
                <p><strong>Opción B:</strong> Si el proyecto actual es correcto, continúa al siguiente paso</p>
              </div>
              {currentStep === 0 && (
                <div className="flex gap-3 mt-3">
                  <Button 
                    onClick={() => setShowReconnectButton(true)}
                    variant="default"
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Reconectar Supabase (Proyecto Nuevo)
                  </Button>
                  <Button onClick={() => setCurrentStep(1)} variant="outline">
                    Continuar (Proyecto Correcto)
                  </Button>
                </div>
              )}
              {showReconnectButton && (
                <Alert className="mt-3 bg-blue-50 border-blue-200">
                  <AlertDescription>
                    <p className="mb-3">Para reconectar tu nuevo proyecto de Supabase:</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm mb-3">
                      <li>Busca el botón <strong>"Connect Supabase"</strong> en la esquina superior derecha</li>
                      <li>Haz click y sigue las instrucciones para conectar tu proyecto nuevo</li>
                      <li>Una vez conectado, <strong>recarga esta página</strong></li>
                      <li>Luego regresa aquí para ejecutar el script SQL</li>
                    </ol>
                    <p className="text-xs text-gray-600">
                      💡 Después de reconectar, el sistema apuntará a tu nuevo proyecto "Sistema de Inventario"
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Step 1 */}
          {currentStep >= 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
                </div>
                <h3 className="font-semibold text-lg">Abre el SQL Editor en Supabase</h3>
              </div>
              <div className="ml-11 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Ve a tu dashboard de Supabase: <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-xs"
                    onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Abrir Dashboard
                  </Button></li>
                  <li>Selecciona tu proyecto <strong>"Sistema de Inventario"</strong> (o el nombre que le hayas dado)</li>
                  <li>En el menú lateral izquierdo, selecciona <strong>SQL Editor</strong></li>
                  <li>Click en <strong>"New query"</strong></li>
                </ol>
                {currentStep === 1 && (
                  <Button onClick={() => setCurrentStep(2)} className="mt-3">
                    Continuar al Paso 2
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 2 */}
          {currentStep >= 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
                </div>
                <h3 className="font-semibold text-lg">Ejecuta el Script Principal</h3>
              </div>
              <div className="ml-11 space-y-3">
                <Alert>
                  <AlertDescription>
                    <strong>Importante:</strong> Abre el archivo <code className="bg-gray-100 px-2 py-1 rounded">database-setup.sql</code> en tu proyecto
                    y copia <strong>TODO</strong> su contenido.
                  </AlertDescription>
                </Alert>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Abre el archivo <code>database-setup.sql</code></li>
                  <li>Copia todo el contenido del archivo</li>
                  <li>Pégalo en el SQL Editor de Supabase</li>
                  <li>Click en <strong>"Run"</strong> o presiona <kbd>Ctrl+Enter</kbd></li>
                  <li>Espera a que termine la ejecución (verás el mensaje de éxito)</li>
                </ol>
                {currentStep === 2 && (
                  <Button onClick={() => setCurrentStep(3)} className="mt-3">
                    Script Ejecutado - Continuar
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep >= 3 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > 3 ? <CheckCircle className="w-5 h-5" /> : '3'}
                </div>
                <h3 className="font-semibold text-lg">Migrar Usuarios Existentes (Si aplica)</h3>
              </div>
              <div className="ml-11 space-y-3">
                <Alert>
                  <AlertDescription>
                    <strong>Solo si ya tienes usuarios:</strong> Si creaste usuarios en Supabase Auth antes de ejecutar el script,
                    necesitas migrarlos a la tabla perfiles.
                  </AlertDescription>
                </Alert>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Abre el archivo <code>migrar-usuarios-existentes.sql</code></li>
                  <li>Copia todo el contenido</li>
                  <li>Pégalo en el SQL Editor de Supabase</li>
                  <li>Click en <strong>"Run"</strong></li>
                  <li>Verifica que todos los usuarios tengan perfil</li>
                </ol>
                <p className="text-sm text-gray-600 mt-3">
                  Si <strong>NO</strong> tienes usuarios existentes, puedes omitir este paso.
                </p>
                {currentStep === 3 && (
                  <div className="flex gap-3 mt-3">
                    <Button onClick={() => setCurrentStep(4)}>
                      Migración Completada
                    </Button>
                    <Button variant="outline" onClick={() => setCurrentStep(4)}>
                      Saltar (No tengo usuarios)
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4 */}
          {currentStep >= 4 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-600 text-white">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg">¡Configuración Completa!</h3>
              </div>
              <div className="ml-11 space-y-3">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    La base de datos está lista. Ahora puedes:
                  </AlertDescription>
                </Alert>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Iniciar sesión con tus usuarios existentes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    O crear nuevos usuarios desde el archivo <code>crear-usuarios.html</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Gestionar productos, inventario y ventas
                  </li>
                </ul>
                <Button onClick={onComplete} className="mt-3 w-full" size="lg">
                  Ir a Inicio de Sesión
                </Button>
              </div>
            </div>
          )}

          {/* Help Links */}
          <div className="pt-6 border-t space-y-3">
            <h4 className="font-semibold text-sm text-gray-700">Documentación de Ayuda</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start" asChild>
                <a href="#" onClick={(e) => { e.preventDefault(); toast.info('Abre README.md en tu proyecto'); }}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  README.md
                </a>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <a href="#" onClick={(e) => { e.preventDefault(); toast.info('Abre INSTRUCCIONES.md en tu proyecto'); }}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  INSTRUCCIONES.md
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
