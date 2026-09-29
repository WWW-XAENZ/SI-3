-- Agrega la lista de codigos SAP a turnos activos y al historial.
ALTER TABLE public.turnos
    ADD COLUMN IF NOT EXISTS materiales_sap JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.historial_turnos
    ADD COLUMN IF NOT EXISTS materiales_sap JSONB NOT NULL DEFAULT '[]'::jsonb;