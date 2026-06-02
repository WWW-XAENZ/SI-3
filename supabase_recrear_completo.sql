-- ============================================
-- SISTEMA DE TURNOS SI-3 - ESQUEMA COMPLETO PARA SUPABASE
-- Ejecutar TODO este código en el SQL Editor de Supabase
-- ============================================

-- ============================================
-- 1. ELIMINAR TABLAS EXISTENTES
-- ============================================
DROP TABLE IF EXISTS historial_turnos CASCADE;
DROP TABLE IF EXISTS turnos CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS configuracion CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS mensajes CASCADE;
DROP TABLE IF EXISTS notificaciones_salida CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP PUBLICATION IF EXISTS supabase_realtime;

-- ============================================
-- 2. TABLAS
-- ============================================

CREATE TABLE configuracion (
    id BIGSERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    hora_llegada TIME,
    fecha_llegada TIMESTAMP WITH TIME ZONE,
    hora_finalizacion TIME,
    estado VARCHAR(20) DEFAULT 'espera' CHECK (estado IN ('espera', 'citado', 'atendiendo', 'llegado', 'completado', 'cancelado')),
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

CREATE TABLE historial_turnos (
    id BIGSERIAL PRIMARY KEY,
    turno_id BIGINT,
    numero VARCHAR(10) NOT NULL,
    nombre_empresa VARCHAR(255) NOT NULL,
    nit VARCHAR(20) NOT NULL,
    motivo TEXT,
    hora_solicitud TIME NOT NULL,
    hora_llamada TIME,
    hora_llegada TIME,
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

CREATE TABLE mensajes (
    id BIGSERIAL PRIMARY KEY,
    remitente TEXT NOT NULL CHECK (remitente IN ('admin', 'despachador')),
    mensaje TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    leido BOOLEAN DEFAULT false
);

CREATE TABLE notificaciones_salida (
    id BIGSERIAL PRIMARY KEY,
    turno_id BIGINT REFERENCES turnos(id) ON DELETE CASCADE,
    proveedor_nit TEXT,
    nombre_empresa TEXT,
    fecha_cita TIMESTAMP WITH TIME ZONE,
    tipo TEXT CHECK (tipo IN ('salida_pendiente', 'salida_autorizada')),
    mensaje TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    leido BOOLEAN DEFAULT false
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
-- 4. ÍNDICES
-- ============================================

CREATE INDEX idx_turnos_estado ON turnos(estado);
CREATE INDEX idx_turnos_fecha_solicitud ON turnos(fecha_solicitud);
CREATE INDEX idx_turnos_nit ON turnos(nit);
CREATE INDEX idx_turnos_proveedor_id ON turnos(proveedor_id);
CREATE INDEX idx_turnos_numero ON turnos(numero);
CREATE INDEX idx_turnos_destino ON turnos(destino);

CREATE INDEX idx_historial_turnos_fecha ON historial_turnos(fecha);
CREATE INDEX idx_historial_turnos_nit ON historial_turnos(nit);
CREATE INDEX idx_historial_turnos_estado ON historial_turnos(estado);
CREATE INDEX idx_historial_turnos_numero ON historial_turnos(numero);

CREATE INDEX idx_proveedores_nit ON proveedores(nit);
CREATE INDEX idx_proveedores_nombre ON proveedores(nombre_empresa);
CREATE INDEX idx_proveedores_activo ON proveedores(activo);
CREATE INDEX idx_proveedores_servicio ON proveedores(servicio);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);

CREATE INDEX idx_mensajes_created_at ON mensajes(created_at desc);
CREATE INDEX idx_mensajes_leido ON mensajes(leido);

CREATE INDEX idx_notificaciones_salida_leido ON notificaciones_salida(leido);
CREATE INDEX idx_notificaciones_salida_created_at ON notificaciones_salida(created_at desc);

-- ============================================
-- 5. FUNCIONES Y TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_configuracion_updated_at BEFORE UPDATE ON configuracion FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON proveedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_turnos_updated_at BEFORE UPDATE ON turnos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. REAL-TIME
-- ============================================

ALTER TABLE turnos REPLICA IDENTITY FULL;
ALTER TABLE historial_turnos REPLICA IDENTITY FULL;
ALTER TABLE proveedores REPLICA IDENTITY FULL;
ALTER TABLE configuracion REPLICA IDENTITY FULL;
ALTER TABLE mensajes REPLICA IDENTITY FULL;
ALTER TABLE notificaciones_salida REPLICA IDENTITY FULL;

CREATE PUBLICATION supabase_realtime FOR TABLE turnos, historial_turnos, proveedores, configuracion, mensajes, notificaciones_salida;

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_salida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Turnos: permitir todo" ON turnos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Historial: permitir todo" ON historial_turnos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Proveedores: permitir todo" ON proveedores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Configuracion: permitir todo" ON configuracion FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios: permitir todo" ON usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Mensajes: permitir todo" ON mensajes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "NotificacionesSalida: permitir todo" ON notificaciones_salida FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 8. VERIFICACIÓN
-- ============================================

SELECT '✅ Base de datos recreada exitosamente' AS mensaje;
SELECT 
    (SELECT COUNT(*) FROM configuracion) AS configuracion,
    (SELECT COUNT(*) FROM proveedores) AS proveedores,
    (SELECT COUNT(*) FROM turnos) AS turnos,
    (SELECT COUNT(*) FROM historial_turnos) AS historial,
    (SELECT COUNT(*) FROM usuarios) AS usuarios,
    (SELECT COUNT(*) FROM mensajes) AS mensajes,
    (SELECT COUNT(*) FROM notificaciones_salida) AS notificaciones;
