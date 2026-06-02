// ============================================
// SISTEMA DE TURNOS PROFESIONAL - ESTILO EPS
// VERSIÓN CON RECARGA AUTO Y ELIMINAR PROVEEDOR CORREGIDO
// ============================================

window.getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

window.getLocalISOString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString();
};

const getLocalDate = window.getLocalDate;
const getLocalISOString = window.getLocalISOString;

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
    contadorTurnos: 0,
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
                
                ganancia.gain.setValueAtTime(0.5, this.contexto.currentTime);
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
    setLoading(loading) {
        const btn = document.getElementById('btnSolicitar');
        if (btn) {
            btn.disabled = loading;
            btn.textContent = loading ? 'Solicitando...' : 'Solicitar Turno';
        }
    },

    mostrarNotificacion(mensaje, tipo = 'info', requireAccept = false) {
        const notificacion = document.createElement('div');
        notificacion.className = 'notificacion';

        const iconos = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };

        let contenido = `
            <span class="notif-icon">${iconos[tipo] || 'ℹ'}</span>
            <span class="notificacion-mensaje">${mensaje}</span>
        `;

        if (requireAccept) {
            contenido += `<button class="notificacion-aceptar">Aceptar</button>`;
        } else {
            contenido += `<button class="notificacion-cerrar">&times;</button>`;
        }

        notificacion.innerHTML = contenido;

        Object.assign(notificacion.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '18px 24px',
            borderRadius: '12px',
            backgroundColor: tipo === 'success' ? '#059669' : tipo === 'error' ? '#dc2626' : '#2563eb',
            color: 'white',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            zIndex: '9999',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            maxWidth: '420px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            animation: 'notifSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: 'translateX(0)'
        });

        document.body.appendChild(notificacion);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes notifSlideIn {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .notif-icon {
                font-size: 18px;
                width: 28px;
                height: 28px;
                background: rgba(255,255,255,0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
        `;
        document.head.appendChild(style);

        if (requireAccept) {
            const btnAceptar = notificacion.querySelector('.notificacion-aceptar');
            btnAceptar.style.cssText = 'background: white; border: none; color: ' + (tipo === 'success' ? '#059669' : tipo === 'error' ? '#dc2626' : '#2563eb') + '; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; margin-left: auto; font-size: 13px;';
            btnAceptar.onclick = () => {
                notificacion.style.animation = 'notifSlideOut 0.3s ease forwards';
                setTimeout(() => notificacion.remove(), 300);
            };
        } else {
            const btnCerrar = notificacion.querySelector('.notificacion-cerrar');
            btnCerrar.style.cssText = 'background: none; border: none; color: white; font-size: 22px; cursor: pointer; padding: 0; margin-left: auto; opacity: 0.8;';
            btnCerrar.onclick = () => {
                notificacion.style.animation = 'notifSlideOut 0.3s ease forwards';
                setTimeout(() => notificacion.remove(), 300);
            };

            const styleOut = document.createElement('style');
            styleOut.textContent = `
                @keyframes notifSlideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(120%); opacity: 0; }
                }
            `;
            document.head.appendChild(styleOut);

            setTimeout(() => {
                if (notificacion.parentNode) {
                    notificacion.style.animation = 'notifFadeOut 0.4s ease forwards';
                    setTimeout(() => {
                        if (notificacion.parentNode) notificacion.remove();
                    }, 400);
                }
            }, 4000);

            const styleFade = document.createElement('style');
            styleFade.textContent = `
                @keyframes notifFadeOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(20px); opacity: 0; }
                }
            `;
            document.head.appendChild(styleFade);
        }
    },

    obtenerHoraActual() {
        const ahora = new Date();
        return `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
    },

    // Timeout wrapper para promesas
    withTimeout(promise, ms = 10000) {
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms)
        );
        return Promise.race([promise, timeout]);
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
        if (!hora) return '-';
        try {
            const partes = hora.split(':');
            if (partes.length >= 2) {
                let h = parseInt(partes[0]);
                const min = partes[1];
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12 || 12;
                return `${h}:${min} ${ampm}`;
            }
            return hora;
        } catch (e) {
            return hora;
        }
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

    async incrementarContadorTurnos(signal = null) {
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
            // Timeout interno de 5 segundos
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout Supabase (contador)')), 5000)
            );
            const upsertPromise = window.supabaseClient
                .from('configuracion')
                .upsert({ 
                    clave: 'contador_turnos', 
                    valor: nuevoContador.toString(),
                    descripcion: 'Contador global de turnos',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'clave' })
                .abortSignal(signal);
            
            const { error } = await Promise.race([upsertPromise, timeoutPromise]);
            
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

    async guardarProveedor(proveedor, signal = null) {
        console.log('🔹 SupabaseDB.guardarProveedor llamado con:', proveedor.nit);
        if (!window.supabaseClient) {
            console.error('❌ Supabase no está disponible - usando localStorage');
            return null;
        }
        
        console.log('🔹 Supabase client disponible');
        
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
            
            // Timeout de 5 segundos para cada operación
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout Supabase (proveedor)')), 5000)
            );
            
            if (proveedor.id) {
                console.log('🔹 Actualizando proveedor existente ID:', proveedor.id);
                const updatePromise = window.supabaseClient
                    .from('proveedores')
                    .update(proveedorData)
                    .eq('id', proveedor.id)
                    .select()
                    .single()
                    .abortSignal(signal);
                
                const { data, error } = await Promise.race([updatePromise, timeoutPromise]);
                
                if (error) throw error;
                return this._mapearProveedor(data);
            } else {
                console.log('🔹 Insertando nuevo proveedor NIT:', proveedor.nit);
                const insertPromise = window.supabaseClient
                    .from('proveedores')
                    .insert(proveedorData)
                    .select()
                    .single()
                    .abortSignal(signal);
                
                const { data, error } = await Promise.race([insertPromise, timeoutPromise]);
                
                if (error) {
                    console.log('⚠️ Error en insert, código:', error.code, 'mensaje:', error.message);
                    if (error.code === '23505') {
                        console.log('🔹 Duplicado, actualizando por NIT...');
                        const updatePromise2 = window.supabaseClient
                            .from('proveedores')
                            .update(proveedorData)
                            .eq('nit', proveedor.nit)
                            .select()
                            .single()
                            .abortSignal(signal);
                        
                        const { data: updateData, error: updateError } = await Promise.race([updatePromise2, timeoutPromise]);
                        
                        if (updateError) throw updateError;
                        return this._mapearProveedor(updateData);
                    }
                    throw error;
                }
                
                return this._mapearProveedor(data);
            }
        } catch (error) {
            console.error('❌ Error al guardar proveedor:', error);
            console.log('🔄 Fallback a localStorage para proveedor');
            return null; // Señal para usar fallback
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

    async guardarTurno(turno, signal = null) {
        console.log('🔹 SupabaseDB.guardarTurno llamado. Número:', turno.numero);
        console.log('🔹 Signal:', !!signal);
        
        if (!window.supabaseClient) {
            console.error('❌ Supabase no está disponible - guardando en localStorage');
            turno.id = Date.now();
            AppState.turnos.push(turno);
            LocalStorage.guardarTurnos(AppState.turnos);
            return turno;
        }
        
        console.log('🔹 Supabase client disponible, procediendo...');
        
        try {
            const turnoData = {
                numero: turno.numero,
                nombre_empresa: turno.nombreEmpresa,
                nit: turno.nit,
                motivo: turno.motivo || '',
                hora_solicitud: turno.horaSolicitud,
                fecha_solicitud: turno.fechaSolicitud || getLocalISOString(),
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
            
            console.log('📤 Insertando en Supabase:', JSON.stringify(turnoData, null, 2));
            
            // Timeout interno de 5 segundos
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout Supabase (turno)')), 5000)
            );
            
            const insertPromise = window.supabaseClient
                .from('turnos')
                .insert([turnoData])
                .select()
                .single()
                .abortSignal(signal);
            
            const { data, error } = await Promise.race([insertPromise, timeoutPromise]);
            
            if (error) {
                console.error('❌ Error de Supabase:', error);
                console.error('   Código:', error.code);
                console.error('   Mensaje:', error.message);
                throw error;
            }
            
            console.log('✅ Turno guardado exitosamente:', data);
            return this._mapearTurno(data);
        } catch (error) {
            console.error('❌ Error al guardar turno:', error);
            console.log('🔄 Fallback a localStorage para turno');
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

    /**
     * Verifica qué slots de 15 min están ocupados/bloqueados en una fecha
     * Horario laboral: 08:00 a 17:00 (5 PM), intervalos de 15 min
     *
     * Retorna un objeto con tres conjuntos:
     *  - pasados:       slots ya transcurridos HOY (8–5pm, hora < ahora)
     *  - reservados:    slots reservados por cualquier proveedor (BD)
     *  - fueraHorario:  slots antes de 08:00 (fuera de horario laboral)
     *
     * horaExcluida: slot a excluir de todas las categorías (propio turno al editar)
     */
    async verificarDisponibilidadHoraria(fecha, horaExcluida = null) {
        if (!window.supabaseClient || !fecha) {
            return { pasados: [], reservados: [], fueraHorario: [] };
        }

        try {
            const slotsOcupados    = new Set();  // todos los slots bloqueados
            const slotsPasados     = new Set();  // solo por hora ya cumplida
            const slotsReservados  = new Set();  // solo por reserva en BD
            const slotsFuera       = new Set();  // solo fuera de horario

            const hoy   = new Date();
            const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
            const esHoy = fecha === hoyStr;
            const horaAhora = `${String(hoy.getHours()).padStart(2, '0')}:${String(hoy.getMinutes()).padStart(2, '0')}`;

            // ── 1. Obtener turnos reservados en Supabase ────────────────────────
            const fechaInicio = fecha + 'T08:00:00';
            const fechaFin    = fecha + 'T17:00:00';

            const { data, error } = await window.supabaseClient
                .from('turnos')
                .select('fecha_cita, estado')
                .gte('fecha_cita', fechaInicio)
                .lte('fecha_cita', fechaFin)
                .in('estado', ['espera', 'citado', 'atendiendo', 'llegado']);

            if (error) throw error;

            data?.forEach(turno => {
                if (!turno.fecha_cita) return;
                const horaTurno = turno.fecha_cita.split('T')[1]?.slice(0, 5);
                if (!horaTurno) return;
                // Excluir el propio turno al editar
                if (horaExcluida && horaTurno === horaExcluida) return;

                slotsOcupados.add(horaTurno);
                slotsReservados.add(horaTurno);
            });

            // ── 2. Horarios que ya pasaron HOY ──────────────────────────────────
            if (esHoy) {
                this._generarSlots(8, 16, [0, 15, 30, 45]).forEach(slot => {
                    if (slot <= horaAhora && slot !== horaExcluida) {
                        slotsOcupados.add(slot);
                        // Solo marcar como 'pasado' si no está también reservado por BD
                        if (!slotsReservados.has(slot)) {
                            slotsPasados.add(slot);
                        }
                    }
                });
                // 17:00
                if ('17:00' <= horaAhora && '17:00' !== horaExcluida) {
                    slotsOcupados.add('17:00');
                    if (!slotsReservados.has('17:00')) slotsPasados.add('17:00');
                }
            }

            // ── 3. Fuera de horario laboral (< 08:00) ───────────────────────────
            this._generarSlots(0, 7, [0, 15, 30, 45]).forEach(slot => {
                slotsOcupados.add(slot);
                slotsFuera.add(slot);
            });

            return {
                pasados:     Array.from(slotsPasados).sort(),
                reservados:  Array.from(slotsReservados).sort(),
                fueraHorario: Array.from(slotsFuera).sort()
            };
        } catch (error) {
            console.error('Error al verificar disponibilidad:', error);
            return { pasados: [], reservados: [], fueraHorario: [] };
        }
    },

    /**
     * Helper privado: genera slots entre horaInicio y horaFin
     */
    _generarSlots(horaInicio, horaFin, minutos) {
        const slots = [];
        for (let h = horaInicio; h <= horaFin; h++) {
            for (const m of minutos) {
                slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            }
        }
        return slots;
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
                fecha: getLocalISOString()
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

    async cargarHistorial(limite = 100, fecha = null) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return [];
        }
        
        try {
            let query = window.supabaseClient
                .from('historial_turnos')
                .select('*');
            
            if (fecha) {
                const fechaInicio = fecha + 'T00:00:00';
                const fechaFin = fecha + 'T23:59:59';
                query = query.gte('fecha', fechaInicio).lte('fecha', fechaFin);
            }
            
            const { data, error } = await query
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
            const hoy = getLocalDate();
            
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
            const channelName = 'turnos-changes-' + Date.now();
            const channel = window.supabaseClient
                .channel(channelName)
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
                        window.supabaseClient.removeChannel(channel);
                        setTimeout(() => this.suscribirCambiosTurnos(callback), 3000);
                    } else if (status === 'TIMED_OUT') {
                        console.error('⏰ Timeout en canal de turnos, reconectando...');
                        window.supabaseClient.removeChannel(channel);
                        setTimeout(() => this.suscribirCambiosTurnos(callback), 3000);
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
            const channelName = 'historial-changes-' + Date.now();
            const channel = window.supabaseClient
                .channel(channelName)
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
                        console.log('✅ Suscripción a historial activada correctamente');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ Error en canal de historial:', err);
                        window.supabaseClient.removeChannel(channel);
                        setTimeout(() => this.suscribirCambiosHistorial(callback), 3000);
                    } else if (status === 'TIMED_OUT') {
                        console.error('⏰ Timeout en canal de historial, reconectando...');
                        window.supabaseClient.removeChannel(channel);
                        setTimeout(() => this.suscribirCambiosHistorial(callback), 3000);
                    }
                });
            
            return channel;
        } catch (error) {
            console.error('❌ Error al suscribirse a historial:', error);
            return null;
        }
    }
};



