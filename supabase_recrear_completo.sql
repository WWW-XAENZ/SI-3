-- ============================================
-- SISTEMA DE TURNOS SI-3 - ESQUEMA COMPLETO PARA SUPABASE
-- Este script crea todas las tablas, índices, funciones, triggers y políticas
-- Ejecutar TODO este código en el SQL Editor de Supabase
-- ============================================

-- ============================================
-- 1. ELIMINAR TABLAS EXISTENTES (si existen) PARA RECREAR TODO DE CERO
-- ============================================
DROP TABLE IF EXISTS historial_turnos CASCADE;
DROP TABLE IF EXISTS turnos CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS configuracion CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================
-- 2. TABLAS
-- ============================================

-- Tabla de configuración del sistema
CREATE TABLE configuracion (
    id BIGSERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de proveedores/empresas
CREATE TABLE proveedores (
    id BIGSERIAL PRIMARY KEY,
    nombre_empresa VARCHAR(255) NOT NULL,
    nit VARCHAR(20) UNIQUE NOT NULL,
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(255),
    servicio VARCHAR(50),
    activo BOOLEAN DEFAULT true,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de turnos activos
CREATE TABLE turnos (
    id BIGSERIAL PRIMARY KEY,
    numero VARCHAR(10) UNIQUE NOT NULL,
    proveedor_id BIGINT REFERENCES proveedores(id) ON DELETE SET NULL,
    nombre_empresa VARCHAR(255) NOT NULL,
    nit VARCHAR(20) NOT NULL,
    motivo TEXT,
    hora_solicitud TIME NOT NULL,
    fecha_solicitud TIMESTAMP WITH TIME ZONE NOT NULL,
    hora_llamada TIME,
    hora_finalizacion TIME,
    estado VARCHAR(20) DEFAULT 'espera' CHECK (estado IN ('espera', 'atendiendo', 'completado', 'cancelado', 'citado')),
    prioridad INTEGER DEFAULT 0,
    notas TEXT,
    destino VARCHAR(50),
    fecha_cita TIMESTAMP WITH TIME ZONE,
    num_factura VARCHAR(50),
    tipo_vehiculo VARCHAR(50),
    bultos INTEGER,
    peso VARCHAR(50),
    responsable VARCHAR(255),
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    servicio VARCHAR(50),
    autorizado_salida BOOLEAN DEFAULT false,
    placa_vehiculo VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de historial de turnos (para reportes y análisis)
CREATE TABLE historial_turnos (
    id BIGSERIAL PRIMARY KEY,
    turno_id BIGINT,
    numero VARCHAR(10) NOT NULL,
    nombre_empresa VARCHAR(255) NOT NULL,
    nit VARCHAR(20) NOT NULL,
    motivo TEXT,
    hora_solicitud TIME NOT NULL,
    hora_llamada TIME,
    hora_finalizacion TIME,
    estado VARCHAR(20) DEFAULT 'completado' CHECK (estado IN ('completado', 'cancelado')),
    tiempo_espera_minutos INTEGER,
    tiempo_atencion_minutos INTEGER,
    destino VARCHAR(50),
    fecha_cita TIMESTAMP WITH TIME ZONE,
    num_factura VARCHAR(50),
    tipo_vehiculo VARCHAR(50),
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

-- Tabla de usuarios del sistema (opcional para futuro)
CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'operador' CHECK (rol IN ('admin', 'operador', 'visualizador')),
    activo BOOLEAN DEFAULT true,
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. DATOS INICIALES
-- ============================================

INSERT INTO configuracion (clave, valor, descripcion) VALUES
    ('contador_turnos', '0', 'Contador global de turnos emitidos'),
    ('turno_prefijo', 'T', 'Prefijo para los números de turno'),
    ('tiempo_maximo_espera', '30', 'Tiempo máximo de espera en minutos antes de alerta'),
    ('nombre_empresa', 'SI-3', 'Nombre de la empresa'),
    ('tiempo_atencion_promedio', '15', 'Tiempo promedio de atención en minutos')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO usuarios (email, nombre, rol) VALUES
    ('admin@sistema.com', 'Administrador', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 4. ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índices para turnos
CREATE INDEX idx_turnos_estado ON turnos(estado);
CREATE INDEX idx_turnos_fecha_solicitud ON turnos(fecha_solicitud);
CREATE INDEX idx_turnos_nit ON turnos(nit);
CREATE INDEX idx_turnos_proveedor_id ON turnos(proveedor_id);
CREATE INDEX idx_turnos_numero ON turnos(numero);
CREATE INDEX idx_turnos_destino ON turnos(destino);

-- Índices para historial_turnos
CREATE INDEX idx_historial_turnos_fecha ON historial_turnos(fecha);
CREATE INDEX idx_historial_turnos_nit ON historial_turnos(nit);
CREATE INDEX idx_historial_turnos_estado ON historial_turnos(estado);
CREATE INDEX idx_historial_turnos_numero ON historial_turnos(numero);

-- Índices para proveedores
CREATE INDEX idx_proveedores_nit ON proveedores(nit);
CREATE INDEX idx_proveedores_nombre ON proveedores(nombre_empresa);
CREATE INDEX idx_proveedores_activo ON proveedores(activo);
CREATE INDEX idx_proveedores_servicio ON proveedores(servicio);

-- Índices para usuarios
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);

-- ============================================
-- 5. FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. CONFIGURACIÓN DE REAL-TIME
-- ============================================

-- Habilitar Replica Identity FULL para tablas que se usarán en real-time
ALTER TABLE turnos REPLICA IDENTITY FULL;
ALTER TABLE historial_turnos REPLICA IDENTITY FULL;
ALTER TABLE proveedores REPLICA IDENTITY FULL;
ALTER TABLE configuracion REPLICA IDENTITY FULL;

-- Crear publicación para Real-time
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE turnos, historial_turnos, proveedores, configuracion;

-- ============================================
-- 7. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY)
-- ============================================

-- Habilitar RLS en las tablas
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas para turnos (permitir todas las operaciones)
CREATE POLICY "Turnos: permitir todo" ON turnos
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para historial_turnos
CREATE POLICY "Historial: permitir todo" ON historial_turnos
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para proveedores
CREATE POLICY "Proveedores: permitir todo" ON proveedores
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para configuracion
CREATE POLICY "Configuracion: permitir todo" ON configuracion
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para usuarios
CREATE POLICY "Usuarios: permitir todo" ON usuarios
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 8. COMENTARIOS EN LAS TABLAS
-- ============================================

COMMENT ON TABLE configuracion IS 'Tabla de configuración del sistema';
COMMENT ON TABLE proveedores IS 'Tabla de proveedores/empresas registradas';
COMMENT ON TABLE turnos IS 'Tabla de turnos activos en el sistema';
COMMENT ON TABLE historial_turnos IS 'Tabla de historial de turnos para reportes y análisis';
COMMENT ON TABLE usuarios IS 'Tabla de usuarios del sistema (futura implementación)';

COMMENT ON COLUMN turnos.estado IS 'Estados posibles: espera, atendiendo, completado, cancelado, citado';
COMMENT ON COLUMN turnos.prioridad IS 'Prioridad del turno: 0=normal, 1=alta, 2=urgente';
COMMENT ON COLUMN turnos.destino IS 'Destino del turno: SI ENSAMBLES, SI PLÁSTICOS, AMBOS';
COMMENT ON COLUMN turnos.fecha_cita IS 'Fecha y hora de la cita programada (cuando estado = citado)';
COMMENT ON COLUMN turnos.autorizado_salida IS 'Indica si el vehículo ya fue autorizado para salir';

-- ============================================
-- 9. VERIFICACIÓN FINAL
-- ============================================

SELECT '✅ Base de datos recreada exitosamente' AS mensaje;
SELECT 
    (SELECT COUNT(*) FROM configuracion) AS configuracion_rows,
    (SELECT COUNT(*) FROM proveedores) AS proveedores_rows,
    (SELECT COUNT(*) FROM turnos) AS turnos_rows,
    (SELECT COUNT(*) FROM historial_turnos) AS historial_rows,
    (SELECT COUNT(*) FROM usuarios) AS usuarios_rows;
