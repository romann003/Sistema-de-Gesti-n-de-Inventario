-- Crear tabla de auditoría si no existe
CREATE TABLE IF NOT EXISTS auditoria (
  id_auditoria UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID REFERENCES usuarios(id),
  accion VARCHAR(50) NOT NULL,
  entidad VARCHAR(100) NOT NULL,
  entidad_id VARCHAR(255),
  descripcion TEXT NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(id_usuario);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad, entidad_id);

-- Comentarios para documentación
COMMENT ON TABLE auditoria IS 'Registro de auditoría de todas las operaciones del sistema';
COMMENT ON COLUMN auditoria.accion IS 'Tipo de acción: create, edit, delete, sale, movement';
COMMENT ON COLUMN auditoria.entidad IS 'Tipo de entidad afectada: product, category, user, supplier, customer, inventory';
COMMENT ON COLUMN auditoria.descripcion IS 'Descripción detallada de la acción realizada';