// ============================================
// NOTIFICACIONES DE SALIDA (POLLING FALLBACK)
// ============================================

const NotificacionesPolling = {
    _ultimoTimestamp: null,
    
    async iniciar() {
        this._intervalo = setInterval(async () => {
            if (!window.supabaseClient) return;
            try {
                const { data } = await window.supabaseClient
                    .from('notificaciones_salida')
                    .select('*')
                    .eq('leido', false)
                    .order('created_at', { ascending: false })
                    .limit(5);
                
                if (data && data.length > 0) {
                    const ultimo = data[0];
                    if (this._ultimoTimestamp !== ultimo.created_at && window.AppState && window.AppState.turnoActual) {
                        this._ultimoTimestamp = ultimo.created_at;
                        if (window.SonidoAlerta) SonidoAlerta.reproducir(3);
                        Utils.mostrarNotificacion(`Notificación: ${ultimo.mensaje}`, 'warning');
                    }
                }
            } catch(e) {
                console.error('Error en polling notificaciones:', e);
            }
        }, 5000);
    },
    
    detener() {
        if (this._intervalo) clearInterval(this._intervalo);
    }
};

// ============================================
// CONECTIVIDAD GLOBAL
// ============================================

const Conectividad = {
    _canalTurnos: null,
    _canalHistorial: null,
    _canalNotificaciones: null,
    
    async suscribirTodos(callbacks = {}) {
        if (!window.supabaseClient) {
            console.warn('Supabase no disponible para realtime');
            this.iniciarPolling();
            return;
        }
        
        try {
            await this._suscribirTurnos(callbacks.turnos);
            await this._suscribirHistorial(callbacks.historial);
            await this._suscribirNotificaciones(callbacks.notificaciones);
            console.log('✅ Suscripciones realtime activas');
        } catch(e) {
            console.error('Error en suscripciones:', e);
            this.iniciarPolling();
        }
    },
    
    _suscribirTurnos(callback) {
        if (this._canalTurnos) {
            window.supabaseClient.removeChannel(this._canalTurnos);
        }
        this._canalTurnos = window.supabaseClient
            .channel('turnos-global')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'turnos' },
                (payload) => {
                    console.log('🔄 Cambio en turnos:', payload);
                    if (callback) callback(payload);
                    if (window.SonidoAlerta && payload.eventType === 'INSERT') {
                        SonidoAlerta.reproducir(1);
                    }
                }
            )
            .subscribe();
    },
    
    _suscribirHistorial(callback) {
        if (this._canalHistorial) {
            window.supabaseClient.removeChannel(this._canalHistorial);
        }
        this._canalHistorial = window.supabaseClient
            .channel('historial-global')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'historial_turnos' },
                (payload) => {
                    console.log('📝 Nuevo en historial:', payload);
                    if (callback) callback(payload);
                }
            )
            .subscribe();
    },
    
    _suscribirNotificaciones(callback) {
        if (this._canalNotificaciones) {
            window.supabaseClient.removeChannel(this._canalNotificaciones);
        }
        this._canalNotificaciones = window.supabaseClient
            .channel('notificaciones-global')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notificaciones_salida' },
                (payload) => {
                    console.log('🔔 Nueva notificación:', payload);
                    if (callback) callback(payload);
                    if (window.SonidoAlerta) {
                        SonidoAlerta.reproducir(3);
                    }
                    Utils.mostrarNotificacion(payload.new.mensaje, 'warning');
                }
            )
            .subscribe();
    },
    
    iniciarPolling() {
        console.log('🔄 Iniciando polling como fallback...');
        let ultimosIds = new Set();
        
        setInterval(async () => {
            if (!window.supabaseClient) return;
            try {
                const { data } = await window.supabaseClient
                    .from('turnos')
                    .select('id, estado')
                    .in('estado', ['atendiendo', 'llegado']);
                
                if (data) {
                    const idsActuales = new Set(data.map(t => t.id));
                    data.forEach(t => {
                        if (!ultimosIds.has(t.id) && window.AppState && window.AppState.turnoActual && t.estado === 'atendiendo') {
                            console.log('🔔 Turno detectado vía polling:', t.estado);
                        }
                    });
                    ultimosIds = idsActuales;
                }
            } catch(e) {
                console.error('Error polling:', e);
            }
        }, 8000);
    },
    
    desuscribirTodos() {
        if (this._canalTurnos && window.supabaseClient) {
            window.supabaseClient.removeChannel(this._canalTurnos);
            this._canalTurnos = null;
        }
        if (this._canalHistorial && window.supabaseClient) {
            window.supabaseClient.removeChannel(this._canalHistorial);
            this._canalHistorial = null;
        }
        if (this._canalNotificaciones && window.supabaseClient) {
            window.supabaseClient.removeChannel(this._canalNotificaciones);
            this._canalNotificaciones = null;
        }
    }
};

// Exportar
window.NotificacionesPolling = NotificacionesPolling;
window.Conectividad = Conectividad;

// ============================================
// GESTIÓN DE TURNOS
// ============================================

