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
