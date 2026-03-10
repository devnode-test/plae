-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear tabla usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(20) DEFAULT 'responsable' CHECK (rol IN ('admin', 'responsable')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- Crear tabla ejes
CREATE TABLE IF NOT EXISTS ejes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    orden INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice ejes
CREATE INDEX IF NOT EXISTS idx_ejes_orden ON ejes(orden);

-- Crear tabla focos
CREATE TABLE IF NOT EXISTS focos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eje_id UUID REFERENCES ejes(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    orden INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices focos
CREATE INDEX IF NOT EXISTS idx_focos_eje_id ON focos(eje_id);
CREATE INDEX IF NOT EXISTS idx_focos_orden ON focos(orden);

-- Crear tabla objetivos
CREATE TABLE IF NOT EXISTS objetivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foco_id UUID REFERENCES focos(id) ON DELETE CASCADE,
    responsable_id UUID REFERENCES usuarios(id),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    año_inicio INTEGER DEFAULT 2026,
    año_fin INTEGER DEFAULT 2030,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices objetivos
CREATE INDEX IF NOT EXISTS idx_objetivos_foco_id ON objetivos(foco_id);
CREATE INDEX IF NOT EXISTS idx_objetivos_responsable_id ON objetivos(responsable_id);

-- Crear tabla indicadores
CREATE TABLE IF NOT EXISTS indicadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objetivo_id UUID REFERENCES objetivos(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    tipo_medida VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice indicadores
CREATE INDEX IF NOT EXISTS idx_indicadores_objetivo_id ON indicadores(objetivo_id);

-- Crear tabla metas_anuales
CREATE TABLE IF NOT EXISTS metas_anuales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicador_id UUID REFERENCES indicadores(id) ON DELETE CASCADE,
    año INTEGER NOT NULL CHECK (año >= 2026 AND año <= 2030),
    valor_meta DECIMAL(10,2),
    unidad_medida VARCHAR(50),
    valor_real DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices metas_anuales
CREATE INDEX IF NOT EXISTS idx_metas_anuales_indicador_id ON metas_anuales(indicador_id);
CREATE INDEX IF NOT EXISTS idx_metas_anuales_año ON metas_anuales(año);

-- Crear tabla acciones
CREATE TABLE IF NOT EXISTS acciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meta_anual_id UUID REFERENCES metas_anuales(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    fecha_inicio DATE,
    fecha_fin DATE,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices acciones
CREATE INDEX IF NOT EXISTS idx_acciones_meta_anual_id ON acciones(meta_anual_id);
CREATE INDEX IF NOT EXISTS idx_acciones_estado ON acciones(estado);

-- Crear tabla evidencias
CREATE TABLE IF NOT EXISTS evidencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accion_id UUID REFERENCES acciones(id) ON DELETE CASCADE,
    tipo_archivo VARCHAR(50) NOT NULL CHECK (tipo_archivo IN ('pdf', 'excel', 'word', 'jpg', 'png')),
    nombre_archivo VARCHAR(255) NOT NULL,
    url_archivo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices evidencias
CREATE INDEX IF NOT EXISTS idx_evidencias_accion_id ON evidencias(accion_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_tipo_archivo ON evidencias(tipo_archivo);

-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejes ENABLE ROW LEVEL SECURITY;
ALTER TABLE focos ENABLE ROW LEVEL SECURITY;
ALTER TABLE objetivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_anuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE acciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidencias ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de lectura para usuarios anónimos (para desarrollo inicial, luego restringir)
CREATE POLICY "Enable read access for all users" ON ejes FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON focos FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON objetivos FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON indicadores FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON metas_anuales FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON acciones FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON evidencias FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON usuarios FOR SELECT USING (true);

-- Políticas de escritura para authenticated (simplificado para MVP)
CREATE POLICY "Enable insert for authenticated users only" ON ejes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON ejes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON ejes FOR DELETE TO authenticated USING (true);

-- Repetir para otras tablas si es necesario, por ahora dejamos lectura publica y escritura autenticada general
-- En producción esto debe ser mucho más estricto basado en roles.
