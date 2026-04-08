-- ============================================
-- ESQUEMA DE BASE DE DATOS PARA SISTEMA DE TURNOS SI-3
-- Ejecutar este SQL en el SQL Editor de Supabase
-- ============================================

-- Tabla de configuración
CREATE TABLE IF NOT EXISTS configuracion (
    id BIGSERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id BIGSERIAL PRIMARY KEY,
    nombre_empresa VARCHAR(255) NOT NULL,
    nit VARCHAR(20) UNIQUE NOT NULL,
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    servicio VARCHAR(50),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de turnos
CREATE TABLE IF NOT EXISTS turnos (
    id BIGSERIAL PRIMARY KEY,
    numero VARCHAR(10) UNIQUE NOT NULL,
    nombre_empresa VARCHAR(255) NOT NULL,
    nit VARCHAR(20) NOT NULL,
    motivo TEXT,
    hora_solicitud TIME NOT NULL,
    fecha_solicitud TIMESTAMP WITH TIME ZONE NOT NULL,
    hora_llamada TIME,
    estado VARCHAR(20) DEFAULT 'espera' CHECK (estado IN ('espera', 'atendiendo', 'completado', 'cancelado')),
    destino VARCHAR(50),
    fecha_cita TIMESTAMP WITH TIME ZONE,
    num_factura VARCHAR(50),
    bultos INTEGER,
    peso VARCHAR(50),
    responsable VARCHAR(255),
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    servicio VARCHAR(50),
    autorizado_salida BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de historial de turnos
CREATE TABLE IF NOT EXISTS historial_turnos (
    id BIGSERIAL PRIMARY KEY,
    numero VARCHAR(10) NOT NULL,
    nombre_empresa VARCHAR(255) NOT NULL,
    nit VARCHAR(20) NOT NULL,
    motivo TEXT,
    hora_solicitud TIME NOT NULL,
    hora_llamada TIME,
    hora_finalizacion TIME,
    estado VARCHAR(20) DEFAULT 'completado',
    destino VARCHAR(50),
    fecha_cita TIMESTAMP WITH TIME ZONE,
    num_factura VARCHAR(50),
    bultos INTEGER,
    peso VARCHAR(50),
    responsable VARCHAR(255),
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    servicio VARCHAR(50),
    autorizado_salida BOOLEAN DEFAULT false,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos(estado);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos(fecha_solicitud);
CREATE INDEX IF NOT EXISTS idx_turnos_numero ON turnos(numero);
CREATE INDEX IF NOT EXISTS idx_proveedores_nit ON proveedores(nit);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_turnos(fecha);

-- Insertar configuración inicial
INSERT INTO configuracion (clave, valor, descripcion) 
VALUES ('contador_turnos', '0', 'Contador global de turnos')
ON CONFLICT (clave) DO NOTHING;

-- Habilitar Realtime para la tabla de turnos
ALTER PUBLICATION supabase_realtime ADD TABLE turnos;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_configuracion_updated_at 
    BEFORE UPDATE ON configuracion 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proveedores_updated_at 
    BEFORE UPDATE ON proveedores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_turnos_updated_at 
    BEFORE UPDATE ON turnos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_turnos ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura pública
CREATE POLICY "Permitir lectura pública en configuracion" 
    ON configuracion FOR SELECT USING (true);

CREATE POLICY "Permitir lectura pública en proveedores" 
    ON proveedores FOR SELECT USING (true);

CREATE POLICY "Permitir lectura pública en turnos" 
    ON turnos FOR SELECT USING (true);

CREATE POLICY "Permitir lectura pública en historial_turnos" 
    ON historial_turnos FOR SELECT USING (true);

-- Política para permitir inserción pública
CREATE POLICY "Permitir inserción pública en configuracion" 
    ON configuracion FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir inserción pública en proveedores" 
    ON proveedores FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir inserción pública en turnos" 
    ON turnos FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir inserción pública en historial_turnos" 
    ON historial_turnos FOR INSERT WITH CHECK (true);

-- Política para permitir actualización pública
CREATE POLICY "Permitir actualización pública en configuracion" 
    ON configuracion FOR UPDATE USING (true);

CREATE POLICY "Permitir actualización pública en proveedores" 
    ON proveedores FOR UPDATE USING (true);

CREATE POLICY "Permitir actualización pública en turnos" 
    ON turnos FOR UPDATE USING (true);

-- Política para permitir eliminación pública
CREATE POLICY "Permitir eliminación pública en configuracion" 
    ON configuracion FOR DELETE USING (true);

CREATE POLICY "Permitir eliminación pública en proveedores" 
    ON proveedores FOR DELETE USING (true);

CREATE POLICY "Permitir eliminación pública en turnos" 
    ON turnos FOR DELETE USING (true);

CREATE POLICY "Permitir eliminación pública en historial_turnos" 
    ON historial_turnos FOR DELETE USING (true);
