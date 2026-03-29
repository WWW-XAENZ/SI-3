# ⚡ Inicio Rápido - Sistema de Turnos SI-3

## 🎯 ¿Qué Necesitas?

1. **Cuenta de Supabase** (gratuita) - [supabase.com](https://supabase.com)
2. **Navegador web** en tu celular y computadora
3. **Conexión a internet**

## 🚀 Pasos en 5 Minutos

### Paso 1: Crear Cuenta en Supabase (2 min)
1. Ve a [https://supabase.com](https://supabase.com)
2. Haz clic en "Start your project"
3. Crea una cuenta con tu email
4. Inicia sesión

### Paso 2: Crear Proyecto (1 min)
1. Haz clic en "New Project"
2. Nombre: `sistema-turnos-si3`
3. Contraseña: (guarda esta contraseña)
4. Región: **US East** o **South America**
5. Haz clic en "Create new project"
6. Espera 2 minutos a que se cree

### Paso 3: Obtener Credenciales (1 min)
1. Ve a **Settings** (engranaje) → **API**
2. Copia estos valores:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Paso 4: Configurar Sistema (1 min)
1. Abre el archivo `supabase-config.js`
2. Reemplaza las líneas 5 y 6:

```javascript
const SUPABASE_URL = 'https://TU_PROJECT_URL.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

3. Guarda el archivo

### Paso 5: Crear Tablas (1 min)
1. En Supabase, ve a **SQL Editor**
2. Haz clic en "New Query"
3. Abre el archivo `supabase-schema.sql`
4. Copia TODO el contenido
5. Pégalo en el SQL Editor
6. Haz clic en **Run** (o Ctrl+Enter)
7. Espera a que diga "Success"

### Paso 6: Habilitar Tiempo Real (30 seg)
1. Ve a **Database** → **Replication**
2. Busca la tabla `turnos`
3. Activa el toggle de **Realtime** (debe estar verde)

### Paso 7: ¡Probar! (30 seg)
1. Abre `user.html` en tu celular
2. Abre `admin.html` en tu computadora
3. Solicita un turno desde el celular
4. ¡Debería aparecer instantáneamente en la computadora!

## 📱 URLs del Sistema

- **Página Principal**: `index.html`
- **Proveedor (Celular)**: `user.html`
- **Administrador (PC)**: `admin.html`
- **Prueba de Conexión**: `test-supabase.html`

## 🔧 Si Algo Falla

### "Modo local (sin nube)"
→ Verifica que hayas pegado correctamente las credenciales en `supabase-config.js`

### Los turnos no aparecen
→ Ejecuta `supabase-schema.sql` en Supabase SQL Editor

### Error de conexión
→ Abre `test-supabase.html` para diagnosticar el problema

## 📞 Ayuda

- **Instrucciones completas**: `INSTRUCCIONES_SUPABASE.md`
- **Guía completa**: `README_SISTEMA_TURNOS.md`
- **Diagnóstico**: `test-supabase.html`

## ✅ Checklist Rápido

- [ ] Cuenta de Supabase creada
- [ ] Proyecto creado
- [ ] Credenciales copiadas
- [ ] `supabase-config.js` configurado
- [ ] `supabase-schema.sql` ejecutado
- [ ] Realtime habilitado para tabla `turnos`
- [ ] `test-supabase.html` pasa todas las pruebas
- [ ] `user.html` funciona en celular
- [ ] `admin.html` funciona en computadora
- [ ] Turnos se sincronizan en tiempo real

## 🎉 ¡Listo!

Tu sistema está funcionando. Los proveedores pueden solicitar turnos desde su celular y el administrador los ve instantáneamente en su computadora.

**¡Disfruta!** 🚀
