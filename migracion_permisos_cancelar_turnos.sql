-- Permite cancelar turnos activos desde el cliente público.
-- Ejecutar o volver a ejecutar en el SQL Editor para reemplazar la política anterior.

GRANT DELETE ON TABLE public.turnos TO anon, authenticated;

DROP POLICY IF EXISTS "Cancelar turnos no atendidos desde la aplicación" ON public.turnos;
DROP POLICY IF EXISTS "Cancelar turnos activos desde la aplicación" ON public.turnos;

CREATE POLICY "Cancelar turnos activos desde la aplicación"
    ON public.turnos
    FOR DELETE TO anon, authenticated
    USING (estado IN ('espera', 'citado', 'llegado', 'atendiendo'));
