// ============================================
// SISTEMA DE TURNOS - CON SINCRONIZACIÓN SILENCIOSA A SUPABASE
// ============================================

// ============================================
// CONFIGURACIÓN
// ============================================

const CONFIG = {
    ADMIN_PASSWORD: '12345',
    LOGO_CLICKS_REQUIRED: 5,
    LOGO_CLICK_TIMEOUT: 2000,
    TURN_TIME_ESTIMATE: 5
};

// ============================================
// SUPABASE (Sincronización silenciosa)
// ============================================

const SUPABASE_URL = 'https://kqqjlkpwctaekyzuzdqm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxcWpsa3B3Y3RhZWt5enV6ZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQwNjA4MDAsImV4cCI6MjAxOTYzNjgwMH0.VhDAjJwgcqqiEw08i4g6CA__Y5aPGbp';

let supabase = null;
let syncEnabled = false;

// Inicializar Supabase si está disponible
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        syncEnabled = true;
        console.log('✅ Supabase conectado - sincronización activa');
    } else {
        console.log('⚠️ Supabase no disponible - solo modo local');
    }
} catch (e) {
    console.log('❌ Error Supabase:', e.message);
}

// ============================================
// ESTADO LOCAL
// ============================================

const AppState = {
    turnos: [],
    turnoActual: null,
    contadorTurnos: parseInt(localStorage.getItem('contadorTurnos')) || 0,
    isLoading: false,
    lastSync: 0
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
        localStorage.setItem('contadorTurnos', AppState.contadorTurnos);
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

    mostrarNotificacion(mensaje, tipo = 'info') {
        const notificaciones = document.querySelectorAll('.notificacion');
        notificaciones.forEach(n => n.remove());
        
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
            fontFamily: 'system-ui, sans-serif'
        });

        document.body.appendChild(notificacion);

        notificacion.querySelector('.notificacion-cerrar').onclick = () => notificacion.remove();
        setTimeout(() => notificacion.remove(), 4000);
    },

    setLoading(isLoading) {
        AppState.isLoading = isLoading;
        document.querySelectorAll('.btn, button[type="submit"]').forEach(btn => {
            btn.disabled = isLoading;
            if (isLoading) {
                btn.dataset.originalText = btn.textContent;
                btn.textContent = 'Procesando...';
            } else if (btn.dataset.originalText) {
                btn.textContent = btn.dataset.originalText;
            }
        });
    }
};

// ============================================
// SINCRONIZACIÓN CON SUPABASE
// ============================================

