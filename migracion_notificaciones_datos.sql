-- ============================================
-- MIGRACIÓN: Agregar columna datos JSONB a notificaciones_salida
-- ============================================
-- Ejecutar en el SQL Editor de Supabase para bases de datos existentes.
-- Agrega la columna 'datos' para transmitir datos completos entre admin y despachador.
--   - datos: JSONB con datos completos del proveedor/turno para comunicacion realtime

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

CREATE INDEX IF NOT EXISTS idx_notificaciones_datos ON notificaciones_salida USING GIN (datos jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON notificaciones_salida(tipo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_no_leidas ON notificaciones_salida(leido) WHERE leido = false;

SELECT 'Migración completada: columna datos agregada a notificaciones_salida.' AS mensaje;
