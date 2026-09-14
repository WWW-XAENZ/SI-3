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
