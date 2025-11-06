import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NoDataAccess: React.FC<{ resourceName?: string }> = ({ resourceName }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-yellow-600" />
            Acceso a datos denegado
          </CardTitle>
          <CardDescription>No tienes permisos para acceder a los datos solicitados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">No tienes permiso para ver {resourceName ? `${resourceName}` : 'estos datos'}.</p>
            <div className="flex gap-2">
              <Button onClick={() => navigate(-1)} variant="outline">Volver</Button>
              <Button onClick={() => navigate('/')} className="bg-blue-600 text-white">Ir al inicio</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
