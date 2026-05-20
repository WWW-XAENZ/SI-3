-- ============================================
-- Sistema de Reservas de Turnos SI-3
-- Agrega columnas para bloqueo y disponibilidad de horarios
-- ============================================

-- 1. Agregar columna fecha_cita como TIMESTAMP (si no existe)
ALTER TABLE turnos
ADD COLUMN IF NOT EXISTS fecha_cita TIMESTAMP WITH TIME ZONE;

-- 2. Agregar columna destino (proveedor va a ENSAMBLES, PLASTICOS o AMBOS)
ALTER TABLE turnos
ADD COLUMN IF NOT EXISTS destino VARCHAR(50);

-- 3. Actualizar constraint de estado para incluir 'citado' (cita futura / reserva)
ALTER TABLE turnos
DROP CONSTRAINT IF EXISTS turnos_estado_check;

ALTER TABLE turnos
ADD CONSTRAINT turnos_estado_check
CHECK (estado IN ('espera', 'atendiendo', 'completado', 'cancelado', 'citado', 'llegado'));

-- 4. Indice para consultar rapidamente los turnos reservados por fecha
CREATE INDEX IF NOT EXISTS idx_turnos_fecha_cita ON turnos(fecha_cita);

-- 5. Indice para filtrar turnos activos por estado
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos(estado);
