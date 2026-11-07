-- Ejecutar una vez en SQL Editor de Supabase para guardar carga por destino.
ALTER TABLE public.turnos
    ADD COLUMN IF NOT EXISTS bultos_sie INTEGER,
    ADD COLUMN IF NOT EXISTS peso_sie VARCHAR(50),
    ADD COLUMN IF NOT EXISTS bultos_si3 INTEGER,
    ADD COLUMN IF NOT EXISTS peso_si3 VARCHAR(50),
    ALTER COLUMN num_factura TYPE VARCHAR(255);

ALTER TABLE public.historial_turnos
    ADD COLUMN IF NOT EXISTS bultos_sie INTEGER,
    ADD COLUMN IF NOT EXISTS peso_sie VARCHAR(50),
    ADD COLUMN IF NOT EXISTS bultos_si3 INTEGER,
    ADD COLUMN IF NOT EXISTS peso_si3 VARCHAR(50),
    ALTER COLUMN num_factura TYPE VARCHAR(255);

ALTER TABLE public.proveedores_transporte
    ADD COLUMN IF NOT EXISTS bultos_sie INTEGER,
    ADD COLUMN IF NOT EXISTS peso_sie VARCHAR(50),
    ADD COLUMN IF NOT EXISTS bultos_si3 INTEGER,
    ADD COLUMN IF NOT EXISTS peso_si3 VARCHAR(50),
    ALTER COLUMN num_factura TYPE VARCHAR(255);

NOTIFY pgrst, 'reload schema';
