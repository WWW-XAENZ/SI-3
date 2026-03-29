// ============================================
// SISTEMA DE TURNOS PROFESIONAL - ESTILO EPS
// ============================================

const CONFIG = {
    ADMIN_PASSWORD: '12345',
    LOGO_CLICKS_REQUIRED: 5,
    LOGO_CLICK_TIMEOUT: 2000,
    TURN_TIME_ESTIMATE: 5,
    SYNC_INTERVAL: 10000,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000,
    MAX_HISTORIAL: 200,
    MAX_PROVEEDORES: 500
};

const AppState = {
    turnos: [],
    turnoActual: null,
    contadorTurnos: parseInt(localStorage.getItem('contadorTurnos')) || 0,
    isLoading: false,
    subscription: null,
    lastSync: null,
    syncInProgress: false,
    proveedores: [],
    historial: []
};

let logoClickCount = 0;
let logoClickTimer = null;
let syncInterval = null;

// ============================================
// UTILIDADES
// ============================================

const Utils = {
    generarNumeroTurno() {
        AppState.contadorTurnos++;
        localStorage.setItem('contadorTurnos', AppState.contadorTurnos.toString());
        return 'T' + AppState.contadorTurnos.toString().padStart(3, '0');
    },

    obtenerHoraActual() {
        const ahora = new Date();
        return ahora.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    },

    obtenerFechaActual() {
        return new Date().toISOString().split('T')[0];
    },

    obtenerFechaHoraCompleta() {
        return new Date().toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    mostrarNotificacion(mensaje, tipo = 'info') {
        const notificacionesAnteriores = document.querySelectorAll('.notificacion');
        notificacionesAnteriores.forEach(n => n.remove());
        
        const notificacion = document.createElement('div');
        notificacion.className = `notificacion notificacion-${tipo}`;
        notificacion.innerHTML = `
            <span class="notificacion-mensaje">${mensaje}</span>
            <button class="notificacion-cerrar">&times;</button>
        `;

        Object.assign(notificacion.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '16px 24px',
            borderRadius: '8px',
            backgroundColor: tipo === 'success' ? '#10b981' : tipo === 'error' ? '#ef4444' : '#3b82f6',
            color: 'white',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: '9999',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '400px',
            animation: 'slideIn 0.3s ease'
        });

        document.body.appendChild(notificacion);

        const btnCerrar = notificacion.querySelector('.notificacion-cerrar');
        btnCerrar.style.cssText = 'background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; margin-left: auto;';
        btnCerrar.onclick = () => notificacion.remove();

        setTimeout(() => notificacion.remove(), 4000);
    },

    setLoading(isLoading) {
        AppState.isLoading = isLoading;
        const buttons = document.querySelectorAll('.btn, button[type="submit"]');
        buttons.forEach(btn => {
            btn.disabled = isLoading;
            if (isLoading) {
                btn.dataset.originalText = btn.textContent;
                btn.textContent = 'Procesando...';
            } else if (btn.dataset.originalText) {
                btn.textContent = btn.dataset.originalText;
            }
        });
    },

    async reintentarOperacion(operacion, maxIntentos = CONFIG.MAX_RETRY_ATTEMPTS) {
        for (let intento = 1; intento <= maxIntentos; intento++) {
            try {
                return await operacion();
            } catch (error) {
                console.error(`Intento ${intento}/${maxIntentos} falló:`, error.message);
                if (intento === maxIntentos) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            }
        }
    },

    formatearFecha(fechaISO) {
        if (!fechaISO) return 'N/A';
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    },

    formatearHora(hora) {
        return hora || 'N/A';
    }
};

// ============================================
// ALMACENAMIENTO LOCAL
// ============================================

const LocalStorage = {
    guardarTurnos(turnos) {
        localStorage.setItem('turnos', JSON.stringify(turnos));
    },

    obtenerTurnos() {
        return JSON.parse(localStorage.getItem('turnos') || '[]');
    },

    guardarTurnoActual(turno) {
        localStorage.setItem('turnoActual', JSON.stringify(turno));
    },

    obtenerTurnoActual() {
        const turno = localStorage.getItem('turnoActual');
        return turno && turno !== 'null' ? JSON.parse(turno) : null;
    },

    guardarProveedores(proveedores) {
        localStorage.setItem('proveedores', JSON.stringify(proveedores));
    },

    obtenerProveedores() {
        return JSON.parse(localStorage.getItem('proveedores') || '[]');
    },

    guardarHistorial(historial) {
        localStorage.setItem('historial_turnos', JSON.stringify(historial));
    },

    obtenerHistorial() {
        return JSON.parse(localStorage.getItem('historial_turnos') || '[]');
    },

    guardarContador(contador) {
        localStorage.setItem('contadorTurnos', contador.toString());
    },

    obtenerContador() {
        return parseInt(localStorage.getItem('contadorTurnos')) || 0;
    },

    guardarMiTurno(turno) {
        localStorage.setItem('miTurnoActual', JSON.stringify(turno));
    },

    obtenerMiTurno() {
        const turno = localStorage.getItem('miTurnoActual');
        return turno && turno !== 'null' ? JSON.parse(turno) : null;
    },

    eliminarMiTurno() {
        localStorage.removeItem('miTurnoActual');
    }
};

// ============================================
// BASE DE DATOS SUPABASE
// ============================================