const Sync = {
    // Subir turno a la nube (silencioso, no bloquea)
    async subirTurno(turno) {
        if (!syncEnabled || !supabase) return;
        
        try {
            // Subir proveedor primero
            const { data: proveedorExistente } = await supabase
                .from('proveedores')
                .select('id')
                .eq('nit', turno.nit)
                .maybeSingle();

            let proveedorId = proveedorExistente?.id;

            if (!proveedorId) {
                const { data: nuevoProveedor, error: errorProveedor } = await supabase
                    .from('proveedores')
                    .insert({
                        nombre_empresa: turno.nombreEmpresa,
                        nit: turno.nit,
                        contacto: turno.contacto,
                        telefono: turno.telefono,
                        servicio: turno.servicio,
                        fecha_registro: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (errorProveedor) throw errorProveedor;
                proveedorId = nuevoProveedor.id;
            }

            // Subir turno
            const { error: errorTurno } = await supabase
                .from('turnos')
                .insert({
                    numero: turno.numero,
                    proveedor_id: proveedorId,
                    nombre_empresa: turno.nombreEmpresa,
                    nit: turno.nit,
                    motivo: turno.motivo,
                    hora_solicitud: turno.horaSolicitud,
                    fecha_solicitud: turno.fechaSolicitud,
                    estado: turno.estado
                });

            if (errorTurno) throw errorTurno;
            
            console.log('☁️ Turno subido a la nube:', turno.numero);
        } catch (e) {
            console.log('⚠️ No se pudo subir turno:', e.message);
        }
    },

    // Descargar turnos de la nube
    async descargarTurnos() {
        if (!syncEnabled || !supabase) return [];

        try {
            const { data, error } = await supabase
                .from('turnos')
                .select('*')
                .eq('estado', 'espera')
                .order('fecha_solicitud', { ascending: true });

            if (error) throw error;

            // Convertir formato Supabase a formato local
            const turnosNube = data.map(t => ({
                id: t.id,
                numero: t.numero,
                nombreEmpresa: t.nombre_empresa,
                nit: t.nit,
                contacto: '',
                telefono: '',
                servicio: '',
                motivo: t.motivo || '',
                horaSolicitud: t.hora_solicitud,
                fechaSolicitud: t.fecha_solicitud,
                estado: t.estado
            }));

            console.log('☁️ Turnos descargados:', turnosNube.length);
            return turnosNube;
        } catch (e) {
            console.log('⚠️ No se pudo descargar turnos:', e.message);
            return [];
        }
    },

    // Sincronizar turno actual
    async sincronizarTurnoActual() {
        if (!syncEnabled || !supabase) return;

        try {
            const { data, error } = await supabase
                .from('turnos')
                .select('*')
                .eq('estado', 'atendiendo')
                .maybeSingle();

            if (error) throw error;

            if (data) {
                AppState.turnoActual = {
                    id: data.id,
                    numero: data.numero,
                    nombreEmpresa: data.nombre_empresa,
                    nit: data.nit,
                    motivo: data.motivo,
                    horaSolicitud: data.hora_solicitud,
                    horaLlamada: data.hora_llamada,
                    estado: data.estado
                };
            } else {
                AppState.turnoActual = null;
            }
        } catch (e) {
            console.log('⚠️ Error sync turno actual:', e.message);
        }
    },

    // Actualizar estado en la nube
    async actualizarEstado(turnoId, estado, horaLlamada = null) {
        if (!syncEnabled || !supabase) return;

        try {
            const updateData = { estado, updated_at: new Date().toISOString() };
            if (horaLlamada) updateData.hora_llamada = horaLlamada;

            await supabase
                .from('turnos')
                .update(updateData)
                .eq('id', turnoId);

            console.log('☁️ Estado actualizado:', turnoId, '→', estado);
        } catch (e) {
            console.log('⚠️ No se pudo actualizar estado:', e.message);
        }
    },

    // Sincronización completa (cada 3 segundos)
    async sincronizar() {
        if (!syncEnabled || document.hidden) return;

        const ahora = Date.now();
        if (ahora - AppState.lastSync < 3000) return; // Máximo cada 3 segundos
        AppState.lastSync = ahora;

        try {
            // Descargar turnos de la nube
            const turnosNube = await this.descargarTurnos();
            
            // Fusionar con locales (sin duplicados)
            const numerosLocales = new Set(AppState.turnos.map(t => t.numero));
            
            turnosNube.forEach(turnoNube => {
                if (!numerosLocales.has(turnoNube.numero)) {
                    // Es un turno nuevo de otro dispositivo
                    AppState.turnos.push(turnoNube);
                    console.log('📥 Nuevo turno de otro dispositivo:', turnoNube.numero);
                }
            });

            // Sincronizar turno actual
            await this.sincronizarTurnoActual();

            // Guardar y renderizar
            Turnos.guardar();
            if (document.getElementById('btnLlamarTurno')) {
                RenderAdmin.todo();
            } else {
                RenderUsuario.todo();
            }

        } catch (e) {
            console.log('⚠️ Error de sincronización:', e.message);
        }
    },

    // Iniciar sincronización automática
    iniciar() {
        if (!syncEnabled) {
            console.log('📴 Modo offline - sin sincronización');
            return;
        }

        // Sincronizar cada 3 segundos
        syncInterval = setInterval(() => this.sincronizar(), 3000);
        
        // Sincronizar cuando la ventana vuelve a estar visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.sincronizar();
            }
        });

        console.log('🔄 Sincronización automática iniciada (cada 3 segundos)');
    },

    detener() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
    }
};

// ============================================
// TURNOS (Local + Sync silenciosa)
// ============================================

