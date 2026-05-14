-- Agregar columnas para confirmación de llegada
ALTER TABLE turnos 
ADD COLUMN IF NOT EXISTS hora_llegada TIME,
ADD COLUMN IF NOT EXISTS fecha_llegada TIMESTAMP WITH TIME ZONE;

-- Actualizar constraint de estado para incluir 'llegado' y 'citado'
ALTER TABLE turnos 
DROP CONSTRAINT IF EXISTS turnos_estado_check;

ALTER TABLE turnos 
ADD CONSTRAINT turnos_estado_check 
CHECK (estado IN ('espera', 'citado', 'atendiendo', 'llegado', 'completado', 'cancelado'));

-- También agregar columna destino si no existe (para citas)
ALTER TABLE turnos 
ADD COLUMN IF NOT EXISTS destino VARCHAR(50);

-- Agregar columna fecha_cita si no existe
ALTER TABLE turnos 
ADD COLUMN IF NOT EXISTS fecha_cita DATE;
