import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { CheckCircle2, XCircle, Loader2, Database, Users, Sparkles } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';

interface SetupStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
}

export function InitialSetup({ onComplete }: { onComplete: () => void }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<SetupStep[]>([
    { name: 'Verificar base de datos', status: 'pending', message: '' },
    { name: 'Crear usuario Administrador', status: 'pending', message: '' },
    { name: 'Crear usuario Empleado', status: 'pending', message: '' },
    { name: 'Finalizar configuración', status: 'pending', message: '' },
  ]);

  const updateStep = (index: number, status: SetupStep['status'], message: string) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, status, message } : step))
    );
  };

  const runSetup = async () => {
    setIsRunning(true);
    const supabase = createClient();

    try {
      // Paso 1: Verificar base de datos
      setCurrentStep(0);
      updateStep(0, 'running', 'Verificando conexión con Supabase...');
      
      // Primero verificar la conexión básica
      const { data: healthCheck, error: connectionError } = await supabase
        .from('categorias')
        .select('id_categoria')
        .limit(1);

      if (connectionError) {
        console.error('Database connection error:', connectionError);
        
        if (connectionError.message.includes('Failed to fetch')) {
          updateStep(0, 'error', 'Error de conexión: Verifica la URL de Supabase y tu conexión a internet');
          toast.error('Error de conexión', {
            description: 'No se puede conectar a Supabase. Verifica tu configuración.',
          });
        } else if (connectionError.code === '42P01') {
          updateStep(0, 'error', 'Tabla no encontrada: Ejecuta database-setup.sql en Supabase');
          toast.error('Base de datos no configurada', {
            description: 'Por favor ejecuta el script database-setup.sql primero',
          });
        } else {
          updateStep(0, 'error', `Error en BD: ${connectionError.message}`);
          toast.error('Error de base de datos', {
            description: connectionError.message,
          });
        }
        setIsRunning(false);
        return;
      }

      updateStep(0, 'success', 'Base de datos verificada correctamente ✓');
      await sleep(500);

      // Paso 2: Crear administrador
      setCurrentStep(1);
      updateStep(1, 'running', 'Creando usuario administrador...');

      const { data: adminData, error: adminError } = await supabase.auth.signUp({
        email: 'admin@inventario.com',
        password: 'Admin123!',
        options: {
          data: {
            nombre: 'Admin Principal',
            rol: 'Administrador',
          },
        },
      });

      if (adminError && !adminError.message.includes('already registered')) {
        updateStep(1, 'error', `Error: ${adminError.message}`);
        toast.error('Error al crear administrador', {
          description: adminError.message,
        });
        setIsRunning(false);
        return;
      }

      if (adminError && adminError.message.includes('already registered')) {
        updateStep(1, 'success', 'Usuario administrador ya existe');
      } else {
        updateStep(1, 'success', 'Administrador creado: admin@inventario.com');
        toast.success('Administrador creado', {
          description: 'Email: admin@inventario.com',
        });
      }

      await sleep(500);

      // Paso 3: Crear empleado
      setCurrentStep(2);
      updateStep(2, 'running', 'Creando usuario empleado...');

      const { data: empleadoData, error: empleadoError } = await supabase.auth.signUp({
        email: 'empleado@inventario.com',
        password: 'Empleado123!',
        options: {
          data: {
            nombre: 'Juan Empleado',
            rol: 'Empleado',
          },
        },
      });

      if (empleadoError && !empleadoError.message.includes('already registered')) {
        updateStep(2, 'error', `Error: ${empleadoError.message}`);
        toast.error('Error al crear empleado', {
          description: empleadoError.message,
        });
        setIsRunning(false);
        return;
      }

      if (empleadoError && empleadoError.message.includes('already registered')) {
        updateStep(2, 'success', 'Usuario empleado ya existe');
      } else {
        updateStep(2, 'success', 'Empleado creado: empleado@inventario.com');
        toast.success('Empleado creado', {
          description: 'Email: empleado@inventario.com',
        });
      }

      await sleep(500);

      // Paso 4: Finalizar
      setCurrentStep(3);
      updateStep(3, 'running', 'Finalizando configuración...');
      await sleep(1000);
      updateStep(3, 'success', '¡Configuración completada!');

      toast.success('¡Sistema configurado exitosamente!', {
        description: 'Ahora puedes iniciar sesión',
      });

      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error: any) {
      console.error('Error en setup:', error);
      toast.error('Error en la configuración', {
        description: error.message || 'Error desconocido',
      });
      setIsRunning(false);
    }
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Sparkles className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-3xl">Configuración Inicial</CardTitle>
          <CardDescription className="text-base">
            Sistema de Gestión de Inventario para PyME
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Información importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Antes de continuar
            </h4>
            <p className="text-sm text-blue-800 mb-2">
              Asegúrate de haber ejecutado el script <code className="bg-blue-100 px-2 py-1 rounded">database-setup.sql</code> en el SQL Editor de Supabase.
            </p>
            <a
              href="https://supabase.com/dashboard/project/zqdgbunpbzeoqkzcslkl/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Abrir SQL Editor →
            </a>
          </div>

          {/* Progress bar */}
          {isRunning && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-gray-600 text-center">
                {Math.round(progress)}% completado
              </p>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  step.status === 'running'
                    ? 'bg-blue-50 border border-blue-200'
                    : step.status === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : step.status === 'error'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {step.status === 'running' && (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  )}
                  {step.status === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  {step.status === 'error' && (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  {step.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{step.name}</p>
                  {step.message && (
                    <p className="text-sm text-gray-600 mt-1">{step.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action button */}
          <div className="pt-4">
            <Button
              onClick={runSetup}
              disabled={isRunning}
              className="w-full h-12 text-base"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Configurando sistema...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5 mr-2" />
                  Crear Usuarios de Prueba
                </>
              )}
            </Button>
          </div>

          {/* Credentials info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Credenciales que se crearán:
            </h4>
            <div className="space-y-3 text-sm">
              <div className="bg-white p-3 rounded border border-gray-200">
                <p className="font-medium text-gray-900">👨‍💼 Administrador</p>
                <p className="text-gray-600 mt-1">
                  Email: <code className="bg-gray-100 px-2 py-0.5 rounded">admin@inventario.com</code>
                </p>
                <p className="text-gray-600">
                  Contraseña: <code className="bg-gray-100 px-2 py-0.5 rounded">Admin123!</code>
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-gray-200">
                <p className="font-medium text-gray-900">👤 Empleado</p>
                <p className="text-gray-600 mt-1">
                  Email: <code className="bg-gray-100 px-2 py-0.5 rounded">empleado@inventario.com</code>
                </p>
                <p className="text-gray-600">
                  Contraseña: <code className="bg-gray-100 px-2 py-0.5 rounded">Empleado123!</code>
                </p>
              </div>
            </div>
          </div>

          {/* Skip button */}
          {!isRunning && (
            <Button
              variant="outline"
              onClick={onComplete}
              className="w-full"
            >
              Omitir (ya tengo usuarios)
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