const SupabaseDB = {
    async verificarConexion() {
        if (!window.supabaseClient) {
            console.warn('Supabase no está inicializado');
            return false;
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('configuracion')
                .select('*')
                .limit(1);
            
            if (error) {
                console.warn('Error al conectar con Supabase:', error.message);
                return false;
            }
            
            console.log('Conexión con Supabase exitosa');
            return true;
        } catch (error) {
            console.warn('Error de conexión:', error.message);
            return false;
        }
    },

    async obtenerContadorTurnos() {
        if (!window.supabaseClient) {
            return LocalStorage.obtenerContador();
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('configuracion')
                .select('valor')
                .eq('clave', 'contador_turnos')
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    await window.supabaseClient
                        .from('configuracion')
                        .insert({ clave: 'contador_turnos', valor: '0', descripcion: 'Contador global de turnos' });
                    return 0;
                }
                return LocalStorage.obtenerContador();
            }
            
            const contador = data ? parseInt(data.valor) : 0;
            LocalStorage.guardarContador(contador);
            return contador;
        } catch (error) {
            return LocalStorage.obtenerContador();
        }
    },

    async incrementarContadorTurnos() {
        AppState.contadorTurnos++;
        LocalStorage.guardarContador(AppState.contadorTurnos);
        
        if (!window.supabaseClient) {
            return AppState.contadorTurnos;
        }
        
        try {
            const { error } = await window.supabaseClient
                .from('configuracion')
                .upsert({ clave: 'contador_turnos', valor: AppState.contadorTurnos.toString() });
            
            if (error) {
                console.error('Error al guardar contador en Supabase:', error);
            }
            
            return AppState.contadorTurnos;
        } catch (error) {
            console.error('Error en incrementarContadorTurnos:', error);
            return AppState.contadorTurnos;
        }
    },

    async guardarProveedor(proveedor) {
        const proveedores = LocalStorage.obtenerProveedores();
        const existingIndex = proveedores.findIndex(p => p.nit === proveedor.nit);
        
        if (existingIndex >= 0) {
            proveedores[existingIndex] = { ...proveedores[existingIndex], ...proveedor };
        } else {
            proveedor.id = Date.now();
            proveedores.push(proveedor);
        }
        
        LocalStorage.guardarProveedores(proveedores);
        AppState.proveedores = proveedores;
        
        if (!window.supabaseClient) return proveedor;
        
        try {
            const proveedorData = {
                nombre_empresa: proveedor.nombreEmpresa,
                nit: proveedor.nit,
                contacto: proveedor.contacto,
                telefono: proveedor.telefono,
                servicio: proveedor.servicio
            };
            
            const { data, error } = await window.supabaseClient
                .from('proveedores')
                .upsert(proveedorData, { onConflict: 'nit' })
                .select()
                .single();
            
            if (error) {
                console.error('Error al guardar proveedor:', error);
                return proveedor;
            }
            
            return data;
        } catch (error) {
            console.error('Error en guardarProveedor:', error);
            return proveedor;
        }
    },

    async actualizarProveedor(proveedorId, datos) {
        const proveedores = LocalStorage.obtenerProveedores();
        const index = proveedores.findIndex(p => p.id === proveedorId);
        
        if (index >= 0) {
            proveedores[index] = { ...proveedores[index], ...datos };
            LocalStorage.guardarProveedores(proveedores);
            AppState.proveedores = proveedores;
        }
        
        if (!window.supabaseClient) return true;
        
        try {
            const { error } = await window.supabaseClient
                .from('proveedores')
                .update(datos)
                .eq('id', proveedorId);
            
            if (error) {
                console.error('Error al actualizar proveedor:', error);
                return true;
            }
            
            return true;
        } catch (error) {
            console.error('Error en actualizarProveedor:', error);
            return true;
        }
    },

    async eliminarProveedor(proveedorId) {
        const proveedores = LocalStorage.obtenerProveedores();
        const proveedoresFiltrados = proveedores.filter(p => p.id !== proveedorId);
        LocalStorage.guardarProveedores(proveedoresFiltrados);
        AppState.proveedores = proveedoresFiltrados;
        
        if (!window.supabaseClient) return true;
        
        try {
            const { error } = await window.supabaseClient
                .from('proveedores')
                .delete()
                .eq('id', proveedorId);
            
            if (error) {
                console.error('Error al eliminar proveedor:', error);
                return true;
            }
            
            return true;
        } catch (error) {
            console.error('Error en eliminarProveedor:', error);
            return true;
        }
    },

    async cargarProveedores() {
        const proveedores = LocalStorage.obtenerProveedores();
        AppState.proveedores = proveedores;
        
        if (!window.supabaseClient) return proveedores;
        
        try {
            const { data, error } = await window.supabaseClient
                .from('proveedores')
                .select('*')
                .eq('activo', true)
                .order('nombre_empresa', { ascending: true });
            
            if (error) {
                console.error('Error al cargar proveedores:', error);
                return proveedores;
            }
            
            const proveedoresSupabase = data.map(p => ({
                id: p.id,
                nombreEmpresa: p.nombre_empresa,
                nit: p.nit,
                contacto: p.contacto,
                telefono: p.telefono,
                servicio: p.servicio
            }));
            
            LocalStorage.guardarProveedores(proveedoresSupabase);
            AppState.proveedores = proveedoresSupabase;
            
            return proveedoresSupabase;
        } catch (error) {
            console.error('Error en cargarProveedores:', error);
            return proveedores;
        }
    },

    async guardarTurno(turno) {
        if (!window.supabaseClient) {
            // Si no hay Supabase, guardar en LocalStorage
            const turnos = LocalStorage.obtenerTurnos();
            // Verificar que no exista un turno con el mismo número
            const existeTurno = turnos.find(t => t.numero === turno.numero);
            if (!existeTurno) {
                turnos.push(turno);
                LocalStorage.guardarTurnos(turnos);
                AppState.turnos = turnos;
            }
            return turno;
        }
        
        try {
            const turnoData = {
                numero: turno.numero,
                nombre_empresa: turno.nombreEmpresa,
                nit: turno.nit,
                motivo: turno.motivo || '',
                hora_solicitud: turno.horaSolicitud,
                fecha_solicitud: turno.fechaSolicitud,
                estado: turno.estado
            };
            
            const { data, error } = await window.supabaseClient
                .from('turnos')
                .insert([turnoData])
                .select()
                .single();
            
            if (error) {
                console.error('Error al guardar turno:', error);
                // Si hay error en Supabase, guardar en LocalStorage como respaldo
                const turnos = LocalStorage.obtenerTurnos();
                const existeTurno = turnos.find(t => t.numero === turno.numero);
                if (!existeTurno) {
                    turnos.push(turno);
                    LocalStorage.guardarTurnos(turnos);
                    AppState.turnos = turnos;
                }
                return turno;
            }
            
            return data;
        } catch (error) {
            console.error('Error en guardarTurno:', error);
            // Si hay error en Supabase, guardar en LocalStorage como respaldo
            const turnos = LocalStorage.obtenerTurnos();
            const existeTurno = turnos.find(t => t.numero === turno.numero);
            if (!existeTurno) {
                turnos.push(turno);
                LocalStorage.guardarTurnos(turnos);
                AppState.turnos = turnos;
            }
            return turno;
        }
    },

    async cargarTurnos() {
        const turnos = LocalStorage.obtenerTurnos();
        AppState.turnos = turnos;
        
        if (!window.supabaseClient) return turnos;
        
        try {
            const { data, error } = await window.supabaseClient
                .from('turnos')
                .select('*')
                .eq('estado', 'espera')
                .order('fecha_solicitud', { ascending: true });
            
            if (error) {
                console.error('Error al cargar turnos:', error);
                return turnos;
            }
            
            const turnosSupabase = data.map(t => ({
                id: t.id,
                numero: t.numero,
                nombreEmpresa: t.nombre_empresa,
                nit: t.nit,
                motivo: t.motivo,
                horaSolicitud: t.hora_solicitud,
                fechaSolicitud: t.fecha_solicitud,
                estado: t.estado
            }));
            
            LocalStorage.guardarTurnos(turnosSupabase);
            AppState.turnos = turnosSupabase;
            
            return turnosSupabase;
        } catch (error) {
            console.error('Error en cargarTurnos:', error);
            return turnos;
        }
    },

    async actualizarTurno(turnoId, datos) {
        const turnos = LocalStorage.obtenerTurnos();
        const index = turnos.findIndex(t => t.id === turnoId);
        
        if (index >= 0) {
            turnos[index] = { ...turnos[index], ...datos };
            LocalStorage.guardarTurnos(turnos);
            AppState.turnos = turnos;
        }
        
        if (!window.supabaseClient) return true;
        
        try {
            const { error } = await window.supabaseClient
                .from('turnos')
                .update(datos)
                .eq('id', turnoId);
            
            if (error) {
                console.error('Error al actualizar turno:', error);
                return true;
            }
            
            return true;
        } catch (error) {
            console.error('Error en actualizarTurno:', error);
            return true;
        }
    },

    async eliminarTurno(turnoId) {
        const turnos = LocalStorage.obtenerTurnos();
        const turnosFiltrados = turnos.filter(t => t.id !== turnoId);
        LocalStorage.guardarTurnos(turnosFiltrados);
        AppState.turnos = turnosFiltrados;
        
        if (!window.supabaseClient) return true;
        
        try {
            const { error } = await window.supabaseClient
                .from('turnos')
                .delete()
                .eq('id', turnoId);
            
            if (error) {
                console.error('Error al eliminar turno:', error);
                return true;
            }
            
            return true;
        } catch (error) {
            console.error('Error en eliminarTurno:', error);
            return true;
        }
    },

    async guardarEnHistorial(turno) {
        const historial = LocalStorage.obtenerHistorial();
        const historialData = {
            id: Date.now(),
            numero: turno.numero,
            nombreEmpresa: turno.nombreEmpresa,
            nit: turno.nit,
            motivo: turno.motivo || '',
            horaSolicitud: turno.horaSolicitud,
            horaLlamada: turno.horaLlamada || null,
            horaFinalizacion: Utils.obtenerHoraActual(),
            estado: 'completado',
            fecha: new Date().toISOString()
        };
        
        historial.unshift(historialData);
        
        if (historial.length > CONFIG.MAX_HISTORIAL) {
            historial.pop();
        }
        
        LocalStorage.guardarHistorial(historial);
        AppState.historial = historial;
        
        if (!window.supabaseClient) return true;
        
        try {
            const historialSupabase = {
                numero: turno.numero,
                nombre_empresa: turno.nombreEmpresa,
                nit: turno.nit,
                motivo: turno.motivo || '',
                hora_solicitud: turno.horaSolicitud,
                hora_llamada: turno.horaLlamada || null,
                hora_finalizacion: Utils.obtenerHoraActual(),
                estado: 'completado',
                fecha: new Date().toISOString()
            };
            
            const { error } = await window.supabaseClient
                .from('historial_turnos')
                .insert([historialSupabase]);
            
            if (error) {
                console.error('Error al guardar en historial:', error);
                return true;
            }
            
            return true;
        } catch (error) {
            console.error('Error en guardarEnHistorial:', error);
            return true;
        }
    },

    async cargarHistorial() {
        const historial = LocalStorage.obtenerHistorial();
        AppState.historial = historial;
        
        if (!window.supabaseClient) return historial;
        
        try {
            const { data, error } = await window.supabaseClient
                .from('historial_turnos')
                .select('*')
                .order('fecha', { ascending: false })
                .limit(CONFIG.MAX_HISTORIAL);
            
            if (error) {
                console.error('Error al cargar historial:', error);
                return historial;
            }
            
            const historialSupabase = data.map(h => ({
                id: h.id,
                numero: h.numero,
                nombreEmpresa: h.nombre_empresa,
                nit: h.nit,
                motivo: h.motivo,
                horaSolicitud: h.hora_solicitud,
                horaLlamada: h.hora_llamada,
                horaFinalizacion: h.hora_finalizacion,
                estado: h.estado,
                fecha: h.fecha
            }));
            
            LocalStorage.guardarHistorial(historialSupabase);
            AppState.historial = historialSupabase;
            
            return historialSupabase;
        } catch (error) {
            console.error('Error en cargarHistorial:', error);
            return historial;
        }
    },

    async cargarEstadisticas() {
        const historial = LocalStorage.obtenerHistorial();
        const turnos = LocalStorage.obtenerTurnos();
        const proveedores = LocalStorage.obtenerProveedores();
        
        const hoy = Utils.obtenerFechaActual();
        const turnosHoy = historial.filter(h => {
            const fechaTurno = h.fecha ? h.fecha.split('T')[0] : '';
            return fechaTurno === hoy;
        });
        
        const stats = {
            totalTurnos: turnosHoy.length,
            turnosEspera: turnos.filter(t => t.estado === 'espera').length,
            totalProveedores: proveedores.length
        };
        
        if (!window.supabaseClient) return stats;
        
        try {
            const [{ count: totalTurnos }, { count: turnosEspera }, { count: totalProveedores }] = await Promise.all([
                window.supabaseClient.from('historial_turnos').select('*', { count: 'exact', head: true }).gte('fecha', hoy),
                window.supabaseClient.from('turnos').select('*', { count: 'exact', head: true }).eq('estado', 'espera'),
                window.supabaseClient.from('proveedores').select('*', { count: 'exact', head: true }).eq('activo', true)
            ]);

            return {
                totalTurnos: totalTurnos || stats.totalTurnos,
                turnosEspera: turnosEspera || stats.turnosEspera,
                totalProveedores: totalProveedores || stats.totalProveedores
            };
        } catch (error) {
            console.error('Error en cargarEstadisticas:', error);
            return stats;
        }
    },

    suscribirCambios(callback) {
        if (!window.supabaseClient) {
            console.warn('Supabase no está disponible para suscripción');
            return null;
        }
        
        try {
            const subscription = window.supabaseClient
                .channel('turnos-changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'turnos' },
                    (payload) => {
                        console.log('Cambio en tiempo real:', payload);
                        if (callback && typeof callback === 'function') {
                            callback(payload);
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('Estado de suscripción:', status);
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Suscripción a tiempo real activada correctamente');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ Error en el canal de tiempo real');
                    }
                });
            
            return subscription;
        } catch (error) {
            console.error('Error al suscribirse:', error);
            return null;
        }
    },

    async suscribirCambiosHistorial(callback) {
        if (!window.supabaseClient) return null;
        
        try {
            const subscription = window.supabaseClient
                .channel('historial-changes')
                .on('postgres_changes', 
                    { event: 'INSERT', schema: 'public', table: 'historial_turnos' },
                    (payload) => {
                        console.log('Nuevo turno en historial:', payload);
                        if (callback && typeof callback === 'function') {
                            callback(payload);
                        }
                    }
                )
                .subscribe();
            
            return subscription;
        } catch (error) {
            console.error('Error al suscribirse al historial:', error);
            return null;
        }
    },

    async sincronizarTodo() {
        if (!window.supabaseClient) {
            return { success: false, message: 'Supabase no está configurado' };
        }

        if (AppState.syncInProgress) {
            return { success: false, message: 'Sincronización ya en progreso' };
        }

        AppState.syncInProgress = true;

        try {
            const contador = LocalStorage.obtenerContador();
            await window.supabaseClient
                .from('configuracion')
                .upsert({ clave: 'contador_turnos', valor: contador.toString() });

            const turnosLocal = LocalStorage.obtenerTurnos();
            let turnosSincronizados = 0;
            
            for (const turno of turnosLocal) {
                const turnoData = {
                    numero: turno.numero,
                    nombre_empresa: turno.nombreEmpresa,
                    nit: turno.nit,
                    motivo: turno.motivo || '',
                    hora_solicitud: turno.horaSolicitud,
                    fecha_solicitud: turno.fechaSolicitud,
                    estado: turno.estado
                };
                
                const { error } = await window.supabaseClient
                    .from('turnos')
                    .upsert(turnoData, { onConflict: 'numero' });
                
                if (!error) turnosSincronizados++;
            }

            AppState.lastSync = new Date();
            AppState.syncInProgress = false;

            return { 
                success: true, 
                message: `Sincronización completada: ${turnosSincronizados} turnos` 
            };
        } catch (error) {
            console.error('Error durante sincronización:', error);
            AppState.syncInProgress = false;
            return { success: false, message: error.message };
        }
    }
};

