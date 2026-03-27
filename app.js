// ============================================
// SISTEMA DE TURNOS PARA PROVEEDORES
// Aplicación JavaScript Profesional
// ============================================

// ============================================
// DATOS Y ESTADO DE LA APLICACIÓN
// ============================================

const AppState = {
    proveedores: JSON.parse(localStorage.getItem('proveedores')) || [],
    turnos: JSON.parse(localStorage.getItem('turnos')) || [],
    historialTurnos: JSON.parse(localStorage.getItem('historialTurnos')) || [],
    turnoActual: JSON.parse(localStorage.getItem('turnoActual')) || null,
    contadorTurnos: parseInt(localStorage.getItem('contadorTurnos')) || 0,
    isLoading: false
};

// Configuración de acceso al admin
const CONFIG = {
    ADMIN_PASSWORD: '12345',
    LOGO_CLICKS_REQUIRED: 5,
    LOGO_CLICK_TIMEOUT: 2000,
    AUTO_REFRESH_INTERVAL: 5000,
    TURN_TIME_ESTIMATE: 5 // minutos por turno

};

// Estado del logo
let logoClickCount = 0;
let logoClickTimer = null;

// ============================================
// UTILIDADES
// ============================================

const Utils = {
    guardarDatos() {
        localStorage.setItem('proveedores', JSON.stringify(AppState.proveedores));
        localStorage.setItem('turnos', JSON.stringify(AppState.turnos));
        localStorage.setItem('historialTurnos', JSON.stringify(AppState.historialTurnos));
        localStorage.setItem('turnoActual', JSON.stringify(AppState.turnoActual));
        localStorage.setItem('contadorTurnos', AppState.contadorTurnos.toString());
    },

    generarNumeroTurno() {
        AppState.contadorTurnos++;
        this.guardarDatos();
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
        const ahora = new Date();
        return ahora.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    mostrarNotificacion(mensaje, tipo = 'info') {
        // Crear elemento de notificación
        const notificacion = document.createElement('div');
        notificacion.className = `notificacion notificacion-${tipo}`;
        notificacion.innerHTML = `
            <span class="notificacion-mensaje">${mensaje}</span>
            <button class="notificacion-cerrar">&times;</button>
        `;

        // Estilos inline para la notificación
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
            animation: 'slideInRight 0.3s ease',
            maxWidth: '400px'
        });

        // Agregar estilos de animación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notificacion);

        // Botón de cerrar
        const btnCerrar = notificacion.querySelector('.notificacion-cerrar');
        btnCerrar.style.cssText = 'background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; margin-left: auto;';
        btnCerrar.onclick = () => {
            notificacion.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notificacion.remove(), 300);
        };

        // Auto-cerrar después de 4 segundos
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notificacion.remove(), 300);
            }
        }, 4000);
    },

    setLoading(isLoading) {
        AppState.isLoading = isLoading;
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.disabled = isLoading;
        });
    }
};

// ============================================
// FUNCIONES DE PROVEEDORES
// ============================================

const Proveedores = {
    registrar(datos) {
        const proveedor = {
            id: Date.now(),
            nombreEmpresa: datos.nombreEmpresa,
            nit: datos.nit,
            contacto: datos.contacto,
            telefono: datos.telefono,
            servicio: datos.servicio,
            fechaRegistro: new Date().toISOString()
        };
        
        AppState.proveedores.push(proveedor);
        Utils.guardarDatos();
        return proveedor;
    },

    eliminar(id) {
        AppState.proveedores = AppState.proveedores.filter(p => p.id !== id);
        Utils.guardarDatos();
    },

    obtenerPorId(id) {
        return AppState.proveedores.find(p => p.id === parseInt(id));
    },

    buscarPorNIT(nit) {
        return AppState.proveedores.find(p => p.nit === nit);
    },

    actualizar(datos) {
        const index = AppState.proveedores.findIndex(p => p.id === datos.id);
        if (index !== -1) {
            AppState.proveedores[index] = { ...AppState.proveedores[index], ...datos };
            Utils.guardarDatos();
            return true;
        }
        return false;
    }
};

