## Objective
- Allow receptionist to register multiple providers under a transport company turn, with each provider tracked independently through dispatch, inspection, exit, and history — while preserving the existing flow for normal vehicles.

## Important Details
- Client-side JS (`app.js` + Supabase), no build step
- HTML files: `user.html`, `llegada.html`, `admin.html`, `despachador.html`, `facturas.html`
- `supabase-config.js` exposes `SUPABASE_URL`/`SUPABASE_ANON_KEY` and `window.supabaseClient`
- `AppState` and `SupabaseDB` are global objects in `app.js`

## Active
- (None — implementation complete)

## Completed
- **`supabase_transportistas.sql`**: New `proveedores_transporte` table with fields (numero_turno, nombre_empresa, nit, motivo, num_factura, tipo_vehiculo, bultos, peso, responsable, contacto, telefono, servicio, destino, nombre_proveedor, estado, autorizado_salida, inspeccion_fisica, hora_solicitud/hora_llamada/hora_finalizacion, created_at, updated_at); `nombre_proveedor VARCHAR(255)` added to `historial_turnos`; `es_transporte` added to `turnos`; indexes, trigger, RLS, realtime publication
- **`admin.html`**: `[ES TRANSPORTADORA]` button in `despachoModal`; `transportistaModal` with Proveedor (required) as first field, then Factura, Bultos, Peso, Responsable, Destino; removed Tipo Vehículo, Contacto, Tel fields; read-only placa display from transportadora
- **`app.js` - `finalizarProveedores`**: Deletes turno from `turnos` table directly (NO historial entry for transportadora); creates individual provider historial entries with `nombre_proveedor`; pushes only provider data to `proveedorListoSalir` localStorage; inserts notification with `tipo: 'salida_pendiente'`; plays direct sound alert via `SonidoAlerta.reproducir(3)`
- **`app.js` - `guardarEnHistorial`/`cargarHistorial`**: Include `nombre_proveedor`/`nombreProveedor`
- **`app.js` - `_crearHistorialProveedoresTransporte`**: Sets `nombre_proveedor` and `destino` per provider
- **`app.js` - `agregarProveedorTransportista`**: Uses `turnoActual.tipoVehiculo` (from despachoModal); no placa-based duplicate check; `nombreProveedor` required
- **`app.js` - `completarTurno`**: Added `inspeccionFisica` and `autorizadoSalida` to localStorage proveedorData
- **`app.js` - `RenderAdmin.historial`**: "Proveedor" column shows provider name for transport, company name for non-transport; Empresa shows transportadora name only for transport; removed "Transporte" column and badges; same column order as dispatcher
- **`app.js` - `eliminarProveedorTransportista`**: Uses `nombreProveedor` in confirmation
- **`despachador.html` - List view**: Filters out transportadora entries; Proveedor shows `nombre_proveedor || nombre_empresa`; "Inspección: SI/NO" status (button only when not inspected and not authorized); always shows "Solicitar Inspección" button for pending entries
- **`despachador.html` - `mostrarProveedorListo`**: Only individual providers for transport; added "Proveedor:" and "Inspección: SI/NO" fields to non-transport info box; no Contacto/Tel
- **`despachador.html` - History tables** (both `consultarHistorial` and `cargarHistorialDespachador`): Unified columns (#, Empresa, Proveedor, Placa, Factura, Tipo, Bultos, Peso, Responsable, Hora, Inspeccion, Estado, Destino); filter transportadora entries; Empresa shows company only for transport; Proveedor shows provider name for transport, company name for non-transport; Inspección: SI/NO column added
- **`despachador.html` - Stats**: Fixed date from UTC to local time (was showing 0 for all counts)
- **`despachador.html` - Data loading**: Both `cargarTurnosPendientesSalida` and `consultarPendientesSalida` fetch ALL `proveedores_transporte` (not just `estado='pendiente'`)
- **`despachador.html` - Data attributes**: Added `data-inspeccion` and `data-estado` to list items; `solicitarInspeccionDesdeLista` passes `nombreProveedor` and `inspeccionFisica`
- **`facturas.html`**: "Empresa" header changed to "Proveedor"; shows proveedor name for transport, company name for non-transport; auto-refreshes every 10 seconds

## Relevant Files
- `app.js` — client logic (SupabaseDB, AdminHandlers, DespachadorHandlers, AdminUI)
- `admin.html` — receptionist panel
- `despachador.html` — dispatcher panel
- `facturas.html` — biller panel (auto-refresh every 10s)
- `supabase_transportistas.sql` — migration file
- `supabase_recrear_completo.sql` — schema reference
- `supabase-config.js` — Supabase client setup