const Turnos = {
    solicitar(datosProveedor, motivo = '') {
        if (!datosProveedor.nit) throw new Error('La placa es requerida');
        if (!datosProveedor.nombreEmpresa) throw new Error('El nombre de la empresa es requerido');

        const numeroTurno = Utils.generarNumeroTurno();
        
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

        AppState.turnos.push(turno);
        this.guardar();
        
        // Sincronizar silenciosamente (no bloquea)
        Sync.subirTurno(turno);
        
        return turno;
    },

    llamarSiguiente() {
        if (AppState.turnos.length === 0) return null;
        
        AppState.turnos.sort((a, b) => new Date(a.fechaSolicitud) - new Date(b.fechaSolicitud));
        
        const siguiente = AppState.turnos[0];
        siguiente.estado = 'atendiendo';
        siguiente.horaLlamada = Utils.obtenerHoraActual();
        
        AppState.turnoActual = siguiente;
        AppState.turnos = AppState.turnos.filter(t => t.id !== siguiente.id);
        
        this.guardar();
        
        // Sincronizar silenciosamente
        Sync.actualizarEstado(siguiente.id, 'atendiendo', siguiente.horaLlamada);
        
        return siguiente;
    },

    cancelar(turnoId) {
        const turno = AppState.turnos.find(t => t.id === turnoId);
        AppState.turnos = AppState.turnos.filter(t => t.id !== turnoId);
        this.guardar();
        
        // Sincronizar silenciosamente
        if (turno) {
            Sync.actualizarEstado(turno.id, 'cancelado');
        }
        
        return true;
    },

    reiniciarCola() {
        AppState.turnos = [];
        AppState.turnoActual = null;
        AppState.contadorTurnos = 0;
        localStorage.setItem('contadorTurnos', '0');
        this.guardar();
        return true;
    },

    guardar() {
        localStorage.setItem('turnos', JSON.stringify(AppState.turnos));
        localStorage.setItem('turnoActual', JSON.stringify(AppState.turnoActual));
    },

    cargar() {
        const turnos = localStorage.getItem('turnos');
        const actual = localStorage.getItem('turnoActual');
        
        if (turnos) AppState.turnos = JSON.parse(turnos);
        if (actual && actual !== 'null') AppState.turnoActual = JSON.parse(actual);
    }
};

// ============================================
// RENDERIZADO
// ============================================