// ============================================
// GESTIÓN DE TURNOS
// ============================================

const Turnos = {
    async solicitar(datosProveedor, motivo = '') {
        console.log('=== CREANDO TURNO ===');
        
        if (!datosProveedor.nit) {
            throw new Error('La placa es requerida');
        }
        
        const placa = datosProveedor.nit.toUpperCase();
        
        if (placa.length !== 6) {
            throw new Error('La placa debe tener exactamente 6 caracteres');
        }
        
        if (!datosProveedor.nombreEmpresa) throw new Error('El nombre de la empresa es requerido');
        
        datosProveedor.nit = placa;

        await SupabaseDB.guardarProveedor(datosProveedor);

        const nuevoContador = await SupabaseDB.incrementarContadorTurnos();
        const numeroTurno = 'T' + nuevoContador.toString().padStart(3, '0');
        
        const turno = {
            id: Date.now(),
            numero: numeroTurno,
            nombreEmpresa: datosProveedor.nombreEmpresa,
            nit: datosProveedor.nit.toUpperCase(),
            contacto: datosProveedor.contacto,
            telefono: datosProveedor.telefono,
            servicio: datosProveedor.servicio,
            motivo: motivo,
            horaSolicitud: Utils.obtenerHoraActual(),
            fechaSolicitud: new Date().toISOString(),
            estado: 'espera'
        };

        const turnoSupabase = await SupabaseDB.guardarTurno(turno);
        if (turnoSupabase) {
            turno.id = turnoSupabase.id;
        }

        // Verificar que no exista un turno con el mismo número antes de agregarlo
        const existeTurno = AppState.turnos.find(t => t.numero === turno.numero);
        if (!existeTurno) {
            AppState.turnos.push(turno);
            LocalStorage.guardarTurnos(AppState.turnos);
        }
        
        return turno;
    },

    async llamarSiguiente() {
        const turnosSupabase = await SupabaseDB.cargarTurnos();
        if (turnosSupabase.length > 0) {
            AppState.turnos = turnosSupabase;
        }
        
        if (AppState.turnos.length === 0) return null;
        
        AppState.turnos.sort((a, b) => new Date(a.fechaSolicitud) - new Date(b.fechaSolicitud));
        
        const siguiente = AppState.turnos[0];
        siguiente.estado = 'atendiendo';
        siguiente.horaLlamada = Utils.obtenerHoraActual();
        
        await SupabaseDB.actualizarTurno(siguiente.id, {
            estado: 'atendiendo',
            hora_llamada: siguiente.horaLlamada
        });
        
        AppState.turnoActual = siguiente;
        AppState.turnos = AppState.turnos.filter(t => t.id !== siguiente.id);
        
        LocalStorage.guardarTurnos(AppState.turnos);
        LocalStorage.guardarTurnoActual(AppState.turnoActual);
        
        return siguiente;
    },

    async cancelar(turnoId) {
        try {
            await SupabaseDB.eliminarTurno(turnoId);
            AppState.turnos = AppState.turnos.filter(t => t.id !== turnoId);
            LocalStorage.guardarTurnos(AppState.turnos);
            return true;
        } catch (error) {
            console.error('Error al cancelar turno:', error);
            return false;
        }
    },

    async completarTurnoActual() {
        if (!AppState.turnoActual) return false;
        
        try {
            await SupabaseDB.guardarEnHistorial(AppState.turnoActual);
            await SupabaseDB.actualizarTurno(AppState.turnoActual.id, {
                estado: 'completado'
            });
            
            const miTurno = LocalStorage.obtenerMiTurno();
            if (miTurno && miTurno.numero === AppState.turnoActual.numero) {
                LocalStorage.eliminarMiTurno();
                ModoEspera.desactivar();
            }
            
            AppState.turnoActual = null;
            LocalStorage.guardarTurnoActual(null);
            
            return true;
        } catch (error) {
            console.error('Error al completar turno:', error);
            return false;
        }
    },

    async reiniciarCola() {
        try {
            for (const turno of AppState.turnos) {
                await SupabaseDB.eliminarTurno(turno.id);
            }
            
            AppState.turnos = [];
            AppState.turnoActual = null;
            AppState.contadorTurnos = 0;
            
            LocalStorage.guardarTurnos([]);
            LocalStorage.guardarTurnoActual(null);
            LocalStorage.guardarContador(0);
            LocalStorage.eliminarMiTurno();
            
            return true;
        } catch (error) {
            console.error('Error al reiniciar cola:', error);
            return false;
        }
    },

    async cargarTurnos() {
        try {
            const turnosSupabase = await SupabaseDB.cargarTurnos();
            if (turnosSupabase && turnosSupabase.length > 0) {
                // Filtrar duplicados por número de turno
                const turnosUnicos = [];
                const numerosVistos = new Set();
                for (const turno of turnosSupabase) {
                    if (!numerosVistos.has(turno.numero)) {
                        numerosVistos.add(turno.numero);
                        turnosUnicos.push(turno);
                    }
                }
                AppState.turnos = turnosUnicos;
                LocalStorage.guardarTurnos(turnosUnicos);
            } else {
                AppState.turnos = LocalStorage.obtenerTurnos();
            }
            
            AppState.turnoActual = LocalStorage.obtenerTurnoActual();
            AppState.contadorTurnos = await SupabaseDB.obtenerContadorTurnos();
        } catch (error) {
            console.error('Error al cargar turnos:', error);
            AppState.turnos = LocalStorage.obtenerTurnos();
            AppState.turnoActual = LocalStorage.obtenerTurnoActual();
        }
    }
};

