-- ============================================
-- CREAR TABLAS PARA SISTEMA DE TURNOS SI-3
-- Copia TODO este código y ejecútalo en Supabase SQL Editor
-- ============================================

-- 1. Tabla de configuración
CREATE TABLE IF NOT EXISTS configuracion (
    id BIGSERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de proveedores
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

-- 3. Tabla de turnos
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de historial de turnos
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
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Insertar configuración inicial
INSERT INTO configuracion (clave, valor, descripcion) 
VALUES ('contador_turnos', '0', 'Contador global de turnos')
ON CONFLICT (clave) DO NOTHING;

-- 6. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos(estado);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos(fecha_solicitud);
CREATE INDEX IF NOT EXISTS idx_turnos_numero ON turnos(numero);
CREATE INDEX IF NOT EXISTS idx_proveedores_nit ON proveedores(nit);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_turnos(fecha);

-- 7. Habilitar Realtime para la tabla de turnos
ALTER PUBLICATION supabase_realtime ADD TABLE turnos;

-- 8. Verificar que las tablas se crearon
SELECT 'Tablas creadas exitosamente' AS resultado;
