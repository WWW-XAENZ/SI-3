# Instrucciones para Configurar Supabase

## Pasos para configurar la base de datos

### 1. Crear tablas en Supabase

1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor** en el menú lateral
4. Copia todo el contenido del archivo `database-schema.sql`
5. Pégalo en el editor de SQL
6. Haz clic en **Run** para ejecutar el script

### 2. Verificar que las tablas se crearon

1. Ve a **Table Editor** en el menú lateral
2. Deberías ver las siguientes tablas:
   - `configuracion`
   - `proveedores`
   - `turnos`
   - `historial_turnos`

### 3. Verificar que Real-time está habilitado

1. Ve a **Database** > **Replication** en el menú lateral
2. Asegúrate de que las tablas `turnos`, `historial_turnos` y `proveedores` tengan habilitado **Real-time**

### 4. Probar la aplicación

1. Abre `index.html` en tu navegador
2. Solicita un turno desde la página de usuario
3. Abre `admin.html` en otra pestaña o dispositivo
4. Deberías ver el turno aparecer en tiempo real

## Estructura de la base de datos

### Tabla: configuracion
- `id`: Identificador único
- `clave`: Nombre de la configuración (ej: 'contador_turnos')
- `valor`: Valor de la configuración
- `created_at`: Fecha de creación

### Tabla: proveedores
- `id`: Identificador único
- `nombre_empresa`: Nombre de la empresa
- `nit`: NIT o placa del vehículo (único)
- `contacto`: Persona de contacto
- `telefono`: Número de teléfono
- `servicio`: Tipo de servicio
- `fecha_registro`: Fecha de registro

### Tabla: turnos
- `id`: Identificador único
- `numero`: Número de turno (ej: 'T001')
- `proveedor_id`: ID del proveedor (referencia a proveedores)
- `nombre_empresa`: Nombre de la empresa
- `nit`: NIT o placa del vehículo
- `motivo`: Motivo de la visita (opcional)
- `hora_solicitud`: Hora de solicitud
- `fecha_solicitud`: Fecha y hora de solicitud
- `hora_llamada`: Hora de llamada
- `estado`: Estado del turno ('espera', 'atendiendo', 'completado', 'cancelado')
- `created_at`: Fecha de creación

### Tabla: historial_turnos
- `id`: Identificador único
- `turno_id`: ID del turno original
- `numero`: Número de turno
- `nombre_empresa`: Nombre de la empresa
- `nit`: NIT o placa del vehículo
- `motivo`: Motivo de la visita
- `hora_solicitud`: Hora de solicitud
- `hora_llamada`: Hora de llamada
- `hora_finalizacion`: Hora de finalización
- `estado`: Estado final ('completado', 'cancelado')
- `fecha`: Fecha y hora del registro

## Características implementadas

✅ **Sincronización en tiempo real**: Los cambios se reflejan instantáneamente en todos los dispositivos
✅ **Acceso multi-dispositivo**: Los usuarios pueden solicitar turnos desde cualquier dispositivo
✅ **Historial persistente**: El historial de turnos se guarda en la base de datos
✅ **Estadísticas en vivo**: Las estadísticas se actualizan en tiempo real

## Solución de problemas

### Si los datos no se sincronizan:
1. Verifica que las tablas tengan habilitado Real-time
2. Revisa la consola del navegador para ver si hay errores
3. Verifica que tu API key sea correcta en `app.js`

### Si no puedes acceder al admin:
1. Asegúrate de hacer 5 clics en el logo rápidamente (dentro de 2 segundos)
2. La contraseña por defecto es: `12345`

### Si los turnos no aparecen:
1. Verifica que la tabla `turnos` tenga habilitado Real-time
2. Revisa que el estado del turno sea 'espera'
3. Recarga la página para forzar la sincronización