// ============================================
// RENDERIZADO USUARIO
// ============================================

const RenderUsuario = {
    miTurno() {
        const container = document.getElementById('miTurnoContainer');
        const miTurno = LocalStorage.obtenerMiTurno();
        
        if (!container) return;

        if (miTurno) {
            try {
                const posicion = AppState.turnos.findIndex(t => t.numero === miTurno.numero) + 1;
                const tiempoEstimado = posicion > 0 ? posicion * CONFIG.TURN_TIME_ESTIMATE : 0;
                
                const estaSiendoAtendido = AppState.turnoActual && AppState.turnoActual.numero === miTurno.numero;
                
                container.innerHTML = `
                    <div class="my-turn-active ${estaSiendoAtendido ? 'being-served' : ''}">
                        <div class="my-turn-number">${miTurno.numero}</div>
                        <div class="my-turn-status">${miTurno.nombreEmpresa}</div>
                        <div class="my-turn-position">
                            ${estaSiendoAtendido ? '¡Es tu turno! Diríjase al punto de atención' : 
                              posicion > 0 ? `Posición en cola: ${posicion}` : 'Esperando confirmación'}
                        </div>
                        ${posicion > 0 && !estaSiendoAtendido ? `<div class="my-turn-position">Tiempo estimado: ${tiempoEstimado} min</div>` : ''}
                    </div>
                `;
            } catch (e) {
                container.innerHTML = `
                    <div class="no-turn-message">
                        <p>No tienes un turno activo</p>
                    </div>
                `;
            }
        } else {
            container.innerHTML = `
                <div class="no-turn-message">
                    <p>No tienes un turno activo</p>
                    <p class="hint">Solicita un turno usando el formulario</p>
                </div>
            `;
        }
    },

    estadoCola() {
        const turnoActualEl = document.getElementById('turnoActualUsuario');
        const turnosEsperaEl = document.getElementById('turnosEnEsperaUsuario');
        
        if (turnoActualEl) turnoActualEl.textContent = AppState.turnoActual ? AppState.turnoActual.numero : '--';
        if (turnosEsperaEl) turnosEsperaEl.textContent = AppState.turnos.length;
        
        const miTurno = LocalStorage.obtenerMiTurno();
        if (miTurno) {
            try {
                const posicion = AppState.turnos.findIndex(t => t.numero === miTurno.numero) + 1;
                
                const miPosicionEl = document.getElementById('miPosicion');
                const tiempoEstimadoEl = document.getElementById('tiempoEstimado');
                
                if (miPosicionEl) miPosicionEl.textContent = posicion > 0 ? posicion : '--';
                if (tiempoEstimadoEl) tiempoEstimadoEl.textContent = posicion > 0 ? `${posicion * CONFIG.TURN_TIME_ESTIMATE} min` : '--';
            } catch (e) {}
        }
    },

    turnosEnEspera() {
        const listaDiv = document.getElementById('listaTurnosUsuario');
        if (!listaDiv) return;

        if (AppState.turnos.length === 0) {
            listaDiv.innerHTML = '<p class="empty-message">No hay turnos en espera</p>';
        } else {
            const miTurno = LocalStorage.obtenerMiTurno();
            let miNumero = null;
            try { miNumero = miTurno.numero; } catch(e) {}
            
            listaDiv.innerHTML = AppState.turnos.map(turno => `
                <div class="turn-item-user ${turno.numero === miNumero ? 'current' : ''}">
                    <span class="turn-item-number">${turno.numero}</span>
                    <div class="turn-item-info">
                        <div class="turn-item-company">${turno.nombreEmpresa}</div>
                        <div class="turn-item-time">${turno.horaSolicitud}</div>
                    </div>
                </div>
            `).join('');
        }
    },

    todo() {
        this.miTurno();
        this.estadoCola();
        this.turnosEnEspera();
    },
    
    suscribirCambios() {
        if (!window.supabaseClient) {
            console.warn('Supabase no disponible para suscripción en usuario');
            return null;
        }
        
        try {
            const subscription = window.supabaseClient
                .channel('turnos-changes-user')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'turnos' },
                    async (payload) => {
                        console.log('Actualización en tiempo real (usuario):', payload);
                        try {
                            await Turnos.cargarTurnos();
                            this.todo();
                            
                            // Verificar si mi turno fue llamado
                            const miTurno = LocalStorage.obtenerMiTurno();
                            if (miTurno && AppState.turnoActual && AppState.turnoActual.numero === miTurno.numero) {
                                ModoEspera.actualizar();
                            }
                        } catch (error) {
                            console.error('Error al procesar actualización:', error);
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('Estado de suscripción (usuario):', status);
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Suscripción a tiempo real activada (usuario)');
                    }
                });
            
            return subscription;
        } catch (error) {
            console.error('Error al suscribirse (usuario):', error);
            return null;
        }
    }
};