const RenderUsuario = {
    miTurno() {
        const container = document.getElementById('miTurnoContainer');
        if (!container) return;

        const miTurno = localStorage.getItem('miTurnoActual');
        
        if (miTurno) {
            try {
                const turno = JSON.parse(miTurno);
                const posicion = AppState.turnos.findIndex(t => t.numero === turno.numero) + 1;
                const tiempo = posicion > 0 ? posicion * CONFIG.TURN_TIME_ESTIMATE : 0;
                
                container.innerHTML = `
                    <div class="my-turn-active">
                        <div class="my-turn-number">${turno.numero}</div>
                        <div class="my-turn-status">${turno.nombreEmpresa}</div>
                        <div class="my-turn-position">
                            ${posicion > 0 ? `Posición en cola: ${posicion}` : '¡Es tu turno!'}
                        </div>
                        ${posicion > 0 ? `<div class="my-turn-position">Tiempo estimado: ${tiempo} min</div>` : ''}
                    </div>
                `;
            } catch (e) {
                container.innerHTML = `<div class="no-turn-message"><p>No tienes un turno activo</p></div>`;
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
        
        const miTurno = localStorage.getItem('miTurnoActual');
        if (miTurno) {
            try {
                const turno = JSON.parse(miTurno);
                const posicion = AppState.turnos.findIndex(t => t.numero === turno.numero) + 1;
                
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
            const miTurno = localStorage.getItem('miTurnoActual');
            let miNumero = null;
            try { miNumero = JSON.parse(miTurno).numero; } catch(e) {}
            
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
    }
};

const RenderAdmin = {
    turnoActual() {
        const turnoActualDiv = document.getElementById('turnoActual');
        const turnoInfoDiv = document.getElementById('turnoInfo');
        
        if (turnoActualDiv && turnoInfoDiv) {
            if (AppState.turnoActual) {
                turnoActualDiv.textContent = AppState.turnoActual.numero;
                turnoInfoDiv.textContent = AppState.turnoActual.motivo ? 
                    `${AppState.turnoActual.nombreEmpresa} - ${AppState.turnoActual.motivo}` : 
                    AppState.turnoActual.nombreEmpresa;
            } else {
                turnoActualDiv.textContent = '--';
                turnoInfoDiv.textContent = 'Ningún turno en atención';
            }
        }
    },

    listaTurnosEspera() {
        const listaDiv = document.getElementById('listaTurnosEspera');
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

    todo() {
        this.turnoActual();
        this.listaTurnosEspera();
    }
};

// ============================================
// MANEJADORES
// ============================================

const UsuarioHandlers = {
    solicitarTurno(e) {
        e.preventDefault();
        Utils.setLoading(true);
        
        try {
            const datosProveedor = {
                nombreEmpresa: document.getElementById('nombreEmpresa')?.value?.trim(),
                nit: document.getElementById('placa')?.value?.trim(),
                contacto: document.getElementById('contacto')?.value?.trim(),
                telefono: document.getElementById('telefono')?.value?.trim(),
                servicio: document.getElementById('servicio')?.value
            };

            if (!datosProveedor.nit) throw new Error('La placa es requerida');
            if (!datosProveedor.nombreEmpresa) throw new Error('El nombre de la empresa es requerido');

            const motivoInput = document.getElementById('motivoVisita');
            const motivo = motivoInput ? motivoInput.value?.trim() : '';

            const turno = Turnos.solicitar(datosProveedor, motivo);
            
            localStorage.setItem('miTurnoActual', JSON.stringify(turno));
            
            const modal = document.getElementById('confirmacionModal');
            if (modal) {
                const modalMiTurno = document.getElementById('modalMiTurno');
                const modalTurnoInfo = document.getElementById('modalTurnoInfo');
                
                if (modalMiTurno) modalMiTurno.textContent = turno.numero;
                if (modalTurnoInfo) modalTurnoInfo.textContent = `${turno.nombreEmpresa}\n${turno.motivo || ''}`;
                modal.style.display = 'block';
            }

            Utils.mostrarNotificacion(`Turno ${turno.numero} solicitado`, 'success');
            
            e.target.reset();
            const motivoGroup = document.getElementById('motivoGroup');
            if (motivoGroup) motivoGroup.style.display = 'none';
            
            RenderUsuario.todo();
            
        } catch (error) {
            Utils.mostrarNotificacion(error.message, 'error');
        } finally {
            Utils.setLoading(false);
        }
    }
};

const AdminHandlers = {
    llamarTurno() {
        const turno = Turnos.llamarSiguiente();
        
        if (turno) {
            const modal = document.getElementById('turnoModal');
            if (modal) {
                const modalTurnNumber = document.getElementById('modalTurnNumber');
                const modalTurnInfo = document.getElementById('modalTurnInfo');
                
                if (modalTurnNumber) modalTurnNumber.textContent = turno.numero;
                if (modalTurnInfo) modalTurnInfo.textContent = `${turno.nombreEmpresa}\n${turno.motivo || ''}`;
                modal.style.display = 'block';
            }
            
            Utils.mostrarNotificacion(`Turno ${turno.numero} llamado`, 'success');
            RenderAdmin.todo();
        } else {
            Utils.mostrarNotificacion('No hay turnos en espera', 'error');
        }
    },

    cancelarTurno(id) {
        if (confirm('¿Cancelar turno?')) {
            Turnos.cancelar(id);
            RenderAdmin.todo();
        }
    },

    reiniciarCola() {
        if (confirm('¿Reiniciar cola?')) {
            Turnos.reiniciarCola();
            Utils.mostrarNotificacion('Cola reiniciada', 'success');
            RenderAdmin.todo();
        }
    }
};

const AdminAccess = {
    handleLogoClick() {
        logoClickCount++;
        if (logoClickTimer) clearTimeout(logoClickTimer);
        
        logoClickTimer = setTimeout(() => logoClickCount = 0, CONFIG.LOGO_CLICK_TIMEOUT);
        
        if (logoClickCount >= CONFIG.LOGO_CLICKS_REQUIRED) {
            logoClickCount = 0;
            const modal = document.getElementById('adminAccessModal');
            if (modal) {
                modal.style.display = 'block';
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
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sistema de Turnos cargado');
    
    // Cargar datos locales
    Turnos.cargar();
    
    // Configurar modales
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

    // Login admin
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', AdminAccess.handleLogin);
    }

    // Index - logo
    if (document.getElementById('logoClick')) {
        document.getElementById('logoClick').addEventListener('click', AdminAccess.handleLogoClick);
        document.getElementById('logoClick').style.cursor = 'pointer';
    }
    
    // User page
    if (document.getElementById('formSolicitarTurno')) {
        const placaInput = document.getElementById('placa');
        if (placaInput) {
            placaInput.addEventListener('input', function() {
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = this.value.toUpperCase();
                this.setSelectionRange(start, end);
            });
        }

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

        document.getElementById('formSolicitarTurno').addEventListener('submit', UsuarioHandlers.solicitarTurno);
        RenderUsuario.todo();
    }
    
    // Admin page
    if (document.getElementById('btnLlamarTurno')) {
        document.getElementById('btnLlamarTurno').addEventListener('click', AdminHandlers.llamarTurno);
        document.getElementById('btnReiniciarCola')?.addEventListener('click', AdminHandlers.reiniciarCola);
        RenderAdmin.todo();
    }

    // Iniciar sincronización silenciosa
    Sync.iniciar();
});

window.AdminHandlers = AdminHandlers;
