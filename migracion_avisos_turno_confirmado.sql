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