// ============================================
// RENDERIZADO ADMIN
// ============================================

const RenderAdmin = {
    turnoActual() {
        const turnoActualDiv = document.getElementById('turnoActual');
        const turnoInfoDiv = document.getElementById('turnoInfo');
        
        if (turnoActualDiv) {
            turnoActualDiv.textContent = AppState.turnoActual ? AppState.turnoActual.numero : '--';
        }
        
        if (turnoInfoDiv) {
            if (AppState.turnoActual) {
                const motivo = AppState.turnoActual.motivo ? ` - ${AppState.turnoActual.motivo}` : '';
                const placa = AppState.turnoActual.nit ? ` (Placa: ${AppState.turnoActual.nit})` : '';
                turnoInfoDiv.textContent = `${AppState.turnoActual.nombreEmpresa}${motivo}${placa}`;
            } else {
                turnoInfoDiv.textContent = 'Ningún turno en atención';
            }
        }
    },

    listaTurnosEspera() {
        const listaDiv = document.getElementById('listaTurnosEspera');
        const contadorDiv = document.getElementById('contadorTurnosEspera');
        
        if (contadorDiv) contadorDiv.textContent = AppState.turnos.length;
        
        if (!listaDiv) return;

        if (AppState.turnos.length === 0) {
            listaDiv.innerHTML = '<p class="empty-message">No hay turnos en espera</p>';
        } else {
            listaDiv.innerHTML = AppState.turnos.map(turno => `
                <div class="turn-item">
                    <span class="turn-item-number">${turno.numero}</span>
                    <div class="turn-item-info">
                        <div class="turn-item-company">${turno.nombreEmpresa}</div>
                        <div class="turn-item-time">${turno.horaSolicitud}${turno.motivo ? ' - ' + turno.motivo : ''}</div>
                    </div>
                    <div class="turn-item-actions">
                        <button class="btn btn-danger btn-small" onclick="AdminHandlers.cancelarTurno(${turno.id})">
                            Cancelar
                        </button>
                    </div>
                </div>
            `).join('');
        }
    },

    async proveedores() {
        const proveedoresBody = document.getElementById('proveedoresBody');
        const contadorDiv = document.getElementById('contadorProveedores');
        
        if (!proveedoresBody) return;

        try {
            const proveedores = await SupabaseDB.cargarProveedores();
            
            if (contadorDiv) contadorDiv.textContent = proveedores.length;
            
            if (proveedores.length === 0) {
                proveedoresBody.innerHTML = '<tr><td colspan="6" class="empty-message">No hay proveedores registrados</td></tr>';
            } else {
                proveedoresBody.innerHTML = proveedores.map(p => `
                    <tr>
                        <td>${p.nombreEmpresa}</td>
                        <td>${p.nit || '-'}</td>
                        <td>${p.contacto || '-'}</td>
                        <td>${p.telefono || '-'}</td>
                        <td>${p.servicio || '-'}</td>
                        <td>
                            <button class="btn btn-secondary btn-small" onclick="AdminHandlers.editarProveedor(${p.id})">
                                Editar
                            </button>
                            <button class="btn btn-danger btn-small" onclick="AdminHandlers.eliminarProveedor(${p.id})">
                                Eliminar
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
            proveedoresBody.innerHTML = '<tr><td colspan="6" class="empty-message">Error al cargar proveedores</td></tr>';
        }
    },

    async historial() {
        const historialDiv = document.getElementById('historialTurnos');
        if (!historialDiv) return;

        try {
            const historial = await SupabaseDB.cargarHistorial();
            
            if (historial.length === 0) {
                historialDiv.innerHTML = '<p class="empty-message">No hay historial de turnos</p>';
            } else {
                historialDiv.innerHTML = historial.map(h => `
                    <div class="history-item">
                        <div class="history-item-header">
                            <span class="history-item-number">${h.numero}</span>
                            <span class="history-item-status status-${h.estado}">${h.estado}</span>
                        </div>
                        <div class="history-item-info">
                            <div class="history-item-company">${h.nombreEmpresa}</div>
                            <div class="history-item-details">
                                <span><strong>Placa:</strong> ${h.nit || 'N/A'}</span>
                                <span><strong>Motivo:</strong> ${h.motivo || 'N/A'}</span>
                            </div>
                            <div class="history-item-time">
                                <span><strong>Solicitud:</strong> ${Utils.formatearHora(h.horaSolicitud)}</span>
                                <span><strong>Llamada:</strong> ${Utils.formatearHora(h.horaLlamada)}</span>
                                <span><strong>Finalización:</strong> ${Utils.formatearHora(h.horaFinalizacion)}</span>
                            </div>
                            <div class="history-item-date">
                                <strong>Fecha:</strong> ${Utils.formatearFecha(h.fecha)}
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error al cargar historial:', error);
            historialDiv.innerHTML = '<p class="empty-message">Error al cargar historial</p>';
        }
    },

    async estadisticas() {
        try {
            const stats = await SupabaseDB.cargarEstadisticas();
            
            const totalTurnosEl = document.getElementById('totalTurnos');
            const turnosEsperaEl = document.getElementById('turnosEspera');
            const totalProveedoresEl = document.getElementById('totalProveedores');
            
            if (totalTurnosEl) totalTurnosEl.textContent = stats.totalTurnos;
            if (turnosEsperaEl) turnosEsperaEl.textContent = stats.turnosEspera;
            if (totalProveedoresEl) totalProveedoresEl.textContent = stats.totalProveedores;
            
            console.log('Estadísticas actualizadas:', stats);
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        }
    },

    async todo() {
        this.turnoActual();
        this.listaTurnosEspera();
        await this.proveedores();
        await this.historial();
        await this.estadisticas();
    }
};

// ============================================
// HANDLERS USUARIO
// ============================================

const UsuarioHandlers = {
    async solicitarTurno(e) {
        e.preventDefault();
        
        Utils.setLoading(true);
        
        try {
            const placaInput = document.getElementById('nit')?.value?.trim().toUpperCase();
            
            if (!placaInput) {
                throw new Error('La placa es requerida');
            }
            
            if (placaInput.length !== 6) {
                throw new Error('La placa debe tener exactamente 6 caracteres');
            }
            
            const datosProveedor = {
                nombreEmpresa: document.getElementById('nombreEmpresa')?.value?.trim(),
                nit: placaInput,
                contacto: document.getElementById('contacto')?.value?.trim(),
                telefono: document.getElementById('telefono')?.value?.trim(),
                servicio: document.getElementById('servicio')?.value
            };

            if (!datosProveedor.nombreEmpresa) throw new Error('El nombre de la empresa es requerido');

            const motivoInput = document.getElementById('motivoVisita');
            const motivoPersonalizado = motivoInput ? motivoInput.value?.trim() : '';
            
            // Usar el motivo personalizado si existe, sino usar el tipo de servicio
            const motivo = motivoPersonalizado || datosProveedor.servicio;

            const turno = await Turnos.solicitar(datosProveedor, motivo);
            
            LocalStorage.guardarMiTurno(turno);
            
            const modal = document.getElementById('confirmacionModal');
            const modalMiTurno = document.getElementById('modalMiTurno');
            const modalTurnoInfo = document.getElementById('modalTurnoInfo');
            
            if (modal && modalMiTurno) {
                modalMiTurno.textContent = turno.numero;
                if (modalTurnoInfo) modalTurnoInfo.textContent = `${turno.nombreEmpresa}\n${turno.motivo || ''}`;
                modal.style.display = 'flex';
            }

            Utils.mostrarNotificacion(`Turno ${turno.numero} solicitado`, 'success');
            
            // Activar modo de espera
            ModoEspera.activar(turno);
            
            e.target.reset();
            document.getElementById('motivoGroup').style.display = 'none';
            
            RenderUsuario.todo();
            
        } catch (error) {
            console.error('Error:', error);
            Utils.mostrarNotificacion(error.message, 'error');
        } finally {
            Utils.setLoading(false);
        }
    },
    
    async cancelarTurno() {
        const miTurno = LocalStorage.obtenerMiTurno();
        if (!miTurno) {
            Utils.mostrarNotificacion('No tienes un turno activo', 'error');
            return;
        }
        
        if (confirm(`¿Cancelar turno ${miTurno.numero}?`)) {
            try {
                await Turnos.cancelar(miTurno.id);
                LocalStorage.eliminarMiTurno();
                ModoEspera.desactivar();
                Utils.mostrarNotificacion('Turno cancelado', 'success');
                RenderUsuario.todo();
            } catch (error) {
                console.error('Error al cancelar turno:', error);
                Utils.mostrarNotificacion('Error al cancelar turno', 'error');
            }
        }
    }
};

// ============================================
// HANDLERS ADMIN
// ============================================

const AdminHandlers = {
    async llamarTurno() {
        const turno = await Turnos.llamarSiguiente();
        
        if (turno) {
            const modal = document.getElementById('turnoModal');
            if (modal) {
                const modalTurnNumber = document.getElementById('modalTurnNumber');
                const modalTurnInfo = document.getElementById('modalTurnInfo');
                
                if (modalTurnNumber) modalTurnNumber.textContent = turno.numero;
                if (modalTurnInfo) modalTurnInfo.textContent = `${turno.nombreEmpresa}\n${turno.motivo || ''}`;
                modal.style.display = 'flex';
            }
            
            Utils.mostrarNotificacion(`Turno ${turno.numero} llamado`, 'success');
            await RenderAdmin.todo();
        } else {
            Utils.mostrarNotificacion('No hay turnos en espera', 'error');
        }
    },
    
    async completarTurno() {
        if (!AppState.turnoActual) {
            Utils.mostrarNotificacion('No hay turno en atención', 'error');
            return;
        }
        
        if (confirm(`¿Completar turno ${AppState.turnoActual.numero}?`)) {
            const resultado = await Turnos.completarTurnoActual();
            if (resultado) {
                Utils.mostrarNotificacion(`Turno ${AppState.turnoActual.numero} completado`, 'success');
                await RenderAdmin.todo();
            } else {
                Utils.mostrarNotificacion('Error al completar turno', 'error');
            }
        }
    },

    async cancelarTurno(id) {
        if (confirm('¿Cancelar turno?')) {
            await Turnos.cancelar(id);
            await RenderAdmin.todo();
        }
    },

    async reiniciarCola() {
        if (confirm('¿Reiniciar cola? Se perderán todos los turnos en espera.')) {
            await Turnos.reiniciarCola();
            Utils.mostrarNotificacion('Cola reiniciada', 'success');
            await RenderAdmin.todo();
        }
    },

    editarProveedor(id) {
        const proveedor = AppState.proveedores.find(p => p.id === id);
        if (!proveedor) {
            Utils.mostrarNotificacion('Proveedor no encontrado', 'error');
            return;
        }

        const modal = document.getElementById('editarProveedorModal');
        if (!modal) {
            // Crear modal si no existe
            const modalHTML = `
                <div id="editarProveedorModal" class="modal">
                    <div class="modal-content">
                        <button class="close-modal" onclick="document.getElementById('editarProveedorModal').style.display='none'">&times;</button>
                        <h2>Editar Proveedor</h2>
                        <form id="formEditarProveedor">
                            <input type="hidden" id="editProveedorId">
                            <div class="form-group">
                                <label for="editNombreEmpresa">Nombre de la Empresa:</label>
                                <input type="text" id="editNombreEmpresa" required>
                            </div>
                            <div class="form-group">
                                <label for="editNit">Placa del Vehículo:</label>
                                <input type="text" id="editNit" required maxlength="6">
                            </div>
                            <div class="form-group">
                                <label for="editContacto">Persona de Contacto:</label>
                                <input type="text" id="editContacto">
                            </div>
                            <div class="form-group">
                                <label for="editTelefono">Teléfono:</label>
                                <input type="tel" id="editTelefono">
                            </div>
                            <div class="form-group">
                                <label for="editServicio">Tipo de Servicio:</label>
                                <select id="editServicio">
                                    <option value="entrega">Entrega de Mercancía</option>
                                    <option value="servicio">Servicio Técnico</option>
                                    <option value="reunion">Reunión</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                        </form>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Configurar evento submit
            document.getElementById('formEditarProveedor').addEventListener('submit', async (e) => {
                e.preventDefault();
                const proveedorId = parseInt(document.getElementById('editProveedorId').value);
                const datos = {
                    nombreEmpresa: document.getElementById('editNombreEmpresa').value.trim(),
                    nit: document.getElementById('editNit').value.trim().toUpperCase(),
                    contacto: document.getElementById('editContacto').value.trim(),
                    telefono: document.getElementById('editTelefono').value.trim(),
                    servicio: document.getElementById('editServicio').value
                };
                
                await SupabaseDB.actualizarProveedor(proveedorId, datos);
                Utils.mostrarNotificacion('Proveedor actualizado', 'success');
                document.getElementById('editarProveedorModal').style.display = 'none';
                await RenderAdmin.proveedores();
            });
        }
        
        // Llenar formulario con datos del proveedor
        document.getElementById('editProveedorId').value = proveedor.id;
        document.getElementById('editNombreEmpresa').value = proveedor.nombreEmpresa;
        document.getElementById('editNit').value = proveedor.nit;
        document.getElementById('editContacto').value = proveedor.contacto || '';
        document.getElementById('editTelefono').value = proveedor.telefono || '';
        document.getElementById('editServicio').value = proveedor.servicio || 'entrega';
        
        modal.style.display = 'flex';
    },

    async eliminarProveedor(id) {
        if (confirm('¿Eliminar este proveedor?')) {
            await SupabaseDB.eliminarProveedor(id);
            Utils.mostrarNotificacion('Proveedor eliminado', 'success');
            await RenderAdmin.proveedores();
        }
    },

    async limpiarHistorial() {
        if (confirm('¿Está seguro de que desea limpiar todo el historial?')) {
            try {
                LocalStorage.guardarHistorial([]);
                AppState.historial = [];
                
                if (window.supabaseClient) {
                    const { error } = await window.supabaseClient
                        .from('historial_turnos')
                        .delete()
                        .neq('id', 0);
                    
                    if (error) {
                        console.error('Error al limpiar historial:', error);
                    }
                }
                
                Utils.mostrarNotificacion('Historial limpiado', 'success');
                await RenderAdmin.todo();
            } catch (error) {
                console.error('Error al limpiar historial:', error);
                Utils.mostrarNotificacion('Error al limpiar historial', 'error');
            }
        }
    }
};

window.AdminHandlers = AdminHandlers;
window.UsuarioHandlers = UsuarioHandlers;

// ============================================
// ACCESO ADMIN
// ============================================

const AdminAccess = {
    handleLogoClick() {
        logoClickCount++;
        if (logoClickTimer) clearTimeout(logoClickTimer);
        
        logoClickTimer = setTimeout(() => logoClickCount = 0, CONFIG.LOGO_CLICK_TIMEOUT);
        
        if (logoClickCount >= CONFIG.LOGO_CLICKS_REQUIRED) {
            logoClickCount = 0;
            const modal = document.getElementById('adminAccessModal');
            if (modal) {
                modal.style.display = 'flex';
                const input = document.getElementById('adminPassword');
                if (input) {
                    input.value = '';
                    input.focus();
                }
            }
        }
    },

    handleLogin(e) {
        e.preventDefault();
        const password = document.getElementById('adminPassword')?.value;
        
        if (password === CONFIG.ADMIN_PASSWORD) {
            window.location.href = 'admin.html';
        } else {
            const errorEl = document.getElementById('loginError');
            if (errorEl) {
                errorEl.textContent = 'Contraseña incorrecta';
                errorEl.style.display = 'block';
            }
            Utils.mostrarNotificacion('Contraseña incorrecta', 'error');
        }
    }
};

// ============================================
// CONFIGURACIÓN DE INPUTS
// ============================================

const InputConfig = {
    configurarPlacaInput() {
        const placaInput = document.getElementById('nit');
        if (placaInput) {
            placaInput.setAttribute('maxlength', '6');
            placaInput.setAttribute('pattern', '[A-Za-z0-9]{6}');
            placaInput.setAttribute('title', 'Ingrese exactamente 6 caracteres (letras o números)');
            
            placaInput.addEventListener('input', function() {
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = this.value.toUpperCase().slice(0, 6);
                this.setSelectionRange(start, end);
            });
        }
    },

    configurarServicioSelect() {
        const servicioSelect = document.getElementById('servicio');
        const motivoGroup = document.getElementById('motivoGroup');
        const motivoInput = document.getElementById('motivoVisita');
        
        if (servicioSelect && motivoGroup && motivoInput) {
            servicioSelect.addEventListener('change', function() {
                if (this.value === 'otro') {
                    motivoGroup.style.display = 'block';
                    motivoInput.setAttribute('required', 'required');
                } else {
                    motivoGroup.style.display = 'none';
                    motivoInput.removeAttribute('required');
                    motivoInput.value = '';
                }
            });
        }
    }
};

// ============================================
// CONFIGURACIÓN DE MODALES
// ============================================

const ModalConfig = {
    configurar() {
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.onclick = function() {
                this.closest('.modal').style.display = 'none';
            };
        });

        window.onclick = (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        };

        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', AdminAccess.handleLogin);
        }
    }
};

// ============================================
// ESTADO DE CONEXIÓN
// ============================================

const ConnectionStatus = {
    actualizar(estado, mensaje) {
        const statusEl = document.getElementById('connectionStatus');
        if (!statusEl) return;
        
        statusEl.textContent = mensaje;
        statusEl.className = 'connection-status ' + estado;
    }
};

// ============================================
// MODO DE ESPERA Y NOTIFICACIONES
// ============================================

const ModoEspera = {
    activo: false,
    miTurno: null,
    intervaloActualizacion: null,
    notificacionMostrada: false,

    activar(turno) {
        this.activo = true;
        this.miTurno = turno;
        this.notificacionMostrada = false;
        
        const waitingSection = document.getElementById('waitingModeSection');
        if (waitingSection) {
            waitingSection.style.display = 'block';
            this.actualizar();
            
            // Iniciar actualización automática cada 3 segundos
            this.intervaloActualizacion = setInterval(() => {
                this.actualizar();
            }, 3000);
        }
    },

    desactivar() {
        this.activo = false;
        this.miTurno = null;
        this.notificacionMostrada = false;
        
        const waitingSection = document.getElementById('waitingModeSection');
        if (waitingSection) {
            waitingSection.style.display = 'none';
        }
        
        if (this.intervaloActualizacion) {
            clearInterval(this.intervaloActualizacion);
            this.intervaloActualizacion = null;
        }
    },

    actualizar() {
        if (!this.activo || !this.miTurno) return;
        
        const turnoActual = AppState.turnoActual;
        const turnosEspera = AppState.turnos;
        
        // Verificar si mi turno está siendo atendido
        if (turnoActual && turnoActual.numero === this.miTurno.numero) {
            this.mostrarNotificacionLlamado();
            return;
        }
        
        // Calcular posición
        const posicion = turnosEspera.findIndex(t => t.numero === this.miTurno.numero) + 1;
        const tiempoEstimado = posicion > 0 ? posicion * CONFIG.TURN_TIME_ESTIMATE : 0;
        
        // Actualizar UI
        const waitingTurnNumber = document.getElementById('waitingTurnNumber');
        const waitingTurnStatus = document.getElementById('waitingTurnStatus');
        const waitingPosition = document.getElementById('waitingPosition');
        const waitingTime = document.getElementById('waitingTime');
        const progressFill = document.getElementById('progressFill');
        
        if (waitingTurnNumber) waitingTurnNumber.textContent = this.miTurno.numero;
        if (waitingTurnStatus) waitingTurnStatus.textContent = posicion > 0 ? 'En espera' : 'Procesando...';
        if (waitingPosition) waitingPosition.textContent = `Posición: ${posicion > 0 ? posicion : '--'}`;
        if (waitingTime) waitingTime.textContent = `Tiempo estimado: ${tiempoEstimado > 0 ? tiempoEstimado + ' min' : '--'}`;
        
        // Actualizar barra de progreso
        if (progressFill) {
            const totalTurnos = turnosEspera.length;
            const progreso = totalTurnos > 0 ? ((totalTurnos - posicion + 1) / totalTurnos) * 100 : 0;
            progressFill.style.width = `${Math.min(progreso, 100)}%`;
        }
    },

    mostrarNotificacionLlamado() {
        if (this.notificacionMostrada) return;
        this.notificacionMostrada = true;
        
        // Crear notificación visual
        const notificacion = document.createElement('div');
        notificacion.className = 'turn-called-notification';
        notificacion.innerHTML = `
            <h3>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                ¡Es tu turno!
            </h3>
            <div class="turn-number">${this.miTurno.numero}</div>
            <p>${this.miTurno.nombreEmpresa}</p>
            <p>Diríjase al punto de atención</p>
            <button class="btn" onclick="this.parentElement.remove()">Entendido</button>
        `;
        
        document.body.appendChild(notificacion);
        
        // Reproducir sonido de notificación (si está disponible)
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQkALpPp6pZwGQA0m+nqlnAZADSb6eqWcBkANJvp6pZwGQA0m+nqlnAZADSb6eqWcBkANJvp6pZwGQ==');
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (e) {}
        
        // Auto-remover después de 10 segundos
        setTimeout(() => {
            if (notificacion.parentElement) {
                notificacion.remove();
            }
        }, 10000);
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Sistema de Turnos cargado');
    
    try {
        let conexionOk = false;
        try {
            conexionOk = await SupabaseDB.verificarConexion();
            console.log(conexionOk ? 'Supabase conectado' : 'Modo local');
            
            if (conexionOk) {
                ConnectionStatus.actualizar('connected', '✓ Conectado a Supabase');
            } else {
                ConnectionStatus.actualizar('local', '⚠ Modo local (sin nube)');
            }
        } catch (error) {
            console.log('Error al verificar Supabase:', error.message);
            ConnectionStatus.actualizar('disconnected', '✗ Sin conexión');
        }
        
        await Turnos.cargarTurnos();
        console.log('Datos cargados:', {
            turnos: AppState.turnos.length,
            turnoActual: AppState.turnoActual ? AppState.turnoActual.numero : 'ninguno'
        });
        
        ModalConfig.configurar();
        
        if (document.getElementById('logoClick')) {
            document.getElementById('logoClick').addEventListener('click', AdminAccess.handleLogoClick);
            document.getElementById('logoClick').style.cursor = 'pointer';
        }
        
        if (document.getElementById('formSolicitarTurno')) {
            InputConfig.configurarPlacaInput();
            InputConfig.configurarServicioSelect();
            document.getElementById('formSolicitarTurno').addEventListener('submit', UsuarioHandlers.solicitarTurno);
            RenderUsuario.todo();
            
            // Configurar botón de cancelar turno en modo de espera
            const btnCancelarEspera = document.getElementById('btnCancelarEspera');
            if (btnCancelarEspera) {
                btnCancelarEspera.addEventListener('click', UsuarioHandlers.cancelarTurno);
            }
            
            // Verificar si ya hay un turno activo y activar modo de espera
            const miTurno = LocalStorage.obtenerMiTurno();
            if (miTurno) {
                ModoEspera.activar(miTurno);
            }
            
            if (window.supabaseClient) {
                console.log('Configurando suscripción a tiempo real para usuario...');
                AppState.subscription = RenderUsuario.suscribirCambios();
            } else {
                console.warn('Supabase no disponible - funcionando en modo local');
            }
        }
        
        const btnLlamarTurno = document.getElementById('btnLlamarTurno');
        if (btnLlamarTurno) {
            console.log('Configurando página de administrador...');
            
            btnLlamarTurno.addEventListener('click', AdminHandlers.llamarTurno);
            
            const btnCompletarTurno = document.getElementById('btnCompletarTurno');
            if (btnCompletarTurno) btnCompletarTurno.addEventListener('click', AdminHandlers.completarTurno);
            
            const btnReiniciar = document.getElementById('btnReiniciarCola');
            if (btnReiniciar) btnReiniciar.addEventListener('click', AdminHandlers.reiniciarCola);
            
            const btnLimpiar = document.getElementById('btnLimpiarHistorial');
            if (btnLimpiar) btnLimpiar.addEventListener('click', AdminHandlers.limpiarHistorial);
            
            const btnSincronizar = document.getElementById('btnSincronizarNube');
            if (btnSincronizar) {
                btnSincronizar.addEventListener('click', async () => {
                    const originalText = btnSincronizar.textContent;
                    btnSincronizar.textContent = 'Sincronizando...';
                    btnSincronizar.disabled = true;
                    
                    const resultado = await SupabaseDB.sincronizarTodo();
                    
                    btnSincronizar.textContent = originalText;
                    btnSincronizar.disabled = false;
                    
                    if (resultado.success) {
                        Utils.mostrarNotificacion(resultado.message, 'success');
                        await Turnos.cargarTurnos();
                        await RenderAdmin.todo();
                    } else {
                        Utils.mostrarNotificacion('Error: ' + resultado.message, 'error');
                    }
                });
            }
            
            console.log('Renderizando admin...');
            await RenderAdmin.todo();
            
            // Actualizar historial y estadísticas cada 5 segundos
            setInterval(async () => {
                await RenderAdmin.historial();
                await RenderAdmin.estadisticas();
            }, 5000);
            
            if (window.supabaseClient) {
                console.log('Configurando suscripción a tiempo real para admin...');
                AppState.subscription = SupabaseDB.suscribirCambios(async (payload) => {
                    console.log('Actualización en tiempo real recibida:', payload);
                    try {
                        await Turnos.cargarTurnos();
                        await RenderAdmin.todo();
                        
                        // Mostrar notificación si hay un nuevo turno
                        if (payload.eventType === 'INSERT') {
                            Utils.mostrarNotificacion(`Nuevo turno ${payload.new.numero} recibido`, 'info');
                        }
                    } catch (error) {
                        console.error('Error al procesar actualización en tiempo real:', error);
                    }
                });
                
                // Suscribirse también a cambios en historial
                SupabaseDB.suscribirCambiosHistorial(async (payload) => {
                    console.log('Nuevo turno completado:', payload);
                    try {
                        await RenderAdmin.historial();
                        await RenderAdmin.estadisticas();
                    } catch (error) {
                        console.error('Error al actualizar historial:', error);
                    }
                });
            } else {
                console.warn('Supabase no disponible - funcionando en modo local');
            }
        }
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        Utils.mostrarNotificacion('Error al inicializar el sistema', 'error');
    }
});

window.AdminHandlers = AdminHandlers;
window.UsuarioHandlers = UsuarioHandlers;
