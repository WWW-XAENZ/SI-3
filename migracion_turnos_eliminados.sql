CREATE TABLE IF NOT EXISTS public.turnos_eliminados (
    id BIGSERIAL PRIMARY KEY,
    turno_id BIGINT UNIQUE,
    numero VARCHAR(10) NOT NULL,
    fecha_cita TIMESTAMP WITH TIME ZONE,
    fecha_solicitud TIMESTAMP WITH TIME ZONE,
    eliminado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    origen VARCHAR(20) NOT NULL DEFAULT 'turno',
    origen_id BIGINT,
    turno_data JSONB NOT NULL
);

ALTER TABLE public.turnos_eliminados ALTER COLUMN turno_id DROP NOT NULL;
ALTER TABLE public.turnos_eliminados ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'turno';
ALTER TABLE public.turnos_eliminados ADD COLUMN IF NOT EXISTS origen_id BIGINT;
UPDATE public.turnos_eliminados SET origen_id = turno_id WHERE origen_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_turnos_eliminados_origen_id
    ON public.turnos_eliminados (origen, origen_id);

CREATE INDEX IF NOT EXISTS idx_turnos_eliminados_eliminado_en
    ON public.turnos_eliminados (eliminado_en DESC);

ALTER TABLE public.turnos_eliminados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Turnos eliminados: permitir todo" ON public.turnos_eliminados;
CREATE POLICY "Turnos eliminados: permitir todo"
    ON public.turnos_eliminados
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, DELETE ON TABLE public.turnos_eliminados TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.turnos_eliminados_id_seq TO anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.purgar_turnos_eliminados_vencidos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.turnos_eliminados
    WHERE eliminado_en <= NOW() - INTERVAL '30 days';
END;
$$;

REVOKE ALL ON FUNCTION public.purgar_turnos_eliminados_vencidos() FROM PUBLIC;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-deleted-turns-30-days';
SELECT cron.schedule(
    'purge-deleted-turns-30-days',
    '0 * * * *',
    'SELECT public.purgar_turnos_eliminados_vencidos();'
);

NOTIFY pgrst, 'reload schema';