// ============================================
// FUNCIONES DE TURNOS
// ============================================

const Turnos = {
    solicitar(datosProveedor, motivo = '') {
        // Registrar o actualizar proveedor
        let proveedor = Proveedores.buscarPorNIT(datosProveedor.nit);
        
        if (!proveedor) {
            proveedor = Proveedores.registrar(datosProveedor);
        } else {
            // Actualizar datos del proveedor existente
            Proveedores.actualizar({
                id: proveedor.id,
                nombreEmpresa: datosProveedor.nombreEmpresa,
                contacto: datosProveedor.contacto,
                telefono: datosProveedor.telefono,
                servicio: datosProveedor.servicio
            });
        }
        
        const turno = {
            numero: Utils.generarNumeroTurno(),
            proveedorId: proveedor.id,
            nombreEmpresa: proveedor.nombreEmpresa,
            nit: proveedor.nit,
            motivo: motivo,
            horaSolicitud: Utils.obtenerHoraActual(),
            fechaSolicitud: new Date().toISOString(),
            estado: 'espera'
        };
        
        AppState.turnos.push(turno);
        Utils.guardarDatos();
        return turno;
    },

    llamarSiguiente() {
        if (AppState.turnos.length === 0) {
            return null;
        }
        
        // Si hay un turno actual, moverlo al historial
        if (AppState.turnoActual) {
            AppState.historialTurnos.unshift({
                ...AppState.turnoActual,
                horaFinalizacion: Utils.obtenerHoraActual(),
                estado: 'completado'
            });
        }
        
        // Tomar el siguiente turno de la cola
        AppState.turnoActual = AppState.turnos.shift();
        AppState.turnoActual.estado = 'atendiendo';
        AppState.turnoActual.horaLlamada = Utils.obtenerHoraActual();
        
        Utils.guardarDatos();
        return AppState.turnoActual;
    },

    cancelar(numeroTurno) {
        const index = AppState.turnos.findIndex(t => t.numero === numeroTurno);
        if (index !== -1) {
            AppState.turnos.splice(index, 1);
            Utils.guardarDatos();
            return true;
        }
        return false;
    },

    reiniciarCola() {
        // Mover todos los turnos actuales al historial como cancelados
        AppState.turnos.forEach(turno => {
            AppState.historialTurnos.unshift({
                ...turno,
                horaFinalizacion: Utils.obtenerHoraActual(),
                estado: 'cancelado'
            });
        });
        
        if (AppState.turnoActual) {
            AppState.historialTurnos.unshift({
                ...AppState.turnoActual,
                horaFinalizacion: Utils.obtenerHoraActual(),
                estado: 'cancelado'
            });
        }
        
        AppState.turnos = [];
        AppState.turnoActual = null;
        AppState.contadorTurnos = 0;
        Utils.guardarDatos();
    },

    obtenerPosicionEnCola(numeroTurno) {
        const index = AppState.turnos.findIndex(t => t.numero === numeroTurno);
        return index !== -1 ? index + 1 : -1;
    },

    obtenerPorNumero(numeroTurno) {
        return AppState.turnos.find(t => t.numero === numeroTurno);
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
                turnoInfoDiv.textContent = AppState.turnoActual.motivo ? `${AppState.turnoActual.nombreEmpresa} - ${AppState.turnoActual.motivo}` : AppState.turnoActual.nombreEmpresa;
            } else {
                turnoActualDiv.textContent = '--';
                turnoInfoDiv.textContent = 'Ningún turno en atención';
            }
        }
    },

    listaTurnosEspera() {
        const listaDiv = document.getElementById('listaTurnosEspera');
        
        if (listaDiv) {
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
                            <button class="btn btn-danger btn-small" onclick="AdminHandlers.cancelarTurno('${turno.numero}')">
                                Cancelar
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }
    },

    listaProveedores() {
        const tbody = document.getElementById('proveedoresBody');
        
        if (tbody) {
            if (AppState.proveedores.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-message">No hay proveedores registrados</td></tr>';
            } else {
                tbody.innerHTML = AppState.proveedores.map(proveedor => `
                    <tr>
                        <td>${proveedor.nombreEmpresa}</td>
                        <td>${proveedor.contacto}</td>
                        <td>${proveedor.telefono}</td>
                        <td>${proveedor.servicio}</td>
                        <td>
                            <button class="btn btn-danger btn-small" onclick="AdminHandlers.eliminarProveedor(${proveedor.id})">
                                Eliminar
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    },

    historialTurnos() {
        const historialDiv = document.getElementById('historialTurnos');
        
        if (historialDiv) {
            if (AppState.historialTurnos.length === 0) {
                historialDiv.innerHTML = '<p class="empty-message">No hay historial de turnos</p>';
            } else {
                historialDiv.innerHTML = AppState.historialTurnos.slice(0, 20).map(turno => `
                    <div class="history-item">
                        <span class="history-turn">${turno.numero}</span>
                        <span>${turno.nombreEmpresa}</span>
                        <span class="history-time">${turno.horaFinalizacion || turno.horaSolicitud}</span>
                    </div>
                `).join('');
            }
        }
    },

    estadisticas() {
        const totalTurnosEl = document.getElementById('totalTurnos');
        const turnosEsperaEl = document.getElementById('turnosEspera');
        const totalProveedoresEl = document.getElementById('totalProveedores');
        
        if (totalTurnosEl) {
            totalTurnosEl.textContent = AppState.historialTurnos.filter(t => t.estado === 'completado').length;
        }
        if (turnosEsperaEl) {
            turnosEsperaEl.textContent = AppState.turnos.length;
        }
        if (totalProveedoresEl) {
            totalProveedoresEl.textContent = AppState.proveedores.length;
        }
    },

    todo() {
        this.turnoActual();
        this.listaTurnosEspera();
        this.listaProveedores();
        this.historialTurnos();
        this.estadisticas();
    }
};

// ============================================
// RENDERIZADO - USUARIO
// ============================================

const RenderUsuario = {
    miTurno() {
        const container = document.getElementById('miTurnoContainer');
        const miTurno = localStorage.getItem('miTurnoActual');
        
        if (container) {
            if (miTurno) {
                const turno = JSON.parse(miTurno);
                const posicion = Turnos.obtenerPosicionEnCola(turno.numero);
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
            } else {
                container.innerHTML = `
                    <div class="no-turn-message">
                        <p>No tienes un turno activo</p>
                        <p class="hint">Solicita un turno usando el formulario</p>
                    </div>
                `;
            }
        }
    },

    estadoCola() {
        const turnoActualEl = document.getElementById('turnoActualUsuario');
        const turnosEsperaEl = document.getElementById('turnosEnEsperaUsuario');
        const miPosicionEl = document.getElementById('miPosicion');
        const tiempoEstimadoEl = document.getElementById('tiempoEstimado');
        
        if (turnoActualEl) {
            turnoActualEl.textContent = AppState.turnoActual ? AppState.turnoActual.numero : '--';
        }
        
        if (turnosEsperaEl) {
            turnosEsperaEl.textContent = AppState.turnos.length;
        }
        
        const miTurno = localStorage.getItem('miTurnoActual');
        if (miTurno) {
            const turno = JSON.parse(miTurno);
            const posicion = Turnos.obtenerPosicionEnCola(turno.numero);
            
            if (miPosicionEl) {
                miPosicionEl.textContent = posicion > 0 ? posicion : '--';
            }
            
            if (tiempoEstimadoEl) {
                const tiempo = posicion > 0 ? posicion * CONFIG.TURN_TIME_ESTIMATE : 0;
                tiempoEstimadoEl.textContent = posicion > 0 ? `${tiempo} min` : '--';
            }
        } else {
            if (miPosicionEl) miPosicionEl.textContent = '--';
            if (tiempoEstimadoEl) tiempoEstimadoEl.textContent = '--';
        }
    },

    turnosEnEspera() {
        const listaDiv = document.getElementById('listaTurnosUsuario');
        const miTurno = localStorage.getItem('miTurnoActual');
        const miTurnoNumero = miTurno ? JSON.parse(miTurno).numero : null;
        
        if (listaDiv) {
            if (AppState.turnos.length === 0) {
                listaDiv.innerHTML = '<p class="empty-message">No hay turnos en espera</p>';
            } else {
                listaDiv.innerHTML = AppState.turnos.map(turno => `
                    <div class="turn-item-user ${turno.numero === miTurnoNumero ? 'current' : ''}">
                        <span class="turn-item-number">${turno.numero}</span>
                        <div class="turn-item-info">
                            <div class="turn-item-company">${turno.nombreEmpresa}</div>
                            <div class="turn-item-time">${turno.horaSolicitud}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
    },

    todo() {
        this.miTurno();
        this.estadoCola();
        this.turnosEnEspera();
    }
};

// ============================================
// MANEJADORES DE EVENTOS - ADMIN
// ============================================

const AdminHandlers = {
    llamarTurno() {
        Utils.setLoading(true);
        
        setTimeout(() => {
            const turno = Turnos.llamarSiguiente();
            
            if (turno) {
                // Mostrar modal
                const modal = document.getElementById('turnoModal');
                const modalTurnNumber = document.getElementById('modalTurnNumber');
                const modalTurnInfo = document.getElementById('modalTurnInfo');
                
                if (modal && modalTurnNumber && modalTurnInfo) {
                    modalTurnNumber.textContent = turno.numero;
                    modalTurnInfo.textContent = turno.motivo ? `${turno.nombreEmpresa}\n${turno.motivo}` : turno.nombreEmpresa;
                    modal.style.display = 'block';
                }
                
                Utils.mostrarNotificacion(`Turno ${turno.numero} llamado`, 'success');
                
                RenderAdmin.todo();
            } else {
                Utils.mostrarNotificacion('No hay turnos en espera', 'error');
            }
            
            Utils.setLoading(false);
        }, 300);
    },

    cancelarTurno(numeroTurno) {
        if (confirm(`¿Está seguro de cancelar el turno ${numeroTurno}?`)) {
            Turnos.cancelar(numeroTurno);
            Utils.mostrarNotificacion(`Turno ${numeroTurno} cancelado`, 'success');
            RenderAdmin.todo();
        }
    },

    eliminarProveedor(id) {
        if (confirm('¿Está seguro de eliminar este proveedor?')) {
            Proveedores.eliminar(id);
            Utils.mostrarNotificacion('Proveedor eliminado', 'success');
            RenderAdmin.todo();
        }
    },

    reiniciarCola() {
        if (confirm('¿Está seguro de reiniciar la cola? Se perderán todos los turnos en espera.')) {
            Turnos.reiniciarCola();
            Utils.mostrarNotificacion('Cola reiniciada', 'success');
            RenderAdmin.todo();
        }
    },

    limpiarHistorial() {
        if (confirm('¿Está seguro de limpiar el historial de turnos?')) {
            AppState.historialTurnos = [];
            Utils.guardarDatos();
            Utils.mostrarNotificacion('Historial limpiado', 'success');
            RenderAdmin.todo();
        }
    }
};

// ============================================
// MANEJADORES DE EVENTOS - USUARIO
// ============================================

const UsuarioHandlers = {
    solicitarTurno(e) {
        e.preventDefault();
        
        Utils.setLoading(true);
        
        const datosProveedor = {
            nombreEmpresa: document.getElementById('nombreEmpresa').value,
            nit: document.getElementById('nit').value,
            contacto: document.getElementById('contacto').value,
            telefono: document.getElementById('telefono').value,
            servicio: document.getElementById('servicio').value
        };
        
        const motivo = document.getElementById('motivoVisita') ? document.getElementById('motivoVisita').value : '';
        
        setTimeout(() => {
            try {
                const turno = Turnos.solicitar(datosProveedor, motivo);
                
                // Guardar el turno del usuario
                localStorage.setItem('miTurnoActual', JSON.stringify(turno));
                
                // Mostrar modal de confirmación
                const modal = document.getElementById('confirmacionModal');
                const modalMiTurno = document.getElementById('modalMiTurno');
                const modalTurnoInfo = document.getElementById('modalTurnoInfo');
                
                if (modal && modalMiTurno && modalTurnoInfo) {
                    modalMiTurno.textContent = turno.numero;
                    modalTurnoInfo.textContent = turno.motivo ? `${turno.nombreEmpresa}\n${turno.motivo}` : turno.nombreEmpresa;
                    modal.style.display = 'block';
                }
                
                Utils.mostrarNotificacion(`Turno ${turno.numero} solicitado`, 'success');
                
                e.target.reset();
                
                RenderUsuario.todo();
            } catch (error) {
                Utils.mostrarNotificacion('Error al solicitar turno: ' + error.message, 'error');
            }
            
            Utils.setLoading(false);
        }, 500);
    }
};

// ============================================
// ACCESO AL ADMIN - 5 CLICS EN LOGO
// ============================================

// ============================================
// ACCESO AL ADMIN - 5 CLICS EN LOGO
// ============================================

const AdminAccess = {
    handleLogoClick() {
        console.log('Logo clicked, count:', logoClickCount);
        logoClickCount++;
        console.log('New count:', logoClickCount);
        
        if (logoClickTimer) {
            clearTimeout(logoClickTimer);
        }
        
        logoClickTimer = setTimeout(() => {
            logoClickCount = 0;
        }, CONFIG.LOGO_CLICK_TIMEOUT);
        
        if (logoClickCount >= CONFIG.LOGO_CLICKS_REQUIRED) {
            console.log('5 clicks reached, showing modal');
            logoClickCount = 0;
            AdminAccess.mostrarModal(); // ← CORREGIDO: usar AdminAccess en lugar de this
        }
    },

    mostrarModal() {
        console.log('Showing admin modal');
        const modal = document.getElementById('adminAccessModal');
        if (modal) {
            modal.style.display = 'block';
            const passwordInput = document.getElementById('adminPassword');
            if (passwordInput) passwordInput.focus();
        } else {
            console.log('Modal not found');
        }
    },

    handleLogin(e) {
        e.preventDefault();
        console.log('handleLogin called');
        
        const passwordInput = document.getElementById('adminPassword');
        const password = passwordInput ? passwordInput.value : '';
        console.log('Password entered:', password);
        console.log('Expected password:', CONFIG.ADMIN_PASSWORD);
        const errorElement = document.getElementById('loginError');
        
        if (password === CONFIG.ADMIN_PASSWORD) {
            Utils.mostrarNotificacion('Acceso concedido', 'success');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 500);
        } else {
            if (errorElement) {
                errorElement.textContent = 'Contraseña incorrecta';
                errorElement.style.display = 'block';
            }
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
            Utils.mostrarNotificacion('Contraseña incorrecta', 'error');
        }
    }
};

// ============================================
// CONFIGURACIÓN DE MODALES
// ============================================

const ModalConfig = {
    configurar() {
        // Modal de admin en index
        const adminModal = document.getElementById('adminAccessModal');
        if (adminModal) {
            const closeBtn = adminModal.querySelector('.close-modal');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    adminModal.style.display = 'none';
                    const errorElement = document.getElementById('loginError');
                    if (errorElement) errorElement.style.display = 'none';
                };
            }
            
            const loginForm = document.getElementById('adminLoginForm');
            if (loginForm) {
                console.log('Login form found, adding submit listener');
                loginForm.addEventListener('submit', AdminAccess.handleLogin);
                console.log('Submit listener added successfully');
            } else {
                console.log('Login form not found');
            }
            
            window.onclick = (event) => {
                if (event.target === adminModal) {
                    adminModal.style.display = 'none';
                    const errorElement = document.getElementById('loginError');
                    if (errorElement) errorElement.style.display = 'none';
                }
            };
        }
        
        // Modal de turno en admin
        const turnoModal = document.getElementById('turnoModal');
        if (turnoModal) {
            const closeBtn = turnoModal.querySelector('.close-modal');
            if (closeBtn) {
                closeBtn.onclick = () => turnoModal.style.display = 'none';
            }
            window.onclick = (event) => {
                if (event.target === turnoModal) {
                    turnoModal.style.display = 'none';
                }
            };
        }
        
        // Modal de confirmación en usuario
        const confirmacionModal = document.getElementById('confirmacionModal');
        if (confirmacionModal) {
            const closeBtn = confirmacionModal.querySelector('.close-modal');
            if (closeBtn) {
                closeBtn.onclick = () => confirmacionModal.style.display = 'none';
            }
            window.onclick = (event) => {
                if (event.target === confirmacionModal) {
                    confirmacionModal.style.display = 'none';
                }
            };
        }
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================

const App = {
    initAdmin() {
        // Configurar botones
        const btnLlamarTurno = document.getElementById('btnLlamarTurno');
        if (btnLlamarTurno) {
            btnLlamarTurno.addEventListener('click', AdminHandlers.llamarTurno);
        }
        
        const btnReiniciarCola = document.getElementById('btnReiniciarCola');
        if (btnReiniciarCola) {
            btnReiniciarCola.addEventListener('click', AdminHandlers.reiniciarCola);
        }
        
        const btnLimpiarHistorial = document.getElementById('btnLimpiarHistorial');
        if (btnLimpiarHistorial) {
            btnLimpiarHistorial.addEventListener('click', AdminHandlers.limpiarHistorial);
        }
        
        // Renderizar datos iniciales
        RenderAdmin.todo();
    },

    initUsuario() {
        // Configurar formulario de solicitud
        const formSolicitar = document.getElementById('formSolicitarTurno');
        if (formSolicitar) {
            formSolicitar.addEventListener('submit', UsuarioHandlers.solicitarTurno);
        }
        
        // Configurar visibilidad del campo motivo
        const servicioSelect = document.getElementById('servicio');
        const motivoGroup = document.getElementById('motivoGroup');
        if (servicioSelect && motivoGroup) {
            servicioSelect.addEventListener('change', function() {
                if (this.value === 'otro') {
                    motivoGroup.style.display = 'block';
                    document.getElementById('motivoVisita').setAttribute('required', '');
                } else {
                    motivoGroup.style.display = 'none';
                    document.getElementById('motivoVisita').removeAttribute('required');
                }
            });
        }
        
        // Configurar campo de placa en mayusculas
        const nitInput = document.getElementById('nit');
        if (nitInput) {
            nitInput.addEventListener('input', function() {
                this.value = this.value.toUpperCase();
            });
        }
        
        // Renderizar datos iniciales
        RenderUsuario.todo();
        
        // Actualizar cada 5 segundos
        setInterval(() => {
            RenderUsuario.todo();
        }, CONFIG.AUTO_REFRESH_INTERVAL);
    },

    initIndex() {
        // Configurar clics en logo para acceso al admin
        const logo = document.getElementById('logoClick');
        if (logo) {
            console.log('Logo found, adding click listener');
            logo.addEventListener('click', AdminAccess.handleLogoClick);
            console.log('Click listener added successfully');
        } else {
            console.log('Logo not found');
        }
    }
};

// ============================================
// INICIALIZACIÓN AL CARGAR EL DOM
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    ModalConfig.configurar();
    
    // Verificar si estamos en la página principal
    if (document.getElementById('logoClick')) {
        App.initIndex();
    }
    
    // Verificar si estamos en la página de admin
    if (document.getElementById('btnLlamarTurno')) {
        App.initAdmin();
    }
    
    // Verificar si estamos en la página de usuario
    if (document.getElementById('formSolicitarTurno')) {
        App.initUsuario();
    }
});

// ============================================
// FUNCIONES GLOBALES (para onclick en HTML)
// ============================================

window.AdminHandlers = AdminHandlers;
