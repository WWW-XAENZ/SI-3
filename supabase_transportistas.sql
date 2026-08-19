-- ============================================
-- MIGRACIÓN: PROVEEDORES DE TRANSPORTISTAS
-- Tabla para registrar múltiples proveedores bajo un turno de transporte
-- ============================================

-- ============================================
-- 1. ELIMINAR TABLA SI EXISTE (para re-ejecución idempotente)
-- ============================================
DROP TABLE IF EXISTS proveedores_transporte CASCADE;

-- ============================================
-- 2. CREAR TABLA proveedores_transporte
-- ============================================
CREATE TABLE proveedores_transporte (
    id BIGSERIAL PRIMARY KEY,
    numero_turno VARCHAR(10) NOT NULL,
    nombre_empresa VARCHAR(255) NOT NULL,
    nit VARCHAR(20) NOT NULL,
    motivo TEXT,
    num_factura VARCHAR(50),
    tipo_vehiculo VARCHAR(50),
    bultos INTEGER,
    peso VARCHAR(50),
    responsable VARCHAR(255),
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    servicio VARCHAR(50),
    destino VARCHAR(50),
    nombre_proveedor VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'pendiente' 
        CHECK (estado IN ('pendiente', 'inspeccion', 'autorizado_salida', 'completado')),
    autorizado_salida BOOLEAN DEFAULT false,
    inspeccion_fisica BOOLEAN DEFAULT false,
    hora_solicitud TIME,
    hora_llamada TIME,
    hora_finalizacion TIME,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. AÑADIR COLUMNA a historial_turnos (para enlazar proveedores transportistas)
-- ============================================
ALTER TABLE historial_turnos 
    ADD COLUMN IF NOT EXISTS es_transporte BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS proveedor_transporte_id BIGINT REFERENCES proveedores_transporte(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS nombre_proveedor VARCHAR(255);

ALTER TABLE turnos 
    ADD COLUMN IF NOT EXISTS es_transporte BOOLEAN DEFAULT false;

-- ============================================
-- 4. ÍNDICES
-- ============================================
CREATE INDEX idx_proveedores_transporte_numero_turno ON proveedores_transporte(numero_turno);
CREATE INDEX idx_proveedores_transporte_estado ON proveedores_transporte(estado);
CREATE INDEX idx_proveedores_transporte_nit ON proveedores_transporte(nit);
CREATE INDEX idx_proveedores_transporte_autorizado ON proveedores_transporte(autorizado_salida);
CREATE INDEX idx_proveedores_transporte_created_at ON proveedores_transporte(created_at DESC);
CREATE INDEX idx_historial_es_transporte ON historial_turnos(es_transporte);
CREATE INDEX idx_historial_proveedor_transporte_id ON historial_turnos(proveedor_transporte_id);

-- ============================================
-- 5. TRIGGER para actualización de updated_at
-- ============================================
CREATE TRIGGER update_proveedores_transporte_updated_at 
    BEFORE UPDATE ON proveedores_transporte 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. REAL-TIME
-- ============================================
ALTER TABLE proveedores_transporte REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE proveedores_transporte;

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE proveedores_transporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ProveedoresTransporte: permitir todo" 
    ON proveedores_transporte FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 8. VERIFICACIÓN
-- ============================================
SELECT '✅ Migración proveedores_transporte completada' AS mensaje;
