# Instrucciones para Configurar Supabase - Nuevo Proyecto

## 🚀 Configuración desde Cero

Este documento te guiará para configurar tu nuevo proyecto de Supabase desde cero.

## 📋 Requisitos Previos

1. Una cuenta en [Supabase](https://supabase.com)
2. Un nuevo proyecto creado en Supabase
3. Acceso al dashboard de tu proyecto

## 🔧 Pasos para Configurar

### 1. Obtener Credenciales del Proyecto

1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu nuevo proyecto
3. Ve a **Settings** > **API** en el menú lateral
4. Copia los siguientes valores:
   - **Project URL** (ej: `https://abcdefghij.supabase.co`)
   - **anon public** key (la clave pública)

### 2. Configurar las Credenciales en la Aplicación

1. Abre el archivo `supabase-config.js`
2. Reemplaza los valores de placeholder:
   ```javascript
   const SUPABASE_URL = 'https://tu-proyecto-id.supabase.co';
   const SUPABASE_KEY = 'tu-api-key-aqui';
   ```
3. Guarda el archivo

### 3. Crear las Tablas en la Base de Datos

1. Ve a **SQL Editor** en el menú lateral de Supabase
2. Copia **todo** el contenido del archivo `database-schema.sql`
3. Pégalo en el editor de SQL
4. Haz clic en **Run** para ejecutar el script
5. Espera a que se complete la ejecución (puede tomar unos segundos)

### 4. Verificar que las Tablas se Crearon

1. Ve a **Table Editor** en el menú lateral
2. Deberías ver las siguientes tablas:
   - ✅ `configuracion` - Configuración del sistema
   - ✅ `proveedores` - Empresas/proveedores registrados
   - ✅ `turnos` - Turnos activos
   - ✅ `historial_turnos` - Historial de turnos
   - ✅ `usuarios` - Usuarios del sistema

### 5. Verificar que Real-time está Habilitado

1. Ve a **Database** > **Replication** en el menú lateral
2. Asegúrate de que las siguientes tablas tengan habilitado **Real-time**:
   - ✅ `turnos`
   - ✅ `historial_turnos`
   - ✅ `proveedores`
   - ✅ `configuracion`

### 6. Probar la Conexión

1. Abre `index.html` en tu navegador
2. Abre la consola del navegador (F12)
3. Deberías ver el mensaje: `✅ Cliente de Supabase inicializado correctamente`
4. Si ves una advertencia de credenciales, verifica que hayas configurado correctamente el paso 2

### 7. Probar la Aplicación

1. Abre `index.html` en tu navegador
2. Solicita un turno desde la página de usuario
3. Abre `admin.html` en otra pestaña o dispositivo
4. Deberías ver el turno aparecer en tiempo real

## 📊 Estructura de la Base de Datos

### Tabla: configuracion
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGINT | Identificador único |
| clave | TEXT | Nombre de la configuración (ej: 'contador_turnos') |
| valor | TEXT | Valor de la configuración |
| descripcion | TEXT | Descripción de la configuración |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de última actualización |

### Tabla: proveedores
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGINT | Identificador único |
| nombre_empresa | TEXT | Nombre de la empresa |
| nit | TEXT | NIT o placa del vehículo (único) |
| contacto | TEXT | Persona de contacto |
| telefono | TEXT | Número de teléfono |
| email | TEXT | Correo electrónico (opcional) |
| servicio | TEXT | Tipo de servicio |
| activo | BOOLEAN | Si el proveedor está activo |
| fecha_registro | TIMESTAMP | Fecha de registro |
| updated_at | TIMESTAMP | Fecha de última actualización |

### Tabla: turnos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGINT | Identificador único |
| numero | TEXT | Número de turno (ej: 'T001') |
| proveedor_id | BIGINT | ID del proveedor (FK) |
| nombre_empresa | TEXT | Nombre de la empresa |
| nit | TEXT | NIT o placa del vehículo |
| motivo | TEXT | Motivo de la visita (opcional) |
| hora_solicitud | TEXT | Hora de solicitud |
| fecha_solicitud | TIMESTAMP | Fecha y hora de solicitud |
| hora_llamada | TEXT | Hora de llamada |
| hora_finalizacion | TEXT | Hora de finalización |
| estado | TEXT | Estado: espera, atendiendo, completado, cancelado |
| prioridad | INTEGER | Prioridad (0=normal, 1=alta, 2=urgente) |
| notas | TEXT | Notas adicionales |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de última actualización |

### Tabla: historial_turnos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGINT | Identificador único |
| turno_id | BIGINT | ID del turno original |
| numero | TEXT | Número de turno |
| nombre_empresa | TEXT | Nombre de la empresa |
| nit | TEXT | NIT o placa del vehículo |
| motivo | TEXT | Motivo de la visita |
| hora_solicitud | TEXT | Hora de solicitud |
| hora_llamada | TEXT | Hora de llamada |
| hora_finalizacion | TEXT | Hora de finalización |
| estado | TEXT | Estado final (completado, cancelado) |
| tiempo_espera_minutos | INTEGER | Tiempo de espera en minutos |
| tiempo_atencion_minutos | INTEGER | Tiempo de atención en minutos |
| fecha | TIMESTAMP | Fecha y hora del registro |
| created_at | TIMESTAMP | Fecha de creación |

### Tabla: usuarios
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGINT | Identificador único |
| email | TEXT | Correo electrónico (único) |
| nombre | TEXT | Nombre del usuario |
| rol | TEXT | Rol: admin, operador, visualizador |
| activo | BOOLEAN | Si el usuario está activo |
| ultimo_acceso | TIMESTAMP | Último acceso al sistema |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de última actualización |

## ✨ Características Implementadas

✅ **Sincronización en tiempo real**: Los cambios se reflejan instantáneamente en todos los dispositivos
✅ **Acceso multi-dispositivo**: Los usuarios pueden solicitar turnos desde cualquier dispositivo
✅ **Historial persistente**: El historial de turnos se guarda en la base de datos
✅ **Estadísticas en vivo**: Las estadísticas se actualizan en tiempo real
✅ **Row Level Security (RLS)**: Políticas de seguridad implementadas
✅ **Triggers automáticos**: Actualización automática de timestamps
✅ **Índices optimizados**: Mejor rendimiento en consultas
✅ **Validación de datos**: Constraints para garantizar integridad

## 🔐 Seguridad

- **Row Level Security (RLS)** está habilitado en todas las tablas
- Por defecto, se permiten todas las operaciones (puedes restringir según tus necesidades)
- Las credenciales se almacenan en el archivo de configuración
- Nunca compartas tu **service_role key** (solo usa la clave pública)

## 🛠️ Solución de Problemas

### ❌ Error: "Supabase no está inicializado"
**Solución:**
1. Verifica que hayas configurado las credenciales en `supabase-config.js`
2. Asegúrate de que la URL y la API key sean correctas
3. Revisa la consola del navegador para ver errores específicos

### ❌ Los datos no se sincronizan
**Solución:**
1. Verifica que las tablas tengan habilitado Real-time (paso 5)
2. Revisa la consola del navegador para ver si hay errores
3. Verifica que tu API key sea correcta
4. Recarga la página para forzar la sincronización

### ❌ No puedes acceder al admin
**Solución:**
1. Asegúrate de hacer 5 clics en el logo rápidamente (dentro de 2 segundos)
2. La contraseña por defecto es: `12345`

### ❌ Los turnos no aparecen
**Solución:**
1. Verifica que la tabla `turnos` tenga habilitado Real-time
2. Revisa que el estado del turno sea 'espera'
3. Recarga la página para forzar la sincronización
4. Verifica la conexión a internet

### ❌ Error al ejecutar el SQL
**Solución:**
1. Asegúrate de copiar todo el contenido de `database-schema.sql`
2. Ejecuta el script completo, no por partes
3. Si hay errores, verifica que no existan tablas con el mismo nombre
4. Puedes eliminar las tablas existentes y volver a ejecutar

## 📝 Notas Importantes

- **Nunca** compartas tu `service_role key` (solo usa la clave pública)
- Las credenciales se almacenan en el lado del cliente, así que son visibles
- Para producción, considera implementar autenticación más robusta
- Realiza respaldos periódicos de tu base de datos
- Monitorea el uso de tu proyecto en el dashboard de Supabase

## 🔄 Actualizaciones Futuras

- [ ] Sistema de autenticación de usuarios
- [ ] Roles y permisos granulares
- [ ] Reportes avanzados
- [ ] Notificaciones push
- [ ] API REST para integraciones
- [ ] Dashboard de administración avanzado

## 📞 Soporte

Si encuentras problemas:
1. Revisa la consola del navegador (F12)
2. Verifica los logs en el dashboard de Supabase
3. Consulta la documentación oficial: https://supabase.com/docs
4. Revisa este README para soluciones comunes

## 🎯 Próximos Pasos

1. ✅ Configurar credenciales en `supabase-config.js`
2. ✅ Ejecutar `database-schema.sql` en Supabase
3. ✅ Verificar que Real-time esté habilitado
4. ✅ Probar la aplicación
5. ⬜ Personalizar según tus necesidades
6. ⬜ Implementar autenticación (opcional)
7. ⬜ Desplegar a producción