const Turnos = {
    async solicitar(datosProveedor, motivo = '', signal = null) {
        console.log('=== CREANDO TURNO ===');
        console.log('📌 Datos recibidos:', datosProveedor);
        console.log('📌 Signal:', !!signal);
        
        if (!datosProveedor.nit) {
            console.error('❌ Validación fallida: placa requerida');
            throw new Error('La placa es requerida');
        }
        
        const placa = datosProveedor.nit.toUpperCase().trim();
        console.log('📌 Placa:', placa);
        
        if (placa.length !== 6) {
            console.error('❌ Validación fallida: placa longitud incorrecta');
            throw new Error('La placa debe tener exactamente 6 caracteres');
        }
        
        if (!datosProveedor.nombreEmpresa || datosProveedor.nombreEmpresa.trim() === '') {
            console.error('❌ Validación fallida: nombre empresa requerido');
            throw new Error('El nombre de la empresa es requerido');
        }
        
        datosProveedor.nit = placa;
        datosProveedor.nombreEmpresa = datosProveedor.nombreEmpresa.trim();

        // Re-validar disponibilidad justo antes de guardar (previene condiciones de carrera)
        if (datosProveedor.fechaCita) {
            const slotHora  = datosProveedor.fechaCita.split('T')[1]?.slice(0, 5);
            const fechaSola = datosProveedor.fechaCita.split('T')[0];
            if (slotHora && fechaSola && window.supabaseClient) {
                const { reservados } = await SupabaseDB.verificarDisponibilidadHoraria(fechaSola, slotHora);
                if (reservados.includes(slotHora)) {
                    throw new Error(`El horario ${slotHora} ya fue reservado por otro proveedor. Seleccione otro horario.`);
                }
            }
        }

        console.log('📦 Paso 1: Guardando proveedor en Supabase...');
        const proveedorGuardado = await SupabaseDB.guardarProveedor(datosProveedor, signal);
        console.log('✅ Proveedor guardado:', proveedorGuardado);
        
        if (!proveedorGuardado && window.supabaseClient) {
            console.warn('⚠️ Proveedor no guardado en Supabase, continuando...');
        }

        let nuevoContador;
        try {
            console.log('📦 Paso 2: Incrementando contador de turnos...');
            nuevoContador = await SupabaseDB.incrementarContadorTurnos(signal);
            console.log('✅ Contador incrementado:', nuevoContador);
        } catch (error) {
            console.error('❌ Error al incrementar contador:', error);
            AppState.contadorTurnos++;
            nuevoContador = AppState.contadorTurnos;
            LocalStorage.guardarContador(nuevoContador);
        }
        
        // Determinar prefijo según si la fecha es posterior a hoy
        const fechaCitaSola = datosProveedor.fechaCita ? datosProveedor.fechaCita.split('T')[0] : null;
        const hoy = new Date();
        const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        const prefijoTurno = (fechaCitaSola && fechaCitaSola > hoyStr) ? 'C' : 'T';
        const numeroTurno = prefijoTurno + nuevoContador.toString().padStart(3, '0');
        console.log('✅ Número de turno generado:', numeroTurno);
        console.log('📌 Prefijo:', prefijoTurno, '| Fecha cita:', fechaCitaSola, '| Hoy:', hoyStr);
        
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
            fechaSolicitud: getLocalISOString(),
            estado: prefijoTurno === 'C' ? 'citado' : 'espera'
        };

        console.log('📦 Paso 3: Guardando turno en Supabase...');
        const turnoSupabase = await SupabaseDB.guardarTurno(turno, signal);
        console.log('✅ Turno guardado en Supabase:', turnoSupabase);
        
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
                    const turnosEnEspera = todosLosTurnos.filter(t => t.estado === 'espera' || t.estado === 'citado' || t.estado === 'llegado');
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
    },

    async actualizarCitasHoy() {
        const hoy = new Date();
        const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        console.log('🔍 Actualizando citas para hoy:', hoyStr);

        const citasHoy = AppState.turnos.filter(t => t.estado === 'citado' && t.fechaCita && t.fechaCita.startsWith(hoyStr));
        if (citasHoy.length === 0) {
            console.log('No hay citas para hoy');
            return;
        }

        console.log(`✅ ${citasHoy.length} citas encontradas para hoy`);

        for (const cita of citasHoy) {
            console.log(`🔄 Convirtiendo ${cita.numero} a estado 'espera' (mantiene prefijo C)`);

            if (window.supabaseClient) {
                const { error } = await window.supabaseClient
                    .from('turnos')
                    .update({ estado: 'espera' })
                    .eq('id', cita.id);
                if (error) {
                    console.error('Error actualizando cita en Supabase:', error);
                    continue;
                }
            }

            cita.estado = 'espera';
            LocalStorage.guardarTurnos(AppState.turnos);
        }

        console.log('✅ Citas del día convertidas a estado espera');
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

        const hoy = getLocalDate();
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
                        despachoDetail.innerHTML = '';
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

    listaTurnosLlegados() {
        const listaDiv = document.getElementById('listaTurnosLlegados');
        const contadorDiv = document.getElementById('contadorTurnosLlegados');
        const busqueda = document.getElementById('busquedaLlegados')?.value?.toLowerCase() || '';
        
        let turnosLlegados = AppState.turnos.filter(t => t.estado === 'llegado');
        
        if (busqueda) {
            turnosLlegados = turnosLlegados.filter(t => 
                (t.nit && t.nit.toLowerCase().includes(busqueda)) ||
                (t.nombreEmpresa && t.nombreEmpresa.toLowerCase().includes(busqueda)) ||
                (t.numero && t.numero.toLowerCase().includes(busqueda))
            );
        }
        
        if (contadorDiv) contadorDiv.textContent = turnosLlegados.length;
        
        if (!listaDiv) return;

        if (turnosLlegados.length === 0) {
            listaDiv.innerHTML = '<p class="empty-message">No hay turnos confirmados</p>';
        } else {
            listaDiv.innerHTML = turnosLlegados.map(turno => `
                <div class="turn-item turn-item-llegado">
                    <span class="turn-item-number">${turno.numero}</span>
                    <div class="turn-item-info">
                        <div class="turn-item-company">${turno.nombreEmpresa}</div>
                        <div class="turn-item-details">
                            ${turno.nit ? `<span>Placa: ${turno.nit}</span>` : ''}
                            ${turno.contacto ? `<span>Contacto: ${turno.contacto}</span>` : ''}
                            ${turno.telefono ? `<span>Tel: ${turno.telefono}</span>` : ''}
                            ${turno.destino ? `<span>Destino: ${turno.destino}</span>` : ''}
                        </div>
                        <div class="turn-item-time">
                            ${turno.horaSolicitud}${turno.motivo ? ' - ' + turno.motivo : ''}
                        </div>
                    </div>
                </div>
            `).join('');
        }
    },

    listaTurnosEspera() {
        const listaDiv = document.getElementById('listaTurnosEspera');
        const contadorDiv = document.getElementById('contadorTurnosEspera');
        const busqueda = document.getElementById('busquedaEspera')?.value?.toLowerCase() || '';
        
        let turnosNormales = AppState.turnos.filter(t => t.estado === 'espera');
        
        if (busqueda) {
            turnosNormales = turnosNormales.filter(t => 
                (t.nit && t.nit.toLowerCase().includes(busqueda)) ||
                (t.nombreEmpresa && t.nombreEmpresa.toLowerCase().includes(busqueda)) ||
                (t.numero && t.numero.toLowerCase().includes(busqueda))
            );
        }
        
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
                        <div class="turn-item-details">
                            ${turno.nit ? `<span>Placa: ${turno.nit}</span>` : ''}
                            ${turno.contacto ? `<span>Contacto: ${turno.contacto}</span>` : ''}
                            ${turno.telefono ? `<span>Tel: ${turno.telefono}</span>` : ''}
                            ${turno.destino ? `<span>Destino: ${turno.destino}</span>` : ''}
                        </div>
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
        const busqueda = document.getElementById('busquedaCitados')?.value?.toLowerCase() || '';
        
        let turnosCitados = AppState.turnos.filter(t => t.estado === 'citado');
        
        if (busqueda) {
            turnosCitados = turnosCitados.filter(t => 
                (t.nit && t.nit.toLowerCase().includes(busqueda)) ||
                (t.nombreEmpresa && t.nombreEmpresa.toLowerCase().includes(busqueda)) ||
                (t.numero && t.numero.toLowerCase().includes(busqueda))
            );
        }
        
        // Ordenar por fecha de cita
        turnosCitados.sort((a, b) => {
            const fechaA = a.fechaCita || '';
            const fechaB = b.fechaCita || '';
            return fechaA.localeCompare(fechaB);
        });
        
        if (contadorDiv) contadorDiv.textContent = turnosCitados.length;
        
        if (!listaDiv) return;
        
        if (turnosCitados.length === 0) {
            listaDiv.innerHTML = '<p class="empty-message">No hay citas reservadas</p>';
        } else {
            const destinoLabel = { 'ensambles': 'SI ENSAMBLES', 'plasticos': 'SI PLÁSTICOS', 'ambos': 'AMBOS' };
            
            // Agrupar por fecha
            const gruposPorFecha = {};
            turnosCitados.forEach(turno => {
                const fecha = turno.fechaCita ? turno.fechaCita.split('T')[0] : 'Sin fecha';
                if (!gruposPorFecha[fecha]) gruposPorFecha[fecha] = [];
                gruposPorFecha[fecha].push(turno);
            });
            
            let html = '';
            for (const [fecha, turnos] of Object.entries(gruposPorFecha)) {
                const nombreDia = new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                });
                html += `<div class="cited-day-header">${nombreDia}</div>`;
                html += turnos.map(turno => {
                    const horaCita = turno.fechaCita ? (() => {
                        const fechaHora = turno.fechaCita.split('T');
                        if (fechaHora.length >= 2) {
                            const [horas, minSeg] = fechaHora[1].split(':');
                            const h = parseInt(horas);
                            const min = minSeg.split('.')[0];
                            const ampm = h >= 12 ? 'PM' : 'AM';
                            const h12 = h % 12 || 12;
                            return `${h12}:${min} ${ampm}`;
                        }
                        return turno.horaSolicitud;
                    })() : turno.horaSolicitud;
                    return `
                    <div class="turn-item turn-item-citado">
                        <span class="turn-item-number">${turno.numero}</span>
                        <div class="turn-item-info">
                            <div class="turn-item-company">${turno.nombreEmpresa}</div>
                            <div class="turn-item-time">
                                ${horaCita}
                            </div>
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
            listaDiv.innerHTML = html;
        }
    },

    listaTurnosLlegados() {
        const listaDiv = document.getElementById('listaTurnosLlegados');
        const contadorDiv = document.getElementById('contadorTurnosLlegados');
        const busqueda = document.getElementById('busquedaLlegados')?.value?.toLowerCase() || '';
        
        let turnosLlegados = AppState.turnos.filter(t => t.estado === 'llegado');
        
        if (busqueda) {
            turnosLlegados = turnosLlegados.filter(t => 
                (t.nit && t.nit.toLowerCase().includes(busqueda)) ||
                (t.nombreEmpresa && t.nombreEmpresa.toLowerCase().includes(busqueda)) ||
                (t.numero && t.numero.toLowerCase().includes(busqueda))
            );
        }
        
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
                        <div class="turn-item-details">
                            ${turno.nit ? `<span>Placa: ${turno.nit}</span>` : ''}
                            ${turno.contacto ? `<span>Contacto: ${turno.contacto}</span>` : ''}
                            ${turno.telefono ? `<span>Tel: ${turno.telefono}</span>` : ''}
                            ${turno.destino ? `<span>Destino: ${destinoLabel[turno.destino] || turno.destino}</span>` : ''}
                        </div>
                        <div class="turn-item-time">
                            Llegada: ${horaLlegada}
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

        console.log('RenderAdmin.historial llamado');
        
        try {
            const historial = await SupabaseDB.cargarHistorial();
            console.log('Historial cargado:', historial.length, 'registros');
            
            if (historial.length === 0) {
                historialDiv.innerHTML = '<p class="empty-message">No hay historial de turnos</p>';
            } else {
                const destinoLabel = { 'ensambles': 'SI ENSAMBLES', 'plasticos': 'SI PLÁSTICOS', 'ambos': 'AMBOS' };
                historialDiv.innerHTML = `
                    <table class="history-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Empresa</th>
                                <th>Placa</th>
                                <th>Factura</th>
                                <th>Tipo</th>
                                <th>Bultos</th>
                                <th>Peso</th>
                                <th>Responsable</th>
                                <th>Hora Fin</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${historial.map(h => `
                                <tr>
                                    <td><strong>${h.numero}</strong></td>
                                    <td>${h.nombreEmpresa}</td>
                                    <td>${h.nit || '-'}</td>
                                    <td>${h.numFactura || '-'}</td>
                                    <td>${h.tipoVehiculo || '-'}</td>
                                    <td>${h.bultos || '-'}</td>
                                    <td>${h.peso || '-'}</td>
                                    <td>${h.responsable || '-'}</td>
                                    <td>${Utils.formatearHora(h.horaFinalizacion)}</td>
                                    <td>${h.autorizadoSalida ? '<span style="color:#10b981;font-weight:600;">✓ SALIDA OK</span>' : '<span style="color:#f59e0b;">PENDIENTE</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
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
        
        console.log('✅ Iniciando solicitud de turno');
        Utils.setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

        try {
            console.log('📝 Paso 0: Validando formulario...');
            const placaInput = document.getElementById('nit')?.value?.trim().toUpperCase();
            
            if (!placaInput) {
                throw new Error('La placa es requerida');
            }
            
            if (placaInput.length !== 6) {
                throw new Error('La placa debe tener exactamente 6 caracteres');
            }
            
            console.log('✅ Validación OK. Placa:', placaInput);
            
            const destino = document.getElementById('destino')?.value;
            const fechaDateInput = document.getElementById('fechaCitaDate')?.value;
            const slotSeleccionado = document.getElementById('fechaCitaSlot')?.value;

            console.log('📅 Fecha:', fechaDateInput, 'Slot hora:', slotSeleccionado);

            if (!slotSeleccionado) {
                throw new Error('Debe seleccionar una hora de la grilla de horarios');
            }

            // Armar ISO string: "YYYY-MM-DDTHH:MM:00"
            let fechaCitaISO = null;
            if (fechaDateInput && slotSeleccionado) {
                fechaCitaISO = `${fechaDateInput}T${slotSeleccionado}:00`;
            }

            if (!fechaCitaISO) {
                throw new Error('La fecha y hora de la cita son requeridas');
            }

            // Validar que la fecha no sea anterior a hoy (comparación de cadenas YYYY-MM-DD)
            const hoy = new Date();
            const year = hoy.getFullYear();
            const month = String(hoy.getMonth() + 1).padStart(2, '0');
            const day = String(hoy.getDate()).padStart(2, '0');
            const hoyStr = `${year}-${month}-${day}`;
            if (fechaDateInput < hoyStr) {
                throw new Error('La fecha no puede ser anterior a hoy');
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

            console.log('📦 Datos del proveedor:', datosProveedor);

            if (!destino) throw new Error('El destino es requerido');

            if (!datosProveedor.nombreEmpresa) throw new Error('El nombre de la empresa es requerido');

            const motivoInput = document.getElementById('motivoVisita');
            const motivoPersonalizado = motivoInput ? motivoInput.value?.trim() : '';
            
            const motivo = motivoPersonalizado || datosProveedor.servicio;

            console.log('🚀 Llamando a Turnos.solicitar...');
            const turno = await Turnos.solicitar(datosProveedor, motivo, controller.signal);
            console.log('✅ Turno creado:', turno.numero);
            
            LocalStorage.guardarMiTurno(turno);
            
            const modal = document.getElementById('confirmacionModal');
            const modalMiTurno = document.getElementById('miTurno');
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
            // Restaurar valores por defecto de fecha y limpiar slot
            InputConfig.configurarFechaCita();
            InputConfig.resetearSelectorHora();
            const motivoGroup = document.getElementById('motivoGroup');
            if (motivoGroup) motivoGroup.style.display = 'none';
            
            RenderUsuario.todo();
            
        } catch (error) {
            console.error('❌ Error en solicitarTurno:', error);
            console.error('❌ Error name:', error.name);
            console.error('❌ Error message:', error.message);
            
            if (error.name === 'AbortError' || error.message.includes('Timeout') || error.message.includes('Tiempo')) {
                // Si fue timeout, aún podemos tener éxito con localStorage fallback
                console.warn('⚠️ Timeout detectado, verficando si turno se guardó en localStorage...');
                // El turno puede haberse guardado en localStorage por el fallback
                // Intentamos recuperar el último turno de localStorage
                const miTurno = LocalStorage.obtenerMiTurno();
                if (miTurno) {
                    Utils.mostrarNotificacion(`Turno ${miTurno.numero} solicitado (modo sin conexión)`, 'success');
                    if (typeof ModoEspera !== 'undefined') {
                        ModoEspera.activar(miTurno);
                    }
                    e.target.reset();
                    InputConfig.configurarFechaCita();
                    InputConfig.resetearSelectorHora();
                    const motivoGroup = document.getElementById('motivoGroup');
                    if (motivoGroup) motivoGroup.style.display = 'none';
                    RenderUsuario.todo();
                    return;
                } else {
                    Utils.mostrarNotificacion('No se pudo guardar el turno. Intente nuevamente.', 'error');
                }
            } else {
                Utils.mostrarNotificacion(error.message, 'error');
            }
        } finally {
            clearTimeout(timeoutId);
            Utils.setLoading(false);
            console.log('✅ Finally: loading false');
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

        this._prepararLlamada(turno, () => this.mostrarModalDespacho(turno, 'especifico', turnoId));
    },

    _prepararLlamada(turno, onConfirmar) {
        const modalTurnNumber = document.getElementById('modalTurnNumber');
        const modalTurnInfo = document.getElementById('modalTurnInfo');
        if (modalTurnNumber) modalTurnNumber.textContent = turno.numero;
        if (modalTurnInfo) modalTurnInfo.textContent = `${turno.nombreEmpresa}${turno.nit ? ' - ' + turno.nit : ''}`;

        const btnAceptarLlamada = document.querySelector('#turnoModal .btn-primary');
        const _handler = () => {
            document.getElementById('turnoModal').style.display = 'none';
            if (btnAceptarLlamada) btnAceptarLlamada.onclick = null;
            onConfirmar();
        };

        if (btnAceptarLlamada) {
            btnAceptarLlamada.onclick = _handler;
        }

        const turnoModal = document.getElementById('turnoModal');
        if (turnoModal) turnoModal.style.display = 'flex';
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
                infoDespachoDiv.innerHTML = '';
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

        Utils.mostrarNotificacion(`TURNO ${AppState.turnoActual?.numero} LLAMADO`, 'success');
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
            Utils.mostrarNotificacion(`Turno ${turnoNumero} completado`, 'success', true);
            
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
    /**
     * Genera un array de slots de 15 minutos desde 08:00 a 17:00 (5 PM)
     * Cada slot es un string "HH:MM"
     */
    generarSlotsHora() {
        const slots = [];
        // 08:00 hasta 16:45 (15 min antes de 17:00)
        for (let h = 8; h < 17; h++) {
            for (let m of [0, 15, 30, 45]) {
                slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            }
        }
        // Slot final 17:00
        slots.push('17:00');
        return slots;
    },

    /**
     * Renderiza los botones de slots de hora en el contenedor #selectorHora.
     * Usa colores diferentes según el motivo del bloqueo:
     *   - Gris         → hora ya pasó HOY
     *   - Rojo         → slot reservado por otro proveedor (cualquier día)
     *   - Azul sel.    → slot disponible y seleccionado por el usuario
     */
    async renderizarSelectorHora() {
        const contenedor   = document.getElementById('selectorHora');
        const hint         = document.getElementById('horaHint');
        const fechaDateInput = document.getElementById('fechaCitaDate');
        const slotInput    = document.getElementById('fechaCitaSlot');

        if (!contenedor) return;

        const fechaSeleccionada = fechaDateInput?.value;

        if (!fechaSeleccionada) {
            contenedor.innerHTML = '';
            if (hint) hint.textContent = 'Seleccione una fecha para ver horarios (08:00 AM – 05:00 PM)';
            return;
        }

        // Obtener disponibilidad desde Supabase
        let disponibilidad = { pasados: [], reservados: [], fueraHorario: [] };
        if (window.supabaseClient) {
            disponibilidad = await SupabaseDB.verificarDisponibilidadHoraria(
                fechaSeleccionada,
                slotInput?.value || null
            );
        }

        const slots               = this.generarSlotsHora();
        const slotActual          = slotInput?.value || '';
        const { pasados, reservados } = disponibilidad;

        // Actualizar hint informativo
        if (hint) {
            const libres    = slots.filter(s => !pasados.includes(s) && !reservados.includes(s)).length;
            const cntPasado = pasados.length;
            const cntReserv = reservados.length;
            const partes = [];
            if (cntPasado > 0) partes.push(`${cntPasado} vencidos`);
            if (cntReserv > 0) partes.push(`${cntReserv} reservados`);
            const extra = partes.length ? ` (${partes.join(', ')})` : '';
            hint.textContent = `${libres} horarios libres de ${slots.length}${extra}`;
        }

        contenedor.innerHTML = slots.map(hora => {
            const esPasado    = pasados.includes(hora);
            const esReservado = reservados.includes(hora);
            const esMio       = slotInput?.value === hora;   // toggle on/off al hacer clic
            const esSeleccionado = slotActual === hora;

            let clases = 'time-slot-btn';

            if (esMio && esSeleccionado) {
                clases += ' time-slot-selected';   // azul: seleccionado por el usuario
            } else if (esPasado) {
                clases += ' time-slot-pasado';      // gris: hora ya cumplida hoy
            } else if (esReservado) {
                clases += ' time-slot-reservado';   // rojo: reservado por otro proveedor
            }

            // Tooltip y atributos
            let tooltip = '';
            if (esPasado)    tooltip = 'Horario ya transcurrido hoy';
            if (esReservado) tooltip = 'Horario reservado por otro proveedor';
            if (esMio && esSeleccionado) tooltip = 'Tu selección — clic para desmarcar';

            const titleAttr    = tooltip ? `title="${tooltip}"` : '';
            const disabledAttr = (esPasado || esReservado) ? 'disabled aria-disabled="true"' : 'role="button" tabindex="0"';

            const textoHora = this._formatearHoraSlot(hora);

            return `<button type="button" class="${clases}" data-hora="${hora}" ${titleAttr} ${disabledAttr}>${textoHora}</button>`;
        }).join('');

        // Adjuntar event listeners solo a los botones habilitados
        contenedor.querySelectorAll('.time-slot-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                const yaSeleccionado = btn.classList.contains('time-slot-selected');
                // Remover selección anterior
                contenedor.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('time-slot-selected'));
                if (!yaSeleccionado) {
                    btn.classList.add('time-slot-selected');
                    if (slotInput) slotInput.value = btn.dataset.hora;
                } else {
                    if (slotInput) slotInput.value = '';
                }
            });
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });
    },

    /**
     * Convierte "HH:MM" de 24h a formato "H:MM AM/PM"
     */
    _formatearHoraSlot(hora24) {
        if (!hora24) return '';
        const [hStr, m] = hora24.split(':');
        let h = parseInt(hStr, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
    },

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
        const fechaDateInput = document.getElementById('fechaCitaDate');
        if (fechaDateInput) {
            const now = new Date();
            // Establecer mínimo: hoy (no fechas pasadas)
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;
            fechaDateInput.min = todayStr;
            // Establecer valor por defecto a hoy
            fechaDateInput.value = todayStr;
            
            // Cuando cambie la fecha, recargar los slots de disponibilidad
            fechaDateInput.addEventListener('change', () => {
                InputConfig.renderizarSelectorHora();
            });
        }

        // Renderizar los slots la primera vez (fecha = hoy)
        setTimeout(() => {
            InputConfig.renderizarSelectorHora();
        }, 500);
    },

    /**
     * Resetea la selección del selector de hora (sin borrar el grid)
     */
    resetearSelectorHora() {
        const slotInput = document.getElementById('fechaCitaSlot');
        if (slotInput) slotInput.value = '';
        if (window.location.pathname.includes('user') || document.getElementById('selectorHora')) {
            InputConfig.renderizarSelectorHora();
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
        await Turnos.actualizarCitasHoy();
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
            
            // Toggle theme oscuro
            const btnToggleTheme = document.getElementById('btnToggleTheme');
            if (btnToggleTheme) {
                const savedTheme = localStorage.getItem('theme') || 'light';
                if (savedTheme === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    btnToggleTheme.textContent = 'Modo Claro';
                }
                btnToggleTheme.addEventListener('click', () => {
                    const currentTheme = document.documentElement.getAttribute('data-theme');
                    if (currentTheme === 'dark') {
                        document.documentElement.removeAttribute('data-theme');
                        localStorage.setItem('theme', 'light');
                        btnToggleTheme.textContent = 'Modo Oscuro';
                    } else {
                        document.documentElement.setAttribute('data-theme', 'dark');
                        localStorage.setItem('theme', 'dark');
                        btnToggleTheme.textContent = 'Modo Claro';
                    }
                });
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
            
            if (window.InputConfig) {
                window.InputConfig.configurarMayusculas();
                window.InputConfig.configurarTelefono();
            }
            
            btnLlamarTurno.addEventListener('click', AdminHandlers.llamarTurno);
            
            const btnCompletarTurno = document.getElementById('btnCompletarTurno');
            if (btnCompletarTurno) {
                btnCompletarTurno.addEventListener('click', AdminHandlers.completarTurno);
            }
            
            const btnReiniciar = document.getElementById('btnReiniciarCola');
            if (btnReiniciar) btnReiniciar.addEventListener('click', AdminHandlers.reiniciarCola);
            
            const btnLimpiar = document.getElementById('btnLimpiarHistorial');
            if (btnLimpiar) btnLimpiar.addEventListener('click', AdminHandlers.limpiarHistorial);
            
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

            // Búsquedas en tiempo real
            document.getElementById('busquedaLlegados')?.addEventListener('input', () => RenderAdmin.listaTurnosLlegados());
            document.getElementById('busquedaEspera')?.addEventListener('input', () => RenderAdmin.listaTurnosEspera());
            document.getElementById('busquedaCitados')?.addEventListener('input', () => RenderAdmin.listaTurnosCitados());
            
            console.log('Renderizando admin...');
            RenderAdmin.todo();
            RenderAdmin.cargarMesesDisponibles();
            
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
                        // El modal con sonido se muestra automáticamente en admin.html
                    })
                    .subscribe();
            } else {
                console.warn('Supabase no disponible');
            }
            
            verificarSalidaAutorizadaAdmin();
        }
        
        // La verificación de salida autorizada ahora se maneja en admin.html con modal y sonido
        function verificarSalidaAutorizadaAdmin() {
            // Eliminada - ahora admin.html maneja la alerta con sonido y modal
            // El modal se muestra automáticamente cuando el despachador autoriza salida
        }
        
        // Página de despachador (despachador.html)
        const btnAutorizarSalida = document.getElementById('btnAutorizarSalida');
        if (btnAutorizarSalida) {
            btnAutorizarSalida.addEventListener('click', DespachadorHandlers.autorizarSalida);
        }

        async function inicializarPanelDespachador() {
            try {
                console.log('Inicializando despachador desde app.js...');
                const hoy = getLocalDate();
                const [turnos, historial, stats] = await Promise.all([
                    (window.SupabaseDB && window.SupabaseDB.cargarTurnos ? window.SupabaseDB.cargarTurnos() : Promise.resolve([])),
                    (window.SupabaseDB && window.SupabaseDB.cargarHistorial ? window.SupabaseDB.cargarHistorial(100) : Promise.resolve([])),
                    (window.SupabaseDB && window.SupabaseDB.cargarEstadisticas ? window.SupabaseDB.cargarEstadisticas() : Promise.resolve(null))
                ]);

                if (window.AppState) {
                    window.AppState.turnos = (turnos || []).filter(t => ['espera','citado','llegado','atendiendo'].includes(t.estado));
                    window.AppState.turnoActual = (turnos || []).find(t => t.estado === 'atendiendo') || null;
                }

                if (window.RenderAdmin && typeof window.RenderAdmin.todo === 'function') {
                    await window.RenderAdmin.todo();
                }

                if (stats && typeof stats === 'object') {
                    const totalDiaEl = document.getElementById('totalTurnosDia');
                    const totalAutorizadosEl = document.getElementById('totalAutorizados');
                    const totalPendientesEl = document.getElementById('totalPendientes');
                    if (totalDiaEl) totalDiaEl.textContent = stats.totalTurnos ?? (historial || []).length;
                    if (totalAutorizadosEl) totalAutorizadosEl.textContent = stats.turnosAtendiendo ?? (historial || []).filter(h => h.autorizadoSalida).length;
                    if (totalPendientesEl) totalPendientesEl.textContent = stats.turnosEspera ?? Math.max(0, (historial || []).length - ((historial || []).filter(h => h.autorizadoSalida).length));
                }

                if ((historial || []).length === 0) {
                    const el = document.getElementById('historialDespachador');
                    if (el) el.innerHTML = '<p class="empty-message">Sin historial</p>';
                }

                const btnActualizarHistorialDesp = document.getElementById('btnActualizarHistorialDesp');
                if (btnActualizarHistorialDesp) btnActualizarHistorialDesp.onclick = async () => {
                    if (window.SupabaseDB && window.SupabaseDB.cargarHistorial) await window.SupabaseDB.cargarHistorial(100);
                };

                const btnActualizarCitas = document.getElementById('btnActualizarCitas');
                if (btnActualizarCitas) btnActualizarCitas.onclick = async () => {
                    if (window.SupabaseDB && window.SupabaseDB.cargarTurnos) await window.SupabaseDB.cargarTurnos();
                };

                const btnAutorizar = document.getElementById('btnAutorizarSalida');
                if (btnAutorizar) btnAutorizar.disabled = true;

                console.log('Panel despachador inicializado');
            } catch (error) {
                console.error('Error inicializando panel despachador:', error);
            }
        }

        await inicializarPanelDespachador();

        if (window.supabaseClient) {
            try {
                AppState.subscription = SupabaseDB.suscribirCambiosTurnos(async (payload) => {
                    console.log('Actualizacion despachador:', payload);
                    try {
                        await Turnos.cargarTurnos();
                        if (window.RenderAdmin && typeof window.RenderAdmin.todo === 'function') await window.RenderAdmin.todo();
                    } catch (error) {
                        console.error('Error al procesar actualizacion:', error);
                    }
                });
            } catch (e) {
                console.warn('Suscripcion despachador fallo:', e);
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
                        .gte('fecha', getLocalDate() + 'T00:00:00')
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
                                fecha: getLocalISOString()
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
            const numError = turno?.numero || turno?.num || '---';
            localStorage.setItem('salidaAutorizada', JSON.stringify({
                numero: numError,
                nombre: turno.nombre || turno.nombreEmpresa || '',
                nit: turno.nit || '',
                timestamp: Date.now()
            }));
            localStorage.removeItem('proveedorListoSalir');
            // El modal con sonido se muestra automáticamente en admin.html y despachador
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
     _datosExportacion: null,

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

             console.log('Generando certificado y exportando a Excel...');

             // Guardar datos para exportación posterior
             this._datosExportacion = {
                 historial,
                 diasAgrupados,
                 totalVehiculos,
                 totalPeso,
                 totalBultos,
                 vehiculosConFactura,
                 vehiculosConSalida,
                 tipoVehiculoCount,
                 destinoCount,
                 servicioCount,
                 totalEmpresas: empresaSet.size,
                 numDias,
                 primerDia,
                 ultimoDia,
                 promedioTurnosDia,
                 promedioPesoDia,
                 promedioBultosDia,
                 nombreMesMayus
             };

             // Mostrar vista previa en el modal
             this._mostrarVistaPrevia();

         } catch (error) {
             console.error('Error al generar certificado:', error);
             Utils.mostrarNotificacion('Error al generar certificado: ' + error.message, 'error');
         }
     },

     _mostrarVistaPrevia() {
         const contenido = document.getElementById('contenidoCertificado');
         const modal = document.getElementById('modalCertificado');
         if (!contenido || !modal) return;

         const d = this._datosExportacion;
         if (!d) return;

         contenido.innerHTML = `
             <div style="text-align: center; margin-bottom: 20px;">
                 <h3 style="color: #1E3A8A; margin-bottom: 8px;">CERTIFICADO MENSUAL DE DESPACHOS</h3>
                 <p style="font-size: 18px; font-weight: 600; color: #334155;">${d.nombreMesMayus.toUpperCase()}</p>
                 <p style="color: #64748b; font-size: 13px;">Zona Franca Bodegas SIE 240, 239 y SIP 221</p>
             </div>
             <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
                 <div style="background: #eff6ff; padding: 12px; border-radius: 8px; text-align: center;">
                     <div style="font-size: 24px; font-weight: 700; color: #2563eb;">${d.totalVehiculos}</div>
                     <div style="font-size: 11px; color: #64748b;">Vehículos</div>
                 </div>
                 <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; text-align: center;">
                     <div style="font-size: 24px; font-weight: 700; color: #16a34a;">${d.promedioTurnosDia}</div>
                     <div style="font-size: 11px; color: #64748b;">Prom. Turnos/Día</div>
                 </div>
                 <div style="background: #fefce8; padding: 12px; border-radius: 8px; text-align: center;">
                     <div style="font-size: 24px; font-weight: 700; color: #ca8a04;">${d.numDias}</div>
                     <div style="font-size: 11px; color: #64748b;">Días Operativos</div>
                 </div>
             </div>
             <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
                 <div style="background: #fafafa; padding: 12px; border-radius: 8px; text-align: center;">
                     <div style="font-size: 18px; font-weight: 600; color: #334155;">${d.totalPeso.toLocaleString('es-CO')} kg</div>
                     <div style="font-size: 11px; color: #64748b;">Peso Total</div>
                 </div>
                 <div style="background: #fafafa; padding: 12px; border-radius: 8px; text-align: center;">
                     <div style="font-size: 18px; font-weight: 600; color: #334155;">${d.totalBultos}</div>
                     <div style="font-size: 11px; color: #64748b;">Bultos Totales</div>
                 </div>
                 <div style="background: #fafafa; padding: 12px; border-radius: 8px; text-align: center;">
                     <div style="font-size: 18px; font-weight: 600; color: #334155;">${d.totalEmpresas}</div>
                     <div style="font-size: 11px; color: #64748b;">Proveedores Únicos</div>
                 </div>
             </div>
             <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                 <strong style="color: #16a34a;">✓ ${d.vehiculosConSalida}</strong> salidas autorizadas / <strong>${d.vehiculosConFactura}</strong> con factura
             </div>
             <p style="text-align: center; color: #64748b; font-size: 12px; margin-bottom: 16px;">
                 ${d.primerDia} — ${d.ultimoDia}
             </p>
             <button id="btnExportarExcel" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 16px;">
                 📊 Exportar a Excel
             </button>
         `;

         modal.style.display = 'flex';

         // Adjuntar handler al botón de exportar
         const btnExportar = document.getElementById('btnExportarExcel');
         if (btnExportar) {
             btnExportar.addEventListener('click', () => {
                 try {
                     this.exportarExcel(
                         d.historial,
                         d.diasAgrupados,
                         d.totalVehiculos,
                         d.totalPeso,
                         d.totalBultos,
                         d.vehiculosConFactura,
                         d.vehiculosConSalida,
                         d.tipoVehiculoCount,
                         d.destinoCount,
                         d.servicioCount,
                         d.totalEmpresas,
                         d.numDias,
                         d.primerDia,
                         d.ultimoDia,
                         d.promedioTurnosDia,
                         d.promedioPesoDia,
                         d.promedioBultosDia,
                         d.nombreMesMayus
                     );
                 } catch (e) {
                     console.error('Error al exportar:', e);
                     Utils.mostrarNotificacion('Error al exportar: ' + e.message, 'error');
                 }
             });
         }
},

     exportarExcel(
        historial,
        diasAgrupados,
        totalVehiculos,
        totalPeso,
        totalBultos,
        vehiculosConFactura,
        vehiculosConSalida,
        tipoVehiculoCount,
        destinoCount,
        servicioCount,
        totalEmpresas,
        numDias,
        primerDia,
        ultimoDia,
        promedioTurnosDia,
        promedioPesoDia,
        promedioBultosDia,
        nombreMesMayus
    ) {
        console.log('Exportando certificado a Excel...');

        if (typeof XLSX === 'undefined') {
            Utils.mostrarNotificacion('Librería Excel no cargada. Recargue la página.', 'error');
            return;
        }

        const wb = XLSX.utils.book_new();

        // ── Paleta de colores corporativos ──────────────────────────────────
        const C_AZUL_OSCURO  = "1E3A8A";  // Azul corporativo principal
        const C_AZUL_MEDIO   = "2563EB";  // Azul botones / encabezados
        const C_AZUL_CLARO   = "DBEAFE";  // Fondo celdas par (azul suave)
        const C_VERDE        = "059669";  // Ensambles
        const C_VERDE_CLARO  = "D1FAE5";  // Fondo zebra verde
        const C_AMARILLO     = "D97706";  // Advertencias / totales
        const C_AMARILLO_CL  = "FEF3C7";  // Fondo fila totales
        const C_GRIS_OSCURO  = "334155";  // Texto general
        const C_GRIS_MEDIO   = "64748B";  // Texto secundario
        const C_GRIS_CLARO   = "F1F5F9";  // Fondo filas impares (zebra)
        const C_BLANCO       = "FFFFFF";
        const C_BORDE        = "CBD5E1";  // Color de bordes

        // Estilos de borde fino estándar
        const bordeDelgado = {
            top:    { style: "thin", color: { rgb: C_BORDE } },
            bottom: { style: "thin", color: { rgb: C_BORDE } },
            left:   { style: "thin", color: { rgb: C_BORDE } },
            right:  { style: "thin", color: { rgb: C_BORDE } }
        };
        const bordeMedio = {
            top:    { style: "medium", color: { rgb: C_AZUL_OSCURO } },
            bottom: { style: "medium", color: { rgb: C_AZUL_OSCURO } },
            left:   { style: "medium", color: { rgb: C_AZUL_OSCURO } },
            right:  { style: "medium", color: { rgb: C_AZUL_OSCURO } }
        };

        // Helper: aplicar estilos de cabecera a una fila de una hoja
        const estiloEncabezado = (color = C_AZUL_MEDIO) => ({
            font: { bold: true, sz: 11, color: { rgb: C_BLANCO }, name: "Calibri" },
            fill: { patternType: "solid", fgColor: { rgb: color } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            border: {
                top:    { style: "medium", color: { rgb: color } },
                bottom: { style: "medium", color: { rgb: color } },
                left:   { style: "thin",   color: { rgb: C_BLANCO } },
                right:  { style: "thin",   color: { rgb: C_BLANCO } }
            }
        });

// Helper: estilo fila de datos (zebra)
         const estiloFila = (par, alineacion = "left", numFmt) => {
             const s = {
                 font: { sz: 10, color: { rgb: C_GRIS_OSCURO }, name: "Calibri" },
                 fill: { patternType: "solid", fgColor: { rgb: par ? C_GRIS_CLARO : C_BLANCO } },
                 alignment: { horizontal: alineacion, vertical: "center" },
                 border: bordeDelgado
             };
             if (numFmt) s.numFmt = numFmt;
             return s;
         };

        // Helper: estilo fila total
        const estiloTotal = () => ({
            font: { bold: true, sz: 10, color: { rgb: C_AMARILLO }, name: "Calibri" },
            fill: { patternType: "solid", fgColor: { rgb: C_AMARILLO_CL } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: { style: "medium", color: { rgb: C_AMARILLO } }, bottom: { style: "medium", color: { rgb: C_AMARILLO } }, left: bordeDelgado.left, right: bordeDelgado.right }
        });

        // Helper: aplicar estilo a rango completo
        const aplicarEstilos = (ws, range, styleFn) => {
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const ref = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[ref]) { ws[ref] = { v: "", t: "s" }; }
                    ws[ref].s = styleFn(R, C);
                }
            }
        };

        // ══════════════════════════════════════════════════════════════════════
        // HOJA 1 — PORTADA
        // ══════════════════════════════════════════════════════════════════════
        const portadaData = [
            [''],
            ['SI3'],
            [''],
            ['CERTIFICADO MENSUAL DE DESPACHOS'],
            [nombreMesMayus.toUpperCase()],
            [''],
            ['Zona Franca Bodegas SIE 240, 239 y SIP 221'],
            [''],
            ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'],
            [''],
            ['Total Vehículos', totalVehiculos],
            ['Días Operativos', numDias],
            ['Período', primerDia + ' — ' + ultimoDia],
            [''],
            ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'],
            [''],
            ['Generado:', new Date().toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' })]
        ];
        const wsPortada = XLSX.utils.aoa_to_sheet(portadaData);

        // Estilos portada
        const portadaEstilos = {
            1:  { font: { bold: true, sz: 36, color: { rgb: C_AZUL_OSCURO }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center" } },
            3:  { font: { bold: true, sz: 18, color: { rgb: C_AZUL_MEDIO },  name: "Calibri" }, alignment: { horizontal: "center", vertical: "center" } },
            4:  { font: { bold: false, sz: 14, italic: true, color: { rgb: C_GRIS_MEDIO }, name: "Calibri" }, alignment: { horizontal: "center", vertical: "center" } },
            6:  { font: { sz: 11, color: { rgb: C_GRIS_MEDIO }, name: "Calibri" }, alignment: { horizontal: "center" } },
            8:  { font: { sz: 10, color: { rgb: C_BORDE }, name: "Calibri" }, alignment: { horizontal: "center" } },
            14: { font: { sz: 10, color: { rgb: C_BORDE }, name: "Calibri" }, alignment: { horizontal: "center" } },
            16: { font: { sz: 10, italic: true, color: { rgb: C_GRIS_MEDIO }, name: "Calibri" }, alignment: { horizontal: "center" } }
        };
        const portadaKPI = {
            etiqueta: { font: { bold: true, sz: 12, color: { rgb: C_AZUL_OSCURO }, name: "Calibri" }, fill: { patternType: "solid", fgColor: { rgb: C_AZUL_CLARO } }, alignment: { horizontal: "right", vertical: "center" }, border: { bottom: bordeDelgado.bottom, top: bordeDelgado.top, left: { style: "medium", color: { rgb: C_AZUL_MEDIO } }, right: bordeDelgado.right } },
            valor:    { font: { bold: true, sz: 14, color: { rgb: C_AZUL_MEDIO }, name: "Calibri" }, fill: { patternType: "solid", fgColor: { rgb: C_AZUL_CLARO } }, alignment: { horizontal: "left",  vertical: "center" }, border: { bottom: bordeDelgado.bottom, top: bordeDelgado.top, left: bordeDelgado.left, right: { style: "medium", color: { rgb: C_AZUL_MEDIO } } } }
        };

        const portadaRange = XLSX.utils.decode_range(wsPortada['!ref']);
        for (let R = portadaRange.s.r; R <= portadaRange.e.r; ++R) {
            for (let C = 0; C <= 1; ++C) {
                const ref = XLSX.utils.encode_cell({ r: R, c: C });
                if (!wsPortada[ref]) continue;
                if (portadaEstilos[R]) { wsPortada[ref].s = portadaEstilos[R]; }
                if (R === 10 || R === 11 || R === 12) {
                    wsPortada[ref].s = C === 0 ? portadaKPI.etiqueta : portadaKPI.valor;
                }
            }
        }
        wsPortada['!cols']  = [{ wch: 28 }, { wch: 40 }];
        wsPortada['!rows']  = [{ hpt: 20 }, { hpt: 55 }, { hpt: 10 }, { hpt: 40 }, { hpt: 28 }, { hpt: 10 }, { hpt: 22 }, { hpt: 10 }, { hpt: 14 }, { hpt: 10 }, { hpt: 28 }, { hpt: 28 }, { hpt: 28 }, { hpt: 10 }, { hpt: 14 }, { hpt: 10 }, { hpt: 22 }];
        XLSX.utils.book_append_sheet(wb, wsPortada, 'Portada');

        // ══════════════════════════════════════════════════════════════════════
        // HOJA 2 — RESUMEN EJECUTIVO
        // ══════════════════════════════════════════════════════════════════════
        const resumenData = [
            ['CERTIFICADO MENSUAL DE DESPACHOS', nombreMesMayus.toUpperCase()],
            [],
            ['RESUMEN EJECUTIVO', ''],
            ['Indicador', 'Valor'],
            ['Vehículos Total', totalVehiculos],
            ['Peso Total (kg)', totalPeso],
            ['Bultos Totales', totalBultos],
            ['Días Operativos', numDias],
            [],
            ['PROMEDIOS DIARIOS', ''],
            ['Indicador', 'Valor'],
            ['Turnos por día', parseFloat(promedioTurnosDia)],
            ['Peso por día (kg)', Math.round(promedioPesoDia)],
            ['Bultos por día', parseFloat(promedioBultosDia)],
            [],
            ['INFORMACIÓN ADICIONAL', ''],
            ['Indicador', 'Valor'],
            ['Proveedores Únicos', totalEmpresas],
            ['Con Factura', vehiculosConFactura],
            ['Salidas Autorizadas', vehiculosConSalida],
            ['Primer Día del Mes', primerDia],
            ['Último Día del Mes', ultimoDia],
        ];
        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);

        // Filas de título de sección: 0, 2, 9, 15
        // Filas de sub-encabezado: 3, 10, 16
        // Filas de datos: resto
        const resumenRange2 = XLSX.utils.decode_range(wsResumen['!ref']);
        const filasTituloResumen   = new Set([2, 9, 15]);
        const filasSubHeaderResumen= new Set([3, 10, 16]);
        const filasTitleMain       = new Set([0]);
        let dataRowIndex = 0;
        for (let R = resumenRange2.s.r; R <= resumenRange2.e.r; ++R) {
            for (let C = resumenRange2.s.c; C <= resumenRange2.e.c; ++C) {
                const ref = XLSX.utils.encode_cell({ r: R, c: C });
                if (!wsResumen[ref]) { wsResumen[ref] = { v: "", t: "s" }; }
                if (filasTitleMain.has(R)) {
                    wsResumen[ref].s = C === 0
                        ? { font: { bold: true, sz: 13, color: { rgb: C_AZUL_OSCURO }, name: "Calibri" }, alignment: { horizontal: "left", vertical: "center" } }
                        : { font: { sz: 11, italic: true, color: { rgb: C_GRIS_MEDIO }, name: "Calibri" }, alignment: { horizontal: "right", vertical: "center" } };
                } else if (filasTituloResumen.has(R)) {
                    wsResumen[ref].s = {
                        font: { bold: true, sz: 11, color: { rgb: C_BLANCO }, name: "Calibri" },
                        fill: { patternType: "solid", fgColor: { rgb: C_AZUL_OSCURO } },
                        alignment: { horizontal: "left", vertical: "center" },
                        border: { top: { style: "medium", color: { rgb: C_AZUL_OSCURO } }, bottom: { style: "medium", color: { rgb: C_AZUL_OSCURO } }, left: { style: "medium", color: { rgb: C_AZUL_OSCURO } }, right: { style: "medium", color: { rgb: C_AZUL_OSCURO } } }
                    };
                } else if (filasSubHeaderResumen.has(R)) {
                    wsResumen[ref].s = estiloEncabezado(C_AZUL_MEDIO);
                } else {
                    // filas de datos — zebra
                    const esData = ![1, 8, 14].includes(R);
                    if (esData) {
                        const par = (dataRowIndex % 2 === 0);
wsResumen[ref].s = C === 0
                             ? { ...estiloFila(par, "left"),  font: { sz: 10, color: { rgb: C_GRIS_OSCURO }, name: "Calibri" } }
                             : { ...estiloFila(par, "right"), font: { bold: true, sz: 10, color: { rgb: C_AZUL_MEDIO }, name: "Calibri" }, numFmt: '#,##0' };
                    }
                }
            }
            if (![1, 8, 14, 0, 2, 9, 15, 3, 10, 16].includes(R)) dataRowIndex++;
        }
        wsResumen['!cols'] = [{ wch: 26 }, { wch: 22 }];
        wsResumen['!rows'] = Array.from({ length: resumenData.length }, (_, i) =>
            filasTituloResumen.has(i) || filasSubHeaderResumen.has(i) ? { hpt: 22 } : { hpt: 18 }
        );
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

        // ══════════════════════════════════════════════════════════════════════
        // HOJA 3 — DETALLE DIARIO
        // ══════════════════════════════════════════════════════════════════════
        const detalleDiarioData = [
            ['Fecha', 'Turnos', 'Peso (kg)', 'Bultos', 'Facturas', 'Salidas OK']
        ];
        Object.entries(diasAgrupados).forEach(([fecha, datos]) => {
            detalleDiarioData.push([fecha, datos.turnos, datos.peso, datos.bultos, datos.facturas, datos.salidas]);
        });
        // Fila de totales
        const totalDiario = detalleDiarioData.slice(1).reduce((acc, r) => {
            acc[1] += r[1]; acc[2] += r[2]; acc[3] += r[3]; acc[4] += r[4]; acc[5] += r[5]; return acc;
        }, ['TOTAL', 0, 0, 0, 0, 0]);
        detalleDiarioData.push(totalDiario);

        const wsDiario = XLSX.utils.aoa_to_sheet(detalleDiarioData);
        const diarioRange2 = XLSX.utils.decode_range(wsDiario['!ref']);
        const totalRowDiario = diarioRange2.e.r;
for (let R = 0; R <= diarioRange2.e.r; ++R) {
             for (let C = 0; C <= 5; ++C) {
                 const ref = XLSX.utils.encode_cell({ r: R, c: C });
                 if (!wsDiario[ref]) { wsDiario[ref] = { v: "", t: "s" }; }
                 if (R === 0) {
                     wsDiario[ref].s = estiloEncabezado(C_AZUL_OSCURO);
                 } else if (R === totalRowDiario) {
                     wsDiario[ref].s = estiloTotal();
                 } else {
                     const alin = C === 0 ? "center" : "right";
                     const numFmt = C >= 1 && C <= 5 ? '#,##0' : undefined;
                     wsDiario[ref].s = estiloFila(R % 2 === 1, alin, numFmt);
                 }
             }
         }
        wsDiario['!cols'] = [{ wch: 16 }, { wch: 11 }, { wch: 16 }, { wch: 13 }, { wch: 13 }, { wch: 14 }];
        wsDiario['!rows']  = Array.from({ length: detalleDiarioData.length }, () => ({ hpt: 20 }));
        XLSX.utils.book_append_sheet(wb, wsDiario, 'Detalle Diario');

        // ══════════════════════════════════════════════════════════════════════
        // HELPER: crear hoja de tabla simple (encabezado + filas + total)
        // ══════════════════════════════════════════════════════════════════════
const crearHojaTabla = (datos, cols, colorHeader = C_AZUL_MEDIO, nombreHoja) => {
             const ws  = XLSX.utils.aoa_to_sheet(datos);
             const rng = XLSX.utils.decode_range(ws['!ref']);
             const totalR = rng.e.r;
             for (let R = 0; R <= totalR; ++R) {
                 for (let C = 0; C <= rng.e.c; ++C) {
                     const ref = XLSX.utils.encode_cell({ r: R, c: C });
                     if (!ws[ref]) { ws[ref] = { v: "", t: "s" }; }
                     if (R === 0) {
                         ws[ref].s = estiloEncabezado(colorHeader);
                     } else {
                         const alin = C === 0 ? "left" : "right";
                         const numFmt = C >= 1 ? '#,##0' : undefined;
                         ws[ref].s = estiloFila(R % 2 === 0, alin, numFmt);
                     }
                 }
             }
             ws['!cols'] = cols;
             ws['!rows'] = Array.from({ length: datos.length }, () => ({ hpt: 20 }));
             XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
         };

        // ══════════════════════════════════════════════════════════════════════
        // HOJA 4 — TIPOS DE VEHÍCULO
        // ══════════════════════════════════════════════════════════════════════
        const tiposData = [['Tipo de Vehículo', 'Cantidad', '% del Total']];
        Object.entries(tipoVehiculoCount).forEach(([tipo, count]) => {
            tiposData.push([tipo, count, ((count / totalVehiculos) * 100).toFixed(1) + '%']);
        });
        crearHojaTabla(tiposData, [{ wch: 28 }, { wch: 14 }, { wch: 14 }], C_AZUL_MEDIO, 'Tipos Vehículo');

        // ══════════════════════════════════════════════════════════════════════
        // HOJA 5 — DESTINOS
        // ══════════════════════════════════════════════════════════════════════
        const destinosData = [['Destino', 'Cantidad', '% del Total']];
        Object.entries(destinoCount).forEach(([destino, count]) => {
            const nombre = destino === 'ensambles' ? 'SI ENSAMBLES' : destino === 'plasticos' ? 'SI PLASTICOS' : 'AMBOS';
            destinosData.push([nombre, count, ((count / totalVehiculos) * 100).toFixed(1) + '%']);
        });
        crearHojaTabla(destinosData, [{ wch: 22 }, { wch: 14 }, { wch: 14 }], C_AZUL_MEDIO, 'Destinos');

        // ══════════════════════════════════════════════════════════════════════
        // HOJA 6 — SERVICIOS
        // ══════════════════════════════════════════════════════════════════════
        const servicioLabel = { 'entrega': 'Entrega de Mercancía', 'servicio': 'Servicio Técnico', 'reunion': 'Reunión', 'otro': 'Otro' };
        const serviciosData = [['Tipo de Servicio', 'Cantidad', '% del Total']];
        Object.entries(servicioCount).forEach(([srv, count]) => {
            serviciosData.push([servicioLabel[srv] || srv, count, ((count / totalVehiculos) * 100).toFixed(1) + '%']);
        });
        crearHojaTabla(serviciosData, [{ wch: 26 }, { wch: 14 }, { wch: 14 }], C_AZUL_MEDIO, 'Servicios');

        // ══════════════════════════════════════════════════════════════════════
        // HELPER: crear hoja de detalle (historial filtrado)
        // ══════════════════════════════════════════════════════════════════════
        const crearHojaDetalle = (filtroFn, colorHeader, nombreHoja) => {
            const data = [['#', 'Fecha', 'Turno', 'Empresa', 'Tipo Vehículo', 'Peso (kg)', 'Bultos', 'Factura', 'Salida OK']];
            let idx = 0;
            historial.forEach((h) => {
                if (filtroFn(h)) {
                    idx++;
                    data.push([
                        idx,
                        new Date(h.fecha).toLocaleDateString('es-CO'),
                        h.numero,
                        h.nombre_empresa || 'N/A',
                        h.tipo_vehiculo  || 'N/A',
                        parseFloat(h.peso)  || 0,
                        parseInt(h.bultos)  || 0,
                        h.num_factura       || '',
                        h.autorizado_salida ? 'Sí' : 'No'
                    ]);
                }
            });
            // Totales
            if (data.length > 1) {
                const rows = data.slice(1);
                data.push([
                    'TOTAL', '', '',
                    idx + ' registros',
                    '',
                    rows.reduce((s, r) => s + (parseFloat(r[5]) || 0), 0).toLocaleString('es-CO'),
                    rows.reduce((s, r) => s + (parseInt(r[6]) || 0), 0),
                    '',
                    rows.filter(r => r[8] === 'Sí').length + ' ✓'
                ]);
            }

            const ws  = XLSX.utils.aoa_to_sheet(data);
            const rng = XLSX.utils.decode_range(ws['!ref']);
            const lastR = rng.e.r;
            for (let R = 0; R <= lastR; ++R) {
                for (let C = 0; C <= 8; ++C) {
                    const ref = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[ref]) { ws[ref] = { v: "", t: "s" }; }
                    if (R === 0) {
                        ws[ref].s = estiloEncabezado(colorHeader);
} else if (R === lastR && data.length > 1) {
                         ws[ref].s = estiloTotal();
                     } else {
                         const alin = C === 0 ? "center" : C === 3 || C === 4 ? "left" : "right";
                         const numFmt = (C === 5 || C === 6) ? '#,##0' : undefined;
                         ws[ref].s = estiloFila(R % 2 === 1, alin, numFmt);
                     }
                }
            }
            ws['!cols'] = [{ wch: 5 }, { wch: 13 }, { wch: 10 }, { wch: 26 }, { wch: 16 }, { wch: 13 }, { wch: 10 }, { wch: 14 }, { wch: 12 }];
            ws['!rows'] = Array.from({ length: data.length }, (_, i) => ({ hpt: i === 0 ? 24 : 18 }));
            ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }) };
            XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
        };

        // ══════════════════════════════════════════════════════════════════════
        // HOJA 7 — SI ENSAMBLES
        // ══════════════════════════════════════════════════════════════════════
        crearHojaDetalle(h => h.destino === 'ensambles' || h.destino === 'ambos', C_VERDE, 'SI ENSAMBLES');

        // ══════════════════════════════════════════════════════════════════════
        // HOJA 8 — SI PLÁSTICOS
        // ══════════════════════════════════════════════════════════════════════
        crearHojaDetalle(h => h.destino === 'plasticos' || h.destino === 'ambos', C_AZUL_MEDIO, 'SI PLÁSTICOS');

        // ══════════════════════════════════════════════════════════════════════
        // GENERAR Y DESCARGAR
        // ══════════════════════════════════════════════════════════════════════
        const fechaGen = new Date().toISOString().slice(0, 10);
        const nombreArchivo = `Certificado_${nombreMesMayus.replace(/ /g, '_')}_${fechaGen}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);

        Utils.mostrarNotificacion('Excel exportado correctamente', 'success');
    }

};

window.GenerarCertificado = GenerarCertificado;

