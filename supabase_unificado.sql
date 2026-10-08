-- SI-3: INSTALACION Y MIGRACIONES UNIFICADAS PARA SUPABASE

-- Script idempotente: crea lo que falta y conserva tablas, turnos y materiales existentes.

-- No contiene DROP TABLE ni elimina códigos personalizados del catálogo.

-- Ejecutar completo en SQL Editor de Supabase.



-- 1. Esquema base

-- ============================================
-- SISTEMA DE TURNOS SI-3 - ESQUEMA COMPLETO PARA SUPABASE
-- Ejecutar TODO este código en el SQL Editor de Supabase
-- ============================================

-- ============================================
-- 1. ESQUEMA BASE SEGURO (conserva datos)
-- 2. TABLAS
-- ============================================

CREATE TABLE IF NOT EXISTS configuracion (
    id BIGSERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proveedores (
    id BIGSERIAL PRIMARY KEY,
    nombre_empresa VARCHAR(255) NOT NULL,
    nit VARCHAR(20) UNIQUE NOT NULL,
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(255),
    servicio VARCHAR(50),
    consecutivo_ingreso VARCHAR(100),
    num_facturas INTEGER,
    activo BOOLEAN DEFAULT true,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS turnos (
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
    consecutivo_ingreso VARCHAR(100),
    num_facturas INTEGER,
    materiales_sap JSONB NOT NULL DEFAULT '[]'::jsonb,
    tipo_vehiculo VARCHAR(50),
    bultos INTEGER,
    peso VARCHAR(50),
    responsable VARCHAR(255),
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    servicio VARCHAR(50),
    autorizado_salida BOOLEAN DEFAULT false,
    inspeccion_fisica BOOLEAN DEFAULT false,
    placa_vehiculo VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.turnos_eliminados (
    id BIGSERIAL PRIMARY KEY,
    turno_id BIGINT NOT NULL UNIQUE,
    numero VARCHAR(10) NOT NULL,
    fecha_cita TIMESTAMP WITH TIME ZONE,
    fecha_solicitud TIMESTAMP WITH TIME ZONE,
    eliminado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    turno_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_turnos_eliminados_eliminado_en
    ON public.turnos_eliminados (eliminado_en DESC);

CREATE TABLE IF NOT EXISTS historial_turnos (
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
    consecutivo_ingreso VARCHAR(100),
    num_facturas INTEGER,
    materiales_sap JSONB NOT NULL DEFAULT '[]'::jsonb,
    tipo_vehiculo VARCHAR(50),
    bultos INTEGER,
    peso VARCHAR(50),
    responsable VARCHAR(255),
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    servicio VARCHAR(50),
    autorizado_salida BOOLEAN DEFAULT false,
    inspeccion_fisica BOOLEAN DEFAULT false,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'operador' CHECK (rol IN ('admin', 'operador', 'visualizador')),
    activo BOOLEAN DEFAULT true,
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensajes (
    id BIGSERIAL PRIMARY KEY,
    remitente TEXT NOT NULL CHECK (remitente IN ('admin', 'despachador')),
    mensaje TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    leido BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS notificaciones_salida (
    id BIGSERIAL PRIMARY KEY,
    turno_id BIGINT REFERENCES turnos(id) ON DELETE CASCADE,
    remitente VARCHAR(20),
    proveedor_nit TEXT,
    nombre_empresa TEXT,
    fecha_cita TIMESTAMP WITH TIME ZONE,
    tipo TEXT CHECK (tipo IN ('salida_pendiente', 'salida_autorizada')),
    mensaje TEXT,
    datos JSONB,
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

CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos(estado);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha_solicitud ON turnos(fecha_solicitud);
CREATE INDEX IF NOT EXISTS idx_turnos_nit ON turnos(nit);
CREATE INDEX IF NOT EXISTS idx_turnos_proveedor_id ON turnos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_turnos_numero ON turnos(numero);
CREATE INDEX IF NOT EXISTS idx_turnos_destino ON turnos(destino);

CREATE INDEX IF NOT EXISTS idx_historial_turnos_fecha ON historial_turnos(fecha);
CREATE INDEX IF NOT EXISTS idx_historial_turnos_nit ON historial_turnos(nit);
CREATE INDEX IF NOT EXISTS idx_historial_turnos_estado ON historial_turnos(estado);
CREATE INDEX IF NOT EXISTS idx_historial_turnos_numero ON historial_turnos(numero);

CREATE INDEX IF NOT EXISTS idx_proveedores_nit ON proveedores(nit);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre_empresa);
CREATE INDEX IF NOT EXISTS idx_proveedores_activo ON proveedores(activo);
CREATE INDEX IF NOT EXISTS idx_proveedores_servicio ON proveedores(servicio);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

CREATE INDEX IF NOT EXISTS idx_mensajes_created_at ON mensajes(created_at desc);
CREATE INDEX IF NOT EXISTS idx_mensajes_leido ON mensajes(leido);

CREATE INDEX IF NOT EXISTS idx_notificaciones_salida_leido ON notificaciones_salida(leido);
CREATE INDEX IF NOT EXISTS idx_notificaciones_salida_created_at ON notificaciones_salida(created_at desc);

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

DROP TRIGGER IF EXISTS update_configuracion_updated_at ON configuracion;
CREATE TRIGGER update_configuracion_updated_at BEFORE UPDATE ON configuracion FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_proveedores_updated_at ON proveedores;
CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON proveedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_turnos_updated_at ON turnos;
CREATE TRIGGER update_turnos_updated_at BEFORE UPDATE ON turnos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
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

DO $$
DECLARE
    nombre_tabla TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        EXECUTE 'CREATE PUBLICATION supabase_realtime';
    END IF;
    FOREACH nombre_tabla IN ARRAY ARRAY['turnos', 'historial_turnos', 'proveedores', 'configuracion', 'mensajes', 'notificaciones_salida'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = nombre_tabla
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', nombre_tabla);
        END IF;
    END LOOP;
END;
$$;

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
ALTER TABLE public.turnos_eliminados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Turnos: permitir todo" ON turnos;
CREATE POLICY "Turnos: permitir todo" ON turnos FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Historial: permitir todo" ON historial_turnos;
CREATE POLICY "Historial: permitir todo" ON historial_turnos FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Proveedores: permitir todo" ON proveedores;
CREATE POLICY "Proveedores: permitir todo" ON proveedores FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Configuracion: permitir todo" ON configuracion;
CREATE POLICY "Configuracion: permitir todo" ON configuracion FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios: permitir todo" ON usuarios;
CREATE POLICY "Usuarios: permitir todo" ON usuarios FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Mensajes: permitir todo" ON mensajes;
CREATE POLICY "Mensajes: permitir todo" ON mensajes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "NotificacionesSalida: permitir todo" ON notificaciones_salida;
CREATE POLICY "NotificacionesSalida: permitir todo" ON notificaciones_salida FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Turnos eliminados: permitir todo" ON public.turnos_eliminados;
CREATE POLICY "Turnos eliminados: permitir todo"
    ON public.turnos_eliminados
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Reservas

-- ============================================
-- Sistema de Reservas de Turnos SI-3
-- Agrega columnas y constraint para bloqueo de horarios
-- ============================================

-- 1. Columna fecha_cita como TIMESTAMP (guarda fecha + hora exacta de la reserva)
ALTER TABLE turnos
ADD COLUMN IF NOT EXISTS fecha_cita TIMESTAMP WITH TIME ZONE;

-- 2. Columna destino del proveedor
ALTER TABLE turnos
ADD COLUMN IF NOT EXISTS destino VARCHAR(50);

-- 3. Actualizar constraint de estado para incluir 'citado' (reserva futura)
ALTER TABLE turnos
DROP CONSTRAINT IF EXISTS turnos_estado_check;

ALTER TABLE turnos
ADD CONSTRAINT turnos_estado_check
CHECK (estado IN ('espera', 'atendiendo', 'completado', 'cancelado', 'citado', 'llegado'));

-- 4. Indice para consulta rapida por fecha de cita
CREATE INDEX IF NOT EXISTS idx_turnos_fecha_cita ON turnos(fecha_cita);

-- 5. Indice para filtrar turnos activos por estado
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos(estado);


-- 3. Columnas de consecutivo y facturas

-- ============================================
-- MIGRACIÓN: Agregar campos consecutivo_ingreso y num_facturas
-- ============================================
-- Ejecutar en el SQL Editor de Supabase para bases de datos existentes.
-- Agrega las columnas necesarias para los nuevos campos del formulario de proveedores.
--   - consecutivo_ingreso: número consecutivo de ingreso (texto)
--   - num_facturas: cantidad de facturas (número entero)

-- Tabla proveedores
ALTER TABLE proveedores
    ADD COLUMN IF NOT EXISTS consecutivo_ingreso VARCHAR(100);

ALTER TABLE proveedores
    ADD COLUMN IF NOT EXISTS num_facturas INTEGER;

-- Tabla turnos
ALTER TABLE turnos
    ADD COLUMN IF NOT EXISTS consecutivo_ingreso VARCHAR(100);

ALTER TABLE turnos
    ADD COLUMN IF NOT EXISTS num_facturas INTEGER;

-- Tabla historial_turnos
ALTER TABLE historial_turnos
    ADD COLUMN IF NOT EXISTS consecutivo_ingreso VARCHAR(100);

ALTER TABLE historial_turnos
    ADD COLUMN IF NOT EXISTS num_facturas INTEGER;

SELECT '✅ Migración completada. Columnas agregadas.' AS mensaje;


-- 4. Lista SAP en turnos e historial

-- Agrega la lista de codigos SAP a turnos activos y al historial.
ALTER TABLE public.turnos
    ADD COLUMN IF NOT EXISTS materiales_sap JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.historial_turnos
    ADD COLUMN IF NOT EXISTS materiales_sap JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 5. Proveedores de transporte

-- ============================================
-- MIGRACIÓN: PROVEEDORES DE TRANSPORTISTAS
-- Tabla para registrar múltiples proveedores bajo un turno de transporte
-- ============================================

-- ============================================
-- 1. ELIMINAR TABLA SI EXISTE (para re-ejecución idempotente)
-- ============================================
-- Se conserva la tabla y sus registros si ya existe.

-- ============================================
-- 2. CREAR TABLA proveedores_transporte
-- ============================================
CREATE TABLE IF NOT EXISTS proveedores_transporte (
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
    consecutivo_ingreso VARCHAR(100),
    num_facturas INTEGER,
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
CREATE INDEX IF NOT EXISTS idx_proveedores_transporte_numero_turno ON proveedores_transporte(numero_turno);
CREATE INDEX IF NOT EXISTS idx_proveedores_transporte_estado ON proveedores_transporte(estado);
CREATE INDEX IF NOT EXISTS idx_proveedores_transporte_nit ON proveedores_transporte(nit);
CREATE INDEX IF NOT EXISTS idx_proveedores_transporte_autorizado ON proveedores_transporte(autorizado_salida);
CREATE INDEX IF NOT EXISTS idx_proveedores_transporte_created_at ON proveedores_transporte(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_historial_es_transporte ON historial_turnos(es_transporte);
CREATE INDEX IF NOT EXISTS idx_historial_proveedor_transporte_id ON historial_turnos(proveedor_transporte_id);

-- ============================================
-- 5. TRIGGER para actualización de updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_proveedores_transporte_updated_at ON proveedores_transporte;
CREATE TRIGGER update_proveedores_transporte_updated_at 
    BEFORE UPDATE ON proveedores_transporte 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. REAL-TIME
-- ============================================
ALTER TABLE proveedores_transporte REPLICA IDENTITY FULL;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'proveedores_transporte'
       ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.proveedores_transporte;
    END IF;
END;
$$;

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE proveedores_transporte ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ProveedoresTransporte: permitir todo" ON proveedores_transporte;
CREATE POLICY "ProveedoresTransporte: permitir todo" 
    ON proveedores_transporte FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 8. VERIFICACIÓN
-- ============================================
SELECT '✅ Migración proveedores_transporte completada' AS mensaje;


-- 6. Columnas de proveedores de transporte

-- ============================================
-- MIGRACIÓN: Agregar consecutivo_ingreso y num_facturas a proveedores_transporte
-- ============================================
-- Ejecutar en el SQL Editor de Supabase para bases de datos existentes.
-- Agrega las columnas necesarias para que el consecuntivo FMM y numero de facturas
-- se guarden correctamente en la tabla de proveedores de transporte.

ALTER TABLE proveedores_transporte
    ADD COLUMN IF NOT EXISTS consecutivo_ingreso VARCHAR(100);

ALTER TABLE proveedores_transporte
    ADD COLUMN IF NOT EXISTS num_facturas INTEGER;

SELECT '✅ Migración completada: columnas consecutivo_ingreso y num_facturas agregadas a proveedores_transporte.' AS mensaje;


-- 7. Datos de notificaciones

-- ============================================
-- MIGRACIÓN: Agregar columnas a notificaciones_salida
-- ============================================
-- Ejecutar en el SQL Editor de Supabase para bases de datos existentes.

ALTER TABLE notificaciones_salida
    ADD COLUMN IF NOT EXISTS remitente VARCHAR(20);

ALTER TABLE notificaciones_salida
    ADD COLUMN IF NOT EXISTS datos JSONB;

ALTER TABLE notificaciones_salida
    ADD COLUMN IF NOT EXISTS turno_id BIGINT REFERENCES turnos(id) ON DELETE CASCADE;

ALTER TABLE notificaciones_salida
    ADD COLUMN IF NOT EXISTS proveedor_nit TEXT;

ALTER TABLE notificaciones_salida
    ADD COLUMN IF NOT EXISTS nombre_empresa TEXT;

ALTER TABLE notificaciones_salida
    ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('salida_pendiente', 'salida_autorizada'));

CREATE INDEX IF NOT EXISTS idx_notifications_datos ON notificaciones_salida USING GIN (datos jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_notifications_tipo ON notificaciones_salida(tipo);
CREATE INDEX IF NOT EXISTS idx_notifications_no_leidas ON notificaciones_salida(leido) WHERE leido = false;

SELECT 'Migración completada: columnas agregadas a notificaciones_salida.' AS mensaje;


-- 8. Notificación de llegada confirmada

-- Notifica a recepcion y despachador cuando se confirma la llegada de un turno.
-- Ejecutar una vez desde el SQL Editor de Supabase.

ALTER TABLE public.notificaciones_salida
    ADD COLUMN IF NOT EXISTS destinatario TEXT;

ALTER TABLE public.turnos
    ADD COLUMN IF NOT EXISTS es_transporte BOOLEAN DEFAULT false;

DO $$
DECLARE
    constraint_row RECORD;
BEGIN
    FOR constraint_row IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.notificaciones_salida'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%tipo%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.notificaciones_salida DROP CONSTRAINT %I',
            constraint_row.conname
        );
    END LOOP;
END;
$$;

ALTER TABLE public.notificaciones_salida
    ADD CONSTRAINT notificaciones_salida_tipo_check
    CHECK (tipo IN (
        'salida_pendiente',
        'salida_autorizada',
        'turno_completado',
        'turno_confirmado'
    ));

CREATE INDEX IF NOT EXISTS idx_notificaciones_destinatario_no_leidas
    ON public.notificaciones_salida (destinatario, created_at DESC)
    WHERE leido = false;

CREATE OR REPLACE FUNCTION public.notificar_turno_confirmado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    datos_turno JSONB;
BEGIN
    IF NEW.estado IS DISTINCT FROM 'llegado'
       OR (TG_OP = 'UPDATE' AND OLD.estado = 'llegado') THEN
        RETURN NEW;
    END IF;

    datos_turno := jsonb_build_object(
        'turnoId', NEW.id,
        'numero', NEW.numero,
        'nombreEmpresa', NEW.nombre_empresa,
        'nombre', NEW.nombre_empresa,
        'nit', NEW.nit,
        'motivo', NEW.motivo,
        'destino', NEW.destino,
        'numFactura', NEW.num_factura,
        'consecutivoIngreso', NEW.consecutivo_ingreso,
        'numFacturas', NEW.num_facturas,
        'materialesSap', COALESCE(NEW.materiales_sap, '[]'::jsonb),
        'tipoVehiculo', NEW.tipo_vehiculo,
        'bultos', NEW.bultos,
        'peso', NEW.peso,
        'responsable', NEW.responsable,
        'contacto', NEW.contacto,
        'telefono', NEW.telefono,
        'servicio', NEW.servicio,
        'esTransporte', COALESCE(NEW.es_transporte, false)
            OR lower(COALESCE(NEW.servicio, '')) = 'transporte',
        'horaSolicitud', NEW.hora_solicitud,
        'horaLlamada', NEW.hora_llamada,
        'horaLlegada', NEW.hora_llegada,
        'fechaLlegada', NEW.fecha_llegada,
        'timestamp', (extract(epoch FROM clock_timestamp()) * 1000)::BIGINT
    );

    INSERT INTO public.notificaciones_salida (
        remitente,
        destinatario,
        proveedor_nit,
        nombre_empresa,
        tipo,
        mensaje,
        datos,
        leido
    )
    SELECT
        'recepcion',
        destinatarios.destinatario,
        NEW.nit,
        NEW.nombre_empresa,
        'turno_confirmado',
        format('Llegada confirmada para el turno %s', NEW.numero),
        datos_turno,
        false
    FROM (VALUES ('admin'), ('despachador')) AS destinatarios(destinatario);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_turno_confirmado ON public.turnos;
CREATE TRIGGER trg_notificar_turno_confirmado
    AFTER INSERT OR UPDATE OF estado ON public.turnos
    FOR EACH ROW
    WHEN (NEW.estado = 'llegado')
    EXECUTE FUNCTION public.notificar_turno_confirmado();

ALTER TABLE public.notificaciones_salida REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'notificaciones_salida'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones_salida;
    END IF;
END;
$$;

-- 9. Catálogo SIE

-- Catalogo de materiales SIE. Idempotente: crea la tabla y actualiza codigos existentes.
CREATE TABLE IF NOT EXISTS public.materiales_sie (
    codigo_sap TEXT PRIMARY KEY,
    descripcion TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.materiales_sie ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.materiales_sie TO anon, authenticated;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'materiales_sie' AND policyname = 'Lectura publica catalogo materiales SIE') THEN
        CREATE POLICY "Lectura publica catalogo materiales SIE" ON public.materiales_sie FOR SELECT TO anon, authenticated USING (true);
    END IF;
END;
$$;
INSERT INTO public.materiales_sie (codigo_sap, descripcion) VALUES
    ('10000514', 'FORRO UNIK COSTURA NEGRO GRIS'),
    ('10000623', 'BOLSA PLASTICA 16X38 1 BAJA'),
    ('10000681', 'BOLSA PLASTICA 20X38 1 ALTA'),
    ('10000747', 'ESPUMA UNIK'),
    ('10000750', 'FORRO VICTORY ONE'),
    ('10000841', 'VALVULA SELLOMATIC TR-412'),
    ('10000860', 'FORRO DUKE 250-390 DEL'),
    ('10000862', 'FORRO DUKE 250-390 TRAS'),
    ('10001127', 'RIN AGILITY DEL'),
    ('10001194', 'POLIOL VORALUX HK536'),
    ('10001195', 'ISOCIANATO VORALUX HE134'),
    ('10001199', 'STICKER BLANCO'),
    ('10001200', 'GRAPA F03'),
    ('10001201', 'FOAMY NEGRO PARA SILLINES'),
    ('10001206', 'BJ-900 G-137 BLACK'),
    ('10001207', 'FORRO SILLIN VICTORY FLOW'),
    ('10001208', 'FORRO SILLIN HERO ECO 100'),
    ('10001210', 'RUBBER SEAT CUSHION 77206'),
    ('10001211', 'RUBBER A SEAT SETTING 77204'),
    ('10001212', 'RUBBER SEAT MTG 77202'),
    ('10001284', 'BASE SILLIN HERO ECO 100'),
    ('10001285', 'EVA FOAMY ADH 300X35X2MM'),
    ('10001324', 'PORTAFUSIBLE AEREO CORTO F103-C1'),
    ('10001325', 'FUSIBLE VIDRIO CORTO- 1,5 A'),
    ('10001326', 'TERMINAL HEM DJ621-E2.8X0.5A HCB BRASS'),
    ('10001328', 'TAPA TRASERA'),
    ('10001329', 'PASACABLE DUREZA 50/55'),
    ('10001330', 'CIRCUITO PUERTO USB'),
    ('10001331', 'CARCAZA'),
    ('10001332', 'TAPA SUPERIOR'),
    ('10001333', 'SOPORTE ABRAZADERA'),
    ('10001335', 'TERMINAL BOTÃ“N FUSIBLE - TM5000A-0102'),
    ('10001336', 'TORNILLO M4 X 0,7 MM'),
    ('10001337', 'TUERCA SEGURIDAD M4X0,7 MM'),
    ('10001339', 'FORRO TRAS ZS 125'),
    ('10001345', 'TERMOENCOGIBLE NEGRO Ã˜ 9 MM'),
    ('10001346', 'TERMOENCOGIBLE NEGRO Ã˜ 7 MM'),
    ('10001347', 'ANILLO FRICCION SOPORTE ABRAZADERA'),
    ('10001348', 'BUJE TOPE SOPORTE ABRAZADEA'),
    ('10001349', 'ALAMBRE SOLDADURA ESTAÃ‘O 0.8 - 63/37'),
    ('10001350', 'TIE WRAP NEGRO - CORREA PLASTI T4 (10cm)'),
    ('10001383', 'CUÃ‘A FIJACION SOPORTES'),
    ('10001508', 'FORRO SILLIN BLACK'),
    ('10001524', 'FORRO SIL-VIC-ST-1OO'),
    ('10001558', 'FORRO BEN 180 DEL'),
    ('10001559', 'FORRO BEN 180 TRAS'),
    ('10001560', 'FORRO TRK 251 DEL'),
    ('10001561', 'FORRO TRK 251 TRAS'),
    ('10001564', 'FORRO SILLIN TNT 150 DEL'),
    ('10001565', 'FORRO SILLIN TNT 150 TRA'),
    ('10001571', 'FORRO SILLIN TVS STRYKER 125'),
    ('10001574', 'FORRO-SIL-VICTORY-LIFE-PACK'),
    ('10001589', 'TELA FIP-900 G-94 BLACK'),
    ('10001680', 'CINTA EPVC ADH 12X5MM'),
    ('10001682', 'FORRO SILLIN NITRO 151 PRO'),
    ('10001695', 'FORRO SILLIN DEL KTM 390 ADVENTURE'),
    ('10001696', 'FORRO SILLIN TRA KTM 390 ADVENTURE'),
    ('10001697', 'FORRO SILLIN DEL HUSQVARNA 200'),
    ('10001698', 'FORRO SILLIN TRA HUSQVARNA 200'),
    ('10001702', 'FORRO DEL BOLD PRO GRIS'),
    ('10001703', 'FORRO TRAS BOLD PRO GRIS'),
    ('10001713', 'FALSO TRASERO APACHE 200'),
    ('10001779', 'CIRCUITO USB CARGA RAPIDA TUMATEL'),
    ('10001783', 'ARANDELA PLANA M5 USB'),
    ('10001790', 'FORRO SILLIN DEL N360'),
    ('10001795', 'TORNILLO M4 X 0,7 X 25MM'),
    ('10001938', 'TERMINAL MALE DJ611-2.8X0.5A HCB BRASS'),
    ('10001939', 'CONECTOR HEMBRA 2P DJ7021A-2.8-11'),
    ('10002039', 'TLA-VIN-SIL-HUNK-XTREME-160'),
    ('10002093', 'ETIQUETA ADHESIV PP 100X25 ROLLO 1000UND'),
    ('10002125', 'FORRO SIL-VICTORY-VEN-18-DEL'),
    ('10002126', 'FORRO SIL-VICTORY-VEN-18-TRA'),
    ('10002132', 'CINTA SEGURIDAD 2,5CM X 80M 1600 TRAMOS'),
    ('10002140', 'FORRO SIL-VICTORY-VEN-14-DEL'),
    ('10002141', 'FORRO SIL-VICTORY-VEN-14-TRA'),
    ('10002142', 'FORRO SIL-VICTORY-X1-DAYTONA'),
    ('10002150', 'FORRO SILLIN MRX 200'),
    ('10002152', 'FORRO SILLIN MRX 125 MY24'),
    ('10002153', 'FORRO SILLIN MRX 150 MY24'),
    ('10002155', 'FORRO SILLIN AGILITY GO MY24'),
    ('10002156', 'FORRO SILLIN ADVANCE MY24'),
    ('10002157', 'FORRO SILLIN AGILITY FUSION MY24'),
    ('10002172', 'FORRO SILLIN BLACK 2023'),
    ('10002190', 'FORRO SILLIN DEL N360 FRESH'),
    ('10002198', 'FORRO SILLIN YAMAHA D241'),
    ('10002200', 'FORRO ECO DELUXE 100 FRESH'),
    ('10002211', 'FORRO SILLIN VICTORY ARIZONA-V3'),
    ('10002212', 'FORRO SILLIN VICTORY SWITCH WEX'),
    ('10002215', 'CABLE AMARI/BLAN-YELLOW/WHI WIRE 0.5 mmÂ²'),
    ('10002216', 'CABLE AMARI/ROJO-YELLOW/RED WIRE 0.5 mmÂ²'),
    ('10002217', 'CABLE AMARILLO - YELLOW WIRE 0.5 mmÂ²'),
    ('10002218', 'CABLE AMARILLO - YELLOW WIRE 0.75 mmÂ²'),
    ('10002219', 'CABLE AZUL - BLUE WIRE 0.5 mmÂ²'),
    ('10002220', 'CABLE AZUL/VIOLE-BLUE/VIOLET WIRE 0.5mmÂ²'),
    ('10002221', 'CABLE AZUL/AMARI-BLUE/YELLO WIRE 0.5 mmÂ²'),
    ('10002222', 'CABLE AZUL/BLANCO-BLUE/WHITE WIRE 0.5mmÂ²'),
    ('10002224', 'CABLE AZUL/NEGRO -BLUE/BLACK WIRE 0.5mmÂ²'),
    ('10002225', 'CABLE AZUL/ROJO - BLUE/RED WIRE 0.5mmÂ²'),
    ('10002226', 'CABLE BLANCO - WHITE WIRE 0.75mmÂ²'),
    ('10002228', 'CABLE BLANCO/AMAR-WHITE/YEL WIRE 0.5 mmÂ²'),
    ('10002230', 'CABLE GRIS - GRAY WIRE 0.5 mmÂ²'),
    ('10002231', 'CABLE MARRON / BROWN WIRE 0.5 mmÂ²'),
    ('10002232', 'CABLE MARRON / BROWN WIRE 0.75mmÂ²'),
    ('10002233', 'CABLE NARANJA - ORANGE WIRE 0.5 mmÂ²'),
    ('10002234', 'CABLE NEGRO - BLACK WIRE 0.5 mmÂ²'),
    ('10002235', 'CABLE NEGRO - BLACK WIRE 0.75 mmÂ²'),
    ('10002236', 'CABLE NEGRO - BLACK WIRE 4.0 mmÂ²'),
    ('10002237', 'CABLE NEGRO / BLACK WIRE 1.25 mmÂ²'),
    ('10002238', 'CABLE NEGRO/AMAR - BLACK/YEL WIRE 0.5mmÂ²'),
    ('10002239', 'CABLE NEGRO/BLANC-BLACK/WHIT WIRE 0.5mmÂ²'),
    ('10002240', 'CABLE NEGRO/ROJO - BLACK/RED WIRE 0.5mmÂ²'),
    ('10002241', 'CABLE ROJO - RED WIRE 0.5 mmÂ²'),
    ('10002242', 'CABLE ROJO - RED WIRE 0.75 mmÂ²'),
    ('10002243', 'CABLE ROJO - RED WIRE 5.0 mmÂ²'),
    ('10002245', 'CABLE ROJO / RED WIRE 1.25mmÂ²'),
    ('10002246', 'CABLE ROJO / RED WIRE 4.0mmÂ²'),
    ('10002247', 'CABLE ROJO/AMARIL-RED/YELLOW WIRE 0.5mmÂ²'),
    ('10002249', 'CABLE ROSADO CLA - LIG PINK WIRE 0.5mmÂ²'),
    ('10002250', 'CABLE VERDE - GREEN WIRE 0.5 mmÂ²'),
    ('10002251', 'CABLE VERDE - GREEN WIRE 0.75 mmÂ²'),
    ('10002252', 'CABLE VERDE - GREEN WIRE 1.25 mmÂ²'),
    ('10002253', 'CABLE VERDE - GREEN WIRE 5.0 mmÂ²'),
    ('10002255', 'CABLE VERDE / GREEN WIRE 4.0 mmÂ²'),
    ('10002256', 'CABLE VER/VIOL-GREEN/VIOLET WIRE 0.5 mmÂ²'),
    ('10002257', 'CABLE VERDE/AMAR - GREEN/YEL WIRE 0.5mmÂ²'),
    ('10002259', 'CABLE VERDE/NEGR-GREEN/BLACK WIRE 0.5mmÂ²'),
    ('10002260', 'CABLE VERDE/ROJO - GREEN/RED WIRE 0.5mmÂ²'),
    ('10002262', 'TUBO CORRUGADO (CONDUIT) Ã¸ 20 mm NEGRO'),
    ('10002263', 'TUBO FIBRA VIDRIO SILICONADA 250Â° Ã¸4 mm'),
    ('10002264', 'TUBO PROTECTOR PVC Ã¸ 10 mm NEGRO'),
    ('10002265', 'TUBO PROTECTOR PVC Ã¸ 12 mm NEGRO'),
    ('10002266', 'TUBO PROTECTOR PVC Ã¸ 14 mm NEGRO'),
    ('10002267', 'TUBO PROTECTOR PVC Ã¸ 15 mm NEGRO'),
    ('10002268', 'TUBO PROTECTOR PVC Ã¸ 18 mm NEGRO'),
    ('10002269', 'TUBO PROTECTOR PVC Ã¸ 3 mm NEGRO'),
    ('10002271', 'TUBO PROTECTOR PVC Ã¸ 6 mm NEGRO'),
    ('10002272', 'TUBO PROTECTOR PVC Ã¸ 6 mm ROJO'),
    ('10002274', 'TUBO TERMOENCOGIBLE Ã¸ 4 mm NEGRO'),
    ('10002275', 'TUBO TERMOENCOGIBLE Ã¸ 6 mm NEGRO'),
    ('10002276', 'TUBO TERMOENCOGIBLE Ã¸ 8 mm NEGRO'),
    ('10002277', 'CINTA PVC NEGRA 19 mm x 18m'),
    ('10002279', 'CINTA PVC VERDE 19 mm x 18 m'),
    ('10002281', 'CAJA DE FUSIBLES NEGRA BX2047C-1'),
    ('10002282', 'CLIP DE CORREA PLASTICA LONG126 ANCH 5mm'),
    ('10002283', 'GLASS FUSE HOLDER DJ90024'),
    ('10002285', 'CONECTOR FUSIBLES BLANCO 2VIAS BX2016'),
    ('10002286', 'CONECTOR HEM BLANCO 10VIAS DJ7101-2.3-11'),
    ('10002287', 'CONECTOR HEM WHITE DJ7021A-2.8-11'),
    ('10002288', 'CONECTOR HEM BLANCO 2VIAS DJ7021-2-11J'),
    ('10002289', 'CONECTOR HEM BLANCO 2VIAS DJ70224-6.3-11'),
    ('10002290', 'CONECTOR FEMALE WHITE DJ7031A-2.8-11'),
    ('10002291', 'CONECTOR FEMALE WHITE DJ7031A-6.3-11'),
    ('10002292', 'CONECTOR FEMALE 4 WAYS DJ70413-6.3-11'),
    ('10002293', 'CONECTOR HEM BLANCO 4VIAS DJ7041-6.3-11'),
    ('10002294', 'CONECTOR HEM BLANCO 4VIAS DJ7041A-2.8-11'),
    ('10002295', 'CONECTOR HEM BLANCO 4VIAS FW-C-4F-W'),
    ('10002296', 'CONECTOR HEM BLANCO 6VIAS DJ7061-6.3-11'),
    ('10002297', 'CONECTOR HEM BLANCO 6VIAS DJ7061A-2.8-11'),
    ('10002298', 'CONECTOR HEM WHITE DJ7091A-2.8-11'),
    ('10002299', 'CONECTOR FEMALE WHITE DJ7091Y-2.3-11'),
    ('10002300', 'CONECTOR HEM GRIS 2VIAS DJ7026-2-11'),
    ('10002301', 'CONECTOR HEM NEGRO 2VIAS DJ7021A-2.8-11'),
    ('10002302', 'CONECTOR HEM NEGRO 2VIAS DJ7021A-3.5-21'),
    ('10002303', 'CONECTOR FEMALE BLACK DJ7032-2.3-21'),
    ('10002304', 'CONECTOR HEM BLACK DJ7061A-2.8-11'),
    ('10002305', 'CONECTOR HEM VERDE 6VIAS DJ7061A-2.8-11'),
    ('10002306', 'CONECTOR MALE WHITE 2 WAYS DJ7022-7.8-21'),
    ('10002307', 'CONECTOR MAC BLANC 3VIAS 03R-JWPF-VSLE-S'),
    ('10002308', 'CONECTOR MALE WHITE DJ70224-6.3-21'),
    ('10002309', 'CONECTOR MAC BLANCO 2VIAS DJ7021A-2.8-21'),
    ('10002310', 'CONECTOR MAC BLANCO 2VIAS DJ7022-2.3-21'),
    ('10002311', 'CONECTOR MAC BLANCO 2VIAS DJJ7021-6.3-21'),
    ('10002312', 'CONECTOR MALE 2 WAYS DJ70215-6.3-21'),
    ('10002313', 'CONECTOR MAC BLANCO 3VIAS DJ7031A-2.8-21'),
    ('10002314', 'CONECTOR MALE WHITE DJ70413-6.3-21'),
    ('10002315', 'CONECTOR MAC BLANCO 4VIAS DJ7041-2.3-21'),
    ('10002316', 'CONECTOR MAC BLANCO 4VIAS DJ7041A-2.8-21'),
    ('10002317', 'CONECTOR MAC BLANCO 6VIAS DJ7061A-2.8-21'),
    ('10002318', 'CONECTOR MAC BLANCO 6VIAS DJ7062E-6.3-21'),
    ('10002319', 'CONECTOR MAC WHITE DJ7091A-2.8-21'),
    ('10002320', 'CONECTOR MAC GRIS 12VIAS DJ7125Y-2.2-21'),
    ('10002321', 'CONECTOR MAC GRIS 24VIAS 1612906-1'),
    ('10002322', 'CONECTOR BLACK 16WAYS DJ7161H-1.5-21'),
    ('10002323', 'CONECTOR HEM NEGRO 1VIA DJ7011A-2.8-11'),
    ('10002324', 'CONECTOR MAC NEGRO 34VIAS DJ7341A-1-21'),
    ('10002325', 'CONECTOR MAC NEGRO 4VIAS DJ7041A-2.8-21'),
    ('10002326', 'CONECTOR MAC NEGRO 4VIAS DJ7041Y-1.5-21'),
    ('10002327', 'CONECTOR MAC NEGRO 4VIAS DJ70423C-1-21'),
    ('10002328', 'CONECTOR MAC NEGRO 4VIAS DJ7045D-1.5-21'),
    ('10002329', 'CONECTOR MAC NEGRO 5VIAS DJ7052K-0.6-21'),
    ('10002330', 'CONECTOR MAC NEGRO 5VIAS DJJ7051-6.3-21'),
    ('10002331', 'CONECTOR MALE BLACK 6WAYS DJ7062E-6.3'),
    ('10002332', 'CONECTOR BLACK 6 WAYS DJ7061Y-2.3-21'),
    ('10002333', 'CONECTOR MAC BLACK DJ7091A-2.8-21'),
    ('10002334', 'CONECTOR MAC VERDE 9VIAS DJ7091A-2.8-21'),
    ('10002335', 'CUBIERTA PROTEC CONECTOR DIODO 21x13x8.9'),
    ('10002336', 'DIODO RECTIFICADOR 1N5408'),
    ('10002337', 'DIODO RECTIFICADOR 31700-124-008'),
    ('10002338', 'FUSIBLE DE VIDRIO 10 A 30 mm'),
    ('10002339', 'FUSIBLE NORMAL 15A 19.1 x 5.1 x 18.5 mm'),
    ('10002340', 'FUSIBLE PEQUEÃ‘O 15A 11,1x3.6x17 mm'),
    ('10002342', 'PVC COVER T25-12-65'),
    ('10002344', 'PVC COVER T35-13.5-70'),
    ('10002351', 'PVC COVER T50-20-90 (4 HOLES + TIE WRAP)'),
    ('10002353', 'PVC COVER T70-25-105 (4 HOLES +TIE WRAP)'),
    ('10002355', 'PVC COVER 6.3å…­æ’æŠ¤å¥—/é»‘ (CUA 20X30X65XD10)'),
    ('10002358', 'PVC COVER 2.8å…­æ’å¸¦è¾¹æŠ¤å¥—/é»‘ (CUA 20X16X60XD8)'),
    ('10002360', 'PROTECTOR DE TERMIN BANDERA DJ6211-D6.3A'),
    ('10002361', 'PROTECTOR H1802 DE TERMI DOBLE DJ222-4A'),
    ('10002362', 'PROTECTOR REDONDO DE TERMINAL DJ214-1.2A'),
    ('10002364', 'LIGHT GREEN SLEEVE L30 Ã¸7mm DJ3011-4-21'),
    ('10002365', 'PROTECTOR TERMIN DE OJO NEGRO 43x26x14mm'),
    ('10002366', 'PROTECTOR TERMIN HEM 6.3TRANSPA 22,7x7,6'),
    ('10002367', 'PROTECTOR TERMINA DE OJO ROJO 43x26x14mm'),
    ('10002369', 'PROTECTOR TERMINAL HEM NEG (DJ622-D4.8A)'),
    ('10002370', 'PROTECTOR TERMINAL HEM NEG (DJ622-D6.3A)'),
    ('10002371', 'PROTECTORBORNE BAT NEGROCUADRA 14x15Ã¸7mm'),
    ('10002372', 'PROTECTORBORNE BAT ROJO CUADRA 14x15Ã¸7mm'),
    ('10002373', 'RELE CMA36-S-DC12V-C-R (YBæœ‰é“èƒŒ) FLANGE'),
    ('10002375', 'RUBBER PROTECTOR CONECTOR DJJ7021-6.3-21'),
    ('10002377', 'SELLO OBTURADOR CONECTOR HDZ-66'),
    ('10002378', 'SELLO PARA TERMINA RS040-01000'),
    ('10002381', 'SELLO PARA TERMINA-TERMINAL SEAL HDJ-036'),
    ('10002382', 'TERMINAL BATTERY DJ4337-5 tin plated'),
    ('10002383', 'TERMINAL OJO DJ431-6A 0.6 tin plated'),
    ('10002384', 'TERMINAL OJO DJ431-6.2D 5mm2 tin plated'),
    ('10002385', 'TERMINAL EMPALME - SPLICE DJ454B BRASS'),
    ('10002386', 'TERMINAL EMPALME - SPLICE DJ454A BRASS'),
    ('10002387', 'TERMINAL FUSIBLE DE VIDRIO DJ221-5.7A'),
    ('10002388', 'TERMINAL FEMALE DJ625-F1.5A TIN PLATED'),
    ('10002389', 'TERMINAL FEMA DJ622-E2.3Ã—0.6 tin plated'),
    ('10002390', 'TERMINAL FEMALE DJ622-D6.3A tin plated'),
    ('10002391', 'TERMINAL FEM DJ621-E7.8B tin plated'),
    ('10002392', 'TERMIN FEM DJ623-F1.5A(12129373) Plated'),
    ('10002393', 'TERMINAL FEM DJ626-D4.8A tin plated'),
    ('10002394', 'TERMINAL FEM DJ622-E3.5A tin plated'),
    ('10002395', 'TERMINAL FEMALE DJ623-E6.3B tin plated'),
    ('10002396', 'TERMINAL FEM DJ626-F1.0A tin plated'),
    ('10002397', 'TERMINAL Female DJ624-1S Tin Plated'),
    ('10002398', 'TERMINAL HEM - FEMALE TERMINAL DJ621-6.3'),
    ('10002399', 'TERMINAL FAMALE DJ6211-D6.3A tin plated'),
    ('10002400', 'TERMINAL FEMALE DJ623C-1-0.6A tin plated'),
    ('10002401', 'TERMINAL FEM DJ622K-0.6X0.6A TIN PLATED'),
    ('10002402', 'TERM FEMALE DJ621-E2.8x0.5A HCB Plated'),
    ('10002403', 'TERMINAL DJ621-2.3AL (RFW-F-125) plated'),
    ('10002404', 'TERMINAL FAMALE DJ221-4A 0.3 tin plated'),
    ('10002405', 'TERM DJ624Y-0.6A (0.3-0.5mm2) tin plated'),
    ('10002406', 'TERM MALE DJ611-2.8x0.5A HCB Tin Plated'),
    ('10002407', 'TERMINAL MALE DJ612-2.2*0.6A tin plated'),
    ('10002408', 'TERMINAL MALE DJ611-6.3A tin plated'),
    ('10002409', 'TERMINAL MALE DJ611-2.3-0.6A tin plated'),
    ('10002410', 'TERMINAL MALE DJ211-4A tin plated'),
    ('10002412', 'TERMINAL DOBLE DJ223-3.5A tin plated'),
    ('10002465', 'TERMINAL EMPALME - SPLICE DJ454C BRASS'),
    ('10002466', 'TERMINAL EMPALME - SPLICE DJ454D BRASS'),
    ('10002468', 'FORRO SILLIN MRX 125- MY24 BAJO'),
    ('10002469', 'FORRO SILLIN MRX 150- MY24 BAJO'),
    ('10002470', 'SELLO PARA TERMINAL 281934-2 (HDZ-39)'),
    ('10002471', 'SELLO PARA TERMINAL 15324973 (HDZ-503)'),
    ('10002472', 'SELLO PARA TERMINAL HDZ-126'),
    ('10002484', 'TELA VINILICA RIDER GLOSSY NEW'),
    ('10002501', 'FORRO SIL-TVS-APACHE-EE-180-FRESH'),
    ('10002502', 'FORRO SILLIN MRX-EE-125-FRESH'),
    ('10002615', 'TUBO CORRUGADO (CONDUIT) Ã¸10 mm D10 mm'),
    ('10002616', 'TUBO CORRUGADO (CONDUIT) Ã¸8 mm D8 mm'),
    ('10002618', 'CABLE ROJO - RED WIRE 1.0 mmÂ²'),
    ('10002621', 'CABLE VERDE - GREEN WIRE 1.0 mmÂ²'),
    ('10002622', 'CABLE NARANJA - ORANGE WIRE 1.0 mmÂ²'),
    ('10002624', 'CABLE VERDE/AMAR - GREEN/YEL WIRE 1.0mmÂ²'),
    ('10002625', 'CABLE NEGRO/AMAR - BLACK/YEL WIRE 1.0mmÂ²'),
    ('10002626', 'CABLE BLANCO - WHITE WIRE 1.0mmÂ²'),
    ('10002627', 'CABLE NEGRO/BLANC-BLACK/WHIT WIRE 1.0mmÂ²'),
    ('10002628', 'CABLE VER/VIL-GREEN/VIOLET WIRE 0.75mm2'),
    ('10002629', 'CABLE GRIS - GRAY WIRE 0.75 mmÂ²'),
    ('10002630', 'CABLE AMARI/BLAN-YELLOW/WHI WIRE 0.75mmÂ²'),
    ('10002631', 'CABLE AZUL/ROJO - BLUE/RED WIRE 0.75mmÂ²'),
    ('10002632', 'CABLE ROSADO CLA - LIG PINK WIRE 0.75mmÂ²'),
    ('10002633', 'CABLE ROJO/AMARI-RED/YELLOW WIRE 0.75mmÂ²'),
    ('10002634', 'CABLE VERDE/NEG-GREEN/BLACK WIRE 0.75mmÂ²'),
    ('10002635', 'CABLE AZUL/BLANC-BLUE/WHITE WIRE 0.75mmÂ²'),
    ('10002636', 'CABLE NEGRO/ROJ - BLACK/RED WIRE 0.75mmÂ²'),
    ('10002637', 'CABLE AZUL CLARO-LIGHT BLUE WIRE 0.75mmÂ²'),
    ('10002638', 'CABLE ROJO/BLANCO-RED/WHITE WIRE 0.75mmÂ²'),
    ('10002639', 'CABLE VERDE/ROJO- GREEN/RED WIRE 0.75mmÂ²'),
    ('10002641', 'CABLE NARANJA - ORANGE WIRE 0.75 mmÂ²'),
    ('10002642', 'CABLE AMARILLO - YELLOW WIRE 1.0 mmÂ²'),
    ('10002643', 'CABLE VERDE/AMAR -GREEN/YEL WIRE 0.75mmÂ²'),
    ('10002644', 'CABLE NEGRO/AMAR -BLACK/YEL WIRE 0.75mmÂ²'),
    ('10002645', 'CONECTOR MALE GREEN DJ7061A-2.8-21'),
    ('10002646', 'CONECTOR MALE 4 WAYS DJ70413A-6.3-21'),
    ('10002652', 'RELAY CMA31 12V 30A/40A 4 PIN FLANGE'),
    ('10002653', 'PROTECTOR DE CAUCHO L=38mm Ã¸ 7 mm'),
    ('10002665', 'TERMINAL FEMALE DJ623-E6.3D tin plated'),
    ('10002668', 'TERMINAL FEM DJ221-3.5A 0.3 tin plated'),
    ('10002675', 'CLIP CONECT 12110250 16VIA DJ7161-1.5-21'),
    ('10002676', 'TAPA CONECT 12110250 16VIA DJ7161-1.5-21'),
    ('10002677', 'FORRO SIL-TVS-NTORQ-125-EE MY25'),
    ('10002678', 'FORRO SIL-TVS-NTORQ-125-MY25'),
    ('10002679', 'FORRO SIL-TVS-NEO-125-MY25'),
    ('10002680', 'FORRO SIL-TVS-APACHE 160/180 4V-MY25'),
    ('10002681', 'FORRO SIL-TVS-SPORT-MY25'),
    ('10002682', 'FORRO SIL-TVS-DAZZ-MY25'),
    ('10002683', 'FORRO SIL-TRA-TVS-N360-RAIDER-MY25'),
    ('10002687', 'FORRO SIL-VIC-LIFE-URBAN'),
    ('10002688', 'FORRO SIL-TVS-NEO-110-EE'),
    ('10002696', 'CONECTOR MAC ROJ 2VIAS DJ7021-2-21 RED'),
    ('10002697', 'TERMINAL MALE DJ211-3.5A tin plated'),
    ('10002699', 'DISPOSITIVO IOT COMPRADO'),
    ('10002704', 'CONECTOR HEM ROJ 2VIAS DJ7021-2-11J RED'),
    ('10002706', 'CONECTOR HEM BLANCO 2VIAS DJ7022-6.3 11'),
    ('10002707', 'CONECTOR MACHO BLANCO 2VIA DJ7022-6.3 21'),
    ('10002717', 'CONECTOR HEM BLANCO 6VIAS DJ70611-6.3-11'),
    ('10002718', 'CONECTOR MAC BLANCO 6VIAS DJ70611-6.3-21'),
    ('10002719', 'CONECTOR MALE BLACK 2WAYS DJ7021Y-1.8-21'),
    ('10002720', 'CONECTOR FEMALE BLACK DJ7021Y-1.8-11'),
    ('10002721', 'TERMINAL MALE DJ611-1.5B tin plated'),
    ('10002722', 'TERMINAL FEMALE DJ621-1.5B tin plated'),
    ('10002733', 'CAUCHO BAUL AGILITY'),
    ('10002734', 'CAUCHO COLA AGILITY'),
    ('10002735', 'CAUCHO RIBETE BAUL AGILITY (LARGO)'),
    ('10002736', 'CAUCHO RIBETE COLA AGILITY (CORTO)'),
    ('10002741', 'CONECTOR HEM BLANCO 6VIAS DJ7062-6.3-11'),
    ('10002744', '1FPF473201MP PLATE (COMPRADO)'),
    ('10002745', 'TERMINAL FUSE BX2091CL tin plated'),
    ('10002757', 'FORRO SIL-VIC-NITRO-125-EE-FRESH'),
    ('10002776', 'TERMI DJ7041Y-1.5-21(DJ621-T1.5A)Plated'),
    ('10002801', 'TERMINAL FEMALE DJ621-G2*0.6A tin plated'),
    ('10002802', 'FORRO SIL-VIC-ONE-PACIFICK'),
    ('10002803', 'FORRO SIL-AGILITY-FUSION PACIFICK'),
    ('10002915', 'CABLE ENCAUCHETADO 3X20 AWG Ã˜ EXT 6.3MM'),
    ('10002916', 'FORRO SILLIN-VICTORY BOMBER 125-MY26'),
    ('10002917', 'FORRO CON ELASTICO-SILLIN-BBL3'),
    ('10002918', 'TELA VINILICA MUESTRAS'),
    ('10002929', 'TUBO CORRUGADO (CONDUIT) Ã¸17 mm D17 mm'),
    ('10002930', 'CABLE ENCAUCHETADO 2X20 AWG Ã˜ EXT 6.3MM'),
    ('10002931', 'FORRO SILLIN HUNK 150 XT'),
    ('10002966', 'CONECTOR BLACK DJ70216Y 1.8 21'),
    ('10002971', 'TERMINAL FEMALE DJ621F'),
    ('10002986', 'FORRO-SIL-VICTORY-ARIZONA 200-NG-V2'),
    ('10002989', 'CONECTOR WHITE FW-C-4M-W'),
    ('10002992', 'FORRO SILLIN-VIC-MRX125-FACELIFT'),
    ('10002993', 'CORREA-SILLIN-TVS-SPORT-MY27'),
    ('10002995', 'TORNILLO C/HECX- M6X16 INOX'),
    ('10002996', 'ARANDELA PLANA Â¼'),
    ('10002997', 'TUERCA UÃƒâ€˜A M6 X 7,3mm'),
    ('10003198', 'CONECTOR FEMALE BLACK DJ70216Y 1.8 11'),
    ('10003199', 'CONECTOR MALE WHITE 2WAYS DJ7026-2-21'),
    ('10003200', 'TERMINAL MALE DJ611F-1.8A'),
    ('10003228', 'FORRO SILLIN TVS NEO 125 FI'),
    ('10003229', 'FORRO SILLIN BET ADV'),
    ('10003244', 'CONECTOR FEM WHITE 2WAYS DJ7026-2-11'),
    ('10003246', 'CONECTOR FEM DJ7021A-2.8-11 BLUE'),
    ('10003247', 'CONECTOR MALE 2WAYS DJ7021-2-21 BLACK'),
    ('10003248', 'CONECTOR FEM 2WAYS DJ7021-2-11J BLACK'),
    ('10003251', 'FORRO SILLIN KYMCO SKYTOWN'),
    ('10003252', 'RELÃ‰ + PORTARELÃ‰ 5 PINES'),
    ('10003264', 'CAUCHO ANTIVIBRANTE SILLIN D24'),
    ('10003265', 'FORRO SILLIN CITY X'),
    ('10003267', 'FORRO MRX 125 - 125S ED MOBIL ROJO-NEGRO'),
    ('10003268', 'FORRO MRX 150 ED MOBIL ROJO-NEGRO'),
    ('10003270', 'FORRO MRX ARIZONA ED MOBIL ROJO-NEGRO'),
    ('10003271', 'FORRO MRX 125 - 125S ED MOBIL GRIS-NEGRO'),
    ('10003272', 'FORRO MRX 150 ED MOBIL GRIS-NEGRO'),
    ('10003274', 'FORRO MRX ARIZONA ED MOBIL GRIS-NEGRO'),
    ('10003279', 'FOAMY SEMIRIGIDO ADH NEGRO 60*15*5 mm'),
    ('20000004', 'YUMBOLON 3 MM X 100 MT'),
    ('20000006', 'BOLSA PLASTICA 10INX14IN'),
    ('20000012', 'CAJA CARTON 930CK (600X400X300) MM'),
    ('20000017', 'ESTIBA MADERA 1.2 MT X 1.0 MT'),
    ('20000033', 'BOLSA PLASTICA 16X38 0,5 ALTA'),
    ('20000079', 'ESTIBA MADERA 1.2 MT X 1.0 MT AZUL TACO'),
    ('20000083', 'CINTA ADHESIVA TESA 2INX100M'),
    ('20000121', 'GRAPA PLASTICA PARA ZUNCHO'),
    ('20000122', 'ZUNCHO CAL 0.5 MM ANCHO 1/2'''''),
    ('20000168', 'BOLSA TRANSPARENTE ZIPLOC 6X8" CAL 2.0'),
    ('20000169', 'BOLSA TRANSPARENTE ZIPLOC 10X10" CAL 2.0'),
    ('20000172', 'BOLSA PLASTICA 16X38 0,5 ALTA SIN SELLO'),
    ('20000184', 'CAJA CARTON PRESENTACION TRAKKU V2'),
    ('23000000', 'CAJA BC 1130 ( 1140 X 865 X 380 ) RC'),
    ('28000015', 'GRASA SHELL GADUS S2 V220'),
    ('28000021', 'LIMPIADOR CRC CONTAC CLEANER'),
    ('28000024', 'CINTA TEFLON 19MM X0.1MM X50M'),
    ('28000030', 'SHELL TELLUS S2 M 46'),
    ('28000050', 'SILICONA CRC H.D. X 400 CC'),
    ('28000064', 'ACEITE HIDRAULICO PARA STILL FM-X14'),
    ('28000065', 'VALVULINA PARA STILL FM-X14'),
    ('28000067', 'DIOCTIL FTALATO (DOP) GARRAFA DE 18KG'),
    ('28000124', 'VARSOL TECNO PINTS'),
    ('28000226', 'CREMA PARA SOLDAR ESTAÃ‘O'),
    ('28000227', 'ESTAÃ‘O EN BARRA 63/37'),
    ('28000228', 'PEGANTE XL ADHESIVO MADERA SPRAY PRACTI'),
    ('28000279', 'WETCOOL 316 INHIBIDOR CORROSION CERRADO'),
    ('28000280', 'WETCOOL 703 BIOCIDA'),
    ('28000288', 'COMPUESTO LUBRILLANTAS 8 LBS'),
    ('28000296', 'SUPERLUB PENETRANTE 16 OZ'),
    ('28000306', 'DESMOLDANTE INTERMOLD 364'),
    ('28000366', 'DILUYENTE AUTOMOTRIZ'),
    ('28000367', 'ENDURECEDOR SEMI-RÃPIDO'),
    ('28000368', 'PINTURA SEMIMATE POLIURETANO CANNON'),
    ('28000376', 'PEGANTE HOT MELT 41214'),
    ('28000391', 'PINTURA POLIURETANO NEGRO AZULOSO'),
    ('28000392', 'PINTURA POLIURETANO BLANCO'),
    ('28000393', 'PINTURA POLIURETANO AMARILLO ROJIZO'),
    ('28000407', 'THINNER METALIZADO PARA POLIURETANO'),
    ('30000034', 'JABON LIQUIDO DE MANOS'),
    ('30000038', 'SERVILLETA CAFETERIA'),
    ('30000040', 'ESCOBA PLASTICA FLEXIBLE'),
    ('30000041', 'TRAPERO DE ALGODÃ“N CON MANGO'),
    ('30000049', 'AROMATICA TERESITA X 20'),
    ('30000050', 'AROMATICA CUBO PANELA X 48'),
    ('30000053', 'AZUCAR BLANCA X 1 KG'),
    ('30000054', 'AZUCAR BCA X 5 LB'),
    ('30000060', 'ESPONJA D/MALLA LA NEGRA'),
    ('30000068', 'BOLSA 60X85 CAL .8 AD AZUL'),
    ('30000070', 'BOLSA ROJA (70X90)'),
    ('30000081', 'GUANTE KLEENGUARD G80 TALLA 9'),
    ('30000087', 'GAFA SEG KLEENGUARD NEMESIS V30'),
    ('30000100', 'BOTA PUNTERA DAMA TALLA 39'),
    ('30000101', 'BOTA PUNTERA TALLA 38'),
    ('30000103', 'BOTA PUNTERA TALLA 40'),
    ('30000105', 'BOTA PUNTERA TALLA 42'),
    ('30000106', 'BOTA PUNTERA TALLA 43'),
    ('30000107', 'BOTA PUNTERA DAMA TALLA 34'),
    ('30000108', 'BOTA PUNTERA DAMA TALLA 37'),
    ('30000109', 'BOTA PUNTERA DAMA TALLA 38'),
    ('30000116', 'GORRA DRIL GRIS CON LOGO REF 098'),
    ('30000126', 'SOBRE DE MANILA TAMAÃ‘O CARTA'),
    ('30000129', 'RESMA BLANCO TAMAÃ‘O OFICIO'),
    ('30000131', 'TALONARIO TARJETA TPM ROJO'),
    ('30000132', 'TALONARIO TARJETA TPM AZUL'),
    ('30000134', 'PAR DE PILAS AAA'),
    ('30000137', 'LAPICERO NEGRO'),
    ('30000183', 'RESPIRADOR CONTRA POLVOS'),
    ('30000186', 'CARTUCHO VAPORES ORGANICOS ( 3M)'),
    ('30000196', 'BOTA PUNTERA TALLA 36'),
    ('30000197', 'OVEROL TALLA 34 MC'),
    ('30000198', 'OVEROL TALLA 36 MC'),
    ('30000199', 'OVEROL TALLA 38 MC'),
    ('30000201', 'OVEROL TALLA 40 MC'),
    ('30000203', 'OVEROL TALLA 42 MC'),
    ('30000206', 'OVEROL TALLA 46 MC'),
    ('30000207', 'OVEROL TALLA 42 ML'),
    ('30000209', 'OVEROL TALLA 40 ML'),
    ('30000210', 'OVEROL TALLA 38 ML'),
    ('30000211', 'OVEROL TALLA 36 ML'),
    ('30000212', 'OVEROL TALLA 48 ML'),
    ('30000213', 'OVEROL TALLA 44 ML'),
    ('30000214', 'OVEROL TALLA 48 MC'),
    ('30000215', 'OVEROL TALLA 46 ML'),
    ('30000228', 'BLUE JEAN TALLA 32'),
    ('30000229', 'BLUE JEAN TALLA 30'),
    ('30000230', 'BLUE JEAN TALLA 34'),
    ('30000231', 'BLUE JEAN TALLA 36'),
    ('30000233', 'BLUE JEAN TALLA 40'),
    ('30000239', 'KIT CAMISETA TIPO POLO MC TALLA L - HOM'),
    ('30000242', 'PANTALON BRIGADA TALLA 28'),
    ('30000244', 'CAMISA POLO CORTA BRIGADA TALLA S'),
    ('30000245', 'CAMISA POLO CORTA BRIGADA TALLA M'),
    ('30000246', 'CAMISA POLO CORTA BRIGADA TALLA L'),
    ('30000247', 'CAMISA POLO CORTA BRIGADA TALLA XL'),
    ('30000248', 'CAMISA DRILL LARGA BRIGADA TALLA S'),
    ('30000250', 'CAMISA DRILL LARGA BRIGADA TALLA L'),
    ('30000251', 'PANTALON BRIGADA TALLA 30'),
    ('30000252', 'PANTALON BRIGADA TALLA 32'),
    ('30000253', 'PANTALON BRIGADA TALLA 34'),
    ('30000254', 'PANTALON BRIGADA TALLA 36'),
    ('30000268', 'PANTALON BRIGADA TALLA 38'),
    ('30000284', 'BOTA PUNTERA DAMA TALLA 36'),
    ('30000341', 'TONER HP LASERJET 505 RM'),
    ('30000380', 'ALICATE DE PUNTA LARGA'),
    ('30000487', 'BOTA PUNTERA TALLA 44'),
    ('30000516', 'TABLA CON GANCHO'),
    ('30000518', 'TARJETA AMARILLA PRODUCTO NO CONFORME'),
    ('30000526', 'BOLSILLO DE LAMINACIÃ“N'),
    ('30000623', 'REGLA METALICA MILIMETRICA ANCHO 1"'),
    ('30000736', 'CONECTOR 90Âº GIRAT 1/4 TUBO DIAM 8MM'),
    ('30000738', 'CONECTOR RECTO 1/4 TUBO DIAM 8MM'),
    ('30000750', 'INTERRUPTOR DE GIRO ON/OFF CHIN'),
    ('30000754', 'KIT REP VALV SB1 GUARNI 0.200.000.183'),
    ('30000762', 'CORREA 1180MM SULLAIR 88290015-901'),
    ('30000763', 'FILTRO TUBO DE RETORNO 88290015-890'),
    ('30000764', 'KIT REP VALV TERMICA(185Â°F) 02250144-326'),
    ('30000765', 'KIT REP VALV ADMISION 02250176-967'),
    ('30000766', 'KIT REP VALV PRESION MINIMA 02250050-612'),
    ('30000768', 'KIT REEMPLAZO DE MANGUERA 02250181-735'),
    ('30000892', 'SILLIN CKD UNIK'),
    ('30000893', 'SILLIN CKD URBAN S'),
    ('30000900', 'BISTURI STANLEY RETRACTIL 10-143'),
    ('30000906', 'RESALTADOR'),
    ('30000934', 'BAJALENGUAS PAQUETE X 20'),
    ('30000943', 'CAJA DE PARCHE OCULAR X20'),
    ('30000992', 'TOMA 5821-I LEVITON P.T 20A 250V CREMA'),
    ('30001031', 'LAPIZ NEGRO #2'),
    ('30001035', 'PLANILLAS DE CONTEO'),
    ('30001126', 'CINTA DOBLE FAZ EXTRA FUERTE 19MMX20M 3M'),
    ('30001196', 'CAJA CURITAS COLOR PIEL'),
    ('30001197', 'GASA ESTERIL 15*15 * 24 UND'),
    ('30001199', 'AGUJAS 0.80MMX38MM NÂº 21'),
    ('30001202', 'TIJERA CORTATODO'),
    ('30001206', 'ALCOHOL ANTISEPTICO 700 ML GRANDE'),
    ('30001208', 'ESPARADRAPO 1*5'),
    ('30001211', 'BOLSILLO CATALOGO CARTA'),
    ('30001212', 'BOLSILLO CATALOGO OFICIO'),
    ('30001351', 'MARCADOR INDUSTRIAL SHARPIE NEGRO'),
    ('30001352', 'MARCADOR SHARPIE SANFORD P-FINA NEGRO'),
    ('30001353', 'PEGANTE 40 GRS PEGASTICK'),
    ('30001355', 'BOLSA NEGRA (70X90)'),
    ('30001387', 'GRAPA PARA COSEDORA'),
    ('30001389', 'TONER NEGRO LASER JET 26A CF226A'),
    ('30001393', 'TINTA PARA SELLO'),
    ('30001472', 'CINTA DYMO BLANCA 12MMX4MM'),
    ('30001514', 'BURIL HSS 3/8"'),
    ('30001540', 'PARO EMERGENCIA SCHNEIDER XALK178'),
    ('30001662', 'CONDULETA TIPO T DE 1/2"'),
    ('30001683', 'FUSIBLE 5X20MM 1 AMP PARA BORNERA F4U'),
    ('30001837', 'SWITCHE SENCILLO BLANCO LV-1451'),
    ('30001885', 'RACOR 90Â° DE 1/4" NPT A 10MM OD'),
    ('30001905', 'MANGUE 1/2" ACOPLADA REFRIG MOLDES 0,9 M'),
    ('30001909', 'ABRAZADERA CREMALLERA INOX 30-008 16X25'),
    ('30001991', 'ANTIVIBRANTE SILLIN ADV RHB44184A0A00'),
    ('30001992', 'ANTIVIBRANTE SILLIN ADV RHC44185A0A00'),
    ('30001993', 'ANTIVIBRANTE SILLIN ADV RHB44183A0A00'),
    ('30002039', 'CORTAFRIO 6â€'),
    ('30002205', 'ETIQUETADORA PLASTICA MOTEX MX-5500'),
    ('30002230', 'LLAVE HEXAGONA EN "T" DE 4MM'),
    ('30002371', 'VALV TERMOSTATICA 02250092-081 SULLAIR'),
    ('30002436', 'CINTA EN CERA 110MMX300MT'),
    ('30002439', 'TRAJE BLANCO KLEENGUARD A70'),
    ('30002528', 'CINTA AMARILLA 2" DEMARCACION'),
    ('30002615', 'GUANTE LATEX BLANCO'),
    ('30002927', 'BATOLA TALLA S/36'),
    ('30002928', 'BATOLA TALLA M/38'),
    ('30002931', 'BATOLA TALLA XXL/44'),
    ('30002998', 'COSEDORA DE PAPEL'),
    ('30003027', 'RESPIRADOR CONTRA HUMOS 3M 8214'),
    ('30004567', 'PANTALON BRIGADA TALLA 42'),
    ('30005487', 'CRONOMETRO DIGITAL DE MANO'),
    ('30005493', 'NO USAR ESTOS CODIGOS (RESP SST)'),
    ('30005631', 'ESTIBA ANTIDERRAME SOLCO652 14X63.5X63.5'),
    ('30005837', 'BASE CKD SILLIN MRX 150-MRX 200'),
    ('30005866', 'PILA PLANA SONY CR2032'),
    ('30006024', 'PANTALON BRIGADA TALLA 40'),
    ('30006029', 'KIT ACCESORIOS BASE SILLIN LIFE R8'),
    ('30006122', 'BOTA PUNTERA ANTIESTATICA TALLA 38'),
    ('30006127', 'BOTA PUNTERA ANTIESTATICA TALLA 43'),
    ('30006128', 'BOTA PUNTERA ANTIESTATICA TALLA 44'),
    ('30006129', 'CAMISA POLO CORTA BRIGADA TALLA XXL'),
    ('30006212', 'NO USAR ESTOS CODIGOS (RESP SST)'),
    ('30006262', 'STPQUAT X 2KG TAPETE'),
    ('30006266', 'MICROFIBRA BAYETILLA VERDE'),
    ('30006269', 'AMBIENTADOR LIQUIDO BAMBU GLN GENERICO'),
    ('30006270', 'TRAPEADOR 500 GR ROSCA AZUL'),
    ('30006271', 'SABRA AZUL 3M X UNI'),
    ('30006274', 'BOLSAS NEGRA 60X85 CAL 0.8MM'),
    ('30006377', 'TARRO ATOMIZADOR 500ML'),
    ('30006380', 'REPUESTO CARETA FACIAL VISOR NEGRO'),
    ('30006405', 'SILLIN CKD MRX 125'),
    ('30006558', 'PREFILTRO 3M N95'),
    ('30006559', 'RETENEDOR PARA FILTRO 3M 6001'),
    ('30006593', 'CORTINA ENROLLABLE TELA BLACKOUT'),
    ('30007296', 'HERRAJE PARA FOLDER 3 ARGOLLAS 1" X 28CM'),
    ('30007310', 'BASE CKD TVS SPORT 100'),
    ('30007591', 'SILLIN CKD COMBAT 125'),
    ('30007593', 'SILLIN CKD VICTORY ST 100'),
    ('30007675', 'BASE CKD SILLIN NTORQ 125'),
    ('30007772', 'BATOLA XS/6 DAMA BRIGADA'),
    ('30007786', 'BATOLA L/40 HOMBRE BRIGADA'),
    ('30007787', 'BATOLA M/38 HOMBRE BRIGADA'),
    ('30007788', 'BATOLA S/36 HOMBRE BRIGADA'),
    ('30007789', 'BATOLA XL/42 HOMBRE BRIGADA'),
    ('30007793', 'BATOLA M/38 HOMBRE LIDER EVACUACION'),
    ('30007799', 'JABÃ“N LAVALOZA BLANCOX LIMON X3800ML'),
    ('30007857', 'MEZCLADORES CAFÃ‰ DE MADERA X500UNI'),
    ('30007867', 'BASE CKD SILLIN TVS NEO'),
    ('30007922', 'BASE CKD APACHE RTR 200 DEL'),
    ('30007923', 'BASE CKD APACHE RTR 200 TRA'),
    ('30008385', 'BOLSA BLANCA(70X90)'),
    ('30008462', 'GUANTE ANSELL EDGE 48-929 T-9'),
    ('30008463', 'GUANTE ANSELL EDGE 48-929 T-10'),
    ('30008465', 'CINTA REFLECTIVA VERDE 2" X 25M'),
    ('30008521', 'BASE CKD SILLIN DEL N360'),
    ('30008522', 'BASE CKD SILLIN TRAS N360'),
    ('30008527', 'POCILLO TE 250C PP1100704324'),
    ('30008541', 'REVISTERO METÃLICO'),
    ('30008580', 'MATERIAL ABSORBENTE KIT DERRAMES'),
    ('30008802', 'AMORTIGUADOR SILLIN 12 MM M 1237.2301A'),
    ('30009488', 'BASE CKD SILLIN HUNTER-X1-150'),
    ('30009632', 'GUANTE ANSELL HYFLEX 11-840 TALLA 8'),
    ('30009791', 'BASE-CKD-SIL-TVS-DAZZ-125'),
    ('30009820', 'DISPENSADOR CINTA ADHESIVA TESA'),
    ('30009823', 'ALCOHOLIMETRO'),
    ('30010611', 'PIGMENTO NEGRO MB 11 625/E'),
    ('30010666', 'CAMISA POLO CORTA BRIGADA TALLA XS'),
    ('30010692', 'RESMA NATURAL ECOLOGICA CARTA'),
    ('30010693', 'RESMA NATURAL ECOLOGICA OFICIO'),
    ('30010696', 'PAPHIG 4x200M NAT DOBHOJ CENTRAL X 4'),
    ('30010895', 'KIT CAMISA POLO HOMBRE WINDOW PERSO T-M'),
    ('30010902', 'OVEROL AZUL DRILL TALLA 38 MC'),
    ('30010904', 'OVEROL AZUL DRILL TALLA 42 MC'),
    ('30010906', 'OVEROL AZUL DRILL TALLA 46 MC'),
    ('30011102', 'CONO DE SEÃ‘ALIZACIÃ“N'),
    ('30011292', 'CORTINA PARA DUCHA Y LAVA OJOS'),
    ('30011473', '1FPF473201MP PLATE ( CKD)'),
    ('30011482', 'ESTIBA ANTIDERRAME SOLCO654 14x63.5x125'),
    ('30011902', 'TEST DE DEDOS SUELTOS'),
    ('30012228', 'FILTRO TELA PARA GRECA DE 30 TINTOS'),
    ('30012340', 'ESPEJO CAFE 79X108 CM'),
    ('30012891', 'CAFE GRANULADO LA BASTILLAX 5 LIBRAS'),
    ('30013111', 'BASE CKD TVS NEO 125 FI'),
    ('30013112', 'BASE CKD BET ADV'),
    ('30013114', 'TOALLA MANOS ROLLO X 200MTS (X 6 ROLLOS)'),
    ('30013115', 'PAPEL HIGIENICO JRT 2P 6X320 ( 6 ROLLOS)'),
    ('30013197', 'TIRA DE GOMA ASIENTO BET ADV'),
    ('30013362', 'BISEL DV21 - BWPF475M00RP'),
    ('30013364', 'BASE CKD CITY X'),
    ('49000023', 'BROCA HSS Ã˜1/4IN'),
    ('49000036', 'MACHUELO HELIC M6-1MM'),
    ('49000081', 'BROCA HSS Ã˜1/8IN'),
    ('49000087', 'BROCA HSS Ã˜27/64IN'),
    ('49000167', 'BROCHA 2IN'),
    ('49000260', 'SUICHE BASCULANTE LED VERDE 120V EMP.'),
    ('49000261', 'SUICHE BASCULANTE LED ROJO 120V EMP.'),
    ('49000263', 'TOMACORRIENTE LEVITON T5320-W 15AMP 125V'),
    ('49000277', 'CINTA SCOTH 33'),
    ('49000295', 'BALIZA AZUL EBCHQ 17785 LED AC 110 V'),
    ('49000296', 'BALIZA AMARILLA EBCHQ 17773 LED AC 110'),
    ('49000297', 'BALIZA ROJA- VERDE + BASE EBCHQ 17755 L'),
    ('49000298', 'CONTACTOR LC1D025'),
    ('49000425', 'RACOR RECTO Â¼ NPT 8 MM OD B68-08M-4'),
    ('49000426', 'RACOR CODO Â¼ NPT 8 MM OD B69-08M-4'),
    ('49000433', 'ELECTROVALV MICRO 5/2 DE 1/4 A 110V'),
    ('49000444', 'UNID MMT 1/2IN MICRO 0.103.003.564.'),
    ('49000601', 'ELECTRODO SOLDADURA E-6011 Ã˜1/8IN'),
    ('49001030', 'CORREA PLASTICA T10 X 25CM'),
    ('49001125', 'LIJA # 800'),
    ('49001126', 'LIJA # 1000'),
    ('49001127', 'LIJA # 1500'),
    ('49001128', 'PLIEGO LIJA DE AGUA GRANO 2000'),
    ('49001190', 'AGUA DESMINERALIZADA PARA BATERIA'),
    ('49001214', 'UNION 1/4" NPT'),
    ('49001220', 'ELEMENT DRYING INSERT 4818613'),
    ('49001221', 'ORINGS FILTRO LAMINILLAS SUCCION 4642061'),
    ('49001222', 'CARTUCHO FILTRO LAMINILLAS SUCCI 4642059'),
    ('49001223', 'CARTUCHO FILTRO ALTA PRESION ISO 4634102'),
    ('49001224', 'ORINGS FILTRO ALTA PRESION ISO 4641632'),
    ('49001225', 'CARTUCHO FILTRO ALTA HIDRAULICO 4632325'),
    ('49001226', 'ORINGS FILTRO ALTA HIDRAULICO 4636297'),
    ('49001227', 'CARTUCHO FILTRO RETORNO HIDRAULI 4640367'),
    ('49001228', 'CARTUCHO FILTRO AIRE HIDRAULICO 8383435'),
    ('49001229', 'ORINGS FILTRO AIRE HIDRAULICO 4811767'),
    ('49001246', 'ENSAMBLE PISTON SENCO 107AT'),
    ('49001248', 'ALIMENTADOR SENCO 411AT'),
    ('49001249', 'UNION RECTA 25MM ALUMINIO AIREXPRESS'),
    ('49001250', 'CODO NEU ALUMINIO 25MM AIREXPRESS'),
    ('49001251', 'UNION ROSCADA MACHO 25MM 1" AIREXPRESS'),
    ('49001252', 'UNID. MMT G1/4" MICRO 0.103.003.532/ME'),
    ('49001253', 'SWITCH RETENCION SCHNEIDER XB4BD33 3POS'),
    ('49001254', 'INTR DISPARO RAPIDO SCHNEIDER 16AM 1POL'),
    ('49001255', 'INTR DISPARO RAPIDO SCHNEIDER 3 AM 1POL'),
    ('49001256', 'BORNERA RIEL OMEGA 22-12 AWG'),
    ('49001257', 'CONTROL FLUJO G1/4 TUBO DIAM 8MM'),
    ('49001258', 'MANGUE ESPIRAL PU DIAM EXT 8MM AZUL'),
    ('49001259', 'ACOPLE RAPIDO NEU ESCUAL Â¼â€NPTX8MM'),
    ('49001260', 'SILENCIADOR CONICO 1/4 BRONCE'),
    ('49001261', 'REGULADOR NEU 8MMOD 0.477.000.800'),
    ('49001263', 'SELECTOR 2 POS XB4BD21 CON 2 CONTACTOS'),
    ('49001264', 'LAMPARA HERMETICA (200-500)LUXES 110V 1M'),
    ('49001265', 'TUBO LED 28W T8 6500K DI 100-240 VIDRIO'),
    ('49001266', 'TEMPORIZADOR SCHNEIDER DE 0-15 MIN 110V'),
    ('49001267', 'CONTROLADOR TEMP MAXTHERMO 5438'),
    ('49001268', 'RELE EST SOLIDO 40AMP 24-380V OUT 3-32DC'),
    ('49001269', 'TERMOCUPLA TIPO K BULBO 10X3.16CM'),
    ('49001270', 'DISIPADOR DE CALOR 15 AMP PARA SSR'),
    ('49001271', 'RESISTENCIA CIRCULAR 220 V 2000 W'),
    ('49001272', 'KIT REP GUARNI CILIN 0.047.000.101'),
    ('49001273', 'GUAYA 1/8"'),
    ('49001274', 'FUSIBLE CAPSULA CORTO 10MM 0.5AMP'),
    ('49001275', 'LUBRICANTE SULLUBE 32 250022-670'),
    ('49001276', 'FILTRO DE ACEITE 88290014-484'),
    ('49001277', 'FILTRO DE AIRE 88290014-486'),
    ('49001279', 'FILTRO ACEITE PARA STILL FM-X14'),
    ('49001280', 'FILTRO DE AIRE PARA STILL FM-X14'),
    ('49001281', 'BREAKER 1X20A EMPOTRAR'),
    ('49001282', 'BREAKER 3X30A EMPOTRAR'),
    ('49001283', 'BREAKER 2X30A EMPOTRAR'),
    ('49001295', 'GUARDAMOTOR SCHNEIDER 440V 2.5-4A OMEGA'),
    ('49001309', 'LOCTITE EA 3463 METAL MAGIC STEEL'),
    ('49001343', 'MANGUERA PU AZUL 12MM'),
    ('49001344', 'RACOR RECTO 1/4" NPT A 12MM OD'),
    ('49001347', 'TERMINAL PLANA HEMBRA PARA CALIBRE 16'),
    ('49001384', 'CINTA DE ENMASCARAR 24MMX40M SOLUCIONES'),
    ('49001398', 'STICKER AZUL'),
    ('49001412', 'CLAMP MOLDE ESPUMA FABRIC TALLER COLAUTO'),
    ('49001422', 'TALCO INDUSTRIAL PARA RESINA POLIESTER'),
    ('49001423', 'RESINA POLIESTER'),
    ('49001424', 'COBALTO AL 6% PARA RESINA POLIESTER'),
    ('49001425', 'PEROXIDO PARA RESINA POLIESTER'),
    ('49001432', 'RODOS TELA #80'),
    ('49001433', 'RODOS TELA #100'),
    ('49001434', 'RODOS TELA #120'),
    ('49001435', 'RODOS TELA #160'),
    ('49001436', 'PORTA RODOS VASTAGO 1/4'),
    ('49001437', 'PAPEL LIJA DE AGUA PARA METAL #80'),
    ('49001438', 'PAPEL LIJA DE AGUA PARA METAL #100'),
    ('49001439', 'PAPEL LIJA DE AGUA PARA METAL #120'),
    ('49001442', 'PAÃ‘O RETAZO (DIMENSIÃ“N 50CMX50CM)'),
    ('49001499', 'HOJA SIERRA MANUAL DE 12 MM'),
    ('49001513', 'ESPATULA 3M REF PA-1 ACENTADOR'),
    ('49001730', 'BOQUILLA PARA INFLADOR DE LLANTAS'),
    ('49001810', 'KIT TOMA DE MUESTRAS DE ACITES'),
    ('49001861', 'REMACHE POP 3/16 X 3/4'),
    ('49001870', 'MULTIMETRO UNI-T REF UT191T'),
    ('49001871', 'PELACABLE 8PK371D 10-24 AWG'),
    ('49001872', 'PONCHADORA TERMINAL DESNUDA 10-22AWG'),
    ('49001875', 'CAUTIN WELLER WL100 REGULABLE'),
    ('49001926', 'MANGUE PU AZUL 10 MM'),
    ('49001967', 'SEMICODO A 45Â° PVC PRESION 1"'),
    ('49002011', 'CINTA ELECTRICA F/VIDRIO SCOTCH 27 3/4"'),
    ('49002061', 'TARJETA VERDE PP-P IMPRESA MANIFOLD 60GR'),
    ('49002062', 'LAPIZ CORRECTOR LIQUID PAPER'),
    ('49002073', 'PUNTA CONICA CAUTIN WLC100 Ã˜ 1/32â€'),
    ('49002080', 'CRISOL SOLDADURA DE ESTAÃ‘O'),
    ('49002081', 'EXTRACTOR DE HUMO'),
    ('49002098', 'CHEQUEADOR PARA CONTROL INTERNO'),
    ('49002116', 'DISPO. AJUSTE A TANKE DUKE 200'),
    ('49002117', 'GUIA PLASTICA ENSAMBLADORA DE LLANTAS'),
    ('49002195', 'TORNILLO AUTOPERFORANTE HEX 1" CAL10'),
    ('49002216', 'RESORTE REF 306094I0014'),
    ('49002217', 'EMPUJA GRAPA SENCO REF 306096I0007'),
    ('49002218', 'ENSAMBLE PISTON REF 306096I0001'),
    ('49002219', 'ORING DE GRAPADORA SENCO SFW09-F'),
    ('49002220', 'TOPE SENCO REF 306089I0007'),
    ('49002322', 'SELLO MECANICO DE 14 MM RESORTE CONICO'),
    ('49002350', 'LOCTITE 243 X 50 ML'),
    ('49002411', 'CARCASA PARA CHARGER DOCTOR'),
    ('49002563', 'CINTA DE ENMARCAR ADHESIVA'),
    ('49002577', 'CHAZO PLASTICO 1/4Â¨ X 1 1/2Â¨ CON TORNI'),
    ('49002606', 'MANGUERA DE AIRE 8MM NEGRA'),
    ('49002608', 'MANGUE AIRE- AGUA DE 1/4 A 300PSI NEGRA'),
    ('49002609', 'FUSIBLE CON RETARDO DE 3,15A 5X20'),
    ('49002611', 'SWITCH INTERRUPTOR FLUJO DE 1"'),
    ('49002623', 'RESORTE CORTO PELACABLE USB'),
    ('49002624', 'RESORTE LARGO PONCHADORA USB'),
    ('49002717', 'ARRASTRADOR DE TERMINAL PONCHADORA'),
    ('49002718', 'GUIAS DE PONCHADO (PUNTA)'),
    ('49002719', 'FUSIBLE CORTO 8A 250V'),
    ('49002720', 'INTERRUPTOR PILOTO 20A 250V COLOR ROJO'),
    ('49002721', 'INTERRUPTOR DE PEDAL 10A 250VAC'),
    ('49002722', 'TERMICO SCHNEIDER LRD340'),
    ('49002723', 'RELE SCHNEIDER RXM4AB2P7 230VAC 4PDT'),
    ('49002724', 'TEMPO ICM102 18V-240VAC 0.03 A 10 MIN'),
    ('49002725', 'CONTACTOR SCHNEIDER LC1D50A 220V'),
    ('49002726', 'BREAKERMATIC 3 FASES 250V'),
    ('49002727', 'BLOQUE DE CONTACTOS SCHNEIDER LADN22'),
    ('49002728', 'BREAKER SCHNEIDER IK60N 1P 32A'),
    ('49002729', 'TERMICO SCHNEIDER LRD340 25A'),
    ('49002730', 'PORTAFUSIBLE RT18-32X'),
    ('49002731', 'ELECTROVALVULA 5/2 MICRO VM18 1/4" 24VDC'),
    ('49002732', 'REGULADOR CAUDAL MINDMAN MSC200-8A'),
    ('49002733', 'INTERRUPTOR MULETILLA SCNEIDER XB4D21'),
    ('49002735', 'PULSADOR ROJO SCHNEIDER XB4BA42'),
    ('49002743', 'RODAMIENTO 6206 2Z C3'),
    ('49002758', 'RACOR 90Â° 1/2" NPT 10MM OD'),
    ('49002759', 'RACOR 90Â° 3/8" NPT 8MM OD'),
    ('49002761', 'PILOTO LED EBCHQ 220V 20MA AMARILLO'),
    ('49002786', 'GRAPADORA NEUMATICA SFW09'),
    ('49002794', 'PINZAS DE SUJECION HORNO SILLINES'),
    ('49002799', 'GRATA EN COPA PULIDORA 4 1/2'),
    ('49002800', 'DISCO CORTE DE METAL 4 1/2'),
    ('49002807', 'RACOR RECTO 1/2 NPT X 12 MM OD'),
    ('49002818', 'ABRAZADERA META CREMALLERA 1".'),
    ('49002844', 'CHAZO MARIPOSA'),
    ('49002886', 'CAUCHO N NE 1/8" C/L 1.2 MTS ANCHO'),
    ('49002888', 'JUNTAS TÃ“RICAS 0725178'),
    ('49002889', 'JUNTAS TÃ“RICAS 0725068'),
    ('49002890', 'ARO ESTANQUEIDAD GOULOTTE 0725810'),
    ('49002891', 'AGUJA BOQUILLA 4607755'),
    ('49002892', 'AGUJA BOQUILLA 4619100'),
    ('49002894', 'CONO DE BOQUILLA 1 8 TIPO A 4616497'),
    ('49002896', 'ELEMENT FILTER 8383435'),
    ('49002951', 'FUSIBLE VIDRIO 0,5 AMP 250VAC 5X30MM'),
    ('49002972', 'RACOR RECTO 1/4" NPT 10MM OD'),
    ('49002976', 'BOMBILLO PHILIPS 12V 5,5W LED'),
    ('49002978', 'CLAVIJAMACHO POL TIERRA 15A-250V CODELCA'),
    ('49002979', 'WYPALL X-80 ROLLO'),
    ('49002993', 'BROCA DE MURO DE 1/8'),
    ('49003007', 'FUSIBLE 5X20MM 2 AMP PARA BORNERA F4U'),
    ('49003171', 'BROCA DE MURO 1/4"'),
    ('49003341', 'FUSIBLE VIDRIO 6X30MM 15AMP'),
    ('49003556', 'IMAN REDONDO DIAM 2CM'),
    ('49003612', 'TOBERA D1,2 - 10MM O.D. - 4602351'),
    ('49003670', 'LAPIZ OPTICO PANTALLA TACTIL'),
    ('49003698', 'MANGUE HIDRAU ALTA PRES CABEZAL -4633859'),
    ('49003699', 'MANGUE HIDRAU ALTA PRES CABEZAL -4635325'),
    ('49003729', 'VALVULA BOLA 3/8" INOX'),
    ('49003747', 'TARJETERO AZUL TPM'),
    ('49003772', 'RODAMIENTO 6307 ZZ-C3'),
    ('49003773', 'RETENEDOR 30X42X7'),
    ('49003793', 'VALVULA BOLA 1/2" INOX'),
    ('49003808', 'RESORTE PEDAL MONTALLANTAS L120XD14XE2'),
    ('49003831', 'KIT 5 PUNTAS PARA BOQUILLA PISTOLA GRACO'),
    ('49003860', 'LLAVE MIXTA 9MM'),
    ('49003981', 'LIMA PLANA BASTARDA 4" STARREETT'),
    ('49004000', 'TORNILLO DE ENSAMBLE HEX 3/4" CAL10'),
    ('49004010', 'REMACHE POP DE 1/8 X 1"'),
    ('49004026', 'LIJA # 2500'),
    ('49004104', 'ETIQUETA ADHESIVA 100MMX150MM'),
    ('49004120', 'CARTUCHO FILTRO ALTA ISO CANNON 293331-0'),
    ('49004145', 'PLUG RJ45'),
    ('49004147', 'RACOR RECTO RAPIDO 6 MM OD X 1/8" NPT H'),
    ('49004154', 'PRENSA ESTOPA PG11'),
    ('49004176', 'TORNILLO AUTOPERFORANTE CILIN 1/2" CAL10'),
    ('49004208', 'MEMBRANA PULSADOR 0610881'),
    ('49004237', 'TORNILLO DE ENSAMBLE CILIN 1" CAL8'),
    ('49004273', 'RELE TERMICO LRD340 (30-40 A)'),
    ('49004402', 'SWITCH/INTERRUPTOR SENCILLO CONMUTABLE'),
    ('49004492', 'TEE 1 1/2" PRESIÃ“N'),
    ('49004540', 'SELLO MECÃNICO FN-24 24MM'),
    ('49004585', 'MANGUERA NYLON 1/4" GRACO X1M'),
    ('49004629', 'COPA CUADRANTE 3/8" HEXAGONAL 6MM'),
    ('49004692', 'TERMINAL EN U TIPO HERRADURA CAL 20'),
    ('49004695', 'TUBERÃA EMT 1/2"'),
    ('49004697', 'CURVA EMT 1/2"'),
    ('49004787', 'CONTADOR DE CICLOS CVPL-B'),
    ('49004851', 'EMPAQUE ACOPLE OPW 1" VITON'),
    ('49004863', 'TOMA DOBLE LEVITON 110'),
    ('49004873', 'MANGUERA PU 10MM AZUL'),
    ('49004878', 'CHAZO EXPANSION 3/8 X2 1/8'),
    ('49004948', 'TERMINAL PIN HUECO NEGRO 10AWG'),
    ('49004949', 'TERMINAL PIN HUECO GRIS 12AWG'),
    ('49004950', 'TERMINAL PIN HUECO AZUL 14AWG'),
    ('49004951', 'TERMINAL PIN HUECO AMARILLO 18AWG'),
    ('49004952', 'TERMINAL PIN HUECO ROJO 16AWG'),
    ('49004970', 'PACE 1121-0336-P5-1/32" KIT PUNTAS X5'),
    ('49004971', 'PACE 1121-0639-P5-1/32" KIT PUNTAS X5'),
    ('49004975', 'COPA PARA DESTORNILLADOR #8'),
    ('49004986', 'PILA CUADRADA 9V'),
    ('49005076', 'TERMINAL PIN HUECO PARA CALIBRE 20AWG'),
    ('49005077', 'SOPORTES ADHESIVOS'),
    ('49005084', 'CLAVIJA AÃ‰REA 110 VAC SIN POLO TIERRA'),
    ('49005088', 'INTERRUPTOR SWITCHE ON/OFF'),
    ('49005095', 'LF SWITCH TAPA LAT LH SIN PINT'),
    ('49005096', 'COMPLEMENTO TAPA LAT DERECHA SWITCH'),
    ('49005097', 'COMPLEMENTO TAPA LAT IZQUIERDA SWITCH'),
    ('49005098', 'CUBIERTA STOP MRX 125'),
    ('49005099', 'CUBIERTA SILLIN IZQUIERDA MRX 125'),
    ('49005100', 'CUBIERTA SILLIN DERECHA MRX 125'),
    ('49005101', 'TAPA LATERAL DERECHA MRX 125'),
    ('49005102', 'TAPA LATERAL IZQUIERDA MRX 125'),
    ('49005103', 'ZS TAPA LATERAL LH SIN PINT MRX 150'),
    ('49005104', 'ZS TAPA LATERAL RH SIN PINT MRX 150'),
    ('49005105', 'LF MACH 110 CUB CENTRAL TRAS SIN PINT'),
    ('49005106', 'LF MACH 110 CUB SILLIN LH SIN PINT'),
    ('49005107', 'LF MACH 110 CUB SILLIN RH SN PINT'),
    ('49005108', 'TRINQUETE SEGURO SILLIN ONE ST'),
    ('49005109', 'CUBIERTA SILLIN DERECHA NITRO 151'),
    ('49005110', 'CUBIERTA SILLIN IZQUIERDA NITRO 151'),
    ('49005111', 'LF CUB SILLIN RH SIN PINT NITRO 125'),
    ('49005112', 'LF CUB SILLIN LH SIN PINT NITRO 125'),
    ('49005113', 'SEGURO SILLIN NITRO 125'),
    ('49005114', 'LF CUB SILLIN CEN SIN PINTAR ONE ST 100'),
    ('49005115', 'LF CUB SILLIN RH SIN PINTAR ONE ST 100'),
    ('49005116', 'LF CUB SILLIN LH SIN PINTAR ONE ST 100'),
    ('49005117', 'TRINQUETE SEGURO SILLIN'),
    ('49005118', 'LF SWITCH TAPA LAT RH SIN PINT'),
    ('49005143', 'AJUSTADOR PIN PORTA-INYECTOR CANNON'),
    ('49005144', 'MANGUERA 6MM TRANSPARENTE POLIURETANO'),
    ('49005146', 'RESORTE DE BOMBA AC0032 ESTIBADORA NOBLE'),
    ('49005178', 'KIT VALVULA ADMISION SULLAR 02250176-856'),
    ('49005180', 'INTERRUPTOR DE GIRO ON/OFF CHINT NP2'),
    ('49005181', 'BOBINA22GC 110V50/60HZ-9MM 0.200.001.202'),
    ('49005182', 'KIT REP VALV PRESION MINIMA 02250050-612'),
    ('49005183', 'VALV SOLENOIDE SULLAIR 88290015-219'),
    ('49005281', 'EMPAQUE BOMBA PEDROLLO CP680C'),
    ('49005353', 'TEE 1" PVC PRESIÃ“N'),
    ('49005359', 'REDUCCIÃ“N 1 1/2 A 1" PVC PRESIÃ“N'),
    ('49005403', 'ENTRADA CAJA EMT 1/2"'),
    ('49005430', 'TORNILLO AUTOPERFORANTE HEX 2" CAL10'),
    ('49005431', 'CABLE ENCAUCHETADO 4X12AWG'),
    ('49005480', 'BANDA A 660 LI 690 LD'),
    ('49005492', 'GRASERA 45Â° DE 1/4'),
    ('49005494', 'GRASERA RECTA 1/4'),
    ('49005506', 'JUEGO DESTORNILLADOR DE PRECISIÃ“N 66-052'),
    ('49005637', 'REMACHE POP DE 1/8 X 1/2'),
    ('49005639', 'ELECTRODO E6011'),
    ('49005641', 'PEGALOCA 120G'),
    ('49005642', 'RACOOR TEE HEMBRA OD 12 MM NEUM'),
    ('49005656', 'CABLE ENCAUCHETADO 4X18 AWG'),
    ('49005701', 'ESPARRAGO M16X1/2'),
    ('49005831', 'TORNILLO AUTOPERFORANTE CILIN 1/2" CAL10'),
    ('49005833', 'TORNILLO ALLEN BRIS AVELLA M5x30+TUERCA'),
    ('49005834', 'TORNILLO ALLEN BRIS AVELLA M5x20+TUERCA'),
    ('49005835', 'TORNILLO ALLEN BRIS AVELLA M4x20+TUERCA'),
    ('49005836', 'TORNILLO ESTUF 1/8 X 1 CON ARAN_TUERC'),
    ('49005837', 'TORNILLO 1/4X2 ARANDE_TUERC'),
    ('49005838', 'TORNILLO 3/8 X 2 ARANDE_TUERC'),
    ('49005839', 'TORNILLO ALLEN BRIS AVELLA M3x20+TUERCA'),
    ('49005840', 'TERMINAL HERRADURA CAL10 AWG'),
    ('49005841', 'TORNILLO ESTUF 3/16 X 2 CON ARAN_TUERC'),
    ('49005989', 'ETIQUETA S0029 DE 10CM X 15CM X 950U 3"'),
    ('49006044', 'NIPLE TUERCA INOX 1/4'),
    ('49006048', 'PISTOLA FINE SPRAY W3 FZ-DUO 1.0 MM'),
    ('49006071', 'CLAVIJA UNIVERSAL'),
    ('49006094', 'RUEDA AC232 ESTIBADOR'),
    ('49006095', 'KIT DE SELLOS ESTIBADOR'),
    ('49006169', 'JUEGO DE SELLOS CABEZAL MEZCLADOR CANNON'),
    ('49006182', 'REPUESTO TIJERAS ELECTTRICAS'),
    ('49006269', 'SWITCHE AMARILLO 15A 250 V AC'),
    ('49006293', 'CAJA EMT DOBLE TOMA CON TAPA 12X12X5'),
    ('49006370', 'FUSIBLE 16 A 690 VAC 10X38 MM'),
    ('49006409', 'CINTA RESINA ZEBRA 110MM-300M-509511030'),
    ('49006490', 'CORREA PLASTICA T4 X 10 CM'),
    ('49006491', 'PILA AAA PAQUETE X 2 UND'),
    ('49006504', 'INYECTOR LÂ´ORANGE Ã˜2MM/LSO U 904 AP'),
    ('49006505', 'INYECTOR LÂ´ORANGE Ã˜3,5MM/LSO U 905 AP'),
    ('49006531', 'TOMA CORRIENTE DOBLE 110V'),
    ('49006572', 'ABRAZADERA DOBLE ALA 1/2"'),
    ('49006584', 'SENSOR PROXIM-CABEZAL CANNON Z51210PA0'),
    ('49006732', 'JUEGO ORINGS PORTAINYECTOR CANNON ORANGE'),
    ('49006734', 'RESORTE PORTABOQUILLAS CANNON W66209PA0'),
    ('49006735', 'PIN ACTIVADO PORTAINYECTORA 273574-0'),
    ('49006773', 'LLAVE HEXAGONA LARGA 3 MM'),
    ('49006810', 'SWICHT DOBLE LEVITON'),
    ('49006858', 'LIJA ROJA # 80'),
    ('49006864', 'CLAVIJA DE 3P +T L1430'),
    ('49006909', 'ETIQUETA LA0790 POL5CMAX1.5CML X 5000'),
    ('49006963', 'CONECTOR 2 VIAS M DJ7021A-2.8-11'),
    ('49006964', 'CONECTOR 2 VIAS H DJ7021A-2.8-21'),
    ('49006965', 'CONECTOR 2 VIAS M DJJ7021-6.3-21'),
    ('49006966', 'CONECTOR 3 VIAS F DJ7031A-2.8-11'),
    ('49006968', 'CONECTOR 4 VIAS F DJ70413-6.3-21'),
    ('49006969', 'CONECTOR 4 VIAS M DJ7041-6.3-11'),
    ('49006970', 'CONECTOR 4 VIAS M DJ7041A-2.8-11'),
    ('49006973', 'CONECTOR DE 6 VIAS M DJ7061A-2.8-11'),
    ('49006974', 'CONECTOR DE 6 VIAS F DJ7061A-2.8-21'),
    ('49006975', 'TERMINAL MATE-N-LOK PIN 140 MACHO 20-16'),
    ('49006977', 'TERMINAL DJ221-3.5A'),
    ('49007037', '3.2 Female Unique Copper Blade'),
    ('49007038', '3.2 Female Unique PVC Blade'),
    ('49007039', '3.2 Female Unique PVC Anvil'),
    ('49007040', '3.2 Female Unique Copper Anvil'),
    ('49007041', 'Button Unique Copper Blade'),
    ('49007042', 'Button Unique PVC Blade'),
    ('49007044', 'Button Unique PVC Anvil'),
    ('49007054', 'JUEGO DE BOTADORES'),
    ('49007106', 'CONECTOR 6 VÃAS F DJ7061-6.3-21'),
    ('49007107', 'CONTRAPARTE CONECTOR PCB 1612906-1'),
    ('49007108', 'RELE 12V 5 PINES (1044818)'),
    ('49007152', 'SILICON ADHESIVO POLICARBONATO PVC TRANS'),
    ('49007224', 'CONECTOR CDI'),
    ('49007225', 'CONECTOR 1X2 MACHO TX1-C23'),
    ('49007238', 'CONECTOR TARZ-C5'),
    ('49007240', 'CONECTOR TVEN14-C14'),
    ('49007242', 'CONECTOR TARZ-C12'),
    ('49007249', 'TERMINAL ACOPLAMIENTO HEMBRA'),
    ('49007250', 'TERMINAL ACOPLAMIENTO MACHO'),
    ('49007251', 'TERMINAL 2.8 HEMBRA'),
    ('49007252', 'TERMINAL 2.8 MACHO'),
    ('49007254', 'TERMINAL 2.3 HEMBRA'),
    ('49007256', 'TERMINAL TARZ-C14'),
    ('49007258', 'TERMINAL TX1-C14 X6'),
    ('49007260', 'INDICADOR LED TX1'),
    ('49007261', 'BOTON PULSADOR MOMEN ROJO TX1'),
    ('49007262', 'BORNERA 4P 3.5MM PITCH ANG MACHO'),
    ('49007263', 'BORNERA 4P 3.5MM PITCH ANG HEMBRA'),
    ('49007273', 'SALSERO'),
    ('49007310', 'TERMINAL F FASTON RECEP 250 (22-18 AWG)'),
    ('49007311', 'TERMINAL MACHO 1/4 TAB FASTON 250 SERIES'),
    ('49007312', 'TERMINAL MACH 2.8*0.5 0.75-1.25 18-16AWG'),
    ('49007313', 'TERMINAL HEMBRA 2.8*0.5 0.75-1.25 18 AWG'),
    ('49007314', 'CONECTOR MACHO COUP 2 VIA TERMINA 7.8'),
    ('49007315', 'TERMINAL MACHO PLAN SERIE 7.8 305 CAL 10'),
    ('49007316', 'CONECTOR PLANO HEMBRA 3 VIA housing 6.3'),
    ('49007317', 'TERMINAL F. FASTON RECEP.250 ,18-14 AWG'),
    ('49007319', 'TERMINAL MACHO 6.3*0.8 H65Y reel 0.5-1.0'),
    ('49007324', 'TAB. 2.8 X 0.80 Flachstecker (16-14)'),
    ('49007344', 'BARNIZ DIELÃ‰CTRICO LITRO'),
    ('49007445', 'RETENEDOR DE ACEITE 40-56-8'),
    ('49007473', 'SET REPUESTOS #1 PISTOLA FINE SPRAY'),
    ('49007474', 'SET REPUESTOS #2 PISTOLA FINE SPRAY'),
    ('49007477', 'PELACABLES PROSKIT CP-080E'),
    ('49007492', 'PLASTICO TRANSPARENTE CALIBRE 6'),
    ('49007593', 'EMPAQUE ARANDELA SILICONA 125x106X6 MM'),
    ('49007615', 'SELLO MAQ PEGA SHOT POT TIMER'),
    ('49007616', 'RESISTENCIA MAQ PEGA 120V SHOT POT TIMER'),
    ('49007617', 'O-RING CSP009 MAQ PEGA SHOT POT TIMER'),
    ('49007855', 'RETENEDOR TC 42X56X7 NDR CANNON'),
    ('49007947', 'LLAVE PARA VÃLVULA DE RIN'),
    ('49007949', 'EXTRACTOR DE VÃLVULA 2 CARA'),
    ('49008076', 'RODAMIENTO 6200 2RS'),
    ('49008078', 'RODAMIENTO 6202 2RS'),
    ('49008081', 'SIDE-FEED APPLICATOR-APLICADOR LATERAL'),
    ('49008082', 'SPARE CRIMPER & ANVIL SET-CRIMPER YUNQUE'),
    ('49008084', 'SPARE CRIMPER & ANVIL SET-CRIMPER YUNQUE'),
    ('49008093', 'SUPPORT RING 4650817'),
    ('49008104', 'SPARE STRIPPING BLADE KIT-CUCHILLA'),
    ('49008119', 'SWITCHE AZUL 15A 250 V AC'),
    ('49008178', 'TABLERO DE PUNTOS DE PRUEBA (128) 5-4002'),
    ('49008184', 'DEFLECTOR 306089I0001'),
    ('49008185', 'PACKING 306089I0002'),
    ('49008186', 'CILINDRO 306089I0003'),
    ('49008187', 'O-RING 306089I0004'),
    ('49008188', 'ANILLO CILÃNDRICO 306089I0005'),
    ('49008192', 'PASADOR PIVOTE DEL GATILLO 306089I0025'),
    ('49008193', 'ANILLO 306089I0026'),
    ('49008194', 'RETENEDOR 306089I0027'),
    ('49008196', 'GATILLO DE SEGURIDAD 306089I0029'),
    ('49008197', 'PASADOR RESORTE REF 306089I0030'),
    ('49008200', 'SOPORTE BLOQUE B 306096I0005'),
    ('49008201', 'BLOQUE DE ANCLAJE REF 306094I0006'),
    ('49008203', 'ARANDELA PLANA REF 306092I0009'),
    ('49008204', 'SOPORTE BLOQUE A 306092I0015'),
    ('49008205', 'RESORTE BLOQUE A REF 306094I0011'),
    ('49008207', 'O-RING 306092I0024'),
    ('49008212', 'UNIONBARRA ESTABILIZADORA ESTIBADOR'),
    ('49008234', '11 1204 PLATE, TERMINAL GUIDE.'),
    ('49008235', '10 1203 BASE PLATE.'),
    ('49008236', '5 133053-4 FRONT SHEAR FLOAT'),
    ('49008237', '24 1212 STOPPER'),
    ('49008238', '52 1232 FEED FINGER'),
    ('49008239', '16 1254 BLOCK INSULATION HT ADJUST'),
    ('49008240', '42 1222 SPRING, DISC'),
    ('49008241', '17 909 M5 SPECIAL SCREW'),
    ('49008242', '40 1220 FIXED DISC'),
    ('49008243', '39 1219 LOCK DISC'),
    ('49008244', '58 1237 DOWEL PIN FIXED DISC'),
    ('49008258', 'MANG CAUCHOLONA 1" ACOPLADA'),
    ('49008282', 'HOLDER CONTRAPARTE T FASELCO 1-2 VIAS'),
    ('49008283', 'HOLDER CONTRAPARTE T FASELCO 3-4 VIAS'),
    ('49008284', 'HOLDER CONTRAPARTE T FASELCO 6 VIAS'),
    ('49008298', 'JUEGO DE CUCHILLAS 10002411'),
    ('49008303', 'JUEGO DE CUCHILLAS INSUFORK'),
    ('49008304', 'JUEGO DE CUCHILLAS INSU-RING'),
    ('49008305', 'JUEGO DE CUCHILLAS JCW'),
    ('49008308', 'JUEGO DE CUCHILLAS 10002404/10002668'),
    ('49008316', 'JUEGO DE CUCHILLAS 10002412'),
    ('49008324', 'JUEGO DE CUCHILLAS 10002383'),
    ('49008328', 'JUEGO DE CUCHILLAS 10002384'),
    ('49008330', 'JUEGO DE CUCHILLAS 10002387'),
    ('49008331', 'JUEGO DE CUCHILLAS 10002388'),
    ('49008333', 'JUEGO DE CUCHILLAS 10002386'),
    ('49008334', 'JUEGO DE CUCHILLAS 10002465'),
    ('49008336', 'JUEGO DE CUCHILLAS 10002466'),
    ('49008337', 'JUEGO DE CUCHILLAS 10002668'),
    ('49008338', 'JUEGO DE CUCHILLAS 10002402/10002406'),
    ('49008344', 'JUEGO DE CUCHILLAS 10002409'),
    ('49008347', 'JUEGO DE CUCHILLAS 10002407'),
    ('49008351', 'JUEGO DE CUCHILLAS 10002399'),
    ('49008354', 'JUEGO DE CUCHILLAS 10002403'),
    ('49008360', 'JUEGO DE CUCHILLAS 10002390'),
    ('49008362', 'JUEGO DE CUCHILLAS 10002389'),
    ('49008374', 'JUEGO DE CUCHILLAS 10002400'),
    ('49008380', 'JUEGO DE CUCHILLAS 10002395'),
    ('49008382', 'JUEGO DE CUCHILLAS 10002392'),
    ('49008386', 'JUEGO DE CUCHILLAS 10002397'),
    ('49008390', 'JUEGO DE CUCHILLAS 10002405'),
    ('49008394', 'JUEGO DE CUCHILLAS 10002396'),
    ('49008400', 'JUEGO DE CUCHILLAS 10002393'),
    ('49008401', 'JUEGO DE CUCHILLAS 10002394'),
    ('49008402', 'JUEGO DE CUCHILLAS 10002401'),
    ('49008403', 'JUEGO DE CUCHILLAS 10002402'),
    ('49008406', 'JUEGO DE CUCHILLAS 10002391'),
    ('49008453', 'TAPON HEMBRA 3/8 BSP CN'),
    ('49008454', 'ADAPTADOR TAPON 3/8 M BSP CN'),
    ('49008455', 'TAPON HEMBRA 3/4 BSP CN'),
    ('49008456', 'ADAPTADOR TAPON M 3/4 M NPT CN'),
    ('49008457', 'LAMPARA LED DIXTON LS3SP 110-220V'),
    ('49008468', 'RODAMIETO KR16-SK-PP-A'),
    ('49008540', 'RETENEDOR TAPA 47x18'),
    ('49008542', 'O''RING 55MMX1,85Ã˜MM'),
    ('49008553', 'RETENEDOR 45x62x7'),
    ('49008563', 'GRAPADORA NEUMATICA SFW09LN-102024I0019'),
    ('49008572', 'SWITCH PULIDORA MAKITA'),
    ('49008725', 'CHAZOS EXPANSIVOS DE 1/2"X4"'),
    ('49008754', 'RUEDA DE CARGA 756 01'),
    ('49008755', 'ESCOBILLAR MOTOR DIRECCIÃ“N 304 02'),
    ('49008777', 'GUARDAS DE SEGURIDAD EN ACRÃLICO'),
    ('49008811', 'TORNILLO INOX SOCKET M4X15MM'),
    ('49008814', 'FILTRO ACEITE MFL-Z17968CA0-A MEXICANNON'),
    ('49008838', 'TERMOFUSIBLE 20A 240 GRADOS'),
    ('49008927', 'PELACABLE MLTI-Stripper No.400'),
    ('49008942', 'ALUMINIO FINO BRILLANTE PLUS COD 10919'),
    ('49008943', 'LIJA ROJA #150'),
    ('49008944', 'LIJA ROJA #240'),
    ('49008945', 'LIJA ROJA #400'),
    ('49008980', 'BUTIL CELLOSOLVE X 500 CC 766'),
    ('49008981', 'ACETATO DE METILO X 500 CC 3790'),
    ('49008992', 'UNION MINI CARRIL-TUBO-LEAN'),
    ('49009026', 'BLOWER 40X40X10 MM 24VDC'),
    ('49009058', 'FILTRO AIRE DC-4 DE 3 MICRAS LONG 9" 1"'),
    ('49009061', 'CUCHILLACORTE APLICADOR DJ431-6.2D H1802'),
    ('49009159', 'PUENTE DE DIODO 12VDC'),
    ('49009160', 'BANDA MALLA TEMPERATURA HORNO'),
    ('49009179', 'CONECTOR MAC 2VIAS DJ7021-2-21J'),
    ('49009180', 'CONECTOR MAC 4VIAS FW-C-4M-W'),
    ('49009181', 'CONECTOR MAC 9VIAS FW-C-9F-B'),
    ('49009182', 'CONECTOR MAC 2VIAS DJ7026-2-21'),
    ('49009183', 'CONECTOR MAC 2VIAS DJ7021A-2.8-21'),
    ('49009184', 'CONECTOR MAC 2VIAS DJ7021A-3.5-11'),
    ('49009185', 'CONECTOR MAC 3VIAS FW-C-3M-B'),
    ('49009186', 'CONECTOR HEM BLANC 3VIAS HD036-0.7-11J'),
    ('49009187', 'CONECTOR HEM 2VIAS HD0224-6.3-11J'),
    ('49009189', 'CONECTOR HEM BLANCO 2VIAS HD0215-6.3-11'),
    ('49009190', 'CONECTOR HEM 4 VIAS HD041-2.3-11J'),
    ('49009191', 'CONECTOR HEM 4VIAS DJ7041-2.3-11'),
    ('49009192', 'CONECTOR HEM 6VIAS DJ7062E-6.3-11'),
    ('49009193', 'CONECTOR HEM 12VIAS DJ7125Y-2.2-11'),
    ('49009195', 'CONECTOR MAC 1VIA DJ7011A-2.8-21'),
    ('49009196', 'CONECTOR HEM 34VIAS DJ7341A-1-10'),
    ('49009197', 'CONECTOR HEM 4VIAS DJ7041Y-1.5-11'),
    ('49009198', 'CONECTOR HEM 4VIAS DJ7045D-1.5-11'),
    ('49009200', 'CONECTOR HEM 6VIAS 7123-2165-11'),
    ('49009201', 'CONECTOR HEM 6VIAS FW-C-6M-B'),
    ('49009236', 'JUEGO DE CUCHILLAS 10002385'),
    ('49009238', 'JUEGO DE CUCHILLAS 10002665'),
    ('49009303', 'CUÃ‘A ACERO 5mm'),
    ('49009340', 'CLAVIJA HEM32AMP-2P-200/250V-9HRIP44'),
    ('49009341', 'CLAVIJA MACH32AMP-2P-200/250V-9HR IP44'),
    ('49009453', 'POLEA 4" PERFIL V CON DOBLE RODAMIENTO'),
    ('49009500', 'INYECTOR CONICO 3 MM C0607A0200-A00A'),
    ('49009515', 'MOTOR-REDUCTOR GS90L-4'),
    ('49009516', 'VARIADOR DELTA VFD4A2MS43AFSAA'),
    ('49009542', 'SENSOR U JCW CTS02'),
    ('49009559', 'UPPER GUIDE COVER BUTTERFLY NUT'),
    ('49009571', 'PERNO PARA GUAYA 1/8'),
    ('49009630', 'CORTAFRIO DE PRECISION PROSKIT (1PK-717)'),
    ('49009827', 'CLAMP DESTACO 601'),
    ('49009832', 'CORREDERA 40MMX250MM'),
    ('49009834', '6010-0131-P1 SOLDADOR UNIVERSAL PS-90'),
    ('49009847', 'SWITCH 12 X 28MM 250 VAC 16 A NEGRO'),
    ('49009848', 'TORNILLO SOCKET M8X30MM'),
    ('49009849', 'TORNILLO SOCKET M5X30MM'),
    ('49009850', 'TORNILLO SOCKET M10X120MM'),
    ('49009851', 'TORNILLO SOCKET M10X20MM'),
    ('49009852', 'TORNILLO SOCKET M4X12MM'),
    ('49009853', 'CUCHILLA CORTE-CST02'),
    ('49009859', 'BLADE ACTUADOR REF SDA 40X15'),
    ('49009860', 'BLADES CUTTING EXCESS TERMINALS JCWCST02'),
    ('49009861', 'CLAMP FEEDING SYSTEM JCW-CST02'),
    ('49009862', 'BENCH SCREW FOR ADJUSTING APPLICATORS'),
    ('49009863', 'DOOR SENSORS JCW-CST02'),
    ('49009864', 'BEND 297-3M JCW-CST02'),
    ('49009865', 'BEND 685-5M JCW-CST02'),
    ('49009866', 'BENDA 445-5M JCW-CST02'),
    ('49009867', 'BEND 342-3M JCW-CST02'),
    ('49009868', 'BEND 306-3M JCW-CST02'),
    ('49009869', 'GRIPPER REF D-W00593 JCW-CST02'),
    ('49009870', 'ADJUSTING SCREW AND MOUNTING APPLICATOR'),
    ('49009899', 'TORNILLO SOCKET 3X5 MM'),
    ('49009900', 'TORNILLO SOMBRILLA 5X7 MM'),
    ('49009901', 'TORNILLO SOCKET 7X10 MM'),
    ('49009902', 'TORNILLO SOCKET 5X15 MM'),
    ('49009904', 'TORNILLO SOCKET 6X35 MM'),
    ('49009905', 'EJE ACERO 4140 RDO. 3/4'),
    ('49009956', 'GUAYA 5MMX 5METROS'),
    ('49009957', 'PERNO DE GUAYA 5MM'),
    ('49010154', 'VALVULA 1/4 REG 0-8 BAR CANNON'),
    ('49010162', 'CUCHILLAS CORTE RETAL JCWCS02 S/P'),
    ('49010187', 'BREAKER 3 POLOS 40A SOBREPONER'),
    ('49010244', 'CABLE HP1500 GV5010 MAKITA'),
    ('49010329', 'PICNOMETRO DE VIDRIO 50 ML'),
    ('49010361', 'SENSOR INDUCTIVO MOD NBB4 12 GM30 E2V1'),
    ('49010362', 'JUEGO DE SELLOS DEL CABEZAL FPL 14SR'),
    ('49010424', 'CUCHILLA MET-PUN-04V 43X20X4 MM'),
    ('49010425', 'CUCHILLA MET-PUN-04V 34X20X4 MM'),
    ('49010427', 'NOZZLE NUT CSP057'),
    ('49010428', 'BAND HEATER CSP007'),
    ('49010430', 'O-RING CSP009'),
    ('49010431', 'CONNECTOR CSP048'),
    ('49010432', 'LID LATCH CSP067'),
    ('49010433', 'LOCKING HANDLE CSP068'),
    ('49010434', 'RESORTE DE COMPRESIÃ“N 10X6X25MMX1.2MM'),
    ('49010435', 'RESORTE HOLDER TABLERO CONTROL ÃƒËœ5 X 30'),
    ('49010544', 'TUBO LED T8 600 MM 9W 865 VIDRIO'),
    ('49010580', 'RELE ALLEN BRADLEY 700-HK32Z24 24VDC'),
    ('49010581', 'FUSIBLE CERAMICO 6X30 MM 600V 630m'),
    ('49010583', 'JACKET IBC HEATER 230 V'),
    ('49010630', 'ADAPTADOR DE CORRIENTE 12VDC 2A'),
    ('49010648', 'RACOR HEMBRA 1/4 X 6MM'),
    ('49010682', 'CANALETA 13X7 MM'),
    ('49011061', 'POLEA EN V 2" CON PASE PARA SOLDAR'),
    ('49011201', 'KIT EXTRACTORES DE PINES'),
    ('49011212', 'LAMINA EN PERFORCIÃ“N 6 CAL 20 -1X2'),
    ('49011300', 'FEEDING ROLLER KIT FOR CST02'),
    ('49011301', 'GUIDE TUBES FOR CST02'),
    ('49011314', 'BURIL TUNGSTENO 1/4 X 3'),
    ('49011315', 'BURIL REDONDO 12MM TUNGTENO'),
    ('49011545', 'BANDEADOR EN T MACHUELO 1/ 2â€³ MAN-T-1/2'),
    ('49011547', 'ADAPTADOR DE SIERRA CIRCULA PULIDORA'),
    ('49011568', 'LAMINA CR C-20 -0,85mm1x2'),
    ('49011665', 'BLOKING BALLCOCK VALVE KHB.12SR-1134'),
    ('60000056', 'DESPERDICIO CHATARRA ORDINARIA'),
    ('60000059', 'DESPERDICIO CARTON'),
    ('60000070', 'DESPERDICIO ESTIBAS MADERA'),
    ('60000128', 'DESPERDICIO PLÃSTICO TRANSPARENTE'),
    ('60000142', 'DESPERDICIO IBC POLIOL'),
    ('70000053', 'ADV BASE SILLIN'),
    ('70000055', 'KYM BASE SILLIN FLY125 (INT.NAL)'),
    ('70000077', 'INC BASE SILLIN D241'),
    ('70000080', 'INC BASE SILLIN BBL3'),
    ('70000086', 'HER BASE SILLIN HUNK 150 XTEC'),
    ('90004124', 'TLA-VIN-SIL-APACHE-200-DEL-CTT'),
    ('90004125', 'TLA-VIN-SIL-APACHE-200-TRA-CTT'),
    ('90004243', 'SER-SIL-DEL-APACHE-RTR-CNF-TER'),
    ('90004244', 'SER-SIL-TRA-APACHE-RTR-CNF-TER'),
    ('90006670', 'ESP-SIL-HUNK-150-INY-CNF')
ON CONFLICT (codigo_sap) DO UPDATE SET descripcion = EXCLUDED.descripcion, updated_at = NOW();


-- 10. Catálogo SIP / SI3 ZF

-- Catalogo completo SIP / SI3 ZF: codigo SAP y material.
-- Idempotente: sincroniza el catalogo sin recrear tablas.
CREATE TABLE IF NOT EXISTS public.materiales_sip (
    codigo_sap TEXT PRIMARY KEY,
    descripcion TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.materiales_sip ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.materiales_sip TO anon, authenticated;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'materiales_sip' AND policyname = 'Lectura publica catalogo materiales SIP') THEN
        CREATE POLICY "Lectura publica catalogo materiales SIP" ON public.materiales_sip FOR SELECT TO anon, authenticated USING (true);
    END IF;
END;
$$;
-- Se conservan los códigos personalizados; los códigos del catálogo se sincronizan por UPSERT.

INSERT INTO public.materiales_sip (codigo_sap, descripcion) VALUES
    ('10000207', 'TORNILLO HOMBRO 5/16INX2'),
    ('10000312', 'POLIPROPILENO COPOLIMERO PP06C30DA'),
    ('10000313', 'RESINA 408-1NT-PP+10%FIBRA DE VIDRIO'),
    ('10000316', 'PIGMENTO NEGRO SUMIMASTER PE-720'),
    ('10000317', 'PIGMENTO NEGRO SUMIMASTER AB-29140-UV'),
    ('10000752', 'STICKER VERDE'),
    ('10000920', 'TORN HOMBRO 1/2INX4IN'),
    ('10001149', 'INSERTO TORNILLO PLANO M6X17MM'),
    ('10001209', 'POLIAMIDA PA66 VYDYNE R530H BK'),
    ('10001283', 'ABS SD0150/K2007 NEGRO'),
    ('10001311', 'PIGMENTO ROJO SUMIMASTER POM-40951'),
    ('10001312', 'PIGMENTO ROJO SUMIMASTER PO-40940'),
    ('10001313', 'PIGMENTO ROJO SUMIMASTER TY-40944'),
    ('10001376', 'ACETAL COPOLYMER F20-03'),
    ('10001382', 'CALCOMANIA CARGA MAX. 3KG'),
    ('10001386', 'MASTERBATCH PS-5092'),
    ('10001400', 'CALC NITRUS DOMING'),
    ('10001413', '3.7*72PIN'),
    ('10001418', '4*12 SCREW-R'),
    ('10001419', 'TORNILLO LAMINA LEN PHILL 8X1/2 ZC VERDE'),
    ('10001420', '3*14 SCREW'),
    ('10001501', 'TORNILLO SOCKET AVELLAN INOX M6-P1X12MM'),
    ('10001502', 'TERMOPLASTICO TPV TOPRENE 9510-751'),
    ('10001513', 'POLIAMIDA PA66 VYDYNE 21SPF BK'),
    ('10001526', 'POLIPROPILENO PP'),
    ('10001573', 'TERMOPLASTICO TPV 9510-501'),
    ('10001605', 'TORNILLO BCC 6X40MM INOX RC'),
    ('10001606', 'TORNILLO BCC 8X40MM INOX'),
    ('10001629', 'POLIETILENO BD LLDPE M200024'),
    ('10001663', 'MASTER NEGRO ARCOPLAST PA UV 18681'),
    ('10001667', 'MASTER NEGRO SUMIMASTER PE-43051-UV'),
    ('10001668', 'MASTER NEGRO SUMIMASTER NY-43052-UV'),
    ('10001693', 'PIGMENTO SUMIMASTER PS-43217 ROJO'),
    ('10001742', 'TERMOPLASTICO TPU DESMOPAN 3059D'),
    ('10001775', 'PIGMENTO PE NEGRO'),
    ('10001789', 'POLIPROPILENO PP KOPELEN JM-350'),
    ('10002025', 'POLIPROPILENO PP 210-3PR 20T ESENTTIA'),
    ('10002095', 'ANTI VIBRANTE PVC 8X21 MM'),
    ('10002096', 'BUJE NYLON 8X11 MM'),
    ('10002104', 'PIGMENTO NEGRO ESENTTIA 682 - 4NE'),
    ('10002161', 'POLIAMIDA PA PLUSTEK 7000G3BK-A'),
    ('10002168', 'POLIPROPILENO PP 400-1 ESENTTIA'),
    ('10002467', 'POLIPROPILENO PP 432-1NT 20GF ESENTTIA'),
    ('10002481', 'POLIPROPILENO COPOLIMERO VPP821-C NEGRO'),
    ('10002489', 'TORNILLO HEX FLAN M6 1MMX25MM ESP ZINC'),
    ('10002495', 'INSERTO ROSCADO ARIZONA M6 X 12'),
    ('10002667', 'POLIESTIRENO CRISTAL STYRON GPPS 692'),
    ('10002713', 'SOCKET CABEZA BOTON M6X20 INOX'),
    ('10002727', 'POLIESTIRENO PS STRYRON 478'),
    ('10002729', 'SC-1220UR POLICARBONATO'),
    ('10002740', 'TPU ESTANE T465A70 Shore A NATURAL'),
    ('10002774', 'PP NEGRO PELETIZADO'),
    ('10002784', 'BUJE LISO CUBIERTA PIÃ‘ON RAIDER AUT'),
    ('10002804', 'BUJE GL541306 CUB PIÃ‘ON KTM G3'),
    ('10003202', 'PIN ENGANCHE HUNK 150 XTEC HER'),
    ('10003209', 'TORNILLO MM HEX FLANGE M6-1X16 ZC/IRI'),
    ('10003216', 'ZYTEL 70G30HSLR BK 099'),
    ('10003238', 'POLICARBONATO PC LEXAN 143R'),
    ('10003241', 'CHAPETA GOLOSA N8 CORTA'),
    ('10003242', 'CHAPETA GOLOSA P/TLLO N10 CORTA'),
    ('20000006', 'BOLSA PLASTICA 10INX14IN'),
    ('20000008', 'BOLSA PLASTICA 30X95 CM CAL 0.8'),
    ('20000010', 'BOLSA PLASTICA 70X55CM CALIBRE 0.8'),
    ('20000011', 'BOLSA PLASTICA 16X24 TRANS OPACA 0.8'),
    ('20000025', 'BOLSA PLAST TUBULAR 28CM AUTECO AZUL'),
    ('20000026', 'BOLSA PLAST TUBULAR 55 CM AUTECO AZUL'),
    ('20000035', 'BOLSA 900 X 1100 MM 0.8'),
    ('20000037', 'BOLSA PLASTICA 1200 X 700 MM 0.8'),
    ('20000039', 'BOLSA PLASTICA 900 X 800 MM 0.8'),
    ('20000043', 'BOLSA 25X45CMS'),
    ('20000066', 'BOLSA BAJA DEN 60X90 CM CAL 0,8'),
    ('20000080', 'ESTIBA MADERA 1.2 MT X 1.0 MT EXPORT'),
    ('20000121', 'GRAPA PLASTICA PARA ZUNCHO'),
    ('20000131', 'BOLSA 10X14 PUL CAL 0,8 VERDE'),
    ('20000132', 'BOLSA 30X95 CM CAL 0,8 VERDE'),
    ('20000134', 'BOLSA 16X24 PUL CAL 0,8 VERDE'),
    ('20000135', 'BOLSA 45X80 CM CAL 0,8 VERDE'),
    ('20000148', 'BOLSA 25X45 CM CAL 0,8 VERDE'),
    ('20000149', 'BOLSA 90X110 CM CAL 0,8 VERDE'),
    ('20000152', 'SEPARADOR ICOPOR 6X5X3,5 CM'),
    ('20000157', 'CAJA CARTON C790 (335X286X330)'),
    ('20000163', 'PAPEL KRAFT'),
    ('20000164', 'Caja 420X410X305 C790'),
    ('20000166', 'BOLSA PLASTICA 8X11 CM CON CIERRE'),
    ('20000170', 'BOLSA TRANS PE BAJA DEN 70X30 CM CAL 0.8'),
    ('23000000', 'CAJA BC 1130 ( 1140 X 865 X 380 ) RC'),
    ('23000002', 'CAJA CARTON 930CK (715X400X300) MM RC'),
    ('23000003', 'CAJA BC 1130 (1140X865X565) MM RC'),
    ('23000006', 'CAJA C930 (1140X865X380) MM'),
    ('23000015', 'SEPARADOR 1130X850MM CLAVE 790CK'),
    ('28000000', 'PAPEL PERIODICO RECICLADO'),
    ('28000011', 'ACEITE DE ROSCADO TAP MAGIC 16'),
    ('28000012', 'ACEITE SHELL TELLUS 22'),
    ('28000015', 'GRASA SHELL GADUS S2 V220'),
    ('28000018', 'SHELL ACEITE OMALA 220'),
    ('28000021', 'LIMPIADOR CRC CONTAC CLEANER'),
    ('28000022', 'LUBRICANTE GRAFITO MOLIBDENO'),
    ('28000030', 'SHELL TELLUS S2 M 46'),
    ('28000064', 'ACEITE HIDRAULICO PARA STILL FM-X14'),
    ('28000065', 'VALVULINA PARA STILL FM-X14'),
    ('28000124', 'VARSOL TECNO PINTS'),
    ('28000218', 'CATALIZADOR EPOXICO X 1/4'),
    ('28000220', 'CONCENTROL LP FDC-58 LIQ'),
    ('28000240', 'SHELL ACEITE TONNA S2 M 68'),
    ('28000279', 'WETCOOL 316 INHIBIDOR CORROSION CERRADO'),
    ('28000280', 'WETCOOL 703 BIOCIDA'),
    ('28000332', 'POMADA DIMANT NARANJA 5G 4-8 M FINAL'),
    ('28000333', 'POMADA DIAMANT AMARILLA 5G #8.000 TAIWAN'),
    ('28000334', 'POMADA DIMANT BEIGE 5G #1 14.500 TAIWAN'),
    ('28000366', 'DILUYENTE AUTOMOTRIZ'),
    ('28000367', 'ENDURECEDOR SEMI-RÃPIDO'),
    ('28000387', 'PER-FIX BLACK PP 7500 A'),
    ('28000388', 'PER-FIX BLACK PP 7500 AA'),
    ('28000456', 'SUPER GREASE AEROSOL 11 OZ'),
    ('28000472', 'GRASA DIELECTRICA 85 ML WEICON'),
    ('30000034', 'JABON LIQUIDO DE MANOS'),
    ('30000038', 'SERVILLETA CAFETERIA'),
    ('30000040', 'ESCOBA PLASTICA FLEXIBLE'),
    ('30000041', 'TRAPERO DE ALGODÃ“N CON MANGO'),
    ('30000049', 'AROMATICA TERESITA X 20'),
    ('30000050', 'AROMATICA CUBO PANELA X 48'),
    ('30000053', 'AZUCAR BLANCA X 1 KG'),
    ('30000060', 'ESPONJA D/MALLA LA NEGRA'),
    ('30000065', 'TE NESTEA LIMON/DURAZNO BOLSA X 500 GRS'),
    ('30000068', 'BOLSA 60X85 CAL .8 AD AZUL'),
    ('30000070', 'BOLSA ROJA (70X90)'),
    ('30000077', 'PAR GUANTE EN HILAZA'),
    ('30000079', 'GUANTE G-40 POLIURETANO TALLA 9'),
    ('30000081', 'GUANTE KLEENGUARD G80 TALLA 9'),
    ('30000085', 'MANGA EN KEVLAR'),
    ('30000092', 'CASCO DIELECTRICO CON BARBUQUEJO'),
    ('30000100', 'BOTA PUNTERA DAMA TALLA 39'),
    ('30000101', 'BOTA PUNTERA TALLA 38'),
    ('30000102', 'BOTA PUNTERA TALLA 39'),
    ('30000103', 'BOTA PUNTERA TALLA 40'),
    ('30000104', 'BOTA PUNTERA TALLA 41'),
    ('30000105', 'BOTA PUNTERA TALLA 42'),
    ('30000106', 'BOTA PUNTERA TALLA 43'),
    ('30000108', 'BOTA PUNTERA DAMA TALLA 37'),
    ('30000116', 'GORRA DRIL GRIS CON LOGO REF 098'),
    ('30000126', 'SOBRE DE MANILA TAMAÃ‘O CARTA'),
    ('30000127', 'SOBRE DE MANILA TAMAÃ‘O OFICIO'),
    ('30000129', 'RESMA BLANCO TAMAÃ‘O OFICIO'),
    ('30000131', 'TALONARIO TARJETA TPM ROJO'),
    ('30000132', 'TALONARIO TARJETA TPM AZUL'),
    ('30000134', 'PAR DE PILAS AAA'),
    ('30000176', 'BOTA PUNTERA DAMA TALLA 35'),
    ('30000183', 'RESPIRADOR CONTRA POLVOS'),
    ('30000196', 'BOTA PUNTERA TALLA 36'),
    ('30000198', 'OVEROL TALLA 36 MC'),
    ('30000199', 'OVEROL TALLA 38 MC'),
    ('30000201', 'OVEROL TALLA 40 MC'),
    ('30000203', 'OVEROL TALLA 42 MC'),
    ('30000213', 'OVEROL TALLA 44 ML'),
    ('30000228', 'BLUE JEAN TALLA 32'),
    ('30000230', 'BLUE JEAN TALLA 34'),
    ('30000231', 'BLUE JEAN TALLA 36'),
    ('30000238', 'KIT CAMISETA TIPO POLO MC TALLA M - HOM'),
    ('30000239', 'KIT CAMISETA TIPO POLO MC TALLA L - HOM'),
    ('30000240', 'KIT CAMISETA TIPO POLO MC TALLA XL - HOM'),
    ('30000242', 'PANTALON BRIGADA TALLA 28'),
    ('30000244', 'CAMISA POLO CORTA BRIGADA TALLA S'),
    ('30000245', 'CAMISA POLO CORTA BRIGADA TALLA M'),
    ('30000246', 'CAMISA POLO CORTA BRIGADA TALLA L'),
    ('30000248', 'CAMISA DRILL LARGA BRIGADA TALLA S'),
    ('30000250', 'CAMISA DRILL LARGA BRIGADA TALLA L'),
    ('30000252', 'PANTALON BRIGADA TALLA 32'),
    ('30000253', 'PANTALON BRIGADA TALLA 34'),
    ('30000254', 'PANTALON BRIGADA TALLA 36'),
    ('30000268', 'PANTALON BRIGADA TALLA 38'),
    ('30000280', 'CAMISA POLO CORTA BRIGADA TALLA XXXL'),
    ('30000284', 'BOTA PUNTERA DAMA TALLA 36'),
    ('30000287', 'OVEROL TALLA 34 ML'),
    ('30000477', 'BOTA PUNTERA TALLA 37'),
    ('30000478', 'BATOLA TALLA S/8 DAMA'),
    ('30000515', 'CARPETA AZ OFICIO'),
    ('30000516', 'TABLA CON GANCHO'),
    ('30000526', 'BOLSILLO DE LAMINACIÃ“N'),
    ('30000623', 'REGLA METALICA MILIMETRICA ANCHO 1"'),
    ('30000713', 'RACOR DE 1/4" NPT A 10MM NEUM'),
    ('30000772', 'CINTA DE SEGURIDAD AMARILLA SEÃ‘ALIZACION'),
    ('30000900', 'BISTURI STANLEY RETRACTIL 10-143'),
    ('30000906', 'RESALTADOR'),
    ('30001031', 'LAPIZ NEGRO #2'),
    ('30001202', 'TIJERA CORTATODO'),
    ('30001211', 'BOLSILLO CATALOGO CARTA'),
    ('30001346', 'SILICONA SUPERFLEX ROJA ALT TEMP LOCTITE'),
    ('30001353', 'PEGANTE 40 GRS PEGASTICK'),
    ('30001355', 'BOLSA NEGRA (70X90)'),
    ('30001387', 'GRAPA PARA COSEDORA'),
    ('30001392', 'CRAYOLA BLANCA (CAJA X 10 UND)'),
    ('30001393', 'TINTA PARA SELLO'),
    ('30001472', 'CINTA DYMO BLANCA 12MMX4MM'),
    ('30001503', 'BROCA HSS 17/64"'),
    ('30001600', 'CANCAMO MOVIL 12 MM'),
    ('30001609', 'BRILLA METAL'),
    ('30001708', 'TORNILLO SOCKET M10X25 PASO 1.5 GRADO 12'),
    ('30001903', 'CONECTOR 5 PINES HEMBRA AEREO'),
    ('30001904', 'CONECTOR 5 PINES MACHO AEREO'),
    ('30001908', 'VALVULA BOLA 1/2" INOX'),
    ('30001916', 'CONECTOR 16 PINES MACHO AEREO'),
    ('30002002', 'REGULADOR NEUMATICO 1/4" NPT'),
    ('30002030', 'CLAMP 2000LBS PARA MOLDE DE ESPUMAS'),
    ('30002036', 'LLAVE EXPANSION 8â€'),
    ('30002137', 'GAFA DE SEGURIDAD CONTRA ARCO ELÃ‰CTRICO'),
    ('30002439', 'TRAJE BLANCO KLEENGUARD A70'),
    ('30002745', 'JUEGO DE FORMONES 1/4 - 3/4 - 1"'),
    ('30002931', 'BATOLA TALLA XXL/44'),
    ('30005273', 'CUADERNO DE 100 HOJAS ARGOLLADO'),
    ('30005350', 'TAPETE ANTIFATIGA CAUCHO 90CMX90CM'),
    ('30005813', 'TINTA NEGRA 544 EPSON L5190'),
    ('30005814', 'TINTA AMARILLA 544 EPSON L5190'),
    ('30005815', 'TINTA MAGENTA 544 EPSON L5190'),
    ('30005816', 'TINTA CIAN 544 EPSON L5190'),
    ('30005821', 'GUANTE ALGODON/POLIESTER BLANCO'),
    ('30005866', 'PILA PLANA SONY CR2032'),
    ('30006024', 'PANTALON BRIGADA TALLA 40'),
    ('30006212', 'NO USAR ESTOS CODIGOS (RESP SST)'),
    ('30006219', 'BASE DE EXTINTOR 10 LBS'),
    ('30006262', 'STPQUAT X 2KG TAPETE'),
    ('30006264', 'MICROFIBRA BAYETILLA RIBETO ROJO'),
    ('30006265', 'MICROFIBRA BAYETILLA AZUL'),
    ('30006266', 'MICROFIBRA BAYETILLA VERDE'),
    ('30006268', 'JABON NEUTRO MULTICLEAN NAC X GLN-001'),
    ('30006269', 'AMBIENTADOR LIQUIDO BAMBU GLN GENERICO'),
    ('30006270', 'TRAPEADOR 500 GR ROSCA AZUL'),
    ('30006271', 'SABRA AZUL 3M X UNI'),
    ('30006274', 'BOLSAS NEGRA 60X85 CAL 0.8MM'),
    ('30006377', 'TARRO ATOMIZADOR 500ML'),
    ('30006380', 'REPUESTO CARETA FACIAL VISOR NEGRO'),
    ('30007774', 'BATOLA M/10 DAMA BRIGADA'),
    ('30007787', 'BATOLA M/38 HOMBRE BRIGADA'),
    ('30007789', 'BATOLA XL/42 HOMBRE BRIGADA'),
    ('30007792', 'BATOLA L/40 HOMBRE LIDER EVACUACION'),
    ('30007793', 'BATOLA M/38 HOMBRE LIDER EVACUACION'),
    ('30007799', 'JABÃ“N LAVALOZA BLANCOX LIMON X3800ML'),
    ('30007857', 'MEZCLADORES CAFÃ‰ DE MADERA X500UNI'),
    ('30007945', 'GUANTE ANSELL EDGE 48-929 T-8'),
    ('30008385', 'BOLSA BLANCA(70X90)'),
    ('30008463', 'GUANTE ANSELL EDGE 48-929 T-10'),
    ('30008553', 'BUZO GRIS MANGA LARGA TALLA XXXL/46'),
    ('30008580', 'MATERIAL ABSORBENTE KIT DERRAMES'),
    ('30008799', 'TUERCA M4 EN ACERO'),
    ('30008800', 'TORNILLO M4X20 BRISTOL ACERO PAV NEGRO'),
    ('30009504', 'BLUE JEAN TALLA 38'),
    ('30010660', 'ROLLO 3MT PAPEL CONTAC COLOR NEGRO'),
    ('30010692', 'RESMA NATURAL ECOLOGICA CARTA'),
    ('30010693', 'RESMA NATURAL ECOLOGICA OFICIO'),
    ('30010696', 'PAPHIG 4x200M NAT DOBHOJ CENTRAL X 4'),
    ('30010697', 'TOALLA DE MANO X 120M FAMI RLLNAT DH X 6'),
    ('30010896', 'KIT CAMISA POLO HOMBRE WINDOW PERSO T-L'),
    ('30010900', 'OVEROL AZUL DRILL TALLA 34 MC'),
    ('30010901', 'OVEROL AZUL DRILL TALLA 36 MC'),
    ('30010902', 'OVEROL AZUL DRILL TALLA 38 MC'),
    ('30010904', 'OVEROL AZUL DRILL TALLA 42 MC'),
    ('30010906', 'OVEROL AZUL DRILL TALLA 46 MC'),
    ('30011294', 'ROLLO PAPEL CONTAC TRASPARENTE 45X3'),
    ('30011343', 'ESCALERA DE ALUMINIO DE 3 PELDAÃ‘OS.'),
    ('30011447', 'LAMPARA DE EMERGENCIA'),
    ('30012228', 'FILTRO TELA PARA GRECA DE 30 TINTOS'),
    ('30012269', 'BOLSA NEGRA 90 X 130 CMS'),
    ('30012891', 'CAFE GRANULADO LA BASTILLAX 5 LIBRAS'),
    ('30013114', 'TOALLA MANOS ROLLO X 200MTS (X 6 ROLLOS)'),
    ('30013115', 'PAPEL HIGIENICO JRT 2P 6X320 ( 6 ROLLOS)'),
    ('31000052', 'CAJA CARTON RECICLADA TVS(740X325X280)'),
    ('49000005', 'SOLDADURA 680 1/8IN UTP 65'),
    ('49000021', 'BROCA HSS 16 MM'),
    ('49000023', 'BROCA HSS Ã˜1/4IN'),
    ('49000079', 'BROCA HSS Ã˜1/16IN'),
    ('49000081', 'BROCA HSS Ã˜1/8IN'),
    ('49000083', 'BROCA HSS Ã˜9/64IN'),
    ('49000089', 'BROCA HSS Ã˜3MM'),
    ('49000097', 'BROCA HSS Ã˜6MM'),
    ('49000103', 'BROCA CENTRO # 6'),
    ('49000105', 'BROCA CENTRO # 5'),
    ('49000106', 'BROCA CENTRO # 3'),
    ('49000107', 'BROCA CENTRO # 2'),
    ('49000108', 'BROCA CENTRO # 7'),
    ('49000109', 'MARTILLO GOMA SATA'),
    ('49000114', 'ABRAZADERA 1/2IN'),
    ('49000133', 'BROCA HSS Ã˜9/64IN TIN HERTEL'),
    ('49000167', 'BROCHA 2IN'),
    ('49000275', 'FUSIBLE PRIMARIO 20/24KV 40A'),
    ('49000277', 'CINTA SCOTH 33'),
    ('49000329', 'RESISTENCIA 60MMDX74MMA 500W 230V T-104'),
    ('49000330', 'RESISTENCIA 40MMDX40MM 180 W 230V T'),
    ('49000332', 'RESISTENCIA270MMDX135MMA3500W 220VTSOKT-'),
    ('49000333', 'RESISTENCIA170MMDX205MMA3000W 220V SOC'),
    ('49000425', 'RACOR RECTO Â¼ NPT 8 MM OD B68-08M-4'),
    ('49000426', 'RACOR CODO Â¼ NPT 8 MM OD B69-08M-4'),
    ('49000427', 'RACOR CODO Â¼ NPT 6 MM OD B69-06M-4'),
    ('49000429', 'TERMOCUPLA FLEX BAYONETA 12MM TIPO K'),
    ('49000444', 'UNID MMT 1/2IN MICRO 0.103.003.564.'),
    ('49000506', 'PIÃ‘ON PLANETARIO REF 100206'),
    ('49000507', 'NUCLEO MOVIL REF 0550309'),
    ('49000526', 'REDUCCION GALV 1IN-3/4IN'),
    ('49000527', 'REDUCCION DE 1/2 A 1/4 NPT'),
    ('49000559', 'PIEDRA MOTOR TOOL Ã˜1/4IN A2'),
    ('49000560', 'PIEDRA MOTOR TOOL Ã˜1/4IN A4'),
    ('49000561', 'PIEDRA MOTOR TOOL Ã˜1/4IN A5'),
    ('49000562', 'PIEDRA MOTOR TOOL Ã˜1/4IN A11'),
    ('49000563', 'PIEDRA MOTOR TOOL Ã˜1/4IN A13'),
    ('49000564', 'PIEDRA MOTOR TOOL Ã˜1/4IN A25'),
    ('49000565', 'PIEDRA MOTOR TOOL Ã˜1/4IN A36'),
    ('49000566', 'PIEDRA MOTOR TOOL Ã˜1/4IN A38'),
    ('49000654', 'BROCA HSS Ã˜11/64IN'),
    ('49000656', 'BROCA HSS Ã˜13/32IN'),
    ('49000741', 'LOCTITE 404 ( PARA ORING)'),
    ('49000745', 'VALVULA CHEQUE (TORPEDO) CARRERA CORTA'),
    ('49000993', 'TORNILLO SOCKET 3/8 X 3 Â¾'),
    ('49000998', 'TORNILLO SOCKET Ã˜3/16X2'),
    ('49001013', 'TORNILLO SOCKET Ã˜3/8INX1 1/2IN'),
    ('49001014', 'TORNILLO SOCKET Ã˜3/8INX2IN'),
    ('49001125', 'LIJA # 800'),
    ('49001128', 'PLIEGO LIJA DE AGUA GRANO 2000'),
    ('49001179', 'MACHUELO HSS GUN EN MM M4x0.4'),
    ('49001187', 'REDUCCION BUSHING 3/8M A 1/4H NPT COBRE'),
    ('49001189', 'RESISTENCIA 50MMDX355MM 700W 220V'),
    ('49001190', 'AGUA DESMINERALIZADA PARA BATERIA'),
    ('49001211', 'RODAMIENTO 6201 LU'),
    ('49001212', 'KIT ACOPLE RAPIDO 1/4" NPT PARA MOLDE'),
    ('49001213', 'NIPLES 1/4" NPT X 1"'),
    ('49001214', 'UNION 1/4" NPT'),
    ('49001215', 'RACOR Â¼â€ FITTING A MANGUERA 1/2â€'),
    ('49001221', 'ORINGS FILTRO LAMINILLAS SUCCION 4642061'),
    ('49001224', 'ORINGS FILTRO ALTA PRESION ISO 4641632'),
    ('49001225', 'CARTUCHO FILTRO ALTA HIDRAULICO 4632325'),
    ('49001226', 'ORINGS FILTRO ALTA HIDRAULICO 4636297'),
    ('49001228', 'CARTUCHO FILTRO AIRE HIDRAULICO 8383435'),
    ('49001229', 'ORINGS FILTRO AIRE HIDRAULICO 4811767'),
    ('49001237', 'ACOPLE HIDRAULICO 9/16X16'),
    ('49001238', 'ACOPLE HIDRAULICO 9/16X1/4'),
    ('49001239', 'ACOPLE HIDRAULICO CODO 9/16 X 1/4'),
    ('49001240', 'T HIDRAULICA 9/16'),
    ('49001241', 'FUSIBLE PRIMARIO 24KV 50KA 210A 63A'),
    ('49001252', 'UNID. MMT G1/4" MICRO 0.103.003.532/ME'),
    ('49001262', 'MANGUERA PU AZUL 8MM'),
    ('49001271', 'RESISTENCIA CIRCULAR 220 V 2000 W'),
    ('49001279', 'FILTRO ACEITE PARA STILL FM-X14'),
    ('49001280', 'FILTRO DE AIRE PARA STILL FM-X14'),
    ('49001282', 'BREAKER 3X30A EMPOTRAR'),
    ('49001284', 'DISCO BREAKE B REF 050308'),
    ('49001285', 'ENGRANAJE INTERNO REF: 100204'),
    ('49001286', 'COLLARIN 42MM 1/2" ALUMINIO AIREXPRESS'),
    ('49001287', 'COLLARIN 42MM 3/4 ALUMINIO AIREXPRESS'),
    ('49001288', 'UNION ROSCADA MACHO 19MM 3/4" AIREXPRESS'),
    ('49001289', 'UNION ROSCADA MACHO 19MM 1/2" AIREXPRESS'),
    ('49001290', 'CODO NEU ALUMINIO 42MM AIREXPRESS'),
    ('49001291', 'UNION RECTA 42MM ALUMINIO AIREXPRESS'),
    ('49001292', 'BREAKER 2 POLOS 4 AMP RIEL OMEGA 220V'),
    ('49001293', 'TERMICO REF:LRD14 SCHNEIDER/220V 12-18A'),
    ('49001294', 'BREAKER 3 POLOS 40 AMP RIEL OMEGA 220V'),
    ('49001295', 'GUARDAMOTOR SCHNEIDER 440V 2.5-4A OMEGA'),
    ('49001296', 'MANOMETRO GLICERI 0-100 PSI 1/4" NPT LAT'),
    ('49001297', 'VALVULA BOLA MARIPOSA PVC 1 1/2"'),
    ('49001298', 'VALVULA BOLA MARIPOSA PVC 2"'),
    ('49001299', 'VALVULA BOLA MARIPOSA PVC 3/4"'),
    ('49001300', 'RELE 14 PINES 220V R4N-2014-23-5230-WTL'),
    ('49001301', 'LIMPIADOR PVC PAVCO 1/4 DE GALON'),
    ('49001302', 'SOLDADURA PVC PAVCO 1/2 DE GALON'),
    ('49001303', 'CODO PVC PRESION 4"'),
    ('49001304', 'CODO PVC PRESION 3"'),
    ('49001305', 'CODO PVC PRESION 1 1/2"'),
    ('49001306', 'COLLARRIN PVC 1 1/2"'),
    ('49001307', 'LOCTITE TEROSON PU 9225'),
    ('49001309', 'LOCTITE EA 3463 METAL MAGIC STEEL'),
    ('49001310', 'TERMOCUPLA TE6/12E M10X1 J 4M'),
    ('49001311', 'RELE SEGURIDAD PNOZ S3C 24V DC 751103'),
    ('49001315', 'RESISTENCIA SEG 185X74 460V 2050W'),
    ('49001316', 'RESISTENCIA SEG 260X80 460V 3050W'),
    ('49001317', 'RESISTENCIA SEG 260X65 460V 3050W'),
    ('49001318', 'TERMOCUPLA D50X100 TYPE"J"'),
    ('49001319', 'TRANSDUCTOR PRESI KS-T-1-Z-B41D-H-V-631'),
    ('49001331', 'TERMICO REF:LRD10 SCHNEIDER/220V 4-6AMP'),
    ('49001332', 'TERMICO REF:LRD14 SCHNEIDER/220V 7-10AMP'),
    ('49001343', 'MANGUERA PU AZUL 12MM'),
    ('49001344', 'RACOR RECTO 1/4" NPT A 12MM OD'),
    ('49001346', 'TERMINAL PLANA MACHO PARA CALIBRE 16'),
    ('49001347', 'TERMINAL PLANA HEMBRA PARA CALIBRE 16'),
    ('49001384', 'CINTA DE ENMASCARAR 24MMX40M SOLUCIONES'),
    ('49001401', 'COBRE ELECTROLITICO 3/8INX1M'),
    ('49001403', 'BARRA ALUMINIO 1/2INX1M'),
    ('49001411', 'TUBO LED PHILIPS ECOFIT 1200MM 16W T8'),
    ('49001412', 'CLAMP MOLDE ESPUMA FABRIC TALLER COLAUTO'),
    ('49001431', 'JUEGO DE LIMAS ROTATIVAS'),
    ('49001433', 'RODOS TELA #100'),
    ('49001434', 'RODOS TELA #120'),
    ('49001437', 'PAPEL LIJA DE AGUA PARA METAL #80'),
    ('49001438', 'PAPEL LIJA DE AGUA PARA METAL #100'),
    ('49001439', 'PAPEL LIJA DE AGUA PARA METAL #120'),
    ('49001441', 'DESENGRASANTE G-104 SUPER BIO'),
    ('49001442', 'PAÃ‘O RETAZO (DIMENSIÃ“N 50CMX50CM)'),
    ('49001451', 'GGS 10-C-10 BUFFER ANTI-GIRO'),
    ('49001461', 'CINTA HYSTICK AZUL 40 MTS X 12MM'),
    ('49001462', 'CINTA HYSTICK AZUL 40 MTS X 24MM'),
    ('49001463', 'CINTA HYSTICK AZUL 40 MTS X 48MM'),
    ('49001480', 'GRATA ALAMBRE EN COPA MOTOTOOL 2"'),
    ('49001499', 'HOJA SIERRA MANUAL DE 12 MM'),
    ('49001509', 'BROCHA DE 2 PULGADAS GOYA'),
    ('49001510', 'BROCHA DE 3 PULGADAS GOYA'),
    ('49001558', 'E12204023 VS 2-40-S8 BELLOWS VACUUM CUP'),
    ('49001647', 'CLAVIJA (32AMP-4P-200/250V-9HR) IP44'),
    ('49001706', 'TORNILLO SOCKET M8-1.25X50MM'),
    ('49001707', 'TORNILLO SOCKET M12-1.25X40MM'),
    ('49001790', 'TORNILLO SOCKET M10X50MM PASO 1,5'),
    ('49001810', 'KIT TOMA DE MUESTRAS DE ACITES'),
    ('49001861', 'REMACHE POP 3/16 X 3/4'),
    ('49001865', 'TORNILLO SOCKET M8X45MM'),
    ('49001881', 'ORGANIZADOR PLASTICO MP-07'),
    ('49001905', 'LLAVE HEXAGONA DE 14MM'),
    ('49001913', 'TORNILLO SOCKET M6 X 30MM'),
    ('49001926', 'MANGUE PU AZUL 10 MM'),
    ('49001953', 'ADAPTADOR 90GR 1/4 M NPT X 1/4 M NPT'),
    ('49001954', 'ADAPTADOR 1/4 M NPT X 1/4 H NPS'),
    ('49002011', 'CINTA ELECTRICA F/VIDRIO SCOTCH 27 3/4"'),
    ('49002039', 'REDUCCION BUSHING 1 1/4"X3/4"NPT'),
    ('49002061', 'TARJETA VERDE PP-P IMPRESA MANIFOLD 60GR'),
    ('49002062', 'LAPIZ CORRECTOR LIQUID PAPER'),
    ('49002075', 'CHAPA BOLA METALICA ALCOBA'),
    ('49002171', 'NIPLE TUERCA INOX DE 3/4'),
    ('49002195', 'TORNILLO AUTOPERFORANTE HEX 1" CAL10'),
    ('49002250', 'RESORTE LEMPCO AZUL A CMPRSN 3/4''''X3'''''),
    ('49002251', 'RESORTE LEMPCO ROJO A CMPRSN 3/4''''X3'''''),
    ('49002252', 'RESORTE LEMPCO ROJO A CMPRSN 2''''X1'''''),
    ('49002253', 'TORNILLO HOMBRO 3/8INX2'),
    ('49002254', 'TORNILLO HOMBRO 3/8INX2 1/2'),
    ('49002255', 'TORNILLO HOMBRO 1/2INX2'),
    ('49002256', 'TORNILLO HOMBRO 1/2INX2/12'),
    ('49002271', 'BOTADOR MOLDE INYEC 12MMX800MM'),
    ('49002272', 'BOTADOR MOLDE INYEC 12MM X 500MM'),
    ('49002444', 'PINZA PUNTA AGUDA SNTALEY DE 6"'),
    ('49002563', 'CINTA DE ENMARCAR ADHESIVA'),
    ('49002577', 'CHAZO PLASTICO 1/4Â¨ X 1 1/2Â¨ CON TORNI'),
    ('49002611', 'SWITCH INTERRUPTOR FLUJO DE 1"'),
    ('49002733', 'INTERRUPTOR MULETILLA SCNEIDER XB4D21'),
    ('49002758', 'RACOR 90Â° 1/2" NPT 10MM OD'),
    ('49002771', 'ABRAZADERA CREMALLERA INOX 002-1/4 X 1/2'),
    ('49002773', 'RACOR CONEXIÃ“N RAPIDA 1/4 NTP X 12 MM'),
    ('49002780', 'TANQUE ACEITE INYEC. KRAUSS MAFFEI'),
    ('49002800', 'DISCO CORTE DE METAL 4 1/2'),
    ('49002801', 'DISCO FLAP 4 1/2'),
    ('49002807', 'RACOR RECTO 1/2 NPT X 12 MM OD'),
    ('49002815', 'ACOPLE OPW DE 3/4" PARTE F'),
    ('49002816', 'ACOPLE OPW DE 3/4" PARTE C'),
    ('49002824', 'RACOR RECTO 1/4 NPT X 8MM OD'),
    ('49002844', 'CHAZO MARIPOSA'),
    ('49002845', 'BROCA HSS 5/32 IN'),
    ('49002857', 'FLASH CARD ROBOT WITTMANN EP00000386'),
    ('49002877', 'REDUCCION BUSHING INOX 3/4"X1/2"'),
    ('49002886', 'CAUCHO N NE 1/8" C/L 1.2 MTS ANCHO'),
    ('49002972', 'RACOR RECTO 1/4" NPT 10MM OD'),
    ('49002993', 'BROCA DE MURO DE 1/8'),
    ('49003035', 'ADAPTADOR 90GR. 1/4" M X 3/8" M NPT'),
    ('49003040', 'ADAPTADOR MACHO/MACHO 1/4 NPT A 3/8 NPT'),
    ('49003109', 'BOTADOR MOLDE INYEC 9/64"X260MM'),
    ('49003110', 'BOTADOR MOLDE INYEC 8MMX250MM'),
    ('49003112', 'BOTADOR MOLDE INYEC 8MMX510MM'),
    ('49003113', 'BOTADOR MOLDE INYEC 8MMX200MM'),
    ('49003127', 'RESISTENCIA 40mmDx60mmA 180W220V (700)'),
    ('49003128', 'RESISTENCIA 50MMDX315MMA 700W220V (550)'),
    ('49003129', 'RESISTENCIA 32mmDx130mmA 500W230V (200)'),
    ('49003157', 'FECHADOR MOLDE 0-3 DIAMETRO 10MM (DIA)'),
    ('49003158', 'FECHADOR MOLDE 1-12 DIAMETRO 10MM (MES)'),
    ('49003160', 'FECHADOR MOLDE 0-9 DIAMETRO 8MM (DIA)'),
    ('49003161', 'FECHADOR MOLDE 0-3 DIAMETRO 8MM (DIA)'),
    ('49003162', 'FECHADOR MOLDE 1-12 DIAMETRO 8MM (MES)'),
    ('49003164', 'FECHADOR MOLDE 0-9 DIAMETRO 12MM (DIA)'),
    ('49003166', 'FECHADOR MOLDE 1-12 DIAMETRO 12MM (MES)'),
    ('49003171', 'BROCA DE MURO 1/4"'),
    ('49003263', 'BOTADOR MOLDE INYEC 10MMX500MM'),
    ('49003264', 'BOTADOR MOLDE INYEC 10MM X 400MM'),
    ('49003265', 'BOTADOR MOLDE INYEC 7MM X 500MM'),
    ('49003266', 'BOTADOR MOLDE INYEC 8MM X 400MM'),
    ('49003267', 'BOTADOR MOLDE INYEC 10MMX700MM'),
    ('49003268', 'BOTADOR MOLDE INYEC 12MMX500MM'),
    ('49003269', 'BOTADOR MOLDE INYEC 8MMX630MM'),
    ('49003270', 'BOTADOR MOLDE INYEC 3,5MMX700MM'),
    ('49003271', 'BOTADOR MOLDE INYEC 1/4"X250MM'),
    ('49003272', 'BOTADOR MOLDE INYEC 1/4'''' X 10'''' DE LONG'),
    ('49003273', 'BOTADOR MOLDE INYEC 8MM X 250MM'),
    ('49003274', 'BOTADOR MOLDE INYEC 7,5MM X 250MM'),
    ('49003275', 'BOTADOR MOLDE INYEC 10MM X 250MM'),
    ('49003276', 'BOTADOR MOLDE INYEC 12MM X 400MM'),
    ('49003277', 'BOTADOR MOLDE INYEC 4MM X 400MM'),
    ('49003278', 'BOTADOR MOLDE INYEC 12MM X 630MM'),
    ('49003279', 'BOTADOR MOLDE INYEC 6MM X 400MM'),
    ('49003280', 'BOTADOR MOLDE INYEC 1/8'''' X 540MM'),
    ('49003281', 'BOTADOR MOLDE INYEC 4,5MM X 500MM'),
    ('49003282', 'BOTADOR MOLDE INYEC 10MM X 200MM'),
    ('49003283', 'BOTADOR MOLDE INYEC 8MM X 210MM'),
    ('49003284', 'BOTADOR MOLD INYEC 1/4'''' X 8'''' DE LONG'),
    ('49003285', 'BOTADOR MOLDE INYEC 1/8'''' X 10"'),
    ('49003286', 'BOTADOR MOLDE INYEC 16MM X 100MM'),
    ('49003287', 'BOTADOR MOLDE INYEC 21/64'''' X 10"'),
    ('49003288', 'BOTADOR MOLDE INYEC 10MMX100MM'),
    ('49003289', 'BOTADOR MOLDE INYEC 5MMX260MM'),
    ('49003291', 'BUJE BOT MLD EXT:10MM INT:7,5MMX200MM'),
    ('49003325', 'FILTRO HC35 SMX10 02041-1169'),
    ('49003406', 'RESISTENCIA ENGEL SEG 168X74 460V 2000W'),
    ('49003417', 'ENCHUFE CAUCHO POLO A TIERRA'),
    ('49003541', 'RODACHINA 1 1/2" CON FRENO'),
    ('49003582', 'FUSIBLE 15A 250V 6X30 MM CERAMICO'),
    ('49003618', 'GUASA 9/16'),
    ('49003678', 'PATA DE CABRA 24"'),
    ('49003733', 'VALVULA BOLA 3/4" INOX'),
    ('49003839', 'TORNILLO HEX M14 X 45 MM'),
    ('49003840', 'ARANDELA PRESION M14'),
    ('49003841', 'TORNILLO HEX M8-1,25X35MM'),
    ('49003842', 'TUERCA M8'),
    ('49003878', 'CONECTOR HDC MACHO+HEMBRA S-A PIN:5 4+PE'),
    ('49003999', 'COLBÃ“N MADERA 250G'),
    ('49004000', 'TORNILLO DE ENSAMBLE HEX 3/4" CAL10'),
    ('49004004', 'ABRAZADERA CREMALLERA INOX 2"'),
    ('49004010', 'REMACHE POP DE 1/8 X 1"'),
    ('49004026', 'LIJA # 2500'),
    ('49004031', 'DISCO VELCRO 5" GRANO 3000'),
    ('49004032', 'DISCO VELCRO 5" GRANO 5000'),
    ('49004036', 'EVT 100/130 D T CONNECTOR PLATE'),
    ('49004037', 'EVG 25/100 X (E10553200)'),
    ('49004043', 'T04-00-10 UNION TEE (4MM)'),
    ('49004094', 'PREPARADOR DE SUPERFICIES PRIMER 94'),
    ('49004104', 'ETIQUETA ADHESIVA 100MMX150MM'),
    ('49004176', 'TORNILLO AUTOPERFORANTE CILIN 1/2" CAL10'),
    ('49004200', 'CONTACTOR 24V ELR H5-I-SC-24DC/500AC-2-L'),
    ('49004233', 'TORNILLO SOCKET M16 P2 X 200MM'),
    ('49004237', 'TORNILLO DE ENSAMBLE CILIN 1" CAL8'),
    ('49004239', 'E12013023 VC 2-30-S8 BELLOWS VACUUM CUP'),
    ('49004240', 'E12011522 VC 2-15-S5 BELLOWS VACUUM CUP'),
    ('49004241', 'VENTOSA SILICONA VS 2-15-S5'),
    ('49004242', 'VENTOSA SILICONA VS 2-30-S8'),
    ('49004243', 'CHANNEL NUTS GWP 4-8 X'),
    ('49004244', 'CHANNEL NUTS GWP 4-17 X'),
    ('49004245', 'CHANNEL NUTS GWP 4-X'),
    ('49004246', 'H06-01S-10 MALE CONNECTOR (4MM/R1/8 EXT)'),
    ('49004247', 'H06-01S-10 MALE CONNECTOR (6MM/RM5 EXT)'),
    ('49004354', 'KIT CONVERSION SWITCH PANEL â€“ 02203-8909'),
    ('49004369', 'REDUCCION RACOR HEMB 3/8" MACH 1/8" NPT'),
    ('49004402', 'SWITCH/INTERRUPTOR SENCILLO CONMUTABLE'),
    ('49004437', 'FUSIBLE CERAMICO 10AMP 10X38MM'),
    ('49004507', 'ESPARRAGO M16 X 2,0 MM'),
    ('49004530', 'CABLE INTERCELDA CAL 50'),
    ('49004540', 'SELLO MECÃNICO FN-24 24MM'),
    ('49004567', 'MANGUERA 1/4" J844 TIPO A'),
    ('49004692', 'TERMINAL EN U TIPO HERRADURA CAL 20'),
    ('49004693', 'CANALETA RANURADA 40X40X2'),
    ('49004695', 'TUBERÃA EMT 1/2"'),
    ('49004765', 'INTERRUPTOR ATEMP 440VAC 25A 60947-3'),
    ('49004784', 'NIPLE TUERCA 1/2" INOX'),
    ('49004818', 'FILTRO EN Y 1" INOX'),
    ('49004843', 'RESISTENCIA 102X250 460V3000W 02216-1612'),
    ('49004844', 'RESISTENCA 102X210 460V3000W 02216-1613'),
    ('49004845', 'TERMOCUPLA TIPO J TE 6/12E + M10X1 2M'),
    ('49004846', 'TERMOCUPLA ISOLIERT TE6/12E M10X1 "J" 4M'),
    ('49004851', 'EMPAQUE ACOPLE OPW 1" VITON'),
    ('49004873', 'MANGUERA PU 10MM AZUL'),
    ('49004878', 'CHAZO EXPANSION 3/8 X2 1/8'),
    ('49004885', 'BROCA PARA LAMINA 7/64'),
    ('49004919', 'LIMA ROTATIVA 1/2"'),
    ('49004920', 'LIMA ROTATIVA 3/8"'),
    ('49004948', 'TERMINAL PIN HUECO NEGRO 10AWG'),
    ('49004949', 'TERMINAL PIN HUECO GRIS 12AWG'),
    ('49004950', 'TERMINAL PIN HUECO AZUL 14AWG'),
    ('49004951', 'TERMINAL PIN HUECO AMARILLO 18AWG'),
    ('49004952', 'TERMINAL PIN HUECO ROJO 16AWG'),
    ('49004986', 'PILA CUADRADA 9V'),
    ('49005076', 'TERMINAL PIN HUECO PARA CALIBRE 20AWG'),
    ('49005084', 'CLAVIJA AÃ‰REA 110 VAC SIN POLO TIERRA'),
    ('49005092', 'REPUESTO SFGW10'),
    ('49005134', 'TORNILLO SOCKET M16X160MM PASO 2'),
    ('49005187', 'FUSIBLE VIDRIO 6MMX30MM 5A'),
    ('49005203', 'RESISTENCIA Ã˜55X355MM 1000W 230V INYE550'),
    ('49005268', 'TORNILLO SOCKET M12 X60 P1.75'),
    ('49005269', 'TORNILLO SOCKET M12 X70 P1.76'),
    ('49005302', 'CABLE ENCAUCHETADO 3X12 AWG'),
    ('49005310', 'BORNCE 18 MM X 1,5 MM X 1 METRO'),
    ('49005362', 'TORNILLO AUTOPERFORANTE HEX 1" CAL8'),
    ('49005414', 'RODAMIENTO 6900 ZZ'),
    ('49005430', 'TORNILLO AUTOPERFORANTE HEX 2" CAL10'),
    ('49005431', 'CABLE ENCAUCHETADO 4X12AWG'),
    ('49005481', 'CONTACTOR CON AUXILIAR 24V NO'),
    ('49005492', 'GRASERA 45Â° DE 1/4'),
    ('49005520', 'FELPA CILINDRICA DE 1 X 1 X 1/4'),
    ('49005536', 'FELPA MS-3 CONICA 1/2 X 1'),
    ('49005539', 'FELPA CILINDRICA DE 1 X 1 X 1/8'),
    ('49005597', 'CASQUILLO GUIA E 5156/16/22/30'),
    ('49005598', 'CASQUILLO GUIA E 5156/16/22/25'),
    ('49005599', 'CASQUILLO GUIA E 5156/16/22/20'),
    ('49005605', 'REDUCCIÃ“N BUSHING M16X1.5 H A 1/4 NPT M'),
    ('49005633', 'TERMOCUPLA J DIA1,5X420MM 2M YJ164200R'),
    ('49005635', 'TERMOCUPLA J DIA1,5X450MM 2M YJ164500R'),
    ('49005637', 'REMACHE POP DE 1/8 X 1/2'),
    ('49005639', 'ELECTRODO E6011'),
    ('49005641', 'PEGALOCA 120G'),
    ('49005643', 'RACOR RECTO 1/2 NPT 12 MM NEUM'),
    ('49005644', 'CEPILLO DE DIENTES'),
    ('49005654', 'TORNILLO SOCKET M12 X 45 P1.75'),
    ('49005655', 'TORNILLO SOCKET M8-1.25X35MM'),
    ('49005695', 'TORNILLO HOMBRO M5X30MM'),
    ('49005699', 'TORNILLO SOCKET M20X220MM P 2,5'),
    ('49005701', 'ESPARRAGO M16X1/2'),
    ('49005705', 'VALVULA FLOTADOR DE 1/2"'),
    ('49005745', 'PIPETAS GAS MAPP DE 1 LBR'),
    ('49005806', 'FUSIBLE CERÃMICO 6A 10X38MM'),
    ('49005830', 'TORNILLO AUTOPERFORANTE HEX 1 1/2"CAL10'),
    ('49005831', 'TORNILLO AUTOPERFORANTE CILIN 1/2" CAL10'),
    ('49005832', 'TORNILLO AUTOPERFORANTE HEX 3/4" CAL10'),
    ('49005833', 'TORNILLO ALLEN BRIS AVELLA M5x30+TUERCA'),
    ('49005834', 'TORNILLO ALLEN BRIS AVELLA M5x20+TUERCA'),
    ('49005835', 'TORNILLO ALLEN BRIS AVELLA M4x20+TUERCA'),
    ('49005836', 'TORNILLO ESTUF 1/8 X 1 CON ARAN_TUERC'),
    ('49005837', 'TORNILLO 1/4X2 ARANDE_TUERC'),
    ('49005838', 'TORNILLO 3/8 X 2 ARANDE_TUERC'),
    ('49005839', 'TORNILLO ALLEN BRIS AVELLA M3x20+TUERCA'),
    ('49005840', 'TERMINAL HERRADURA CAL10 AWG'),
    ('49005841', 'TORNILLO ESTUF 3/16 X 2 CON ARAN_TUERC'),
    ('49005911', 'TORNILLO SOCKET M12 P1,75 X 105 MM'),
    ('49005912', 'TORNILLO HOMBRO D20X110MM X M16 P2'),
    ('49005975', 'FILTRO YR 50708 800G'),
    ('49005989', 'ETIQUETA S0029 DE 10CM X 15CM X 950U 3"'),
    ('49006109', 'MANGUERA NEUMATICA 4MM AZUL'),
    ('49006167', 'CONTACTOR 32A 220VAC AC3'),
    ('49006291', 'RACOR RECTO 1/4 NPT X 6MM MACHO'),
    ('49006292', 'RESORTE LEMCO ROJO D1/2" X 2-1/2"'),
    ('49006293', 'CAJA EMT DOBLE TOMA CON TAPA 12X12X5'),
    ('49006370', 'FUSIBLE 16 A 690 VAC 10X38 MM'),
    ('49006479', 'TELA SINTETICA AZUL CLARO LAZIO'),
    ('49006482', 'BANDA EN V TIPO B-67'),
    ('49006491', 'PILA AAA PAQUETE X 2 UND'),
    ('49006503', 'TORNILLO SOCKET M10X40MM'),
    ('49006531', 'TOMA CORRIENTE DOBLE 110V'),
    ('49006540', 'TAPON RACOR 8MM'),
    ('49006541', 'TAPON RACOR 10MM'),
    ('49006542', 'TAPON RACOR 12MM'),
    ('49006546', 'LLAVE BOLA 1/4" INOXIDABLE'),
    ('49006582', 'TAPON INOX 3/4 HEMBRA'),
    ('49006583', 'TAPON INOX 3/8 HEMBRA'),
    ('49006618', 'TEE 1/4 NPT HEMBRA'),
    ('49006619', 'TEE 1/4 NPT MACHO'),
    ('49006771', 'CLAVIJA AEREA 110 VAC'),
    ('49006815', 'RACOR RECTO G 1/8- 10MM OD NEUM'),
    ('49006923', 'TORNILLO HEX M5X15MM'),
    ('49007005', 'UNION DE 3/4" INOXIDABLE'),
    ('49007016', 'TORNILLO M6X20'),
    ('49007022', 'AGENTE PURGA INY RAMCLEAN 800'),
    ('49007034', 'UNION NEUMATICA 6MM'),
    ('49007131', 'RODAMIENTO 6202 2z'),
    ('49007273', 'SALSERO'),
    ('49007279', 'RESORTE LEMCO ROJO D1/2" X 2"'),
    ('49007280', 'TORNILLO SOCKET M6 P1 X 45MM'),
    ('49007281', 'TORNILLO SOCKET M6 P1 X 50MM'),
    ('49007384', 'ACOPLE B.I 1/4 X 1/4"M NPT BRONCE 90 GR.'),
    ('49007400', 'CONTACTOR DE RELÃ‰ DE CONTROL'),
    ('49007401', 'SUPRESOR DE PICOS DE VOLTAJE'),
    ('49007492', 'PLASTICO TRANSPARENTE CALIBRE 6'),
    ('49007496', 'CLAVIJA MACHO 32A 415V 4P IP44'),
    ('49007511', 'MANGUERA CAUCHOLONA 1" ACOPLE PARTE C'),
    ('49007513', 'COPA DE 35 MM CUADRANTE 1/2 "'),
    ('49007524', 'LLAVE CRUCETA GABINETE ELECTRICO'),
    ('49007541', '03001-0652 PIEZA ACODADA 506 510K M'),
    ('49007542', '02712-9114 CONNECTOR 3601 06 60'),
    ('49007543', '03001-0202 TORNILLO RACOR 406 002'),
    ('49007544', '03001-0152 ANILLO CONICO DOBLE 406 001'),
    ('49007545', '03001-0481 REGLETA DE TERMINALES 322 661'),
    ('49007546', '03001-0604 TORNILLO 406011'),
    ('49007548', '03002-1251 VAINA ENCHUFABLE'),
    ('49007549', '03001-0476 ELEME DOSIFICACION 321-610-W3'),
    ('49007650', 'MANGUERA CAUCHO LONA ROJA 1/2 "'),
    ('49007651', 'MANGUERA CAUCHO LONA NEGRA 1/2 "'),
    ('49007707', 'PESTILLO DE SEGURIDAD SFGW10 PEWAG'),
    ('49007796', 'O-RING DIN 33MM ESP 2MM 45721'),
    ('49007856', 'GRASERA 45G M6X1'),
    ('49007857', 'ADAP MAC-MAC REC 1/4X7/16 JIC'),
    ('49007896', 'EYECTOR DE VACÃO OD 06MM VENTURI 0.7MM'),
    ('49007998', 'RESISTENCIA 210x80 460V2500W 02216-3251'),
    ('49008054', 'RESISTENCIA 128X50 460V 1000W 02216-1783'),
    ('49008076', 'RODAMIENTO 6200 2RS'),
    ('49008078', 'RODAMIENTO 6202 2RS'),
    ('49008555', 'TINTA PVC 447C'),
    ('49008557', 'ESCOBILLON ALUMINIO 12 CM CAUCHO S75'),
    ('49008559', 'ADELGAZADOR ECOLOGICO 099'),
    ('49008706', 'LLAVE BOLA 1/4" INOXIDABLE'),
    ('49008708', 'ACOPLE OPW INOX PARTE F 3/4'),
    ('49008765', 'CONECTOR H 5P 10A/400V INC'),
    ('49008836', 'SEGURO TOLVA SHINI SAL-6U-A-35 (VER.C) 3'),
    ('49009052', 'BOQUILLA DE INYECCION'),
    ('49009156', 'ADAPTADOR 1/4 H NPT X 1/4 H NPT FIJA'),
    ('49009157', 'ADAPTADOR A 90Â° HEMBRA HEMBRA 1/4 NPT'),
    ('49009178', 'AGENTE DE PURGA DYNA PURGE C'),
    ('49009298', 'CRC IND. SILICONA EXTREME DUTY 400cc'),
    ('49009328', 'TRAFO 63 VA IN 230V OUT 0-12V /3.8 A'),
    ('49009352', 'CORTAFRIO PRECISION SNELL 150MM SN01-318'),
    ('49009355', 'TORNILLO SOCKET M5X10MM'),
    ('49009356', 'TORNILLO SOCKET M5-0.8X20MM'),
    ('49009367', 'FUSIBLE CERAMICO 15A 250V 5MMX20MM'),
    ('49009428', 'ADAPTADOR MACHO PVC 1"'),
    ('49009532', 'SSR TRIFASICO 480VAC/40A'),
    ('49009578', 'GRATA COPA 3"'),
    ('49009775', 'RESISTENCIA 42X100 220V 500W'),
    ('49009789', 'GRASERA 6MM 45 GRADOS'),
    ('49009790', 'BOQUILLA ENGRASADORA S/M CON EXTENSION'),
    ('49009791', 'ADAPTADOR TAPON H 36MM DIN 28'),
    ('49009792', 'ADAPTDOR TAPON M 36MM DIN28'),
    ('49009794', 'ESCOBILLAS CARBON S3 333480-1 WITTMANN'),
    ('49009803', 'BROCA HSS Ã˜19/64IN'),
    ('49009815', 'BLOQUE 4 LINEAS 10 AWG'),
    ('49009816', 'FILTRO EN Y INOX 1-1/2" NPT'),
    ('49009831', 'FILTRO S3 NET F101002944'),
    ('49009833', 'CEPILLO DE TUBO'),
    ('49009848', 'TORNILLO SOCKET M8X30MM'),
    ('49009849', 'TORNILLO SOCKET M5X30MM'),
    ('49009850', 'TORNILLO SOCKET M10X120MM'),
    ('49009851', 'TORNILLO SOCKET M10X20MM'),
    ('49009852', 'TORNILLO SOCKET M4X12MM'),
    ('49009887', 'CAJA PLASTICA 305X305X170MM'),
    ('49009899', 'TORNILLO SOCKET 3X5 MM'),
    ('49009900', 'TORNILLO SOMBRILLA 5X7 MM'),
    ('49009901', 'TORNILLO SOCKET 7X10 MM'),
    ('49009902', 'TORNILLO SOCKET 5X15 MM'),
    ('49009904', 'TORNILLO SOCKET 6X35 MM'),
    ('49009911', 'TERMOCUPLA D40X80 TYPE"J"'),
    ('49010021', 'RECIPIENTE QUIMICOS 1LT'),
    ('49010048', 'MANIJA DE CAJONERA 12 CM'),
    ('49010063', 'CONTACTO AUX NC 220V 4.5A'),
    ('49010188', 'CAPACITOR CBB61 4-PINES 450 VAC 1MF'),
    ('49010242', 'HERRAMIENTA ENSAMBLE EMBLEMA RAIDER 125'),
    ('49010243', 'RELEY SOLID STATE RGC1A60D26KKE 600V'),
    ('49010350', 'CABLE IDE AWM 2651 E169626'),
    ('49010364', 'CONECTOR 26 PINES HEMBRA IDE AWM 2651'),
    ('49010484', 'FUSIBLE CERAMICO 5X20MM 3,15 A'),
    ('49010488', 'TORNILLO SOCKET M8X75MM PASO 1,25'),
    ('49010489', 'TUERCA HEXAGONAL M20 PASO 1,5 MM ZINCAD'),
    ('49010568', 'EMPAQUE LENGÃœETA F21001204'),
    ('49010574', 'ABRAZADERA CREMALLERA 1, 3/4'),
    ('49010582', 'RELE 16A/250V 8 PINES 24V DC'),
    ('49010601', 'UNION PVC 1"'),
    ('49010631', 'PORTAFUSIBLE AEREO CORTO F103-C1'),
    ('49010632', 'FUSIBLE VIDRIO CORTO- 1,5 A'),
    ('49010633', 'TERMINAL DE CONECTOR PORTAFUSIBLE'),
    ('49010667', 'VALVULA PROP. 4/5 NG16 0811 404 256'),
    ('49010810', 'BATERIA CR2030'),
    ('49010875', 'VACUUM CIRCUIT DM6 VALVE24-OAA00764 SMC'),
    ('49010876', 'VACUUM CIRCUIT DM4 VALVE65-OAA00591 SMC'),
    ('49010972', 'RESISTENCIA 50MM X 200MM 220 1100W'),
    ('49010979', 'MACHUELO NPT POLAND 1/4-18'),
    ('49011008', 'TINTA PVC GRIS CLARO 429C'),
    ('49011062', 'REMACHADORA PARA TUERCAS REMACHABLES'),
    ('49011614', 'ELECTRODO NIVEL 73MM-DIA-3/16-4.7MM'),
    ('49011669', 'CRIBA LAMINA HR DE 3/16 4.5MM'),
    ('60000059', 'DESPERDICIO CARTON'),
    ('60000128', 'DESPERDICIO PLÃSTICO TRANSPARENTE'),
    ('60000147', 'DESPERDICIO COSTAL DE 25 KG'),
    ('70000039', 'AUT-BUJ-KTM-HQV'),
    ('70000044', 'ARA-M6-SLI-EJE-DEL-DER-IZQ-ZNP'),
    ('70000051', 'PIN ENGANCHE TWIST')
ON CONFLICT (codigo_sap) DO UPDATE SET descripcion = EXCLUDED.descripcion, updated_at = NOW();


-- 11. Permisos de catálogos y cancelación

-- Permisos requeridos por el cliente público de SI-3.
-- Requiere que existan las tablas materiales_sie, materiales_sip y turnos.
-- El acceso de escritura no queda protegido por la contraseña visual del panel;
-- para producción, usar Supabase Auth/RPC con políticas por usuario.
-- Ejecutar o volver a ejecutar en el SQL Editor de Supabase.

-- Catálogos de materiales SAP
GRANT INSERT, UPDATE, DELETE ON TABLE public.materiales_sie, public.materiales_sip TO anon, authenticated;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'materiales_sie'
          AND policyname = 'Insercion desde panel materiales SIE'
    ) THEN
        CREATE POLICY "Insercion desde panel materiales SIE"
            ON public.materiales_sie
            FOR INSERT TO anon, authenticated
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'materiales_sie'
          AND policyname = 'Actualizacion desde panel materiales SIE'
    ) THEN
        CREATE POLICY "Actualizacion desde panel materiales SIE"
            ON public.materiales_sie
            FOR UPDATE TO anon, authenticated
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'materiales_sie'
          AND policyname = 'Borrado desde panel materiales SIE'
    ) THEN
        CREATE POLICY "Borrado desde panel materiales SIE"
            ON public.materiales_sie
            FOR DELETE TO anon, authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'materiales_sip'
          AND policyname = 'Insercion desde panel materiales SIP'
    ) THEN
        CREATE POLICY "Insercion desde panel materiales SIP"
            ON public.materiales_sip
            FOR INSERT TO anon, authenticated
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'materiales_sip'
          AND policyname = 'Actualizacion desde panel materiales SIP'
    ) THEN
        CREATE POLICY "Actualizacion desde panel materiales SIP"
            ON public.materiales_sip
            FOR UPDATE TO anon, authenticated
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'materiales_sip'
          AND policyname = 'Borrado desde panel materiales SIP'
    ) THEN
        CREATE POLICY "Borrado desde panel materiales SIP"
            ON public.materiales_sip
            FOR DELETE TO anon, authenticated
            USING (true);
    END IF;
END;
$$;

-- Cancelación de turnos activos
GRANT DELETE ON TABLE public.turnos TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.turnos_eliminados TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.turnos_eliminados_id_seq TO anon, authenticated;

DROP POLICY IF EXISTS "Cancelar turnos no atendidos desde la aplicación" ON public.turnos;
DROP POLICY IF EXISTS "Cancelar turnos activos desde la aplicación" ON public.turnos;

CREATE POLICY "Cancelar turnos activos desde la aplicación"
    ON public.turnos
    FOR DELETE TO anon, authenticated
    USING (estado IN ('espera', 'citado', 'llegado', 'atendiendo'));


-- Verificación final
SELECT '✅ Instalación y migraciones unificadas completadas' AS mensaje;
SELECT
    (SELECT COUNT(*) FROM public.turnos) AS turnos,
    (SELECT COUNT(*) FROM public.historial_turnos) AS historial,
    (SELECT COUNT(*) FROM public.proveedores) AS proveedores,
    (SELECT COUNT(*) FROM public.proveedores_transporte) AS proveedores_transporte,
    (SELECT COUNT(*) FROM public.materiales_sie) AS materiales_sie,
    (SELECT COUNT(*) FROM public.materiales_sip) AS materiales_sip,
    (SELECT COUNT(*) FROM public.notificaciones_salida) AS notificaciones;