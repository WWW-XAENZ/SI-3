// ============================================
// SISTEMA DE TURNOS PROFESIONAL - ESTILO EPS
// VERSIÓN FINAL CORREGIDA - Abril 2026
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
// SONIDO DE LLAMADO - MEJORADO
// ============================================

const SoundManager = {
    audioContext: null,
    
    init() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (e) {
            console.warn('Web Audio API no soportada');
        }
    },
    
    playCallSound() {
        if (this.audioContext) {
            this.playBeepSequence();
        } else {
            this.playSimpleBeep();
        }
    },
    
    playBeepSequence() {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.exponentialRampToValueAtTime(440, now + 0.1);
        
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        osc1.start(now);
        osc1.stop(now + 0.5);
        
        setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880, ctx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
            
            gain2.gain.setValueAtTime(0, ctx.currentTime);
            gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            
            osc2.start();
            osc2.stop(ctx.currentTime + 0.5);
        }, 200);
        
        setTimeout(() => {
            const osc3 = ctx.createOscillator();
            const gain3 = ctx.createGain();
            
            osc3.connect(gain3);
            gain3.connect(ctx.destination);
            
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(880, ctx.currentTime);
            osc3.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);
            
            gain3.gain.setValueAtTime(0, ctx.currentTime);
            gain3.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.1);
            gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            
            osc3.start();
            osc3.stop(ctx.currentTime + 0.8);
        }, 400);
    },
    
    playSimpleBeep() {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQkALpPp6pZwGQA0m+nqlnAZADSb6eqWcBkANJvp6pZwGQA0m+nqlnAZADSb6eqWcBkANJvp6pZwGQA0m+nqlnAZADSb6eqWcBkANJvp6pZwGQ==');
        audio.volume = 0.5;
        audio.play().catch(() => {});
    }
};

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

    async actualizarProveedor(proveedorId, datos) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return false;
        }
        
        try {
            const datosActualizados = {
                nombre_empresa: datos.nombreEmpresa,
                nit: datos.nit,
                contacto: datos.contacto || null,
                telefono: datos.telefono || null,
                servicio: datos.servicio || null,
                updated_at: new Date().toISOString()
            };
            
            const { error } = await window.supabaseClient
                .from('proveedores')
                .update(datosActualizados)
                .eq('id', proveedorId);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error al actualizar proveedor:', error);
            return false;
        }
    },

    async eliminarProveedor(proveedorId) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return false;
        }
        
        try {
            const { error } = await window.supabaseClient
                .from('proveedores')
                .update({ 
                    activo: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', proveedorId);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error al eliminar proveedor:', error);
            return false;
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
            
            const proveedores = data.map(p => this._mapearProveedor(p));
            AppState.proveedores = proveedores;
            return proveedores;
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
            return [];
        }
    },

    async buscarProveedorPorNit(nit) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return null;
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('proveedores')
                .select('*')
                .eq('nit', nit)
                .eq('activo', true)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }
            
            return this._mapearProveedor(data);
        } catch (error) {
            console.error('Error al buscar proveedor:', error);
            return null;
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

    async actualizarTurno(turnoId, datos) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return false;
        }
        
        try {
            const datosActualizados = {
                ...datos,
                updated_at: new Date().toISOString()
            };
            
            const { error } = await window.supabaseClient
                .from('turnos')
                .update(datosActualizados)
                .eq('id', turnoId);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error al actualizar turno:', error);
            return false;
        }
    },

    async eliminarTurno(turnoId) {
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
            console.error('Error al eliminar turno:', error);
            return false;
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
                .update({ 
                    estado: 'cancelado',
                    updated_at: new Date().toISOString()
                })
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
            
            return data.map(h => this._mapearHistorial(h));
        } catch (error) {
            console.error('Error al cargar historial:', error);
            return [];
        }
    },

    async cargarHistorialHoy() {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return [];
        }
        
        try {
            const hoy = new Date().toISOString().split('T')[0];
            
            const { data, error } = await window.supabaseClient
                .from('historial_turnos')
                .select('*')
                .gte('fecha', `${hoy}T00:00:00`)
                .lte('fecha', `${hoy}T23:59:59`)
                .order('fecha', { ascending: false });
            
            if (error) throw error;
            
            return data.map(h => this._mapearHistorial(h));
        } catch (error) {
            console.error('Error al cargar historial de hoy:', error);
            return [];
        }
    },

    _mapearHistorial(h) {
        return {
            id: h.id,
            numero: h.numero,
            nombreEmpresa: h.nombre_empresa,
            nit: h.nit,
            motivo: h.motivo,
            horaSolicitud: h.hora_solicitud,
            horaLlamada: h.hora_llamada,
            horaFinalizacion: h.hora_finalizacion,
            estado: h.estado,
            fecha: h.fecha,
            createdAt: h.created_at
        };
    },

    async cargarEstadisticas() {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return {
                totalTurnos: 0,
                turnosEspera: 0,
                turnosAtendiendo: 0,
                totalProveedores: 0,
                promedioEspera: 0
            };
        }
        
        try {
            const hoy = new Date().toISOString().split('T')[0];
            
            const [
                { count: totalTurnosHoy, error: error1 },
                { count: turnosEspera, error: error2 },
                { count: turnosAtendiendo, error: error3 },
                { count: totalProveedores, error: error4 }
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

            if (error1) throw error1;
            if (error2) throw error2;
            if (error3) throw error3;
            if (error4) throw error4;

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
                .channel('turnos-changes', {
                    config: {
                        broadcast: { self: true },
                        presence: { key: '' }
                    }
                })
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
                            console.log('🔄 Intentando reconectar turnos...');
                            this.suscribirCambiosTurnos(callback);
                        }, 3000);
                    } else if (status === 'CLOSED') {
                        console.warn('🔌 Canal de turnos cerrado');
                    } else if (status === 'TIMED_OUT') {
                        console.warn('⏱️ Timeout en suscripción de turnos');
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
                .channel('historial-changes', {
                    config: {
                        broadcast: { self: true }
                    }
                })
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
                .subscribe((status, err) => {
                    console.log('📡 Estado canal historial:', status);
                    
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Suscripción a historial activada');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ Error en canal historial:', err);
                        setTimeout(() => {
                            this.suscribirCambiosHistorial(callback);
                        }, 3000);
                    }
                });
            
            return channel;
        } catch (error) {
            console.error('❌ Error al suscribirse a historial:', error);
            return null;
        }
    },

    async sincronizarTodo() {
        if (!window.supabaseClient) {
            return { success: false, message: 'Supabase no está configurado' };
        }

        try {
            console.log('🔄 Sincronizando datos desde la nube...');
            
            const todosLosTurnos = await this.cargarTurnos();
            
            const turnosEnEspera = todosLosTurnos.filter(t => t.estado === 'espera');
            const turnoAtendiendo = todosLosTurnos.find(t => t.estado === 'atendiendo');
            
            AppState.turnos = turnosEnEspera;
            AppState.turnoActual = turnoAtendiendo || null;
            
            LocalStorage.guardarTurnos(turnosEnEspera);
            if (turnoAtendiendo) {
                LocalStorage.guardarTurnoActual(turnoAtendiendo);
            }
            
            console.log(`✅ Turnos sincronizados: ${todosLosTurnos.length} total (${turnosEnEspera.length} en espera, ${turnoAtendiendo ? 1 : 0} atendiendo)`);
            
            const proveedores = await this.cargarProveedores();
            console.log(`✅ Proveedores sincronizados: ${proveedores.length}`);
            
            const historial = await this.cargarHistorial();
            console.log(`✅ Historial sincronizado: ${historial.length}`);
            
            const contador = await this.obtenerContadorTurnos();
            console.log(`✅ Contador sincronizado: ${contador}`);
            
            return { 
                success: true, 
                message: `Sincronización completada: ${todosLosTurnos.length} turnos (${turnosEnEspera.length} espera, ${turnoAtendiendo ? 1 : 0} atendiendo), ${proveedores.length} proveedores, ${historial.length} historial` 
            };
        } catch (error) {
            console.error('❌ Error al sincronizar:', error);
            return { success: false, message: error.message };
        }
    },

    async limpiarDatosAntiguos(dias = 30) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return false;
        }
        
        try {
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - dias);
            
            const { error } = await window.supabaseClient
                .from('historial_turnos')
                .delete()
                .lt('fecha', fechaLimite.toISOString());
            
            if (error) throw error;
            
            console.log(`🧹 Datos antiguos eliminados (> ${dias} días)`);
            return true;
        } catch (error) {
            console.error('Error al limpiar datos:', error);
            return false;
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
            console.log('Turno guardado en Supabase con ID:', turno.id);
        } else {
            turno.id = Date.now();
            console.warn('Turno guardado localmente con ID:', turno.id);
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
            const fechaA = new Date(a.fechaSolicitud || a.fecha_solicitud || 0);
            const fechaB = new Date(b.fechaSolicitud || b.fecha_solicitud || 0);
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
        if (!AppState.turnoActual) {
            Utils.mostrarNotificacion('No hay turno en atención', 'error');
            return false;
        }
        
        const turnoCompletado = { ...AppState.turnoActual };
        console.log('Completando turno:', turnoCompletado.numero);
        
        try {
            const historialGuardado = await SupabaseDB.guardarEnHistorial(turnoCompletado);
            if (!historialGuardado) {
                console.warn('No se pudo guardar en historial, continuando...');
            }
            
            const eliminado = await SupabaseDB.eliminarTurno(turnoCompletado.id);
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
                    console.log(`   - En espera: ${turnosEnEspera.length}`);
                    console.log(`   - Atendiendo: ${turnoAtendiendo ? 1 : 0}`);
                    
                    AppState.contadorTurnos = await SupabaseDB.obtenerContadorTurnos();
                    return;
                }
            }
            
            console.warn('Usando datos locales');
            AppState.turnos = LocalStorage.obtenerTurnos();
            AppState.turnoActual = LocalStorage.obtenerTurnoActual();
            
        } catch (error) {
            console.error('❌ Error al cargar turnos:', error);
            AppState.turnos = LocalStorage.obtenerTurnos();
            AppState.turnoActual = LocalStorage.obtenerTurnoActual();
            Utils.mostrarNotificacion('Error de conexión. Usando datos locales.', 'error');
        }
    }
};

