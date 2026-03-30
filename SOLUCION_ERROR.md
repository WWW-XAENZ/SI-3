# 🔧 Solución: "Supabase no está configurado"

## 📋 Diagnóstico

El sistema muestra "Supabase no está configurado" porque **las tablas no se han creado** en tu proyecto de Supabase.

## ✅ Solución Rápida (3 minutos)

### Paso 1: Verificar tu proyecto en Supabase
1. Ve a **https://supabase.com** e inicia sesión
2. Verifica que tu proyecto **"msgrypuvobpemieckghb"** esté activo
3. Si no lo ves, créalo nuevamente

### Paso 2: Crear las tablas en Supabase
1. En Supabase, ve al menú lateral y haz clic en **SQL Editor**
2. Haz clic en **"New Query"**
3. Abre el archivo **`supabase-schema.sql`** que está en tu carpeta
4. Copia **TODO** el contenido del archivo
5. Pégalo en el SQL Editor de Supabase
6. Haz clic en **Run** (o presiona **Ctrl+Enter**)
7. Espera a que diga **"Success"** ✅

### Paso 3: Habilitar tiempo real
1. En Supabase, ve a **Database** → **Replication** en el menú lateral
2. Busca la tabla **`turnos`**
3. Asegúrate de que el toggle de **Realtime** esté activado (verde ✅)
4. Si no está activado, haz clic en el toggle para activarlo

### Paso 4: Verificar la conexión
1. Abre el archivo **`verificar-supabase.html`** en tu navegador
2. Deberías ver todos los checks en verde ✅
3. Si ves errores, revisa los pasos anteriores

## 🎯 Resumen Visual

```
1. Ve a https://supabase.com
2. Inicia sesión
3. Ve a SQL Editor
4. Copia contenido de supabase-schema.sql
5. Pega y ejecuta (Run)
6. Ve a Database → Replication
7. Activa Realtime para tabla turnos
8. Prueba con verificar-supabase.html
```

## 🆘 Si Sigues con Problemas

### Error: "Tabla no existe"
**Solución**: Ejecuta el archivo `supabase-schema.sql` en el SQL Editor de Supabase

### Error: "Realtime no habilitado"
**Solución**: Ve a Database → Replication y activa Realtime para la tabla `turnos`

### Error: "No puedo acceder a Supabase"
**Solución**: 
1. Verifica que tu proyecto esté activo
2. Verifica que las credenciales en `supabase-config.js` sean correctas
3. Espera unos minutos e intenta de nuevo

## 📞 ¿Necesitas Ayuda?

1. Abre **`verificar-supabase.html`** en tu navegador
2. Haz clic en **"Verificar Todo"**
3. Copia el log completo
4. Envíamelo para ayudarte

## ✅ Checklist

- [ ] Cuenta de Supabase creada
- [ ] Proyecto activo en Supabase
- [ ] Credenciales configuradas en `supabase-config.js`
- [ ] Tablas creadas ejecutando `supabase-schema.sql`
- [ ] Realtime habilitado para tabla `turnos`
- [ ] `verificar-supabase.html` muestra todos los checks en verde

¡Después de estos pasos, tu sistema funcionará correctamente! 🎉
