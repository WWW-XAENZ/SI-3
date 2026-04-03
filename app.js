// ============================================
// SISTEMA DE TURNOS PROFESIONAL - ESTILO EPS
// VERSIÓN CORREGIDA - NOTIFICACIÓN INMEDIATA
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
            
            console.log('✅ Conexión con Supabase exitosa');
            return true;
        } catch (error) {
            console.warn('Error de conexión:', error.message);
            return false;
        }
    },

    async obtenerContadorTurnos() {
        const contadorLocal = LocalStorage.obtenerContador();
        
        if (!window.supabaseClient) {
            return contadorLocal;
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
                        .insert({ 
                            clave: 'contador_turnos', 
                            valor: contadorLocal.toString(), 
                            descripcion: 'Contador global de turnos' 
                        });
                    return contadorLocal;
                }
                console.warn('Error al obtener contador de Supabase, usando local:', error.message);
                return contadorLocal;
            }
            
            const contadorSupabase = data ? parseInt(data.valor) : 0;
            return Math.max(contadorLocal, contadorSupabase);
        } catch (error) {
            console.warn('Error al obtener contador, usando local:', error.message);
            return contadorLocal;
        }
    },

    async incrementarContadorTurnos() {
        const contadorLocal = LocalStorage.obtenerContador();
        const nuevoContador = contadorLocal + 1;
        LocalStorage.guardarContador(nuevoContador);
        
        if (!window.supabaseClient) {
            return nuevoContador;
        }
        
        try {
            const { error } = await window.supabaseClient
                .from('configuracion')
                .upsert({ 
                    clave: 'contador_turnos', 
                    valor: nuevoContador.toString(),
                    descripcion: 'Contador global de turnos',
                    updated_at: new Date().toISOString()
                });
            
            if (error) {
                console.warn('Error al actualizar contador en Supabase, pero local ya se actualizó:', error.message);
            }
            
            return nuevoContador;
        } catch (error) {
            console.warn('Error al actualizar contador en Supabase, pero local ya se actualizó:', error.message);
            return nuevoContador;
        }
    },

    async guardarProveedor(proveedor) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return null;
        }
        
        try {
            const proveedorData = {
                nombre_empresa: proveedor.nombreEmpresa,
                nit: proveedor.nit,
                contacto: proveedor.contacto || null,
                telefono: proveedor.telefono || null,
                servicio: proveedor.servicio || null,
                activo: true,
                updated_at: new Date().toISOString()
            };
            
            if (proveedor.id) {
                const { data, error } = await window.supabaseClient
                    .from('proveedores')
                    .update(proveedorData)
                    .eq('id', proveedor.id)
                    .select()
                    .single();
                
                if (error) throw error;
                return this._mapearProveedor(data);
            } else {
                const { data, error } = await window.supabaseClient
                    .from('proveedores')
                    .insert(proveedorData)
                    .select()
                    .single();
                
                if (error) {
                    if (error.code === '23505') {
                        const { data: updateData, error: updateError } = await window.supabaseClient
                            .from('proveedores')
                            .update(proveedorData)
                            .eq('nit', proveedor.nit)
                            .select()
                            .single();
                        
                        if (updateError) throw updateError;
                        return this._mapearProveedor(updateData);
                    }
                    throw error;
                }
                
                return this._mapearProveedor(data);
            }
        } catch (error) {
            console.error('Error al guardar proveedor:', error);
            return null;
        }
    },

    async cargarProveedores() {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return [];
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('proveedores')
                .select('*')
                .eq('activo', true)
                .order('nombre_empresa', { ascending: true });
            
            if (error) throw error;
            
            return data.map(p => this._mapearProveedor(p));
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
            return [];
        }
    },

    _mapearProveedor(p) {
        return {
            id: p.id,
            nombreEmpresa: p.nombre_empresa,
            nit: p.nit,
            contacto: p.contacto,
            telefono: p.telefono,
            servicio: p.servicio,
            activo: p.activo,
            createdAt: p.created_at,
            updatedAt: p.updated_at
        };
    },

    async guardarTurno(turno) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return null;
        }
        
        try {
            const turnoData = {
                numero: turno.numero,
                nombre_empresa: turno.nombreEmpresa,
                nit: turno.nit,
                motivo: turno.motivo || '',
                hora_solicitud: turno.horaSolicitud,
                fecha_solicitud: turno.fechaSolicitud || new Date().toISOString(),
                estado: turno.estado || 'espera'
            };
            
            const { data, error } = await window.supabaseClient
                .from('turnos')
                .insert([turnoData])
                .select()
                .single();
            
            if (error) throw error;
            
            return this._mapearTurno(data);
        } catch (error) {
            console.error('Error al guardar turno:', error);
            return null;
        }
    },

    async cargarTurnos(estado = null) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return [];
        }
        
        try {
            let query = window.supabaseClient
                .from('turnos')
                .select('*')
                .order('fecha_solicitud', { ascending: true });
            
            if (estado) {
                query = query.eq('estado', estado);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            return data.map(t => this._mapearTurno(t));
        } catch (error) {
            console.error('Error al cargar turnos:', error);
            return [];
        }
    },

    async llamarTurno(turnoId) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return null;
        }
        
        try {
            const horaLlamada = new Date().toLocaleTimeString('es-CO', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
            
            const { data, error } = await window.supabaseClient
                .from('turnos')
                .update({ 
                    estado: 'atendiendo',
                    hora_llamada: horaLlamada,
                    updated_at: new Date().toISOString()
                })
                .eq('id', turnoId)
                .select()
                .single();
            
            if (error) throw error;
            
            return this._mapearTurno(data);
        } catch (error) {
            console.error('Error al llamar turno:', error);
            return null;
        }
    },

    async completarTurno(turnoId) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return false;
        }
        
        try {
            const { data: turno, error: errorGet } = await window.supabaseClient
                .from('turnos')
                .select('*')
                .eq('id', turnoId)
                .single();
            
            if (errorGet) throw errorGet;
            
            await this.guardarEnHistorial(this._mapearTurno(turno));
            
            const { error } = await window.supabaseClient
                .from('turnos')
                .delete()
                .eq('id', turnoId);
            
            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('Error al completar turno:', error);
            return false;
        }
    },

    async cancelarTurno(turnoId) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return false;
        }
        
        try {
            const { error } = await window.supabaseClient
                .from('turnos')
                .delete()
                .eq('id', turnoId);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error al cancelar turno:', error);
            return false;
        }
    },

    _mapearTurno(t) {
        return {
            id: t.id,
            numero: t.numero,
            nombreEmpresa: t.nombre_empresa,
            nit: t.nit,
            motivo: t.motivo,
            horaSolicitud: t.hora_solicitud,
            horaLlamada: t.hora_llamada,
            fechaSolicitud: t.fecha_solicitud,
            estado: t.estado,
            createdAt: t.created_at,
            updatedAt: t.updated_at
        };
    },

    async guardarEnHistorial(turno) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return false;
        }
        
        try {
            const horaFinalizacion = new Date().toLocaleTimeString('es-CO', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
            
            const historialData = {
                numero: turno.numero,
                nombre_empresa: turno.nombreEmpresa,
                nit: turno.nit,
                motivo: turno.motivo || '',
                hora_solicitud: turno.horaSolicitud,
                hora_llamada: turno.horaLlamada || null,
                hora_finalizacion: horaFinalizacion,
                estado: 'completado',
                fecha: new Date().toISOString()
            };
            
            const { error } = await window.supabaseClient
                .from('historial_turnos')
                .insert([historialData]);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error al guardar en historial:', error);
            return false;
        }
    },

    async cargarHistorial(limite = 100) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return [];
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('historial_turnos')
                .select('*')
                .order('fecha', { ascending: false })
                .limit(limite);
            
            if (error) throw error;
            
            return data.map(h => ({
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
        } catch (error) {
            console.error('Error al cargar historial:', error);
            return [];
        }
    },

    async cargarEstadisticas() {
        if (!window.supabaseClient) {
            return {
                totalTurnos: 0,
                turnosEspera: 0,
                turnosAtendiendo: 0,
                totalProveedores: 0
            };
        }
        
        try {
            const hoy = new Date().toISOString().split('T')[0];
            
            const [
                { count: totalTurnosHoy },
                { count: turnosEspera },
                { count: turnosAtendiendo },
                { count: totalProveedores }
            ] = await Promise.all([
                window.supabaseClient
                    .from('historial_turnos')
                    .select('*', { count: 'exact', head: true })
                    .gte('fecha', `${hoy}T00:00:00`),
                
                window.supabaseClient
                    .from('turnos')
                    .select('*', { count: 'exact', head: true })
                    .eq('estado', 'espera'),
                
                window.supabaseClient
                    .from('turnos')
                    .select('*', { count: 'exact', head: true })
                    .eq('estado', 'atendiendo'),
                
                window.supabaseClient
                    .from('proveedores')
                    .select('*', { count: 'exact', head: true })
                    .eq('activo', true)
            ]);

            return {
                totalTurnos: totalTurnosHoy || 0,
                turnosEspera: turnosEspera || 0,
                turnosAtendiendo: turnosAtendiendo || 0,
                totalProveedores: totalProveedores || 0
            };
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
            return {
                totalTurnos: 0,
                turnosEspera: 0,
                turnosAtendiendo: 0,
                totalProveedores: 0
            };
        }
    },

    suscribirCambiosTurnos(callback) {
        if (!window.supabaseClient) {
            console.error('❌ Supabase no está disponible');
            return null;
        }
        
        try {
            const channel = window.supabaseClient
                .channel('turnos-changes')
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'turnos' 
                    },
                    (payload) => {
                        console.log('🔄 Cambio en turnos:', payload);
                        if (callback && typeof callback === 'function') {
                            callback(payload);
                        }
                    }
                )
                .subscribe((status, err) => {
                    console.log('📡 Estado canal turnos:', status);
                    
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Suscripción a turnos activada correctamente');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ Error en canal de turnos:', err);
                        setTimeout(() => {
                            this.suscribirCambiosTurnos(callback);
                        }, 3000);
                    }
                });
            
            return channel;
        } catch (error) {
            console.error('❌ Error al suscribirse a turnos:', error);
            return null;
        }
    },

    suscribirCambiosHistorial(callback) {
        if (!window.supabaseClient) {
            console.error('❌ Supabase no está disponible');
            return null;
        }
        
        try {
            const channel = window.supabaseClient
                .channel('historial-changes')
                .on('postgres_changes', 
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'historial_turnos' 
                    },
                    (payload) => {
                        console.log('📝 Nuevo en historial:', payload);
                        if (callback && typeof callback === 'function') {
                            callback(payload);
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('📡 Estado canal historial:', status);
                });
            
            return channel;
        } catch (error) {
            console.error('❌ Error al suscribirse a historial:', error);
            return null;
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
        
        const placa = datosProveedor.nit.toUpperCase().trim();
        
        if (placa.length !== 6) {
            throw new Error('La placa debe tener exactamente 6 caracteres');
        }
        
        if (!datosProveedor.nombreEmpresa || datosProveedor.nombreEmpresa.trim() === '') {
            throw new Error('El nombre de la empresa es requerido');
        }
        
        datosProveedor.nit = placa;
        datosProveedor.nombreEmpresa = datosProveedor.nombreEmpresa.trim();

        await SupabaseDB.guardarProveedor(datosProveedor);

        let nuevoContador;
        try {
            nuevoContador = await SupabaseDB.incrementarContadorTurnos();
        } catch (error) {
            console.error('Error al incrementar contador:', error);
            AppState.contadorTurnos++;
            nuevoContador = AppState.contadorTurnos;
            LocalStorage.guardarContador(nuevoContador);
        }
        
        const numeroTurno = 'T' + nuevoContador.toString().padStart(3, '0');
        console.log('Nuevo número de turno:', numeroTurno);
        
        const turno = {
            numero: numeroTurno,
            nombreEmpresa: datosProveedor.nombreEmpresa,
            nit: placa,
            contacto: datosProveedor.contacto,
            telefono: datosProveedor.telefono,
            servicio: datosProveedor.servicio,
            motivo: motivo || '',
            horaSolicitud: Utils.obtenerHoraActual(),
            fechaSolicitud: new Date().toISOString(),
            estado: 'espera'
        };

        const turnoSupabase = await SupabaseDB.guardarTurno(turno);
        
        if (turnoSupabase && turnoSupabase.id) {
            turno.id = turnoSupabase.id;
        } else {
            turno.id = Date.now();
        }

        const existeTurno = AppState.turnos.find(t => t.numero === turno.numero);
        if (!existeTurno) {
            AppState.turnos.push(turno);
            LocalStorage.guardarTurnos(AppState.turnos);
        }
        
        console.log('✅ Turno creado exitosamente:', turno.numero);
        return turno;
    },

    async llamarSiguiente() {
        console.log('=== LLAMANDO SIGUIENTE TURNO ===');
        
        if (AppState.turnoActual) {
            Utils.mostrarNotificacion(`Hay un turno en atención (${AppState.turnoActual.numero}). Complételo primero.`, 'error');
            return null;
        }
        
        const todosLosTurnos = await SupabaseDB.cargarTurnos('espera');
        console.log('Turnos en espera cargados:', todosLosTurnos.length);
        
        if (!todosLosTurnos || todosLosTurnos.length === 0) {
            Utils.mostrarNotificacion('No hay turnos en espera', 'error');
            return null;
        }
        
        todosLosTurnos.sort((a, b) => {
            const fechaA = new Date(a.fechaSolicitud || 0);
            const fechaB = new Date(b.fechaSolicitud || 0);
            return fechaA - fechaB;
        });
        
        const siguiente = todosLosTurnos[0];
        console.log('Turno seleccionado:', siguiente);
        
        const horaLlamada = Utils.obtenerHoraActual();
        const actualizado = await SupabaseDB.llamarTurno(siguiente.id);
        
        if (!actualizado) {
            Utils.mostrarNotificacion('Error al llamar turno en la base de datos', 'error');
            return null;
        }
        
        siguiente.estado = 'atendiendo';
        siguiente.horaLlamada = horaLlamada;
        
        AppState.turnoActual = siguiente;
        AppState.turnos = todosLosTurnos.filter(t => t.id !== siguiente.id);
        
        LocalStorage.guardarTurnoActual(AppState.turnoActual);
        LocalStorage.guardarTurnos(AppState.turnos);
        
        console.log('✅ Turno llamado exitosamente:', siguiente.numero);
        return siguiente;
    },

    async cancelar(turnoId) {
        try {
            await SupabaseDB.cancelarTurno(turnoId);
            AppState.turnos = AppState.turnos.filter(t => t.id !== turnoId);
            LocalStorage.guardarTurnos(AppState.turnos);
            return true;
        } catch (error) {
            console.error('Error al cancelar turno:', error);
            return false;
        }
    },

    async completarTurnoActual() {
        if (!AppState.turnoActual) {
            Utils.mostrarNotificacion('No hay turno en atención', 'error');
            return false;
        }
        
        const turnoCompletado = { ...AppState.turnoActual };
        console.log('Completando turno:', turnoCompletado.numero);
        
        try {
            await SupabaseDB.guardarEnHistorial(turnoCompletado);
            
            const eliminado = await SupabaseDB.completarTurno(turnoCompletado.id);
            if (!eliminado) {
                throw new Error('No se pudo eliminar el turno de la base de datos');
            }
            
            const miTurno = LocalStorage.obtenerMiTurno();
            if (miTurno && miTurno.numero === turnoCompletado.numero) {
                LocalStorage.eliminarMiTurno();
                if (typeof ModoEspera !== 'undefined') {
                    ModoEspera.desactivar();
                }
            }
            
            AppState.turnoActual = null;
            LocalStorage.guardarTurnoActual(null);
            
            console.log('✅ Turno completado exitosamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error al completar turno:', error);
            Utils.mostrarNotificacion('Error al completar turno: ' + error.message, 'error');
            return false;
        }
    },

    async reiniciarCola() {
        try {
            for (const turno of AppState.turnos) {
                await SupabaseDB.cancelarTurno(turno.id);
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
        console.log('=== CARGANDO TURNOS ===');
        
        try {
            if (window.supabaseClient) {
                const todosLosTurnos = await SupabaseDB.cargarTurnos();
                
                if (todosLosTurnos && Array.isArray(todosLosTurnos)) {
                    const turnosEnEspera = todosLosTurnos.filter(t => t.estado === 'espera');
                    const turnoAtendiendo = todosLosTurnos.find(t => t.estado === 'atendiendo');
                    
                    AppState.turnos = turnosEnEspera;
                    AppState.turnoActual = turnoAtendiendo || null;
                    
                    LocalStorage.guardarTurnos(turnosEnEspera);
                    if (turnoAtendiendo) {
                        LocalStorage.guardarTurnoActual(turnoAtendiendo);
                    } else {
                        LocalStorage.guardarTurnoActual(null);
                    }
                    
                    console.log(`✅ Turnos sincronizados: ${todosLosTurnos.length} total`);
                    
                    AppState.contadorTurnos = await SupabaseDB.obtenerContadorTurnos();
                    return;
                }
            }
            
            AppState.turnos = LocalStorage.obtenerTurnos();
            AppState.turnoActual = LocalStorage.obtenerTurnoActual();
            
        } catch (error) {
            console.error('❌ Error al cargar turnos:', error);
            AppState.turnos = LocalStorage.obtenerTurnos();
            AppState.turnoActual = LocalStorage.obtenerTurnoActual();
        }
    }
};

// ============================================
// RENDERIZADO USUARIO - CORREGIDO CON NOTIFICACIÓN INMEDIATA
// ============================================

const RenderUsuario = {
    miTurno() {
        const container = document.getElementById('miTurnoContainer');
        const miTurno = LocalStorage.obtenerMiTurno();
        
        if (!container) return;

        if (miTurno) {
            const enCola = AppState.turnos.find(t => t.numero === miTurno.numero);
            const siendoAtendido = AppState.turnoActual && AppState.turnoActual.numero === miTurno.numero;
            
            if (!enCola && !siendoAtendido) {
                LocalStorage.eliminarMiTurno();
                container.innerHTML = `
                    <div class="no-turn-message">
                        <p><strong>✓ Turno completado</strong></p>
                        <p>Tu turno ${miTurno.numero} ha sido atendido</p>
                        <p class="hint">Gracias por tu visita</p>
                    </div>
                `;
                
                if (typeof ModoEspera !== 'undefined') {
                    ModoEspera.desactivar();
                }
                
                setTimeout(() => {
                    this.miTurno();
                }, 5000);
                return;
            }

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
    
    // CORRECCIÓN CRÍTICA: Función que se ejecuta INMEDIATAMENTE cuando Supabase detecta el cambio
    procesarTurnoLlamado(payload) {
        console.log('🎯 Procesando turno llamado en tiempo real:', payload);
        
        const miTurno = LocalStorage.obtenerMiTurno();
        if (!miTurno) return;
        
        // El payload.new contiene los datos actualizados del turno
        const turnoActualizado = payload.new;
        
        // Verificar si el turno actualizado es mi turno y está en estado 'atendiendo'
        if (turnoActualizado && turnoActualizado.numero === miTurno.numero && turnoActualizado.estado === 'atendiendo') {
            console.log('🎉 ¡ES MI TURNO! Mostrando notificación inmediata...');
            
            // Actualizar AppState inmediatamente
            AppState.turnoActual = {
                id: turnoActualizado.id,
                numero: turnoActualizado.numero,
                nombreEmpresa: turnoActualizado.nombre_empresa,
                nit: turnoActualizado.nit,
                motivo: turnoActualizado.motivo,
                horaSolicitud: turnoActualizado.hora_solicitud,
                horaLlamada: turnoActualizado.hora_llamada,
                estado: 'atendiendo'
            };
            
            // Remover de la lista de espera
            AppState.turnos = AppState.turnos.filter(t => t.numero !== miTurno.numero);
            
            // Actualizar localStorage
            LocalStorage.guardarTurnoActual(AppState.turnoActual);
            LocalStorage.guardarTurnos(AppState.turnos);
            
            // Actualizar UI inmediatamente
            this.todo();
            
            // Mostrar notificación grande con sonido
            if (typeof ModoEspera !== 'undefined') {
                ModoEspera.miTurno = miTurno;
                ModoEspera.activo = true;
                ModoEspera.notificacionMostrada = false; // Forzar mostrar
                ModoEspera.mostrarNotificacionLlamado();
            }
        }
    },
    
    suscribirCambios() {
        if (!window.supabaseClient) {
            console.warn('Supabase no disponible para suscripción en usuario');
            return null;
        }
        
        try {
            const subscription = window.supabaseClient
                .channel('turnos-changes-user')
                // ESCUCHAR INSERTS (nuevos turnos) - Esto ya funciona
                .on('postgres_changes', 
                    { event: 'INSERT', schema: 'public', table: 'turnos' },
                    async (payload) => {
                        console.log('📡 Nuevo turno insertado:', payload);
                        await Turnos.cargarTurnos();
                        this.todo();
                    }
                )
                // CORRECCIÓN CRÍTICA: ESCUCHAR UPDATES (turnos llamados) - Esto es lo que faltaba
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'turnos' },
                    async (payload) => {
                        console.log('📡 Turno actualizado (posiblemente llamado):', payload);
                        
                        // Procesar inmediatamente sin esperar recargar
                        this.procesarTurnoLlamado(payload);
                        
                        // También recargar por si acaso
                        await Turnos.cargarTurnos();
                        this.todo();
                    }
                )
                // También escuchar DELETE (turnos cancelados/eliminados)
                .on('postgres_changes',
                    { event: 'DELETE', schema: 'public', table: 'turnos' },
                    async (payload) => {
                        console.log('📡 Turno eliminado:', payload);
                        await Turnos.cargarTurnos();
                        this.todo();
                    }
                )
                // Escuchar historial (turnos completados)
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'historial_turnos' },
                    async (payload) => {
                        console.log('📝 Nuevo turno completado:', payload);
                        await Turnos.cargarTurnos();
                        this.todo();
                        
                        const miTurno = LocalStorage.obtenerMiTurno();
                        if (miTurno && payload.new && payload.new.numero === miTurno.numero) {
                            if (typeof ModoEspera !== 'undefined') {
                                ModoEspera.desactivar();
                            }
                            LocalStorage.eliminarMiTurno();
                            this.todo();
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('📡 Estado de suscripción (usuario):', status);
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
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        }
    },

    async todo() {
        console.log('=== ACTUALIZANDO VISTA ADMIN ===');
        
        try { this.turnoActual(); } catch (e) { console.error('Error turnoActual:', e); }
        try { this.listaTurnosEspera(); } catch (e) { console.error('Error listaTurnosEspera:', e); }
        try { await this.proveedores(); } catch (e) { console.error('Error proveedores:', e); }
        try { await this.historial(); } catch (e) { console.error('Error historial:', e); }
        try { await this.estadisticas(); } catch (e) { console.error('Error estadisticas:', e); }
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
            
            if (typeof ModoEspera !== 'undefined') {
                ModoEspera.activar(turno);
            }
            
            e.target.reset();
            const motivoGroup = document.getElementById('motivoGroup');
            if (motivoGroup) motivoGroup.style.display = 'none';
            
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
                if (typeof ModoEspera !== 'undefined') {
                    ModoEspera.desactivar();
                }
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
            console.log('No se pudo llamar turno');
        }
    },
    
    async completarTurno() {
        if (!AppState.turnoActual) {
            Utils.mostrarNotificacion('No hay turno en atención', 'error');
            return;
        }
        
        const turnoNumero = AppState.turnoActual.numero;
        
        if (confirm(`¿Completar turno ${turnoNumero}?`)) {
            const resultado = await Turnos.completarTurnoActual();
            if (resultado) {
                Utils.mostrarNotificacion(`Turno ${turnoNumero} completado`, 'success');
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
// MODO DE ESPERA Y NOTIFICACIONES - CON SONIDO
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
            
            if (this.intervaloActualizacion) {
                clearInterval(this.intervaloActualizacion);
            }
            
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
        
        const enCola = AppState.turnos.find(t => t.numero === this.miTurno.numero);
        const siendoAtendido = AppState.turnoActual && AppState.turnoActual.numero === this.miTurno.numero;
        
        if (!enCola && !siendoAtendido) {
            console.log('Turno completado detectado en ModoEspera');
            LocalStorage.eliminarMiTurno();
            this.desactivar();
            RenderUsuario.todo();
            return;
        }
        
        const turnoActual = AppState.turnoActual;
        const turnosEspera = AppState.turnos;
        
        if (turnoActual && turnoActual.numero === this.miTurno.numero) {
            this.mostrarNotificacionLlamado();
            return;
        }
        
        const posicion = turnosEspera.findIndex(t => t.numero === this.miTurno.numero) + 1;
        const tiempoEstimado = posicion > 0 ? posicion * CONFIG.TURN_TIME_ESTIMATE : 0;
        
        const waitingTurnNumber = document.getElementById('waitingTurnNumber');
        const waitingTurnStatus = document.getElementById('waitingTurnStatus');
        const waitingPosition = document.getElementById('waitingPosition');
        const waitingTime = document.getElementById('waitingTime');
        const progressFill = document.getElementById('progressFill');
        
        if (waitingTurnNumber) waitingTurnNumber.textContent = this.miTurno.numero;
        if (waitingTurnStatus) waitingTurnStatus.textContent = posicion > 0 ? 'En espera' : 'Procesando...';
        if (waitingPosition) waitingPosition.textContent = `Posición: ${posicion > 0 ? posicion : '--'}`;
        if (waitingTime) waitingTime.textContent = `Tiempo estimado: ${tiempoEstimado > 0 ? tiempoEstimado + ' min' : '--'}`;
        
        if (progressFill) {
            const totalTurnos = turnosEspera.length;
            const progreso = totalTurnos > 0 ? ((totalTurnos - posicion + 1) / totalTurnos) * 100 : 0;
            progressFill.style.width = `${Math.min(progreso, 100)}%`;
        }
    },

    // CORRECCIÓN: Sonido más fuerte y claro tipo "ding" de notificación
    reproducirSonido() {
        try {
            // Crear contexto de audio para sonido más confiable
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                // Fallback a Audio element
                const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=');
                audio.volume = 1.0;
                audio.play().catch(() => {});
                return;
            }
            
            const ctx = new AudioContext();
            
            // Crear oscilador para tono de "ding"
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            // Tipo de onda: sine para sonido limpio tipo campana
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // Do5
            oscillator.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1); // Do6
            
            // Envelope del sonido
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 1.5);
            
            // Segundo "ding" más agudo para énfasis
            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // Mi5
                osc2.frequency.exponentialRampToValueAtTime(1318.5, ctx.currentTime + 0.1); // Mi6
                gain2.gain.setValueAtTime(0, ctx.currentTime);
                gain2.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
                gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
                osc2.start(ctx.currentTime);
                osc2.stop(ctx.currentTime + 1.5);
            }, 200);
            
        } catch (e) {
            console.log('Error al reproducir sonido:', e);
        }
    },

    mostrarNotificacionLlamado() {
        if (this.notificacionMostrada) return;
        this.notificacionMostrada = true;
        
        // REPRODUCIR SONIDO INMEDIATAMENTE
        this.reproducirSonido();
        
        const notificacionAnterior = document.querySelector('.turn-called-notification');
        if (notificacionAnterior) {
            notificacionAnterior.remove();
        }
        
        const notificacion = document.createElement('div');
        notificacion.className = 'turn-called-notification';

        Object.assign(notificacion.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: '10000',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '50px 80px',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
            minWidth: '350px',
            animation: 'slideInCenter 0.5s ease-out',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        });
        
        notificacion.innerHTML = `
            <h3 style="margin: 0 0 20px 0; font-size: 24px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                ¡Es tu turno!
            </h3>
            <div style="font-size: 72px; font-weight: bold; margin: 20px 0; letter-spacing: 4px;">${this.miTurno.numero}</div>
            <p style="margin: 10px 0; font-size: 18px; opacity: 0.9;">${this.miTurno.nombreEmpresa}</p>
            <p style="margin: 10px 0 30px 0; font-size: 16px; opacity: 0.8;">Diríjase al punto de atención</p>

                        <button style="background: white; color: #10b981; border: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; transition: transform 0.2s;" 
                    onmouseover="this.style.transform='scale(1.05)'" 
                    onmouseout="this.style.transform='scale(1)'"
                    onclick="this.closest('.turn-called-notification').remove(); document.body.style.overflow = '';">Entendido</button>
        `;
        
        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';
        document.body.appendChild(notificacion);
        
        // Auto-cerrar después de 15 segundos
        setTimeout(() => {
            if (notificacion.parentElement) {
                notificacion.remove();
                document.body.style.overflow = '';
            }
        }, 15000);
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Sistema de Turnos cargado - Versión Notificación Inmediata');
    
    try {
        let conexionOk = false;
        try {
            conexionOk = await SupabaseDB.verificarConexion();
            console.log(conexionOk ? 'Supabase conectado' : 'Modo local');
            
            if (conexionOk) {
                ConnectionStatus.actualizar('connected', '✓ Conectado a Supabase');
            } else {
                ConnectionStatus.actualizar('disconnected', '✗ Sin conexión a Supabase');
            }
        } catch (error) {
            console.log('Error al verificar Supabase:', error.message);
            ConnectionStatus.actualizar('disconnected', '✗ Sin conexión');
        }
        
        // Cargar turnos correctamente al inicio
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
        
        // Página de usuario (index.html)
        if (document.getElementById('formSolicitarTurno')) {
            InputConfig.configurarPlacaInput();
            InputConfig.configurarServicioSelect();
            document.getElementById('formSolicitarTurno').addEventListener('submit', UsuarioHandlers.solicitarTurno);
            RenderUsuario.todo();
            
            const btnCancelarEspera = document.getElementById('btnCancelarEspera');
            if (btnCancelarEspera) {
                btnCancelarEspera.addEventListener('click', UsuarioHandlers.cancelarTurno);
            }
            
            // Verificar si el turno del usuario sigue siendo válido
            const miTurno = LocalStorage.obtenerMiTurno();
            if (miTurno) {
                const enCola = AppState.turnos.find(t => t.numero === miTurno.numero);
                const siendoAtendido = AppState.turnoActual && AppState.turnoActual.numero === miTurno.numero;
                
                if (enCola || siendoAtendido) {
                    ModoEspera.activar(miTurno);
                    
                    if (siendoAtendido) {
                        ModoEspera.mostrarNotificacionLlamado();
                    }
                } else {
                    console.log('Turno guardado ya no existe en el sistema, limpiando...');
                    LocalStorage.eliminarMiTurno();
                }
            }
            
            if (window.supabaseClient) {
                console.log('Configurando suscripción a tiempo real para usuario...');
                AppState.subscription = RenderUsuario.suscribirCambios();
            } else {
                console.warn('Supabase no disponible - verifica tu conexión y credenciales');
            }
        }
        
        // Página de admin (admin.html)
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
            
            console.log('Renderizando admin...');
            await RenderAdmin.todo();
            
            setInterval(async () => {
                await RenderAdmin.historial();
                await RenderAdmin.estadisticas();
            }, 5000);
            
            if (window.supabaseClient) {
                console.log('Configurando suscripción a tiempo real para admin...');
                AppState.subscription = SupabaseDB.suscribirCambiosTurnos(async (payload) => {
                    console.log('Actualización en tiempo real recibida:', payload);
                    try {
                        await Turnos.cargarTurnos();
                        await RenderAdmin.todo();
                        
                        if (payload.eventType === 'INSERT') {
                            Utils.mostrarNotificacion(`Nuevo turno ${payload.new.numero} recibido`, 'info');
                        }
                    } catch (error) {
                        console.error('Error al procesar actualización en tiempo real:', error);
                    }
                });
                
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
                console.warn('Supabase no disponible - verifica tu conexión y credenciales');
            }
        }
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        Utils.mostrarNotificacion('Error al inicializar el sistema', 'error');
    }
});

window.AdminHandlers = AdminHandlers;
window.UsuarioHandlers = UsuarioHandlers;
window.RenderUsuario = RenderUsuario;
window.ModoEspera = ModoEspera;
            <button style="background: white; color: #10b981; border: none; padding: 15px 40px; border-radius
