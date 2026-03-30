# ☁️ Configurar Supabase en la Nube

## 🎯 Objetivo
Configurar tu sistema para que funcione con Supabase en la nube, no en modo local.

## 📋 Pasos para Configurar

### Paso 1: Crear cuenta en Supabase
1. Ve a **https://supabase.com**
2. Haz clic en **"Start your project"**
3. Crea una cuenta gratuita con tu email
4. Inicia sesión

### Paso 2: Crear proyecto
1. Haz clic en **"New Project"**
2. Completa estos campos:
   - **Name**: `sistema-turnos-si3`
   - **Database Password**: Crea una contraseña fuerte (¡guárdala!)
   - **Region**: Selecciona **"US East"** o **"South America"**
3. Haz clic en **"Create new project"**
4. Espera **2-3 minutos** a que se cree

### Paso 3: Obtener credenciales
1. En Supabase, ve a **Settings** (engranaje ⚙️) → **API**
2. Copia estos valores:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Paso 4: Configurar credenciales
1. Abre [`supabase-config.js`](supabase-config.js)
2. Reemplaza la **línea 5** con tu Project URL:
```javascript
const SUPABASE_URL = 'https://TU_PROJECT_URL.supabase.co';
```
3. Reemplaza la **línea 6** con tu anon public key:
```javascript
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```
4. **Guarda el archivo** (Ctrl+S)

### Paso 5: Crear tablas
1. En Supabase, ve a **SQL Editor**
2. Haz clic en **"New Query"**
3. Abre [`supabase-schema.sql`](supabase-schema.sql) y copia **TODO** el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **Run** (o Ctrl+Enter)
6. Espera a que diga **"Success"**

### Paso 6: Habilitar tiempo real
1. En Supabase, ve a **Database** → **Replication**
2. Busca la tabla **`turnos`**
3. Activa el toggle de **Realtime** (debe estar verde ✅)

### Paso 7: Verificar
1. Abre [`diagnostico.html`](diagnostico.html) en tu navegador
2. Haz clic en **"Ejecutar Diagnóstico"**
3. Deberías ver todos los checks en verde ✅

## ✅ Resumen Rápido

```
1. Ve a https://supabase.com
2. Crea cuenta e inicia sesión
3. Crea nuevo proyecto
4. Ve a Settings → API
5. Copia Project URL y anon key
6. Abre supabase-config.js
7. Reemplaza las credenciales
8. Guarda el archivo
9. Ve a SQL Editor en Supabase
10. Ejecuta supabase-schema.sql
11. Ve a Database → Replication
12. Activa Realtime para tabla turnos
13. Prueba con diagnostico.html
```

## 🆘 Si Algo Falla

### Error: "Supabase no está configurado"
- Verifica que hayas pegado correctamente las credenciales
- Verifica que el proyecto esté activo en Supabase
- Espera unos minutos e intenta de nuevo

### Error: "Tabla no existe"
- Ejecuta [`supabase-schema.sql`](supabase-schema.sql) en el SQL Editor de Supabase

### Error: "Realtime no habilitado"
- Ve a Database → Replication y activa Realtime para la tabla `turnos`

## 📁 Archivos de Ayuda

- **[`diagnostico.html`](diagnostico.html)** - Página de diagnóstico
- **[`supabase-schema.sql`](supabase-schema.sql)** - Esquema de base de datos
- **[`SOLUCION_ERROR.md`](SOLUCION_ERROR.md)** - Solución de errores

## 🎉 Resultado

Después de estos pasos:
- ✅ Tu sistema funcionará con Supabase en la nube
- ✅ Los turnos se sincronizarán en tiempo real
- ✅ Los proveedores podrán solicitar turnos desde su celular
- ✅ El administrador verá los turnos instantáneamente en su computadora

¡Tu sistema estará completamente funcional! 🚀
