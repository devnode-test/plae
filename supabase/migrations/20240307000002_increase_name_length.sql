-- Aumentar longitud de campos nombre en todas las tablas principales
ALTER TABLE ejes ALTER COLUMN nombre TYPE TEXT;
ALTER TABLE focos ALTER COLUMN nombre TYPE TEXT;
ALTER TABLE objetivos ALTER COLUMN nombre TYPE TEXT;
ALTER TABLE indicadores ALTER COLUMN nombre TYPE TEXT;
