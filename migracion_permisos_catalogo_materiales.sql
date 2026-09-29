-- Permite insertar nuevos materiales desde el panel de recepción.
-- Ejecutar después de crear materiales_sie y materiales_sip.
-- Este proyecto usa el cliente anon; el acceso de escritura no queda protegido
-- por la contraseña visual del panel. Para producción, usar Supabase Auth/RPC.

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