# 🎯 Sistema de Turnos SI-3 - Guía Completa

## 📋 Descripción del Sistema

Sistema de gestión de turnos para proveedores estilo EPS, con sincronización en tiempo real mediante Supabase. Permite que los proveedores soliciten turnos desde su celular y el administrador los gestione desde su computadora.

## 🚀 Inicio Rápido

### Opción 1: Modo Local (sin Supabase)
1. Abre `user.html` en el navegador del celular
2. Abre `admin.html` en el navegador de la computadora
3. ¡Listo! El sistema funciona localmente

### Opción 2: Con Supabase (Recomendado)
1. Sigue las instrucciones en `INSTRUCCIONES_SUPABASE.md`
2. Configura las credenciales en `supabase-config.js`
3. Ejecuta `supabase-schema.sql` en Supabase
4. Abre `user.html` y `admin.html`
5. ¡Los turnos se sincronizan en tiempo real!

## 📁 Archivos del Sistema

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Página principal con información del sistema |
| `user.html` | Interfaz para proveedores (celular) |
| `admin.html` | Panel de administración (computadora) |
| `app.js` | Lógica principal del sistema |
| `styles.css` | Estilos visuales |
| `supabase-config.js` | Configuración de Supabase |
| `supabase-schema.sql` | Esquema de base de datos para Supabase |
| `test-supabase.html` | Página de prueba de conexión |
| `INSTRUCCIONES_SUPABASE.md` | Instrucciones detalladas de configuración |

## 📱 Para Proveedores (Celular)

### Cómo Solicitar un Turno
1. Abre `user.html` en tu navegador móvil
2. Llena el formulario:
   - **Nombre de la Empresa**: Nombre de tu empresa
   - **Placa del Vehículo**: 6 caracteres (ej: ABC123)
   - **Persona de Contacto**: Tu nombre
   - **Teléfono**: Número de contacto
   - **Tipo de Servicio**: Selecciona una opción
   - **Motivo de Visita**: Si seleccionas "Otro", describe el motivo
3. Haz clic en **"Solicitar Turno"**
4. Recibirás un número de turno (ej: T001)
5. Espera a que tu turno sea llamado

### Modo de Espera
- Después de solicitar un turno, se activa el **Modo de Espera**
- Verás tu posición en la cola y tiempo estimado
- Recibirás una notificación cuando sea tu turno
- Puedes cancelar tu turno si es necesario

### Estado de la Cola
- **Turno Actual**: El turno que está siendo atendido
- **Turnos en Espera**: Cantidad de turnos pendientes
- **Tu Posición**: Tu lugar en la cola
- **Tiempo Estimado**: Tiempo aproximado de espera

## 💻 Para Administradores (Computadora)

### Panel de Control
1. Abre `admin.html` en tu navegador
2. Verás el panel principal con:
   - **Turno Actual**: Turno siendo atendido
   - **Turnos en Espera**: Lista de turnos pendientes
   - **Proveedores Registrados**: Base de datos de proveedores
   - **Historial**: Turnos anteriores
   - **Estadísticas**: Resumen del día

### Acciones Disponibles

#### 🔘 Llamar Siguiente Turno
- Atiende al siguiente proveedor en la cola
- Muestra modal con información del turno
- Actualiza automáticamente en todos los dispositivos

#### ✅ Completar Turno Actual
- Marca el turno actual como completado
- Mueve el turno al historial
- Libera al siguiente proveedor en la cola

#### 🔄 Reiniciar Cola
- Elimina todos los turnos en espera
- Útil para comenzar un nuevo día
- **Precaución**: Esta acción no se puede deshacer

#### ☁️ Sincronizar con Nube
- Fuerza la sincronización con Supabase
- Útil si hay problemas de conexión
- Sincroniza todos los datos locales

#### 🗑️ Limpiar Historial
- Elimina todos los registros del historial
- Mantiene las estadísticas del día actual
- **Precaución**: Esta acción no se puede deshacer

### Gestión de Proveedores
- Ver lista de proveedores registrados
- Editar información de proveedores
- Eliminar proveedores
- Los proveedores se registran automáticamente al solicitar turno

## ⚡ Sincronización en Tiempo Real

### ¿Cómo Funciona?
1. **Proveedor solicita turno** → Se guarda en Supabase
2. **Supabase notifica** → Admin recibe actualización instantánea
3. **Admin llama turno** → Proveedor recibe notificación
4. **Todo sucede en tiempo real** → Sin necesidad de recargar página

### Requisitos
- Conexión a internet activa
- Supabase configurado correctamente
- Realtime habilitado en la tabla `turnos`

### Modo Local vs Supabase

| Característica | Modo Local | Con Supabase |
|----------------|------------|--------------|
| Funciona sin internet | ✅ Sí | ❌ No |
| Sincronización entre dispositivos | ❌ No | ✅ Sí |
| Datos persistentes | ⚠️ Solo este navegador | ✅ En la nube |
| Múltiples usuarios | ❌ No | ✅ Sí |
| Historial | ⚠️ Limitado | ✅ Completo |

## 🔧 Solución de Problemas

### "Modo local (sin nube)"
**Causa**: Credenciales de Supabase no configuradas  
**Solución**: 
1. Abre `supabase-config.js`
2. Reemplaza `SUPABASE_URL` y `SUPABASE_KEY` con tus credenciales
3. Recarga la página

