-- Agregar columna orden a tabla objetivos
ALTER TABLE objetivos ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;

-- Crear índice para orden
CREATE INDEX IF NOT EXISTS idx_objetivos_orden ON objetivos(orden);
