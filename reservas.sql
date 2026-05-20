-- ============================================
-- Sistema de Reservas de Turnos SI-3
-- Agrega columnas y constraint para bloqueo de horarios
-- ============================================

-- 1. Columna fecha_cita como TIMESTAMP (guarda fecha + hora exacta de la reserva)
ALTER TABLE turnos
ADD COLUMN IF NOT EXISTS fecha_cita TIMESTAMP WITH TIME ZONE;

-- 2. Columna destino del proveedor
ALTER TABLE turnos
ADD COLUMN IF NOT EXISTS destino VARCHAR(50);

-- 3. Actualizar constraint de estado para incluir 'citado' (reserva futura)
ALTER TABLE turnos
DROP CONSTRAINT IF EXISTS turnos_estado_check;

ALTER TABLE turnos
ADD CONSTRAINT turnos_estado_check
CHECK (estado IN ('espera', 'atendiendo', 'completado', 'cancelado', 'citado', 'llegado'));

-- 4. Indice para consulta rapida por fecha de cita
CREATE INDEX IF NOT EXISTS idx_turnos_fecha_cita ON turnos(fecha_cita);

-- 5. Indice para filtrar turnos activos por estado
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos(estado);
