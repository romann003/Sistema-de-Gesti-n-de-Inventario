import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { FileSearch } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-gray-600" />
            Página no encontrada
          </CardTitle>
          <CardDescription>El recurso que buscas no existe (404).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">La página solicitada no pudo encontrarse. Verifica la URL o regresa al inicio.</p>
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
