// ============================================
// SISTEMA DE TURNOS PROFESIONAL - ESTILO EPS
// VERSIÓN CON RECARGA AUTO Y ELIMINAR PROVEEDOR CORREGIDO
// ============================================

const CONFIG = {
    ADMIN_PASSWORD: 'RECEPCIONCEDI2',
    DESPACHADOR_PASSWORD: 'RECEPCIONDESPACHO',
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

const SonidoAlerta = {
    contexto: null,
    
    inicializar() {
        if (!this.contexto) {
            this.contexto = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    
    reproducir(veces = 3) {
        this.inicializar();
        
        for (let i = 0; i < veces; i++) {
            setTimeout(() => {
                const oscilador = this.contexto.createOscillator();
                const ganancia = this.contexto.createGain();
                
                oscilador.connect(ganancia);
                ganancia.connect(this.contexto.destination);
                
                oscilador.frequency.value = 880;
                oscilador.type = 'sine';
                
                ganancia.gain.setValueAtTime(0.3, this.contexto.currentTime);
                ganancia.gain.exponentialRampToValueAtTime(0.01, this.contexto.currentTime + 0.5);
                
                oscilador.start(this.contexto.currentTime);
                oscilador.stop(this.contexto.currentTime + 0.5);
            }, i * 600);
        }
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
        const horas = ahora.getHours().toString().padStart(2, '0');
        const minutos = ahora.getMinutes().toString().padStart(2, '0');
        return `${horas}:${minutos}`;
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
// BASE DE DATOS SUPABASE - CORREGIDO
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
        console.log('=== Incrementando contador ===');
        const contadorLocal = LocalStorage.obtenerContador();
        console.log('Contador local actual:', contadorLocal);
        const nuevoContador = contadorLocal + 1;
        console.log('Nuevo contador (local):', nuevoContador);
        LocalStorage.guardarContador(nuevoContador);
        
        if (!window.supabaseClient) {
            console.log('Supabase no disponible, usando contador local');
            return nuevoContador;
        }
        
        try {
            console.log('Actualizando contador en Supabase...');
            const { error } = await window.supabaseClient
                .from('configuracion')
                .upsert({ 
                    clave: 'contador_turnos', 
                    valor: nuevoContador.toString(),
                    descripcion: 'Contador global de turnos',
                    updated_at: new Date().toISOString()
                });
            
            if (error) {
                console.warn('Error al actualizar contador en Supabase:', error.message);
            } else {
                console.log('Contador actualizado en Supabase');
            }
            
            return nuevoContador;
        } catch (error) {
            console.warn('Error al actualizar contador en Supabase:', error.message);
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

    // CORRECCIÓN: Función eliminarProveedor añadida
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
            
            console.log(`✅ Proveedor ${proveedorId} eliminado (desactivado)`);
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
        console.log('=== SupabaseDB.guardarTurno ===');
        console.log('turno:', JSON.stringify(turno, null, 2));
        
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible - guardando en localStorage');
            turno.id = Date.now();
            AppState.turnos.push(turno);
            LocalStorage.guardarTurnos(AppState.turnos);
            return turno;
        }
        
        try {
            const turnoData = {
                numero: turno.numero,
                nombre_empresa: turno.nombreEmpresa,
                nit: turno.nit,
                motivo: turno.motivo || '',
                hora_solicitud: turno.horaSolicitud,
                fecha_solicitud: turno.fechaSolicitud || new Date().toISOString(),
                estado: turno.estado || 'espera',
                destino: turno.destino || null,
                fecha_cita: turno.fechaCita || null,
                num_factura: turno.numFactura || null,
                tipo_vehiculo: turno.tipoVehiculo || null,
                bultos: turno.bultos || null,
                peso: turno.peso || null,
                responsable: turno.responsable || null,
                contacto: turno.contacto || null,
                telefono: turno.telefono || null,
                servicio: turno.servicio || null,
                autorizado_salida: turno.autorizadoSalida || false
            };
            
            console.log('Insertando en Supabase:', JSON.stringify(turnoData, null, 2));
            
            const { data, error } = await window.supabaseClient
                .from('turnos')
                .insert([turnoData])
                .select()
                .single();
            
            if (error) {
                console.error('Error de Supabase:', error);
                console.error('Código de error:', error.code);
                console.error('Mensaje de error:', error.message);
                throw error;
            }
            
            console.log('Turno guardado exitosamente:', data);
            return this._mapearTurno(data);
        } catch (error) {
            console.error('Error al guardar turno:', error);
            console.log('Guardando turno en localStorage como fallback...');
            turno.id = Date.now();
            AppState.turnos.push(turno);
            LocalStorage.guardarTurnos(AppState.turnos);
            return turno;
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

    async llamarTurno(turnoId, infoDespacho = null) {
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
            
            const updateData = { 
                estado: 'atendiendo',
                hora_llamada: horaLlamada,
                updated_at: new Date().toISOString()
            };
            
            if (infoDespacho) {
                console.log('infoDespacho.tipoVehiculo antes de asignar:', infoDespacho.tipoVehiculo);
                updateData.num_factura = infoDespacho.numFactura || null;
                updateData.tipo_vehiculo = infoDespacho.tipoVehiculo || null;
                console.log('updateData.tipo_vehiculo:', updateData.tipo_vehiculo);
                updateData.bultos = infoDespacho.bultos ? parseInt(infoDespacho.bultos) : null;
                updateData.peso = infoDespacho.peso || null;
                updateData.responsable = infoDespacho.responsable || null;
                updateData.contacto = infoDespacho.contacto || null;
                updateData.telefono = infoDespacho.telefono || null;
                updateData.servicio = infoDespacho.servicio || null;
                updateData.destino = infoDespacho.destino || null;
            }
            
            const { data, error } = await window.supabaseClient
                .from('turnos')
                .update(updateData)
                .eq('id', turnoId)
                .select()
                .single();
            
            console.log('llamarTurno - DB response data:', data);
            console.log('llamarTurno - tipo_vehiculo from update:', updateData.tipo_vehiculo);
            
            if (error) throw error;
            
            const turnoActualizado = this._mapearTurno(data);
            console.log('Turno actualizado desde DB:', turnoActualizado);
            
            Object.assign(updateData, turnoActualizado);
            return updateData;
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
            
            console.log('completarTurno - turno desde DB:', turno);
            console.log('completarTurno - tipo_vehiculo desde DB:', turno?.tipo_vehiculo);
            
            if (errorGet) throw errorGet;
            
            const turnoMapeado = this._mapearTurno(turno);
            console.log('completarTurno - turno mapeado:', turnoMapeado);
            console.log('completarTurno - tipoVehiculo mapeado:', turnoMapeado?.tipoVehiculo);
            
            await this.guardarEnHistorial(turnoMapeado);
            
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
        console.log('Mapping turno, tipo_vehiculo from DB:', t.tipo_vehiculo);
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
            destino: t.destino,
            fechaCita: t.fecha_cita,
            numFactura: t.num_factura,
            tipoVehiculo: t.tipo_vehiculo,
            bultos: t.bultos,
            peso: t.peso,
            responsable: t.responsable,
            contacto: t.contacto,
            telefono: t.telefono,
            servicio: t.servicio,
            autorizadoSalida: t.autorizado_salida,
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
                destino: turno.destino || null,
                fecha_cita: turno.fechaCita || null,
                num_factura: turno.numFactura || null,
                tipo_vehiculo: turno.tipoVehiculo || null,
                bultos: turno.bultos ? parseInt(turno.bultos) : null,
                peso: turno.peso || null,
                responsable: turno.responsable || null,
                contacto: turno.contacto || null,
                telefono: turno.telefono || null,
                servicio: turno.servicio || null,
                autorizado_salida: false,
                fecha: new Date().toISOString()
            };
            
            console.log('Guardando en historial - tipoVehiculo:', turno.tipoVehiculo);
            
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
            
            console.log('Raw historial data from DB:', data);
            console.log('tipo_vehiculo in first item:', data?.[0]?.tipo_vehiculo);
            
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
                destino: h.destino,
                fechaCita: h.fecha_cita,
                numFactura: h.num_factura,
                tipoVehiculo: h.tipo_vehiculo,
                bultos: h.bultos,
                peso: h.peso,
                responsable: h.responsable,
                contacto: h.contacto,
                telefono: h.telefono,
                servicio: h.servicio,
                autorizadoSalida: h.autorizado_salida,
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

    async obtenerMesesConDatos() {
        if (!window.supabaseClient) return [];
        
        try {
            const { data, error } = await window.supabaseClient
                .from('historial_turnos')
                .select('fecha')
                .order('fecha', { ascending: false });
            
            if (error) throw error;
            
            const mesesSet = new Set();
            data.forEach(h => {
                const fecha = new Date(h.fecha);
                mesesSet.add(fecha.getFullYear() + '-' + (fecha.getMonth() + 1));
            });
            
            return Array.from(mesesSet).map(m => {
                const [anio, mes] = m.split('-').map(Number);
                return { anio, mes };
            }).sort((a, b) => {
                if (b.anio !== a.anio) return b.anio - a.anio;
                return b.mes - a.mes;
            });
        } catch (error) {
            console.error('Error al obtener meses:', error);
            return [];
        }
    },

    async obtenerEstadisticasMes(anio, mes) {
        if (!window.supabaseClient) {
            return { totalTurnos: 0, totalProveedores: 0, promedioDiario: 0, detalle: [] };
        }
        
        try {
            const inicioMes = `${anio}-${mes.toString().padStart(2, '0')}-01`;
            const finMes = mes === 12 
                ? `${anio + 1}-01-01` 
                : `${anio}-${(mes + 1).toString().padStart(2, '0')}-01`;

            const { data: historial, error } = await window.supabaseClient
                .from('historial_turnos')
                .select('fecha, nombre_empresa')
                .gte('fecha', inicioMes)
                .lt('fecha', finMes)
                .order('fecha');

            if (error) throw error;

            const diasMap = {};
            const proveedoresSet = new Set();
            let totalTurnos = 0;

            historial.forEach(h => {
                const fecha = new Date(h.fecha);
                const fechaStr = fecha.toLocaleDateString('es-CO');
                
                if (!diasMap[fechaStr]) {
                    diasMap[fechaStr] = { turnos: 0, proveedores: new Set() };
                }
                diasMap[fechaStr].turnos++;
                if (h.nombre_empresa) diasMap[fechaStr].proveedores.add(h.nombre_empresa);
                proveedoresSet.add(h.nombre_empresa);
                totalTurnos++;
            });

            const detalle = Object.entries(diasMap).map(([fecha, datos]) => ({
                fecha,
                turnos: datos.turnos,
                proveedores: datos.proveedores.size
            })).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

            const diasConDatos = Object.keys(diasMap).length;
            const promedioDiario = diasConDatos > 0 ? Math.round(totalTurnos / diasConDatos) : 0;

            return {
                totalTurnos,
                totalProveedores: proveedoresSet.size,
                promedioDiario,
                detalle
            };
        } catch (error) {
            console.error('Error al obtener estadísticas del mes:', error);
            return { totalTurnos: 0, totalProveedores: 0, promedioDiario: 0, detalle: [] };
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
        console.log('datosProveedor:', datosProveedor);
        
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

        console.log('Guardando proveedor en Supabase...');
        await SupabaseDB.guardarProveedor(datosProveedor);

        let nuevoContador;
        try {
            console.log('Incrementando contador de turnos...');
            nuevoContador = await SupabaseDB.incrementarContadorTurnos();
            console.log('Nuevo contador:', nuevoContador);
        } catch (error) {
            console.error('Error al incrementar contador:', error);
            AppState.contadorTurnos++;
            nuevoContador = AppState.contadorTurnos;
            LocalStorage.guardarContador(nuevoContador);
        }
        
        const prefijoTurno = datosProveedor.fechaCita ? 'C' : 'T';
        const numeroTurno = prefijoTurno + nuevoContador.toString().padStart(3, '0');
        console.log('Nuevo número de turno:', numeroTurno);
        
        const turno = {
            numero: numeroTurno,
            nombreEmpresa: datosProveedor.nombreEmpresa,
            nit: placa,
            contacto: datosProveedor.contacto,
            telefono: datosProveedor.telefono,
            servicio: datosProveedor.servicio,
            destino: datosProveedor.destino || null,
            fechaCita: datosProveedor.fechaCita || null,
            motivo: motivo || '',
            horaSolicitud: datosProveedor.fechaCita ? (() => {
                const fecha = new Date(datosProveedor.fechaCita);
                const horas = fecha.getHours().toString().padStart(2, '0');
                const minutos = fecha.getMinutes().toString().padStart(2, '0');
                return `${horas}:${minutos}`;
            })() : Utils.obtenerHoraActual(),
            fechaSolicitud: new Date().toISOString(),
            estado: datosProveedor.fechaCita ? 'citado' : 'espera'
        };

        console.log('Guardando turno en Supabase:', turno);
        const turnoSupabase = await SupabaseDB.guardarTurno(turno);
        console.log('Resultado guardarTurno:', turnoSupabase);
        
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
        
        const todosLosTurnos = await SupabaseDB.cargarTurnos();
        const turnosEnEspera = todosLosTurnos.filter(t => t.estado === 'espera' || t.estado === 'citado');
        
        console.log('Turnos en espera/citados cargados:', turnosEnEspera.length);
        
        if (!turnosEnEspera || turnosEnEspera.length === 0) {
            Utils.mostrarNotificacion('No hay turnos en espera', 'error');
            return null;
        }
        
        turnosEnEspera.sort((a, b) => {
            const fechaA = new Date(a.fechaSolicitud || 0);
            const fechaB = new Date(b.fechaSolicitud || 0);
            return fechaA - fechaB;
        });
        
        const siguiente = turnosEnEspera[0];
        console.log('Turno seleccionado:', siguiente);
        
        const horaLlamada = Utils.obtenerHoraActual();
        
        siguiente.estado = 'atendiendo';
        siguiente.horaLlamada = horaLlamada;
        
        AppState.turnoActual = siguiente;
        AppState.turnos = todosLosTurnos.filter(t => t.id !== siguiente.id);
        
        LocalStorage.guardarTurnoActual(AppState.turnoActual);
        LocalStorage.guardarTurnos(AppState.turnos);
        
        console.log('✅ Turno seleccionado, esperando confirmación de despacho:', siguiente.numero);
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
                console.log('Turnos cargados de Supabase:', todosLosTurnos);
                
                if (todosLosTurnos && Array.isArray(todosLosTurnos)) {
                    const turnosEnEspera = todosLosTurnos.filter(t => t.estado === 'espera' || t.estado === 'citado');
                    const turnoAtendiendo = todosLosTurnos.find(t => t.estado === 'atendiendo');
                    
                    console.log('Turnos en espera:', turnosEnEspera.length);
                    console.log('Turno atendiendo:', turnoAtendiendo);
                    
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
// RENDERIZADO USUARIO
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
                const esCitado = miTurno.estado === 'citado' || miTurno.fechaCita;
                const destinoLabel = { 'ensambles': 'SI ENSAMBLES', 'plasticos': 'SI PLÁSTICOS', 'ambos': 'AMBOS' };
                
                if (esCitado && !siendoAtendido) {
                    const fechaHoraMostrar = miTurno.fechaCita ? (() => {
                        const fechaHora = miTurno.fechaCita.split('T');
                        if (fechaHora.length >= 2) {
                            const [horas, minutos] = fechaHora[1].split(':');
                            const h = parseInt(horas);
                            const ampm = h >= 12 ? 'PM' : 'AM';
                            const h12 = h % 12 || 12;
                            const fecha = new Date(fechaHora[0] + 'T00:00:00');
                            const fechaStr = fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                            return `${fechaStr} a las ${h12}:${minutos} ${ampm}`;
                        }
                        return new Date(miTurno.fechaCita).toLocaleString('es-CO');
                    })() : 'Esperando ser llamado';
                    container.innerHTML = `
                        <div class="my-turn-active">
                            <div class="my-turn-number">${miTurno.numero}</div>
                            <div class="my-turn-status">${miTurno.nombreEmpresa}</div>
                            <div class="my-turn-position">
                                <strong>Cita Reservada</strong><br>
                                ${fechaHoraMostrar}
                            </div>
                            <div class="my-turn-position">
                                Destino: ${miTurno.destino ? destinoLabel[miTurno.destino] || miTurno.destino : 'N/A'}
                            </div>
                            <p class="hint">Estás atent@ a ser llamado el día de tu cita</p>
                        </div>
                    `;
                } else {
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
                }
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

        const hoy = new Date().toISOString().split('T')[0];
        const turnosHoy = AppState.turnos.filter(t => {
            if (t.estado === 'citado' && t.fechaCita) {
                const fechaCitaDia = t.fechaCita.split('T')[0];
                return fechaCitaDia === hoy;
            }
            return t.estado === 'espera';
        });

        if (turnosHoy.length === 0) {
            listaDiv.innerHTML = '<p class="empty-message">No hay turnos en espera</p>';
        } else {
            const miTurno = LocalStorage.obtenerMiTurno();
            let miNumero = null;
            try { miNumero = miTurno.numero; } catch(e) {}
            
            const formatearHora = (hora) => {
                if (!hora) return '';
                try {
                    const fechaHora = hora.split('T');
                    if (fechaHora.length >= 2) {
                        const [horas, minutos] = fechaHora[1].split(':');
                        const h = parseInt(horas);
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const h12 = h % 12 || 12;
                        return `${h12}:${minutos} ${ampm}`;
                    }
                    return hora;
                } catch(e) { return hora; }
            };
            
            listaDiv.innerHTML = turnosHoy.map(turno => `
                <div class="turn-item-user ${turno.numero === miNumero ? 'current' : ''}">
                    <span class="turn-item-number">${turno.numero}</span>
                    <div class="turn-item-info">
                        <div class="turn-item-company">${turno.nombreEmpresa}</div>
                        <div class="turn-item-time">${formatearHora(turno.horaSolicitud)}</div>
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
            window.supabaseClient
                .channel('turnos-changes-user')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'turnos' },
                    async (payload) => {
                        console.log('Realtime usuario:', payload);
                        try {
                            await Turnos.cargarTurnos();
                            this.todo();
                            
                            if (typeof ModoEspera !== 'undefined' && ModoEspera.activo) {
                                ModoEspera.actualizar();
                            }
                        } catch (error) {
                            console.error('Error:', error);
                        }
                    }
                )
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'historial_turnos' },
                    async (payload) => {
                        console.log('Realtime historial:', payload);
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
                            console.error('Error:', error);
                        }
                    }
                )
                .subscribe();
            console.log('Realtime usuario conectado');
            return true;
        } catch (error) {
            console.error('Error:', error);
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
                
                let despachoInfo = '';
                if (AppState.turnoActual.numFactura || AppState.turnoActual.bultos || AppState.turnoActual.peso || AppState.turnoActual.responsable) {
                    const partes = [];
                    if (AppState.turnoActual.numFactura) partes.push(`Fact: ${AppState.turnoActual.numFactura}`);
                    if (AppState.turnoActual.bultos) partes.push(`Bultos: ${AppState.turnoActual.bultos}`);
                    if (AppState.turnoActual.peso) partes.push(`Peso: ${AppState.turnoActual.peso}`);
                    if (AppState.turnoActual.responsable) partes.push(`Resp: ${AppState.turnoActual.responsable}`);
                    despachoInfo = `\n(${partes.join(', ')})`;
                }
                
                turnoInfoDiv.textContent = `${AppState.turnoActual.nombreEmpresa}${motivo}${placa}${despachoInfo}`;
                
                const despachoDetail = document.getElementById('despachoDetail');
                if (despachoDetail) {
                    if (AppState.turnoActual.numFactura || AppState.turnoActual.tipoVehiculo || AppState.turnoActual.bultos || AppState.turnoActual.peso || AppState.turnoActual.responsable || AppState.turnoActual.autorizadoSalida) {
                        despachoDetail.innerHTML = `
                            ${AppState.turnoActual.numFactura ? `<div><strong>Factura:</strong> ${AppState.turnoActual.numFactura}</div>` : ''}
                            ${AppState.turnoActual.tipoVehiculo ? `<div><strong>Tipo Vehículo:</strong> ${AppState.turnoActual.tipoVehiculo}</div>` : ''}
                            ${AppState.turnoActual.bultos ? `<div><strong>Bultos:</strong> ${AppState.turnoActual.bultos}</div>` : ''}
                            ${AppState.turnoActual.peso ? `<div><strong>Peso:</strong> ${AppState.turnoActual.peso} kg</div>` : ''}
                            ${AppState.turnoActual.responsable ? `<div><strong>Responsable:</strong> ${AppState.turnoActual.responsable}</div>` : ''}
                            ${AppState.turnoActual.autorizadoSalida ? `<div class="autorizado-badge">✓ SALIDA AUTORIZADA</div>` : ''}
                        `;
                    } else {
                        despachoDetail.innerHTML = '<div class="empty-message">Sin información de despacho</div>';
                    }
                }
            } else {
                turnoInfoDiv.textContent = 'Ningún turno en atención';
                
                const despachoDetail = document.getElementById('despachoDetail');
                if (despachoDetail) {
                    despachoDetail.innerHTML = '';
                }
            }
        }
    },

    listaTurnosEspera() {
        const listaDiv = document.getElementById('listaTurnosEspera');
        const contadorDiv = document.getElementById('contadorTurnosEspera');
        
        const turnosNormales = AppState.turnos.filter(t => t.estado === 'espera');
        
        if (contadorDiv) contadorDiv.textContent = turnosNormales.length;
        
        if (!listaDiv) return;

        if (turnosNormales.length === 0) {
            listaDiv.innerHTML = '<p class="empty-message">No hay turnos en espera</p>';
        } else {
            listaDiv.innerHTML = turnosNormales.map(turno => `
                <div class="turn-item turn-item-espera">
                    <span class="turn-item-number">${turno.numero}</span>
                    <div class="turn-item-info">
                        <div class="turn-item-company">${turno.nombreEmpresa}</div>
                        <div class="turn-item-time">
                            ${turno.horaSolicitud}${turno.motivo ? ' - ' + turno.motivo : ''}
                        </div>
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

    listaTurnosCitados() {
        const listaDiv = document.getElementById('listaTurnosCitados');
        const contadorDiv = document.getElementById('contadorTurnosCitados');
        
        const turnosCitados = AppState.turnos.filter(t => t.estado === 'citado');
        
        if (contadorDiv) contadorDiv.textContent = turnosCitados.length;
        
        if (!listaDiv) return;

        if (turnosCitados.length === 0) {
            listaDiv.innerHTML = '<p class="empty-message">No hay citas reservadas</p>';
        } else {
            const destinoLabel = { 'ensambles': 'SI ENSAMBLES', 'plasticos': 'SI PLÁSTICOS', 'ambos': 'AMBOS' };
            listaDiv.innerHTML = turnosCitados.map(turno => {
                const horaCita = turno.fechaCita ? (() => {
                    const fechaHora = turno.fechaCita.split('T');
                    if (fechaHora.length >= 2) {
                        const [horas, minutos] = fechaHora[1].split(':');
                        const h = parseInt(horas);
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const h12 = h % 12 || 12;
                        return `${h12}:${minutos} ${ampm}`;
                    }
                    return turno.horaSolicitud;
                })() : turno.horaSolicitud;
                const fechaCompleta = turno.fechaCita ? (() => {
                    const fechaHora = turno.fechaCita.split('T');
                    if (fechaHora.length >= 2) {
                        const fecha = new Date(turno.fechaCita);
                        return fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                    }
                    return '';
                })() : '';
                return `
                <div class="turn-item turn-item-citado">
                    <span class="turn-item-number">${turno.numero}</span>
                    <div class="turn-item-info">
                        <div class="turn-item-company">${turno.nombreEmpresa}</div>
                        <div class="turn-item-time">
                            ${horaCita}
                        </div>
                        ${fechaCompleta ? `<div class="turn-item-time">${fechaCompleta}</div>` : ''}
                        <div class="turn-item-details">
                            <span class="turn-destino">${turno.destino ? destinoLabel[turno.destino] || turno.destino : ''}</span>
                        </div>
                    </div>
                    <div class="turn-item-actions">
                        <button class="btn btn-primary btn-small" onclick="AdminHandlers.llamarTurnoEspecifico(${turno.id})">
                            Llamar
                        </button>
                        <button class="btn btn-danger btn-small" onclick="AdminHandlers.cancelarTurno(${turno.id})">
                            Cancelar
                        </button>
                    </div>
                </div>
            `}).join('');
        }
    },

    listaTurnosLlegados() {
        const listaDiv = document.getElementById('listaTurnosLlegados');
        const contadorDiv = document.getElementById('contadorTurnosLlegados');
        
        const turnosLlegados = AppState.turnos.filter(t => t.estado === 'llegado');
        
        if (contadorDiv) contadorDiv.textContent = turnosLlegados.length;
        
        if (!listaDiv) return;

        if (turnosLlegados.length === 0) {
            listaDiv.innerHTML = '<p class="empty-message">No hay turnos confirmados</p>';
        } else {
            const destinoLabel = { 'ensambles': 'SI ENSAMBLES', 'plasticos': 'SI PLÁSTICOS', 'ambos': 'AMBOS' };
            listaDiv.innerHTML = turnosLlegados.map(turno => {
                const horaLlegada = turno.hora_llegada ? turno.hora_llegada : turno.horaSolicitud;
                return `
                <div class="turn-item turn-item-llegado">
                    <span class="turn-item-number">${turno.numero}</span>
                    <div class="turn-item-info">
                        <div class="turn-item-company">${turno.nombreEmpresa}</div>
                        <div class="turn-item-time">
                            Llegada: ${horaLlegada}
                        </div>
                        <div class="turn-item-details">
                            <span class="turn-destino">${turno.destino ? destinoLabel[turno.destino] || turno.destino : ''}</span>
                            <span class="turn-placa">${turno.placa_vehiculo || '-'}</span>
                        </div>
                    </div>
                    <div class="turn-item-actions">
                        <button class="btn btn-primary btn-small" onclick="AdminHandlers.llamarTurnoEspecifico(${turno.id})">
                            Llamar
                        </button>
                        <button class="btn btn-danger btn-small" onclick="AdminHandlers.cancelarTurno(${turno.id})">
                            Cancelar
                        </button>
                    </div>
                </div>
            `}).join('');
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
                proveedoresBody.innerHTML = '<tr><td colspan="5" class="empty-message">No hay proveedores registrados</td></tr>';
            } else {
                proveedoresBody.innerHTML = proveedores.map(p => `
                    <tr>
                        <td>${p.nombreEmpresa}</td>
                        <td>${p.nit || '-'}</td>
                        <td>${p.contacto || '-'}</td>
                        <td>${p.telefono || '-'}</td>
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
            proveedoresBody.innerHTML = '<tr><td colspan="5" class="empty-message">Error al cargar proveedores</td></tr>';
        }
    },

    async historial() {
        const historialDiv = document.getElementById('historialTurnos');
        if (!historialDiv) return;

        try {
            const historial = await SupabaseDB.cargarHistorial();
            console.log('Historial cargado:', historial);
            
            if (historial.length === 0) {
                historialDiv.innerHTML = '<p class="empty-message">No hay historial de turnos</p>';
            } else {
                const destinoLabel = { 'ensambles': 'SI ENSAMBLES', 'plasticos': 'SI PLÁSTICOS', 'ambos': 'AMBOS' };
                const formatearFechaHora = (fechaHora) => {
                    if (!fechaHora) return 'N/A';
                    try {
                        const fecha = new Date(fechaHora);
                        return fecha.toLocaleString('es-CO', { 
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: 'numeric', minute: '2-digit', hour12: true 
                        });
                    } catch(e) { return fechaHora; }
                };
                historialDiv.innerHTML = historial.map(h => {
                    console.log('Historial item tipoVehiculo:', h.tipoVehiculo);
                    return `
                    <div class="history-item">
                        <div class="history-item-header">
                            <span class="history-item-number">${h.numero}</span>
                            <span class="history-item-status status-${h.estado}">${h.autorizadoSalida ? '✓ SALIDA AUTORIZADA' : h.estado}</span>
                            ${h.fechaCita ? '<span class="history-item-badge">CITADO</span>' : ''}
                        </div>
                        <div class="history-item-info">
                            <div class="history-item-company">${h.nombreEmpresa}</div>
                            <div class="history-item-details">
                                <span><strong>Placa:</strong> ${h.nit || 'N/A'}</span>
                                <span><strong>Destino:</strong> ${h.destino ? destinoLabel[h.destino] || h.destino : 'N/A'}</span>
                                <span><strong>Servicio:</strong> ${h.servicio || 'N/A'}</span>
                            </div>
                            <div class="history-item-details">
                                <span><strong>Contacto:</strong> ${h.contacto || 'N/A'}</span>
                                <span><strong>Teléfono:</strong> ${h.telefono || 'N/A'}</span>
                            </div>
                            <div class="history-item-details" style="background: #f0fdf4; padding: 8px; border-radius: 4px; margin-top: 4px;">
                                <span><strong>N° Factura:</strong> ${h.numFactura || 'N/A'}</span>
                                <span><strong>Tipo Vehículo:</strong> ${h.tipoVehiculo || 'N/A'}</span>
                                <span><strong>Bultos:</strong> ${h.bultos || 'N/A'}</span>
                                <span><strong>Peso:</strong> ${h.peso || 'N/A'} kg</span>
                                <span><strong>Responsable:</strong> ${h.responsable || 'N/A'}</span>
                            </div>
                            ${h.fechaCita ? `<div class="history-item-details"><span><strong>Cita:</strong> ${formatearFechaHora(h.fechaCita)}</span></div>` : ''}
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
                `}).join('');
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

    async cargarMesesDisponibles() {
        try {
            const meses = await SupabaseDB.obtenerMesesConDatos();
            const mesSelect = document.getElementById('mesSelect');
            if (!mesSelect) return;
            
            mesSelect.innerHTML = '<option value="">Seleccionar mes...</option>';
            
            meses.forEach(mes => {
                const option = document.createElement('option');
                option.value = mes.anio + '-' + mes.mes;
                const nombreMes = new Date(mes.anio, mes.mes - 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
                option.textContent = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
                mesSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar meses:', error);
        }
    },

    async verEstadisticasMes() {
        const mesSelect = document.getElementById('mesSelect');
        if (!mesSelect || !mesSelect.value) {
            Utils.mostrarNotificacion('Seleccione un mes', 'error');
            return;
        }

        const [anio, mes] = mesSelect.value.split('-').map(Number);
        const stats = await SupabaseDB.obtenerEstadisticasMes(anio, mes);

        document.getElementById('totalTurnosMes').textContent = stats.totalTurnos;
        document.getElementById('totalProveedoresMes').textContent = stats.totalProveedores;
        document.getElementById('promedioDiario').textContent = stats.promedioDiario;

        const detalleDiario = document.getElementById('detalleDiario');
        if (detalleDiario) {
            if (stats.detalle.length === 0) {
                detalleDiario.innerHTML = '<tr><td colspan="3" class="empty-message">No hay datos para este mes</td></tr>';
            } else {
                detalleDiario.innerHTML = stats.detalle.map(d => `
                    <tr>
                        <td>${d.fecha}</td>
                        <td>${d.turnos}</td>
                        <td>${d.proveedores}</td>
                    </tr>
                `).join('');
            }
        }
    },

    async todo() {
        console.log('=== ACTUALIZANDO VISTA ADMIN ===');
        
        try { this.turnoActual(); } catch (e) { console.error('Error turnoActual:', e); }
        try { this.listaTurnosEspera(); } catch (e) { console.error('Error listaTurnosEspera:', e); }
        try { this.listaTurnosCitados(); } catch (e) { console.error('Error listaTurnosCitados:', e); }
        try { this.listaTurnosLlegados(); } catch (e) { console.error('Error listaTurnosLlegados:', e); }
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
            
            const destino = document.getElementById('destino')?.value;
            const fechaCitaInput = document.getElementById('fechaCita')?.value;
            
            const esCita = fechaCitaInput && fechaCitaInput.trim() !== '';
            
            let fechaCitaISO = null;
            if (esCita && fechaCitaInput) {
                const fechaLocal = new Date(fechaCitaInput);
                fechaCitaISO = fechaLocal.toISOString();
            }
            
            const datosProveedor = {
                nombreEmpresa: document.getElementById('nombreEmpresa')?.value?.trim(),
                nit: placaInput,
                contacto: document.getElementById('contacto')?.value?.trim(),
                telefono: document.getElementById('telefono')?.value?.trim(),
                servicio: document.getElementById('servicio')?.value,
                destino: destino,
                fechaCita: fechaCitaISO
            };

            if (!destino) throw new Error('El destino es requerido');

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
            this.mostrarModalDespacho(turno, 'llamar');
        } else {
            console.log('No se pudo llamar turno');
        }
    },

    async llamarTurnoEspecifico(turnoId) {
        const turno = AppState.turnos.find(t => t.id === turnoId);
        if (!turno) {
            Utils.mostrarNotificacion('Turno no encontrado', 'error');
            return;
        }

        if (AppState.turnoActual) {
            Utils.mostrarNotificacion(`Ya hay un turno en atención (${AppState.turnoActual.numero}). Complételo primero.`, 'error');
            return;
        }

        this.mostrarModalDespacho(turno, 'especifico', turnoId);
    },

    mostrarModalDespacho(turno, tipo, turnoId = null) {
        const modal = document.getElementById('despachoModal');
        if (!modal) {
            Utils.mostrarNotificacion('Error: Modal de despacho no encontrado', 'error');
            return;
        }

        const modalTurnNumber = document.getElementById('despachoTurnNumber');
        const modalTurnInfo = document.getElementById('despachoTurnInfo');
        const infoDespachoDiv = document.getElementById('despachoInfo');

        if (modalTurnNumber) modalTurnNumber.textContent = turno.numero;
        if (modalTurnInfo) modalTurnInfo.textContent = `${turno.nombreEmpresa}${turno.nit ? ' - ' + turno.nit : ''}`;

        if (turno.numFactura || turno.tipoVehiculo || turno.bultos || turno.peso || turno.responsable) {
            if (infoDespachoDiv) {
                infoDespachoDiv.innerHTML = `
                    ${turno.numFactura ? `<p><strong>Factura:</strong> ${turno.numFactura}</p>` : ''}
                    ${turno.tipoVehiculo ? `<p><strong>Tipo Vehículo:</strong> ${turno.tipoVehiculo}</p>` : ''}
                    ${turno.bultos ? `<p><strong>Bultos:</strong> ${turno.bultos}</p>` : ''}
                    ${turno.peso ? `<p><strong>Peso:</strong> ${turno.peso}</p>` : ''}
                    ${turno.responsable ? `<p><strong>Responsable:</strong> ${turno.responsable}</p>` : ''}
                `;
            }
        } else {
            if (infoDespachoDiv) {
                infoDespachoDiv.innerHTML = '<p class="empty-message">Sin información de despacho</p>';
            }
        }

        const numFacturaInput = document.getElementById('despachoNumFactura');
        const tipoVehiculoInput = document.getElementById('despachoTipoVehiculo');
        const bultosInput = document.getElementById('despachoBultos');
        const pesoInput = document.getElementById('despachoPeso');
        const responsableInput = document.getElementById('despachoResponsable');

        if (numFacturaInput) numFacturaInput.value = turno.numFactura || '';
        if (tipoVehiculoInput) tipoVehiculoInput.value = turno.tipoVehiculo || '';
        if (bultosInput) bultosInput.value = turno.bultos || '';
        if (pesoInput) pesoInput.value = turno.peso || '';
        if (responsableInput) responsableInput.value = turno.responsable || '';

        modal.dataset.turnoId = turnoId || turno.id;
        modal.dataset.tipo = tipo;
        modal.style.display = 'flex';
    },

    async guardarDespacho() {
        const modal = document.getElementById('despachoModal');
        if (!modal) return;

        const turnoId = parseInt(modal.dataset.turnoId);
        const tipo = modal.dataset.tipo;

        const numFacturaInput = document.getElementById('despachoNumFactura');
        const tipoVehiculoInput = document.getElementById('despachoTipoVehiculo');
        const bultosInput = document.getElementById('despachoBultos');
        const pesoInput = document.getElementById('despachoPeso');
        const responsableInput = document.getElementById('despachoResponsable');

        let turnoActual = null;
        
        if (tipo === 'especifico') {
            turnoActual = AppState.turnos.find(t => t.id === turnoId);
        } else {
            turnoActual = AppState.turnoActual;
        }

        const infoDespacho = {
            numFactura: numFacturaInput?.value?.trim() || null,
            tipoVehiculo: tipoVehiculoInput?.value ? tipoVehiculoInput.value.trim() : null,
            bultos: bultosInput?.value?.trim() || null,
            peso: pesoInput?.value?.trim() || null,
            responsable: responsableInput?.value?.trim() || null,
            contacto: turnoActual?.contacto || null,
            telefono: turnoActual?.telefono || null,
            servicio: turnoActual?.servicio || null,
            nit: turnoActual?.nit || null,
            destino: turnoActual?.destino || null
        };
        
        console.log('=== guardarDespacho ===');
        console.log('tipoVehiculoInput value:', tipoVehiculoInput?.value);
        console.log('tipoVehiculoInput trimmed:', tipoVehiculoInput?.value?.trim());
        console.log('infoDespacho:', infoDespacho);

        const horaLlamada = Utils.obtenerHoraActual();

        if (tipo === 'especifico') {
            if (!turnoActual) {
                Utils.mostrarNotificacion('Turno no encontrado', 'error');
                return;
            }

            const actualizado = await SupabaseDB.llamarTurno(turnoId, infoDespacho);
            if (!actualizado) {
                Utils.mostrarNotificacion('Error al llamar turno', 'error');
                return;
            }

            Object.assign(turnoActual, {
                estado: 'atendiendo',
                horaLlamada: horaLlamada,
                ...infoDespacho
            });

            AppState.turnoActual = turnoActual;
            AppState.turnos = AppState.turnos.filter(t => t.id !== turnoId);
        } else {
            if (AppState.turnoActual) {
                const actualizado = await SupabaseDB.llamarTurno(AppState.turnoActual.id, infoDespacho);
                if (actualizado) {
                    Object.assign(AppState.turnoActual, {
                        horaLlamada: horaLlamada,
                        ...infoDespacho
                    });
                } else {
                    Object.assign(AppState.turnoActual, {
                        horaLlamada: horaLlamada,
                        ...infoDespacho
                    });
                }
            }
        }

        LocalStorage.guardarTurnoActual(AppState.turnoActual);
        LocalStorage.guardarTurnos(AppState.turnos);

        modal.style.display = 'none';

        const confirmModal = document.getElementById('turnoModal');
        if (confirmModal) {
            const confirmTurnNumber = document.getElementById('modalTurnNumber');
            const confirmTurnInfo = document.getElementById('modalTurnInfo');
            
            if (confirmTurnNumber) confirmTurnNumber.textContent = AppState.turnoActual?.numero || '--';
            if (confirmTurnInfo) confirmTurnInfo.textContent = AppState.turnoActual ? 
                `${AppState.turnoActual.nombreEmpresa}\n${infoDespacho.numFactura ? 'Factura: ' + infoDespacho.numFactura : ''}` : '';
            
            confirmModal.style.display = 'flex';
        }

        Utils.mostrarNotificacion(`Turno ${AppState.turnoActual?.numero} llamado`, 'success');
        await RenderAdmin.todo();
    },

    async completarTurno() {
        if (!AppState.turnoActual) {
            Utils.mostrarNotificacion('No hay turno en atención', 'error');
            return;
        }
        
        const turnoNumero = AppState.turnoActual.numero;
        const turnoNombre = AppState.turnoActual.nombreEmpresa;
        const despachoInfo = AppState.turnoActual.numFactura || AppState.turnoActual.tipoVehiculo || AppState.turnoActual.bultos || AppState.turnoActual.peso || AppState.turnoActual.responsable;
        
        console.log('=== completarTurno ===');
        console.log('AppState.turnoActual:', AppState.turnoActual);
        console.log('despachoInfo:', despachoInfo);
        
        if (!confirm(`¿Completar turno ${turnoNumero}?`)) {
            return;
        }
        
        const turnoParaDespacho = { ...AppState.turnoActual };
        
        const proveedorData = {
            numero: turnoParaDespacho.numero,
            nombre: turnoParaDespacho.nombreEmpresa,
            nit: turnoParaDespacho.nit || '',
            motivo: turnoParaDespacho.motivo || '',
            horaSolicitud: turnoParaDespacho.horaSolicitud || '',
            horaLlamada: turnoParaDespacho.horaLlamada || '',
            destino: turnoParaDespacho.destino || '',
            contacto: turnoParaDespacho.contacto || '',
            telefono: turnoParaDespacho.telefono || '',
            servicio: turnoParaDespacho.servicio || '',
            numFactura: turnoParaDespacho.numFactura || '',
            tipoVehiculo: turnoParaDespacho.tipoVehiculo || '',
            bultos: turnoParaDespacho.bultos || '',
            peso: turnoParaDespacho.peso || '',
            responsable: turnoParaDespacho.responsable || '',
            timestamp: Date.now()
        };
        
        console.log('Guardando proveedorListoSalir ANTES de completar:', proveedorData);
        
        try {
            localStorage.setItem('proveedorListoSalir', JSON.stringify(proveedorData));
            console.log('✅ Guardado en localStorage exitosamente');
        } catch (e) {
            console.error('❌ Error al guardar en localStorage:', e);
        }
        
        const resultado = await Turnos.completarTurnoActual();
        
        if (resultado) {
            Utils.mostrarNotificacion(`Turno ${turnoNumero} completado`, 'success');
            
            if (despachoInfo) {
                setTimeout(() => {
                    Utils.mostrarNotificacion(`Proveedor ${turnoNombre} completado! Esperando autorización de salida.`, 'info');
                }, 1000);
            } else {
                Utils.mostrarNotificacion(`Turno ${turnoNumero} completado sin información de despacho`, 'info');
            }
            
            await RenderAdmin.todo();
        } else {
            Utils.mostrarNotificacion('Error al completar turno', 'error');
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

    // CORRECCIÓN: Función eliminarProveedor añadida correctamente
    async eliminarProveedor(id) {
        if (confirm('¿Eliminar este proveedor?')) {
            const resultado = await SupabaseDB.eliminarProveedor(id);
            if (resultado) {
                Utils.mostrarNotificacion('Proveedor eliminado', 'success');
                await RenderAdmin.proveedores();
            } else {
                Utils.mostrarNotificacion('Error al eliminar proveedor', 'error');
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
                const accessTypeSelect = document.getElementById('accessType');
                modal.style.display = 'flex';
                const input = document.getElementById('adminPassword');
                if (input) {
                    input.value = '';
                    input.focus();
                }
                if (accessTypeSelect) {
                    accessTypeSelect.value = 'admin';
                }
            }
        }
    },

    handleLogin(e) {
        e.preventDefault();
        const password = document.getElementById('adminPassword')?.value;
        const accessType = document.getElementById('accessType')?.value || 'admin';
        
        if (accessType === 'despachador') {
            if (password === CONFIG.DESPACHADOR_PASSWORD) {
                window.location.href = 'despachador.html';
            } else {
                const errorEl = document.getElementById('loginError');
                if (errorEl) {
                    errorEl.textContent = 'Contraseña de despachador incorrecta';
                    errorEl.style.display = 'block';
                }
                Utils.mostrarNotificacion('Contraseña incorrecta', 'error');
            }
        } else {
            if (password === CONFIG.ADMIN_PASSWORD) {
                window.location.href = 'admin.html';
            } else {
                const errorEl = document.getElementById('loginError');
                if (errorEl) {
                    errorEl.textContent = 'Contraseña de administrador incorrecta';
                    errorEl.style.display = 'block';
                }
                Utils.mostrarNotificacion('Contraseña incorrecta', 'error');
            }
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
    },

    configurarFechaCita() {
        const fechaInput = document.getElementById('fechaCita');
        if (fechaInput) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            fechaInput.min = now.toISOString().slice(0, 16);
        }
    },

    configurarMayusculas() {
        document.querySelectorAll('input[type="text"], textarea').forEach(input => {
            input.addEventListener('input', function() {
                this.value = this.value.toUpperCase();
            });
            if (input.value) {
                input.value = input.value.toUpperCase();
            }
        });
    },

    configurarTelefono() {
        const telefonoInput = document.getElementById('telefono');
        if (telefonoInput) {
            telefonoInput.addEventListener('input', function(e) {
                let value = this.value.replace(/\D/g, '');
                if (value.length > 10) value = value.slice(0, 10);
                
                if (value.length >= 4) {
                    value = value.slice(0, 3) + ' ' + value.slice(3);
                }
                if (value.length >= 7) {
                    value = value.slice(0, 7) + ' ' + value.slice(7);
                }
                
                this.value = value;
            });
        }
    },

    configurarPasswordToggle() {
        console.log('🔐 configurando password toggle...');
        const agregarToggle = () => {
            const inputs = document.querySelectorAll('input[type="password"]');
            console.log('🔍 Encontrados inputs de password:', inputs.length);
            
            inputs.forEach(input => {
                if (input.parentNode.classList.contains('password-wrapper')) return;
                
                const wrapper = document.createElement('div');
                wrapper.className = 'password-wrapper';
                
                input.parentNode.insertBefore(wrapper, input);
                wrapper.appendChild(input);
                
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'password-toggle-btn';
                btn.innerHTML = `
                    <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <svg class="eye-off-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                `;
                btn.style.cssText = 'background:none;border:none;cursor:pointer;padding:4px 8px;display:flex;align-items:center;justify-content:center;';
                
                btn.addEventListener('click', function() {
                    if (input.type === 'password') {
                        input.type = 'text';
                        btn.querySelector('.eye-icon').style.display = 'none';
                        btn.querySelector('.eye-off-icon').style.display = 'block';
                    } else {
                        input.type = 'password';
                        btn.querySelector('.eye-icon').style.display = 'block';
                        btn.querySelector('.eye-off-icon').style.display = 'none';
                    }
                });
                
                wrapper.appendChild(btn);
                console.log('✅ Toggle agregado');
            });
        };
        
        agregarToggle();
        
        const observer = new MutationObserver(() => {
            agregarToggle();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
};

window.InputConfig = InputConfig;

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
        
        if (window.InputConfig) {
            setTimeout(() => {
                InputConfig.configurarPasswordToggle();
            }, 500);
        }
        
        document.querySelectorAll('.modal').forEach(modal => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        if (modal.style.display !== 'none' && window.InputConfig) {
                            setTimeout(() => {
                                InputConfig.configurarPasswordToggle();
                            }, 100);
                        }
                    }
                });
            });
            observer.observe(modal, { attributes: true });
        });
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
            
            if (this.intervaloActualizacion) {
                clearInterval(this.intervaloActualizacion);
            }
            
            this.intervaloActualizacion = setInterval(() => {
                this.actualizar();
            }, 2000);
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
        
        SonidoAlerta.reproducir(3);
        
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
        
        document.body.style.overflow = 'hidden';
        document.body.appendChild(notificacion);
        
        setTimeout(() => {
            if (notificacion.parentElement) {
                notificacion.remove();
                document.body.style.overflow = '';
            }
        }, 15000);
    }
};

// ============================================
// INICIALIZACIÓN CON RECARGA AUTO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Sistema de Turnos cargado - Versión con Recarga Auto');
    
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
            InputConfig.configurarFechaCita();
            InputConfig.configurarMayusculas();
            InputConfig.configurarPasswordToggle();
            InputConfig.configurarTelefono();
            document.getElementById('formSolicitarTurno').addEventListener('submit', UsuarioHandlers.solicitarTurno);
            RenderUsuario.todo();
            
            const btnCancelarEspera = document.getElementById('btnCancelarEspera');
            if (btnCancelarEspera) {
                btnCancelarEspera.addEventListener('click', UsuarioHandlers.cancelarTurno);
            }
            
            const miTurno = LocalStorage.obtenerMiTurno();
            if (miTurno) {
                const enCola = AppState.turnos.find(t => t.numero === miTurno.numero);
                const siendoAtendido = AppState.turnoActual && AppState.turnoActual.numero === miTurno.numero;
                
                if (enCola || siendoAtendido) {
                    ModoEspera.activar(miTurno);
                    
                    if (siendoAtendido) {
                        ModoEspera.mostrarNotificacionLlamado();
                        SonidoAlerta.reproducir(3);
                    }
                } else {
                    console.log('Turno guardado ya no existe en el sistema, limpiando...');
                    LocalStorage.eliminarMiTurno();
                }
            }
            
            if (window.supabaseClient) {
                console.log('Configurando suscripción a tiempo real para usuario...');
                AppState.subscription = RenderUsuario.suscribirCambios();
                
                setInterval(async () => {
                    if (typeof ModoEspera !== 'undefined' && ModoEspera.activo) {
                        try {
                            await Turnos.cargarTurnos();
                            await RenderUsuario.todo();
                            ModoEspera.actualizar();
                        } catch (e) {
                            console.error('Error en actualización:', e);
                        }
                    }
                }, 3000);
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
            
            InputConfig.configurarMayusculas();
            InputConfig.configurarPasswordToggle();
            
            const btnVerMes = document.getElementById('btnVerMes');
            if (btnVerMes) btnVerMes.addEventListener('click', RenderAdmin.verEstadisticasMes);
            
            const btnGenerarCertificado = document.getElementById('btnGenerarCertificado');
            if (btnGenerarCertificado) {
                btnGenerarCertificado.addEventListener('click', async () => {
                    const mesSelect = document.getElementById('mesSelect');
                    if (mesSelect && mesSelect.value) {
                        await GenerarCertificado.generar(mesSelect.value);
                    } else {
                        const mesActual = new Date();
                        const mesString = mesActual.getFullYear() + '-' + (mesActual.getMonth() + 1);
                        await GenerarCertificado.generar(mesString);
                    }
                });
            }
            
            console.log('Renderizando admin...');
            await RenderAdmin.todo();
            await RenderAdmin.cargarMesesDisponibles();
            
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
                
                window.supabaseClient.channel('notificacion_admin')
                    .on('broadcast', { event: 'salida_autorizada' }, (payload) => {
                        console.log('Salida autorizada:', payload);
                        const numero = payload.payload?.numero || '---';
                        const nombre = payload.payload?.nombre || payload.payload?.nombreEmpresa || 'Proveedor';
                        Utils.mostrarNotificacion(`Salida autorizada para turno ${numero} - ${nombre}`, 'success');
                    })
                    .subscribe();
            } else {
                console.warn('Supabase no disponible - verifica tu conexión y credenciales');
            }
            
            verificarSalidaAutorizada();
        }
        
        function verificarSalidaAutorizada() {
            setInterval(() => {
                const datos = localStorage.getItem('salidaAutorizada');
                if (datos) {
                    try {
                        const data = JSON.parse(datos);
                        const ahora = Date.now();
                        const hace10seg = 10 * 1000;
                        
                        if (ahora - data.timestamp < hace10seg) {
                            const numeroMostrar = data.numero || '---';
                            const nombreMostrar = data.nombre || data.nombreEmpresa || 'Proveedor';
                            Utils.mostrarNotificacion(`Salida autorizada para turno ${numeroMostrar} - ${nombreMostrar}`, 'success');
                            localStorage.removeItem('salidaAutorizada');
                        }
                    } catch (e) {
                        console.error('Error al leer salidaAutorizada:', e);
                    }
                }
            }, 2000);
        }
        
        // Página de despachador (despachador.html)
        const btnAutorizarSalida = document.getElementById('btnAutorizarSalida');
        if (btnAutorizarSalida) {
            console.log('Configurando página de despachador...');
            
            btnAutorizarSalida.addEventListener('click', DespachadorHandlers.autorizarSalida);
            
            console.log('Renderizando despachador...');
            await RenderAdmin.todo();
            
            if (window.supabaseClient) {
                console.log('Configurando suscripción a tiempo real para despachador...');
                AppState.subscription = SupabaseDB.suscribirCambiosTurnos(async (payload) => {
                    console.log('Actualización en tiempo real recibida (despachador):', payload);
                    try {
                        await Turnos.cargarTurnos();
                        await RenderAdmin.todo();
                        
                        actualizarBotonAutorizar();
                    } catch (error) {
                        console.error('Error al procesar actualización en tiempo real:', error);
                    }
                });
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
window.RenderAdmin = RenderAdmin;
window.ModoEspera = ModoEspera;
window.SonidoAlerta = SonidoAlerta;
window.AppState = AppState;

// ============================================
// HANDLERS DESPACHADOR
// ============================================

const DespachadorHandlers = {
    async autorizarSalida(turnoData = null) {
        const turno = turnoData || AppState.turnoActual;
        
        if (!turno) {
            Utils.mostrarNotificacion('No hay proveedor esperando', 'error');
            return;
        }
        
        try {
            if (window.supabaseClient) {
                try {
                    const { data: historialActual, error: errorGet } = await window.supabaseClient
                        .from('historial_turnos')
                        .select('id')
                        .eq('numero', turno.numero)
                        .gte('fecha', new Date().toISOString().split('T')[0] + 'T00:00:00')
                        .single();
                    
                    if (historialActual && !errorGet) {
                        const { error: errorUpdate } = await window.supabaseClient
                            .from('historial_turnos')
                            .update({ autorizado_salida: true })
                            .eq('id', historialActual.id);
                        
                        if (errorUpdate) {
                            console.warn('No se pudo actualizar historial:', errorUpdate.message);
                        }
                    } else {
                        const { error } = await window.supabaseClient
                            .from('historial_turnos')
                            .insert([{
                                numero: turno.numero,
                                nombre_empresa: turno.nombre || turno.nombreEmpresa || turno.nombre,
                                nit: turno.nit || '',
                                motivo: turno.motivo || '',
                                hora_solicitud: turno.horaSolicitud || '',
                                hora_llamada: turno.horaLlamada || null,
                                hora_finalizacion: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
                                estado: 'completado',
                                destino: turno.destino || null,
                                num_factura: turno.numFactura || null,
                                tipo_vehiculo: turno.tipoVehiculo || null,
                                bultos: turno.bultos ? parseInt(turno.bultos) : null,
                                peso: turno.peso || null,
                                responsable: turno.responsable || null,
                                contacto: turno.contacto || null,
                                telefono: turno.telefono || null,
                                servicio: turno.servicio || null,
                                autorizado_salida: true,
                                fecha: new Date().toISOString()
                            }]);
                        
                        if (error) {
                            console.warn('No se pudo guardar en historial_turnos:', error.message);
                        }
                    }
                } catch (e) {
                    console.warn('Error al guardar en historial:', e.message);
                }
            }
            
            localStorage.setItem('salidaAutorizada', JSON.stringify({
                numero: turno.numero,
                nombre: turno.nombre || turno.nombreEmpresa || turno.nombre,
                nit: turno.nit || '',
                timestamp: Date.now()
            }));
            localStorage.removeItem('proveedorListoSalir');
            
            const numeroMostrar = turno.numero || '---';
            const nombreMostrar = turno.nombre || turno.nombreEmpresa || turno.nombre || 'Proveedor';
            Utils.mostrarNotificacion(`✅ Salida autorizada para turno ${numeroMostrar} - ${nombreMostrar}`, 'success');
            
            const btnAutorizar = document.getElementById('btnAutorizarSalida');
            if (btnAutorizar) {
                btnAutorizar.disabled = true;
                btnAutorizar.textContent = 'Salida Autorizada';
            }
            
            setTimeout(() => {
                const turnoListoDiv = document.getElementById('turnoListoSalir');
                const infoDespachoDiv = document.getElementById('infoDespachoActual');
                if (turnoListoDiv) {
                    turnoListoDiv.innerHTML = '<div class="esperando-mensaje">Esperando que admin complete un turno...</div>';
                }
                if (infoDespachoDiv) {
                    infoDespachoDiv.innerHTML = '<div class="despacho-empty">No hay proveedor esperando autorización</div>';
                }
                if (btnAutorizar) {
                    btnAutorizar.disabled = true;
                    btnAutorizar.textContent = 'Autorizar Salida';
                }
            }, 3000);
            
        } catch (error) {
            console.error('Error al autorizar salida:', error);
            localStorage.setItem('salidaAutorizada', JSON.stringify({
                numero: turno?.numero || '---',
                nombre: turno?.nombre || turno?.nombreEmpresa || 'Proveedor',
                timestamp: Date.now()
            }));
            localStorage.removeItem('proveedorListoSalir');
            Utils.mostrarNotificacion(`✅ Salida autorizada`, 'success');
        }
    }
};

window.DespachadorHandlers = DespachadorHandlers;

function actualizarBotonAutorizar() {
    const btnAutorizar = document.getElementById('btnAutorizarSalida');
    if (!btnAutorizar) return;
    
    if (window.AppState && window.AppState.turnoActual) {
        btnAutorizar.disabled = window.AppState.turnoActual.autorizadoSalida === true;
        btnAutorizar.textContent = window.AppState.turnoActual.autorizadoSalida ? 'Salida Autorizada' : 'Autorizar Salida';
    } else {
        btnAutorizar.disabled = true;
        btnAutorizar.textContent = 'Autorizar Salida';
    }
}

window.actualizarBotonAutorizar = actualizarBotonAutorizar;

// ============================================
// GENERAR CERTIFICADO MENSUAL
// ============================================

const GenerarCertificado = {
    async generar(mesString) {
        console.log('=== Generando certificado para:', mesString);
        
        if (!window.supabaseClient) {
            console.error('❌ No hay conexión a Supabase');
            Utils.mostrarNotificacion('No hay conexión a la base de datos', 'error');
            return;
        }

        if (!mesString || typeof mesString !== 'string') {
            console.error('❌ Mes inválido:', mesString);
            Utils.mostrarNotificacion('Seleccione un mes válido', 'error');
            return;
        }
        
        const partes = mesString.split('-');
        if (partes.length !== 2) {
            console.error('❌ Formato de mes inválido:', mesString);
            Utils.mostrarNotificacion('Formato de mes inválido', 'error');
            return;
        }
        
        const [anio, mes] = partes.map(Number);
        
        if (isNaN(anio) || isNaN(mes) || mes < 1 || mes > 12) {
            console.error('❌ Año o mes inválido:', anio, mes);
            Utils.mostrarNotificacion('Año o mes inválido', 'error');
            return;
        }
        
        console.log('Consultando para:', anio, 'mes:', mes);
        
        const inicioMes = `${anio}-${mes.toString().padStart(2, '0')}-01`;
        const finMes = mes === 12 
            ? `${anio + 1}-01-01` 
            : `${anio}-${(mes + 1).toString().padStart(2, '0')}-01`;

        try {
            const { data: historial, error } = await window.supabaseClient
                .from('historial_turnos')
                .select('*')
                .gte('fecha', inicioMes)
                .lt('fecha', finMes)
                .order('fecha', { ascending: true });

            if (error) throw error;

            if (!historial || historial.length === 0) {
                Utils.mostrarNotificacion('No hay datos para el mes seleccionado', 'error');
                return;
            }

            const nombreMes = new Date(anio, mes - 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
            const nombreMesMayus = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

            // Totales
            const totalVehiculos = historial.length;
            const totalPeso = historial.reduce((sum, h) => sum + (parseFloat(h.peso) || 0), 0);
            const totalBultos = historial.reduce((sum, h) => sum + (parseInt(h.bultos) || 0), 0);
            const vehiculosConFactura = historial.filter(h => h.num_factura).length;
            const vehiculosConSalida = historial.filter(h => h.autorizado_salida).length;
            
            // Conteo por tipo de vehiculo
            const tipoVehiculoCount = {};
            // Conteo por destino
            const destinoCount = {};
            // Empresas unicas
            const empresaSet = new Set();
            // Servicios
            const servicioCount = {};
            // Dias operativos
            const diasOperativos = new Set();

            historial.forEach(h => {
                if (h.tipo_vehiculo) {
                    tipoVehiculoCount[h.tipo_vehiculo] = (tipoVehiculoCount[h.tipo_vehiculo] || 0) + 1;
                }
                if (h.destino) {
                    destinoCount[h.destino] = (destinoCount[h.destino] || 0) + 1;
                }
                if (h.nombre_empresa) {
                    empresaSet.add(h.nombre_empresa);
                }
                if (h.servicio) {
                    servicioCount[h.servicio] = (servicioCount[h.servicio] || 0) + 1;
                }
                if (h.fecha) {
                    diasOperativos.add(h.fecha.split('T')[0]);
                }
            });

            // Agrupar por dia
            const diasAgrupados = {};
            historial.forEach(h => {
                const fecha = new Date(h.fecha).toLocaleDateString('es-CO');
                if (!diasAgrupados[fecha]) {
                    diasAgrupados[fecha] = { turnos: 0, peso: 0, bultos: 0, facturas: 0, salidas: 0 };
                }
                diasAgrupados[fecha].turnos++;
                diasAgrupados[fecha].peso += parseFloat(h.peso) || 0;
                diasAgrupados[fecha].bultos += parseInt(h.bultos) || 0;
                if (h.num_factura) diasAgrupados[fecha].facturas++;
                if (h.autorizado_salida) diasAgrupados[fecha].salidas++;
            });

            // Promedio diario
            const numDias = Object.keys(diasAgrupados).length;
            const promedioTurnosDia = numDias > 0 ? (totalVehiculos / numDias).toFixed(1) : 0;
            const promedioPesoDia = numDias > 0 ? (totalPeso / numDias).toFixed(0) : 0;
            const promedioBultosDia = numDias > 0 ? (totalBultos / numDias).toFixed(1) : 0;

            // Primer y ultimo dia
            const fechas = Object.keys(diasAgrupados).sort();
            const primerDia = fechas[0] || 'N/A';
            const ultimoDia = fechas[fechas.length - 1] || 'N/A';

            let contenidoHTML = `
    <div class="certificado-container" style="font-family: Arial, sans-serif; padding: 20px; max-width: 100%;">
        <h1 style="text-align: center; color: #1e3a8a; font-size: 22px; margin-bottom: 5px;">CERTIFICADO MENSUAL DE DESPACHOS</h1>
        <p class="subtitle" style="text-align: center; color: #666; margin-bottom: 15px;">Periodo: ${nombreMesMayus.toUpperCase()}</p>
        
        <div class="empresa-info" style="text-align: center; margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 8px;">
            <p><strong>SI ENSAMBLES Y PLASTICOS INDUSTRIALES S.A.S.</strong></p>
            <p>NIT: 901.378.558-5</p>
            <p>Dirección: Zona Franca Bodegas SIE 240, 251 y SIP 221</p>
        </div>
        
        <div class="section" style="margin-bottom: 15px;">
            <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; font-size: 14px; margin: 10px 0;">RESUMEN EJECUTIVO</h2>
            <div class="summary-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0;">
                <div class="summary-item" style="background: #eff6ff; padding: 10px; text-align: center; border: 1px solid #bfdbfe; border-radius: 6px;">
                    <div class="summary-number" style="font-size: 18px; font-weight: bold; color: #1e3a8a;">${totalVehiculos}</div>
                    <div class="summary-label" style="font-size: 10px; color: #64748b;">Vehiculos</div>
                </div>
                <div class="summary-item" style="background: #eff6ff; padding: 10px; text-align: center; border: 1px solid #bfdbfe; border-radius: 6px;">
                    <div class="summary-number" style="font-size: 18px; font-weight: bold; color: #1e3a8a;">${totalPeso.toLocaleString('es-CO')}</div>
                    <div class="summary-label" style="font-size: 10px; color: #64748b;">Kg</div>
                </div>
                <div class="summary-item" style="background: #eff6ff; padding: 10px; text-align: center; border: 1px solid #bfdbfe; border-radius: 6px;">
                    <div class="summary-number" style="font-size: 18px; font-weight: bold; color: #1e3a8a;">${totalBultos.toLocaleString('es-CO')}</div>
                    <div class="summary-label" style="font-size: 10px; color: #64748b;">Bultos</div>
                </div>
                <div class="summary-item" style="background: #eff6ff; padding: 10px; text-align: center; border: 1px solid #bfdbfe; border-radius: 6px;">
                    <div class="summary-number" style="font-size: 18px; font-weight: bold; color: #1e3a8a;">${diasOperativos.size}</div>
                    <div class="summary-label" style="font-size: 10px; color: #64748b;">Dias</div>
                </div>
            </div>
        </div>
        
        <div class="section" style="margin-bottom: 15px;">
            <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; font-size: 14px; margin: 10px 0;">INFORMACION ADICIONAL</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr><td style="border: 1px solid #ccc; padding: 6px;"><strong>Proveedores:</strong></td><td style="border: 1px solid #ccc; padding: 6px;">${empresaSet.size}</td></tr>
                <tr><td style="border: 1px solid #ccc; padding: 6px;"><strong>Con Factura:</strong></td><td style="border: 1px solid #ccc; padding: 6px;">${vehiculosConFactura}</td></tr>
                <tr><td style="border: 1px solid #ccc; padding: 6px;"><strong>Salidas OK:</strong></td><td style="border: 1px solid #ccc; padding: 6px;">${vehiculosConSalida}</td></tr>
            </table>
        </div>
        
        <div class="section" style="margin-bottom: 15px;">
            <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; font-size: 14px; margin: 10px 0;">TIPO DE VEHICULOS</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr style="background: #f1f5f9;"><th style="border: 1px solid #ccc; padding: 6px;">Tipo</th><th style="border: 1px solid #ccc; padding: 6px;">Cantidad</th><th style="border: 1px solid #ccc; padding: 6px;">%</th></tr>
`;

            Object.entries(tipoVehiculoCount).forEach(([tipo, count]) => {
                const porcentaje = ((count / totalVehiculos) * 100).toFixed(1);
                contenidoHTML += `<tr><td style="border:1px solid #ccc;padding:6px;">${tipo}</td><td style="border:1px solid #ccc;padding:6px;">${count}</td><td style="border:1px solid #ccc;padding:6px;">${porcentaje}%</td></tr>`;
            });

            contenidoHTML += `
            </table>
        </div>
        
        <div class="section" style="margin-bottom: 15px;">
            <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; font-size: 14px; margin: 10px 0;">DESTINOS</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr style="background: #f1f5f9;"><th style="border:1px solid #ccc;padding:6px;">Destino</th><th style="border:1px solid #ccc;padding:6px;">Cantidad</th><th style="border:1px solid #ccc;padding:6px;">%</th></tr>
`;

            const destinoLabel = { 'ensambles': 'SI ENSAMBLES', 'plasticos': 'SI PLASTICOS', 'ambos': 'AMBOS' };
            Object.entries(destinoCount).forEach(([destino, count]) => {
                const porcentaje = ((count / totalVehiculos) * 100).toFixed(1);
                contenidoHTML += `<tr><td style="border:1px solid #ccc;padding:6px;">${destinoLabel[destino] || destino}</td><td style="border:1px solid #ccc;padding:6px;">${count}</td><td style="border:1px solid #ccc;padding:6px;">${porcentaje}%</td></tr>`;
            });

            contenidoHTML += `
            </table>
        </div>
        
        <div class="section" style="margin-bottom: 15px;">
            <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; font-size: 14px; margin: 10px 0;">SERVICIOS</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr style="background: #f1f5f9;"><th style="border:1px solid #ccc;padding:6px;">Tipo de Servicio</th><th style="border:1px solid #ccc;padding:6px;">Cantidad</th></tr>
`;

            const servicioLabel = { 'entrega': 'Entrega de Mercancia', 'servicio': 'Servicio Tecnico', 'reunion': 'Reunion', 'otro': 'Otro' };
            Object.entries(servicioCount).forEach(([servicio, count]) => {
                contenidoHTML += `<tr><td style="border:1px solid #ccc;padding:6px;">${servicioLabel[servicio] || servicio}</td><td style="border:1px solid #ccc;padding:6px;">${count}</td></tr>`;
            });

            contenidoHTML += `
            </table>
        </div>
        
        <div class="section" style="margin-bottom: 15px;">
            <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; font-size: 14px; margin: 10px 0;">DETALLE DIARIO</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr style="background: #f1f5f9;"><th style="border:1px solid #ccc;padding:6px;">Fecha</th><th style="border:1px solid #ccc;padding:6px;">Turnos</th><th style="border:1px solid #ccc;padding:6px;">Peso</th><th style="border:1px solid #ccc;padding:6px;">Bultos</th><th style="border:1px solid #ccc;padding:6px;">Facturas</th><th style="border:1px solid #ccc;padding:6px;">Salidas</th></tr>
`;

            Object.entries(diasAgrupados).forEach(([fecha, datos]) => {
                contenidoHTML += `<tr><td style="border:1px solid #ccc;padding:6px;">${fecha}</td><td style="border:1px solid #ccc;padding:6px;">${datos.turnos}</td><td style="border:1px solid #ccc;padding:6px;">${datos.peso.toLocaleString('es-CO')}</td><td style="border:1px solid #ccc;padding:6px;">${datos.bultos}</td><td style="border:1px solid #ccc;padding:6px;">${datos.facturas}</td><td style="border:1px solid #ccc;padding:6px;">${datos.salidas}</td></tr>`;
            });

            const fechaActual = new Date().toLocaleDateString('es-CO', { 
                year: 'numeric', month: 'long', day: 'numeric' 
            });

            contenidoHTML += `
            </table>
        </div>
        
        <div class="section" style="margin-bottom: 15px;">
            <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; font-size: 14px; margin: 10px 0;">LISTADO DE PROVEEDORES</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <tr style="background: #f1f5f9;"><th style="border:1px solid #ccc;padding:4px;">#</th><th style="border:1px solid #ccc;padding:4px;">Fecha</th><th style="border:1px solid #ccc;padding:4px;">Turno</th><th style="border:1px solid #ccc;padding:4px;">Empresa</th><th style="border:1px solid #ccc;padding:4px;">Placa</th><th style="border:1px solid #ccc;padding:4px;">Tipo</th><th style="border:1px solid #ccc;padding:4px;">Peso</th></tr>
`;

            historial.forEach((h, index) => {
                contenidoHTML += `<tr>
                    <td style="border:1px solid #ccc;padding:4px;">${index + 1}</td>
                    <td style="border:1px solid #ccc;padding:4px;">${new Date(h.fecha).toLocaleDateString('es-CO')}</td>
                    <td style="border:1px solid #ccc;padding:4px;">${h.numero}</td>
                    <td style="border:1px solid #ccc;padding:4px;">${h.nombre_empresa || 'N/A'}</td>
                    <td style="border:1px solid #ccc;padding:4px;">${h.nit || 'N/A'}</td>
                    <td style="border:1px solid #ccc;padding:4px;">${h.tipo_vehiculo || 'N/A'}</td>
                    <td style="border:1px solid #ccc;padding:4px;">${h.peso || '0'}</td>
                </tr>`;
            });

            const fechaHora = new Date().toLocaleString('es-CO');

            contenidoHTML += `
            </table>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #666;">
            <p>Certificado generado el ${fechaHora}</p>
            <p>Sistema de Turnos SI-3</p>
        </div>
    </div>`;

            console.log('Generando certificado...');
            
            const modalCertificado = document.getElementById('modalCertificado');
            const contenidoCertificado = document.getElementById('contenidoCertificado');
            
            if (!modalCertificado || !contenidoCertificado) {
                console.error('❌ No se encontró el modal del certificado');
                Utils.mostrarNotificacion('Error: Modal de certificado no encontrado', 'error');
                return;
            }
            
            contenidoCertificado.innerHTML = contenidoHTML;
            modalCertificado.style.display = 'flex';
            
            const btnCerrarCertificado = document.getElementById('btnCerrarCertificado');
            if (btnCerrarCertificado) {
                btnCerrarCertificado.onclick = () => {
                    modalCertificado.style.display = 'none';
                };
            }
            
            const btnImprimirCertificado = document.getElementById('btnImprimirCertificado');
            if (btnImprimirCertificado) {
                btnImprimirCertificado.onclick = () => {
                    try {
                        const printWindow = window.open('', '_blank');
                        if (!printWindow) {
                            Utils.mostrarNotificacion('Bloqueador detectado. Permita ventanas emergentes.', 'error');
                            return;
                        }
                        printWindow.document.write(`
                            <!DOCTYPE html>
                            <html lang="es">
                            <head>
                                <meta charset="UTF-8">
                                <title>Certificado - ${nombreMesMayus}</title>
                                <style>
                                    * { box-sizing: border-box; }
                                    body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
                                    h1 { text-align: center; color: #1e3a8a; font-size: 24px; }
                                    h2 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; font-size: 14px; margin-top: 15px; }
                                    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
                                    th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                                    th { background: #f1f5f9; }
                                    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0; }
                                    .summary-item { background: #eff6ff; padding: 10px; text-align: center; }
                                    .summary-number { font-size: 18px; font-weight: bold; color: #1e3a8a; }
                                    .summary-label { font-size: 10px; }
                                    @media print { body { padding: 10px; } }
                                </style>
                            </head>
                            <body>${contenidoHTML}</body>
                            </html>
                        `);
                        printWindow.document.close();
                        printWindow.focus();
                        setTimeout(() => printWindow.print(), 300);
                    } catch (e) {
                        console.error('Error al imprimir:', e);
                        Utils.mostrarNotificacion('Error al imprimir: ' + e.message, 'error');
                    }
                };
            }
            
            Utils.mostrarNotificacion('Certificado generado correctamente', 'success');

        } catch (error) {
            console.error('Error al generar certificado:', error);
            Utils.mostrarNotificacion('Error al generar certificado: ' + error.message, 'error');
        }
    }
};

window.GenerarCertificado = GenerarCertificado;

                        
