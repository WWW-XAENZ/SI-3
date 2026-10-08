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

ALTER TABLE public.turnos_eliminados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Turnos eliminados: permitir todo" ON public.turnos_eliminados;
CREATE POLICY "Turnos eliminados: permitir todo"
    ON public.turnos_eliminados
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, DELETE ON TABLE public.turnos_eliminados TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.turnos_eliminados_id_seq TO anon, authenticated;

NOTIFY pgrst, 'reload schema';