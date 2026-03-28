// ============================================
// SISTEMA DE TURNOS - VERSIÓN LOCAL (EMERGENCIA)
// Reemplaza todo tu app.js con esto para probar
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
// ESTADO LOCAL (sin Supabase)
// ============================================

const AppState = {
    turnos: [],
    turnoActual: null,
    contadorTurnos: parseInt(localStorage.getItem('contadorTurnos')) || 0,
    isLoading: false
};

let logoClickCount = 0;
let logoClickTimer = null;

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
            maxWidth: '400px'
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
    }
};

// ============================================
// TURNOS (VERSIÓN LOCAL)
// ============================================

const Turnos = {
    solicitar(datosProveedor, motivo = '') {
        console.log('=== CREANDO TURNO LOCAL ===');
        
        // Validar
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

        // Guardar en estado y localStorage
        AppState.turnos.push(turno);
        this.guardarTurnos();
        
        console.log('Turno creado:', turno);
        return turno;
    },

    llamarSiguiente() {
        if (AppState.turnos.length === 0) return null;
        
        // Ordenar por fecha
        AppState.turnos.sort((a, b) => new Date(a.fechaSolicitud) - new Date(b.fechaSolicitud));
        
        const siguiente = AppState.turnos[0];
        siguiente.estado = 'atendiendo';
        siguiente.horaLlamada = Utils.obtenerHoraActual();
        
        AppState.turnoActual = siguiente;
        AppState.turnos = AppState.turnos.filter(t => t.id !== siguiente.id);
        
        this.guardarTurnos();
        return siguiente;
    },

    cancelar(turnoId) {
        AppState.turnos = AppState.turnos.filter(t => t.id !== turnoId);
        this.guardarTurnos();
        return true;
    },

    completarTurnoActual() {
        AppState.turnoActual = null;
        this.guardarTurnos();
    },

    reiniciarCola() {
        AppState.turnos = [];
        AppState.turnoActual = null;
        AppState.contadorTurnos = 0;
        localStorage.setItem('contadorTurnos', '0');
        this.guardarTurnos();
        return true;
    },

    guardarTurnos() {
        localStorage.setItem('turnos', JSON.stringify(AppState.turnos));
        localStorage.setItem('turnoActual', JSON.stringify(AppState.turnoActual));
    },

    cargarTurnos() {
        const guardados = localStorage.getItem('turnos');
        const actual = localStorage.getItem('turnoActual');
        
        if (guardados) AppState.turnos = JSON.parse(guardados);
        if (actual && actual !== 'null') AppState.turnoActual = JSON.parse(actual);
    }
};

// ============================================
// RENDERIZADO - USUARIO
// ============================================

const RenderUsuario = {
    miTurno() {
        const container = document.getElementById('miTurnoContainer');
        const miTurno = localStorage.getItem('miTurnoActual');
        
        if (!container) return;

        if (miTurno) {
            try {
                const turno = JSON.parse(miTurno);
                const posicion = AppState.turnos.findIndex(t => t.numero === turno.numero) + 1;
                const tiempoEstimado = posicion > 0 ? posicion * CONFIG.TURN_TIME_ESTIMATE : 0;
                
                container.innerHTML = `
                    <div class="my-turn-active">
                        <div class="my-turn-number">${turno.numero}</div>
                        <div class="my-turn-status">${turno.nombreEmpresa}</div>
                        <div class="my-turn-position">
                            ${posicion > 0 ? `Posición en cola: ${posicion}` : '¡Es tu turno!'}
                        </div>
                        ${posicion > 0 ? `<div class="my-turn-position">Tiempo estimado: ${tiempoEstimado} min</div>` : ''}
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

// ============================================
// RENDERIZADO - ADMIN
// ============================================

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
// MANEJADORES - USUARIO
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
            
            // Mostrar modal
            const modal = document.getElementById('confirmacionModal');
            const modalMiTurno = document.getElementById('modalMiTurno');
            const modalTurnoInfo = document.getElementById('modalTurnoInfo');
            
            if (modal && modalMiTurno) {
                modalMiTurno.textContent = turno.numero;
                if (modalTurnoInfo) modalTurnoInfo.textContent = `${turno.nombreEmpresa}\n${turno.motivo || ''}`;
                modal.style.display = 'block';
            }

            Utils.mostrarNotificacion(`Turno ${turno.numero} solicitado`, 'success');
            
            e.target.reset();
            document.getElementById('motivoGroup').style.display = 'none';
            
            RenderUsuario.todo();
            
        } catch (error) {
            console.error('Error:', error);
            Utils.mostrarNotificacion(error.message, 'error');
        } finally {
            Utils.setLoading(false);
        }
    }
};

// ============================================
// MANEJADORES - ADMIN
// ============================================

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
// CONFIGURACIÓN DE CAMPOS
// ============================================

const InputConfig = {
    configurarPlacaInput() {
        const placaInput = document.getElementById('placa');
        if (placaInput) {
            placaInput.addEventListener('input', function() {
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = this.value.toUpperCase();
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
// MODALES
// ============================================

const ModalConfig = {
    configurar() {
        // Cerrar modales
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
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Sistema de Turnos cargado');
    
    // Cargar datos guardados
    Turnos.cargarTurnos();
    
    // Configurar modales
    ModalConfig.configurar();
    
    // Detectar página
    if (document.getElementById('logoClick')) {
        // Index - acceso admin
        document.getElementById('logoClick').addEventListener('click', AdminAccess.handleLogoClick);
        document.getElementById('logoClick').style.cursor = 'pointer';
    }
    
    if (document.getElementById('formSolicitarTurno')) {
        // User page
        InputConfig.configurarPlacaInput();
        InputConfig.configurarServicioSelect();
        document.getElementById('formSolicitarTurno').addEventListener('submit', UsuarioHandlers.solicitarTurno);
        RenderUsuario.todo();
    }
    
    if (document.getElementById('btnLlamarTurno')) {
        // Admin page
        document.getElementById('btnLlamarTurno').addEventListener('click', AdminHandlers.llamarTurno);
        document.getElementById('btnReiniciarCola')?.addEventListener('click', AdminHandlers.reiniciarCola);
        RenderAdmin.todo();
    }
});

// Exponer globalmente
window.AdminHandlers = AdminHandlers;