// ============================================
// RENDERIZADO USUARIO - CON NOTIFICACIÓN CENTRADA Y AUTO-ACTUALIZACIÓN
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
    
    // VERIFICACIÓN Y NOTIFICACIÓN AUTOMÁTICA DEL TURNO LLAMADO
    verificarYNotificarTurnoLlamado() {
        const miTurno = LocalStorage.obtenerMiTurno();
        if (!miTurno) return false;
        
        const estaSiendoAtendido = AppState.turnoActual && AppState.turnoActual.numero === miTurno.numero;
        
        if (estaSiendoAtendido) {
            // Verificar si ya mostramos la notificación para este turno
            const notificacionMostrada = sessionStorage.getItem('notificacionTurno_' + miTurno.numero);
            
            if (!notificacionMostrada) {
                // Marcar como mostrada
                sessionStorage.setItem('notificacionTurno_' + miTurno.numero, 'true');
                
                // Mostrar notificación grande centrada
                this.mostrarNotificacionTurnoLlamado(miTurno);
                
                // Reproducir sonido
                SoundManager.playCallSound();
                
                return true;
            }
        }
        
        return false;
    },
    
    // NOTIFICACIÓN CENTRADA CORREGIDA
    mostrarNotificacionTurnoLlamado(turno) {
        // Eliminar notificación anterior si existe
        const notificacionAnterior = document.querySelector('.turn-called-notification');
        if (notificacionAnterior) {
            notificacionAnterior.remove();
        }
        
        const notificacion = document.createElement('div');
        notificacion.className = 'turn-called-notification';
        notificacion.innerHTML = `
            <div class="notification-overlay">
                <div class="notification-content">
                    <div class="notification-icon">🔔</div>
                    <h2>¡ES TU TURNO!</h2>
                    <div class="turn-number-display">${turno.numero}</div>
                    <div class="turn-company">${turno.nombreEmpresa}</div>
                    <p class="turn-message">Por favor diríjase al punto de atención</p>
                    <button class="btn-entendido" onclick="this.closest('.turn-called-notification').remove()">
                        Entendido
                    </button>
                </div>
            </div>
        `;
        
        // CSS completo para centrado absoluto
        const style = document.createElement('style');
        style.textContent = `
            .turn-called-notification {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 999999 !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .notification-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            
            .notification-content {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 50px;
                border-radius: 25px;
                text-align: center;
                color: white;
                box-shadow: 0 25px 80px rgba(0,0,0,0.5);
                max-width: 90%;
                width: 450px;
                animation: slideInUp 0.5s ease;
                position: relative;
            }
            
            .notification-icon {
                font-size: 70px;
                margin-bottom: 20px;
                animation: bellRing 1s ease infinite;
                display: block;
            }
            
            .notification-content h2 {
                font-size: 32px;
                margin: 0 0 25px 0;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 3px;
                color: white;
            }
            
            .turn-number-display {
                font-size: 85px;
                font-weight: bold;
                margin: 25px 0;
                text-shadow: 4px 4px 8px rgba(0,0,0,0.4);
                background: rgba(255,255,255,0.25);
                padding: 25px;
                border-radius: 20px;
                display: inline-block;
                min-width: 200px;
                color: white;
            }
            
            .turn-company {
                font-size: 22px;
                margin: 20px 0;
                opacity: 0.95;
                font-weight: 500;
            }
            
            .turn-message {
                font-size: 20px;
                margin: 25px 0 35px 0;
                opacity: 0.9;
            }
            
            .btn-entendido {
                padding: 18px 50px;
                font-size: 20px;
                border-radius: 35px;
                border: none;
                background: #fff;
                color: #667eea;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            }
            
            .btn-entendido:hover {
                transform: scale(1.05);
                box-shadow: 0 8px 30px rgba(0,0,0,0.4);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideInUp {
                from { transform: translateY(80px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes bellRing {
                0%, 100% { transform: rotate(0); }
                10%, 30%, 50%, 70%, 90% { transform: rotate(15deg); }
                20%, 40%, 60%, 80% { transform: rotate(-15deg); }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(notificacion);
        
        // Auto-cerrar después de 30 segundos
        setTimeout(() => {
            if (notificacion.parentElement) {
                notificacion.style.opacity = '0';
                notificacion.style.transition = 'opacity 0.5s';
                setTimeout(() => notificacion.remove(), 500);
            }
        }, 30000);
    },
    
    // SUSCRIPCIÓN CON AUTO-ACTUALIZACIÓN CORREGIDA
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
                        console.log('🔄 Actualización en tiempo real (usuario):', payload);
                        try {
                            // Recargar datos primero
                            await Turnos.cargarTurnos();
                            
                            // Actualizar interfaz
                            this.todo();
                            
                            // Verificar si llamaron nuestro turno (DESPUÉS de actualizar datos)
                            const miTurno = LocalStorage.obtenerMiTurno();
                            if (miTurno && AppState.turnoActual && AppState.turnoActual.numero === miTurno.numero) {
                                this.verificarYNotificarTurnoLlamado();
                                
                                if (typeof ModoEspera !== 'undefined') {
                                    ModoEspera.actualizar();
                                }
                            }
                        } catch (error) {
                            console.error('Error al procesar actualización:', error);
                        }
                    }
                )
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'historial_turnos' },
                    async (payload) => {
                        console.log('📝 Nuevo turno completado detectado:', payload);
                        try {
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
                        } catch (error) {
                            console.error('Error al procesar historial:', error);
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
                    <tr data-proveedor-id="${p.id}">
                        <td>${p.nombreEmpresa}</td>
                        <td>${p.nit || '-'}</td>
                        <td>${p.contacto || '-'}</td>
                        <td>${p.telefono || '-'}</td>
                        <td>${p.servicio || '-'}</td>
                        <td>
                            <button class="btn btn-secondary btn-small" onclick="AdminHandlers.editarProveedor(${p.id})">
                                ✏️ Editar
                            </button>
                            <button class="btn btn-danger btn-small" onclick="AdminHandlers.eliminarProveedor(${p.id})">
                                🗑️ Eliminar
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
            SoundManager.playCallSound();
            
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

    async editarProveedor(id) {
        console.log('Editando proveedor ID:', id);
        
        let proveedor = AppState.proveedores.find(p => p.id === id);
        
        if (!proveedor) {
            await SupabaseDB.cargarProveedores();
            proveedor = AppState.proveedores.find(p => p.id === id);
        }
        
        if (!proveedor) {
            Utils.mostrarNotificacion('Proveedor no encontrado', 'error');
            return;
        }

        let modal = document.getElementById('editarProveedorModal');
        
        if (!modal) {
            const modalHTML = `
                <div id="editarProveedorModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; align-items: center; justify-content: center;">
                    <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; position: relative;">
                        <button class="close-modal" onclick="document.getElementById('editarProveedorModal').style.display='none'" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                        <h2 style="margin-bottom: 20px; color: #333;">✏️ Editar Proveedor</h2>
                        <form id="formEditarProveedor">
                            <input type="hidden" id="editProveedorId">
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="editNombreEmpresa" style="display: block; margin-bottom: 5px; font-weight: bold;">Nombre de la Empresa:</label>
                                <input type="text" id="editNombreEmpresa" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="editNit" style="display: block; margin-bottom: 5px; font-weight: bold;">Placa del Vehículo:</label>
                                <input type="text" id="editNit" required maxlength="6" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px; text-transform: uppercase;">
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="editContacto" style="display: block; margin-bottom: 5px; font-weight: bold;">Persona de Contacto:</label>
                                <input type="text" id="editContacto" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label for="editTelefono" style="display: block; margin-bottom: 5px; font-weight: bold;">Teléfono:</label>
                                <input type="tel" id="editTelefono" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label for="editServicio" style="display: block; margin-bottom: 5px; font-weight: bold;">Tipo de Servicio:</label>
                                <select id="editServicio" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                                    <option value="entrega">📦 Entrega de Mercancía</option>
                                    <option value="servicio">🔧 Servicio Técnico</option>
                                    <option value="reunion">👥 Reunión</option>
                                    <option value="otro">📋 Otro</option>
                                </select>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button type="submit" class="btn btn-primary" style="flex: 1; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                                    💾 Guardar Cambios
                                </button>
                                <button type="button" onclick="document.getElementById('editarProveedorModal').style.display='none'" class="btn btn-secondary" style="flex: 1; padding: 12px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                                    ❌ Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('editarProveedorModal');
            
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
                
                if (!datos.nombreEmpresa) {
                    Utils.mostrarNotificacion('El nombre de la empresa es requerido', 'error');
                    return;
                }
                
                if (!datos.nit || datos.nit.length !== 6) {
                    Utils.mostrarNotificacion('La placa debe tener 6 caracteres', 'error');
                    return;
                }
                
                Utils.setLoading(true);
                
                try {
                    const resultado = await SupabaseDB.actualizarProveedor(proveedorId, datos);
                    
                    if (resultado) {
                        Utils.mostrarNotificacion('Proveedor actualizado exitosamente', 'success');
                        document.getElementById('editarProveedorModal').style.display = 'none';
                        await RenderAdmin.proveedores();
                    } else {
                        Utils.mostrarNotificacion('Error al actualizar proveedor', 'error');
                    }
                } catch (error) {
                    console.error('Error al actualizar:', error);
                    Utils.mostrarNotificacion('Error al actualizar proveedor: ' + error.message, 'error');
                } finally {
                    Utils.setLoading(false);
                }
            });
            
            document.getElementById('editNit').addEventListener('input', function() {
                this.value = this.value.toUpperCase();
            });
        }
        
        document.getElementById('editProveedorId').value = proveedor.id;
        document.getElementById('editNombreEmpresa').value = proveedor.nombreEmpresa || '';
        document.getElementById('editNit').value = proveedor.nit || '';
        document.getElementById('editContacto').value = proveedor.contacto || '';
        document.getElementById('editTelefono').value = proveedor.telefono || '';
        document.getElementById('editServicio').value = proveedor.servicio || 'entrega';
        
        modal.style.display = 'flex';
    },

    async eliminarProveedor(id) {
        if (confirm('¿Eliminar este proveedor? Esta acción no se puede deshacer.')) {
            Utils.setLoading(true);
            try {
                const resultado = await SupabaseDB.eliminarProveedor(id);
                if (resultado) {
                    Utils.mostrarNotificacion('Proveedor eliminado', 'success');
                    await RenderAdmin.proveedores();
                } else {
                    Utils.mostrarNotificacion('Error al eliminar proveedor', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                Utils.mostrarNotificacion('Error al eliminar proveedor', 'error');
            } finally {
                Utils.setLoading(false);
            }
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
// MODO DE ESPERA
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

    mostrarNotificacionLlamado() {
        if (this.notificacionMostrada) return;
        this.notificacionMostrada = true;
        
        if (typeof RenderUsuario !== 'undefined') {
            RenderUsuario.mostrarNotificacionTurnoLlamado(this.miTurno);
        }
        
        SoundManager.playCallSound();
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Sistema de Turnos cargado - Versión Final');
    
    SoundManager.init();
    
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
                    
                    // Si ya está siendo atendido, mostrar notificación inmediatamente
                    if (siendoAtendido) {
                        setTimeout(() => {
                            RenderUsuario.verificarYNotificarTurnoLlamado();
                        }, 1000);
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