### Los turnos no aparecen en el admin
**Causa**: Tablas no creadas o Realtime deshabilitado  
**Solución**:
1. Ejecuta `supabase-schema.sql` en Supabase SQL Editor
2. Ve a Database → Replication
3. Activa Realtime para la tabla `turnos`

### Error al conectar con Supabase
**Causa**: Problemas de red o credenciales incorrectas  
**Solución**:
1. Verifica tu conexión a internet
2. Verifica que las credenciales sean correctas
3. Abre `test-supabase.html` para diagnosticar
4. Revisa la consola del navegador (F12) para errores

### Los turnos se duplican
**Causa**: Múltiples sincronizaciones  
**Solución**:
1. El sistema filtra duplicados automáticamente
2. Si persiste, haz clic en "Reiniciar Cola"
3. Verifica que no tengas múltiples pestañas abiertas

### No recibo notificaciones
**Causa**: Permisos de notificación bloqueados  
**Solución**:
1. Verifica los permisos del navegador
2. Permite notificaciones para este sitio
3. Recarga la página

## 📊 Base de Datos

### Tablas Principales

#### `configuracion`
- Almacena configuraciones del sistema
- Contiene el contador global de turnos

#### `proveedores`
- Información de los proveedores
- Se actualiza automáticamente

#### `turnos`
- Turnos activos (en espera o siendo atendidos)
- Se sincroniza en tiempo real

#### `historial_turnos`
- Turnos completados
- Para estadísticas y reportes

### Campos Importantes

**Tabla `turnos`**:
- `numero`: Identificador único del turno (ej: T001)
- `nombre_empresa`: Nombre de la empresa
- `nit`: Placa del vehículo
- `estado`: espera, atendiendo, completado, cancelado
- `fecha_solicitud`: Cuándo se solicitó el turno
- `hora_solicitud`: Hora de solicitud
- `hora_llamada`: Cuándo fue llamado

## 🔐 Seguridad

### Row Level Security (RLS)
- Supabase usa RLS para proteger datos
- Políticas configuradas para permitir operaciones públicas
- Para producción, se recomienda autenticación de usuarios

### Mejores Prácticas
1. **No compartas** tus credenciales de Supabase
2. **Usa contraseñas fuertes** para tu proyecto Supabase
3. **Configura autenticación** para producción
4. **Haz backups** regulares de tu base de datos
5. **Monitorea** el uso de tu proyecto Supabase

## 📈 Estadísticas

El sistema muestra:
- **Turnos Atendidos**: Turnos completados hoy
- **En Espera**: Turnos pendientes
- **Proveedores**: Total de proveedores registrados

## 🎨 Personalización

### Cambiar Colores
Edita `styles.css` y modifica las variables CSS:
```css
:root {
    --primary-color: #3b82f6;
    --success-color: #10b981;
    --danger-color: #ef4444;
    --warning-color: #f59e0b;
}
```

### Cambiar Contraseña de Admin
Edita `app.js` línea 6:
```javascript
const CONFIG = {
    ADMIN_PASSWORD: 'tu_nueva_contraseña',
    // ...
};
```

### Cambiar Tiempo Estimado por Turno
Edita `app.js` línea 9:
```javascript
const CONFIG = {
    TURN_TIME_ESTIMATE: 5, // minutos por turno
    // ...
};
```

## 🆘 Soporte

### Logs del Sistema
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Busca mensajes de error o advertencia

### Página de Diagnóstico
1. Abre `test-supabase.html`
2. Ejecuta las pruebas automáticas
3. Revisa los resultados para identificar problemas

### Recursos Útiles
- [Documentación de Supabase](https://supabase.com/docs)
- [Estado de Supabase](https://status.supabase.com)
- [Foro de Supabase](https://github.com/supabase/supabase/discussions)

## ✅ Checklist de Implementación

### Configuración Inicial
- [ ] Descargar/archivar todos los archivos
- [ ] Crear cuenta en Supabase
- [ ] Crear proyecto en Supabase
- [ ] Obtener credenciales (URL y API Key)
- [ ] Configurar `supabase-config.js`
- [ ] Ejecutar `supabase-schema.sql` en Supabase
- [ ] Habilitar Realtime para tabla `turnos`
- [ ] Probar conexión con `test-supabase.html`

### Pruebas
- [ ] Abrir `user.html` en celular
- [ ] Solicitar un turno de prueba
- [ ] Verificar que aparece en `admin.html`
- [ ] Llamar el turno desde admin
- [ ] Verificar notificación en celular
- [ ] Completar el turno
- [ ] Verificar en historial

### Producción
- [ ] Configurar autenticación en Supabase
- [ ] Cambiar contraseña de admin
- [ ] Configurar dominio personalizado
- [ ] Habilitar HTTPS
- [ ] Configurar backups automáticos
- [ ] Monitorear uso de Supabase

## 🎉 ¡Listo!

Tu sistema de turnos está configurado y funcionando. Los proveedores pueden solicitar turnos desde su celular y el administrador puede gestionarlos desde su computadora, todo en tiempo real.

**¡Disfruta tu nuevo sistema de turnos!** 🚀
