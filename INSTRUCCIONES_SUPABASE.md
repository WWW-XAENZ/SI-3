# 📋 Instrucciones para Configurar Supabase - Sistema de Turnos SI-3

## 🚀 Pasos para Configurar Supabase

### 1. Crear cuenta en Supabase
1. Ve a [https://supabase.com](https://supabase.com)
2. Haz clic en "Start your project" y crea una cuenta gratuita
3. Inicia sesión con tu cuenta

### 2. Crear un nuevo proyecto
1. Haz clic en "New Project"
2. Selecciona tu organización
3. Ingresa un nombre para tu proyecto (ej: "sistema-turnos-si3")
4. Ingresa una contraseña segura para la base de datos
5. Selecciona una región cercana (recomendado: US East o South America)
6. Haz clic en "Create new project"
7. Espera unos minutos a que se cree el proyecto

### 3. Obtener las credenciales de API
1. Una vez creado el proyecto, ve a **Settings** (icono de engranaje)
2. Haz clic en **API** en el menú lateral
3. Copia los siguientes valores:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 4. Configurar las credenciales en el sistema
1. Abre el archivo `supabase-config.js`
2. Reemplaza las líneas 5 y 6 con tus credenciales reales:

```javascript
const SUPABASE_URL = 'https://TU_PROJECT_URL.supabase.co';  // ← Pega tu Project URL aquí
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';  // ← Pega tu anon public key aquí
```

### 5. Crear las tablas en la base de datos
1. En Supabase, ve a **SQL Editor** en el menú lateral
2. Haz clic en "New Query"
3. Copia y pega TODO el contenido del archivo `supabase-schema.sql`
4. Haz clic en **Run** (o presiona Ctrl+Enter)
5. Espera a que se ejecuten todas las consultas (deberías ver "Success")

### 6. Verificar que las tablas se crearon correctamente
1. Ve a **Table Editor** en el menú lateral
2. Deberías ver las siguientes tablas:
   - `configuracion`
   - `proveedores`
   - `turnos`
   - `historial_turnos`

### 7. Habilitar Realtime (Tiempo Real)
1. Ve a **Database** → **Replication** en el menú lateral
2. Busca la tabla `turnos`
3. Asegúrate de que el toggle de **Realtime** esté activado (verde)
4. Si no está activado, haz clic en el toggle para activarlo

## 📱 Cómo Usar el Sistema

### Para Proveedores (desde el celular):
1. Abre el navegador web en tu celular
2. Ve a la URL donde está alojado el sistema (o abre `user.html` localmente)
3. Llena el formulario con:
   - Nombre de la empresa
   - Placa del vehículo (6 caracteres)
   - Persona de contacto
   - Teléfono
   - Tipo de servicio
4. Haz clic en "Solicitar Turno"
5. Recibirás un número de turno (ej: T001)
6. Espera a que tu turno sea llamado

### Para el Administrador (desde la computadora):
1. Abre `admin.html` en tu navegador
2. Verás el panel de administración con:
   - **Turno Actual**: El turno que está siendo atendido
   - **Turnos en Espera**: Lista de turnos pendientes
   - **Proveedores Registrados**: Lista de todos los proveedores
   - **Historial**: Turnos anteriores
   - **Estadísticas**: Resumen del día
3. Usa los botones para:
   - **Llamar Siguiente Turno**: Atiende al siguiente proveedor
   - **Completar Turno Actual**: Marca el turno como completado
   - **Reiniciar Cola**: Limpia todos los turnos en espera
   - **Sincronizar con Nube**: Fuerza la sincronización con Supabase

## 🔄 Sincronización en Tiempo Real

El sistema sincroniza automáticamente entre dispositivos:
- Cuando un proveedor solicita un turno desde su celular, aparece INSTANTÁNEAMIENTE en el panel del administrador
- Cuando el administrador llama un turno, el proveedor ve la actualización en su celular
- Todo funciona en tiempo real gracias a Supabase Realtime

## 🛠️ Solución de Problemas

### "Modo local (sin nube)"
- **Causa**: Las credenciales de Supabase no están configuradas correctamente
- **Solución**: Verifica que hayas pegado correctamente la Project URL y la anon key en `supabase-config.js`

### Los turnos no aparecen en el admin
- **Causa**: Las tablas no se crearon o Realtime no está habilitado
- **Solución**: 
  1. Verifica en Table Editor que las tablas existen
  2. Ve a Database → Replication y activa Realtime para la tabla `turnos`

### Error al conectar con Supabase
- **Causa**: Problemas de red o credenciales incorrectas
- **Solución**: 
  1. Verifica tu conexión a internet
  2. Verifica que las credenciales sean correctas
  3. Espera unos minutos e intenta de nuevo

### Los turnos se duplican
- **Causa**: Múltiples sincronizaciones simultáneas
- **Solución**: El sistema ya filtra duplicados automáticamente, pero si persiste, haz clic en "Reiniciar Cola"

## 📊 Estructura de la Base de Datos

### Tabla `configuracion`
- Almacena configuraciones del sistema
- Contiene el contador global de turnos

### Tabla `proveedores`
- Almacena información de los proveedores
- Se actualiza automáticamente cuando un proveedor solicita un turno

### Tabla `turnos`
- Almacena los turnos activos (en espera o siendo atendidos)
- Se sincroniza en tiempo real entre dispositivos

### Tabla `historial_turnos`
- Almacena el historial de turnos completados
- Se usa para estadísticas y reportes

## 🔐 Seguridad

El sistema usa **Row Level Security (RLS)** de Supabase:
- Las políticas permiten lectura, inserción, actualización y eliminación pública
- Para producción, se recomienda configurar autenticación de usuarios
- Las contraseñas y datos sensibles están protegidos por Supabase

## 📞 Soporte

Si tienes problemas:
1. Revisa la consola del navegador (F12 → Console) para ver errores
2. Verifica que Supabase esté funcionando en [status.supabase.com](https://status.supabase.com)
3. Consulta la documentación de Supabase en [supabase.com/docs](https://supabase.com/docs)

## ✅ Checklist de Configuración

- [ ] Cuenta de Supabase creada
- [ ] Proyecto creado en Supabase
- [ ] Credenciales copiadas (Project URL y anon key)
- [ ] Credenciales configuradas en `supabase-config.js`
- [ ] Tablas creadas ejecutando `supabase-schema.sql`
- [ ] Realtime habilitado para la tabla `turnos`
- [ ] Sistema probado desde el celular (user.html)
- [ ] Sistema probado desde la computadora (admin.html)
- [ ] Turnos sincronizándose en tiempo real

¡Listo! Tu sistema de turnos está configurado y funcionando con Supabase. 🎉
