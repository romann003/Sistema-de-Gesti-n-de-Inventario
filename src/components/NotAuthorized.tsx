import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const NotAuthorized: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const requestAccess = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { createAuditLog } = await import('../lib/api');
      const descBase = `Solicitud de acceso a ${window.location.pathname} por ${user?.fullName || user?.email || 'usuario'}`;
      const desc = message && message.trim() ? `${descBase} — Mensaje: ${message.trim()}` : descBase;
      await createAuditLog({ id_usuario: user?.id, accion: 'access_request', entidad: 'usuarios', descripcion: desc });
      toast.success('Solicitud enviada. Un administrador la revisará.');
      setMessage('');
    } catch (err: any) {
      console.error('Error creating access request audit log', err);
      toast.error('No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            No autorizado
          </CardTitle>
          <CardDescription>No tienes permisos para acceder a esta sección.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">Tu cuenta no tiene el rol requerido para ver esta página.</p>
            <div className="space-y-3">
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensaje (opcional) — explica por qué necesitas acceso" className="w-full rounded-md border p-2 text-sm" rows={3} />
              <div className="flex gap-2">
                <Button onClick={() => navigate(-1)} variant="outline">Volver</Button>
                <Button onClick={() => navigate('/')} className="bg-blue-600 text-white">Ir al inicio</Button>
                <Button onClick={requestAccess} disabled={loading} className="bg-yellow-500 text-white">
                  {loading ? 'Enviando...' : 'Solicitar acceso'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
