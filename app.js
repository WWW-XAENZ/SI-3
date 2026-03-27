// ============================================
// SISTEMA DE TURNOS PARA PROVEEDORES
// Con Supabase Real-time
// ============================================

// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================

const SUPABASE_URL = 'https://kqqjlkpwctaekyzuzdqm.supabase.co'; // Reemplaza con tu URL
const SUPABASE_KEY = 'sb_publishable_VhDAjJwgcqqiEw08i4g6CA__Y5aPGbp'; // Reemplaza con tu anon key

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// DATOS Y ESTADO DE LA APLICACIÓN
// ============================================

const AppState = {
    proveedores: [],
    turnos: [],
    historialTurnos: [],
    turnoActual: null,
    contadorTurnos: 0,
    isLoading: false,
    subscription: null
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
    async guardarDatos() {
        // Ya no es necesario con Supabase, los datos se guardan automáticamente
        // Esta función se mantiene por compatibilidad
    },

    async obtenerContadorTurnos() {
        const { data, error } = await supabase
            .from('configuracion')
            .select('valor')
            .eq('clave', 'contador_turnos')
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('Error al obtener contador:', error);
            return 0;
        }
        
        return data ? parseInt(data.valor) : 0;
    },

    async incrementarContadorTurnos() {
        const actual = await this.obtenerContadorTurnos();
        const nuevo = actual + 1;
        
        const { error } = await supabase
            .from('configuracion')
            .upsert({ clave: 'contador_turnos', valor: nuevo.toString() });
        
        if (error) {
            console.error('Error al incrementar contador:', error);
            return actual;
        }
        
        return nuevo;
    },

    generarNumeroTurno() {
        AppState.contadorTurnos++;
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
            animation: 'slideInRight 0.3s ease',
            maxWidth: '400px'
        });

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

        const btnCerrar = notificacion.querySelector('.notificacion-cerrar');
        btnCerrar.style.cssText = 'background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; margin-left: auto;';
        btnCerrar.onclick = () => {
            notificacion.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notificacion.remove(), 300);
        };

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
// FUNCIONES DE PROVEEDORES (SUPABASE)
// ============================================

const Proveedores = {
    async registrar(datos) {
        const proveedor = {
            nombre_empresa: datos.nombreEmpresa,
            nit: datos.nit,
            contacto: datos.contacto,
            telefono: datos.telefono,
            servicio: datos.servicio,
            fecha_registro: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('proveedores')
            .insert([proveedor])
            .select()
            .single();
        
        if (error) {
            console.error('Error al registrar proveedor:', error);
            throw error;
        }
        
        return {
            id: data.id,
            nombreEmpresa: data.nombre_empresa,
            nit: data.nit,
            contacto: data.contacto,
            telefono: data.telefono,
            servicio: data.servicio,
            fechaRegistro: data.fecha_registro
        };
    },

    async eliminar(id) {
        const { error } = await supabase
            .from('proveedores')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error al eliminar proveedor:', error);
            throw error;
        }
    },

    async obtenerPorId(id) {
        const { data, error } = await supabase
            .from('proveedores')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) return null;
        
        return {
            id: data.id,
            nombreEmpresa: data.nombre_empresa,
            nit: data.nit,
            contacto: data.contacto,
            telefono: data.telefono,
            servicio: data.servicio,
            fechaRegistro: data.fecha_registro
        };
    },

    async buscarPorNIT(nit) {
        const { data, error } = await supabase
            .from('proveedores')
            .select('*')
            .eq('nit', nit)
            .single();
        
        if (error) return null;
        
        return {
            id: data.id,
            nombreEmpresa: data.nombre_empresa,
            nit: data.nit,
            contacto: data.contacto,
            telefono: data.telefono,
            servicio: data.servicio,
            fechaRegistro: data.fecha_registro
        };
    },

    async actualizar(datos) {
        const updateData = {
            nombre_empresa: datos.nombreEmpresa,
            contacto: datos.contacto,
            telefono: datos.telefono,
            servicio: datos.servicio
        };
        
        const { error } = await supabase
            .from('proveedores')
            .update(updateData)
            .eq('id', datos.id);
        
        if (error) {
            console.error('Error al actualizar proveedor:', error);
            return false;
        }
        
        return true;
    },

    async cargarTodos() {
        const { data, error } = await supabase
            .from('proveedores')
            .select('*')
            .order('fecha_registro', { ascending: false });
        
        if (error) {
            console.error('Error al cargar proveedores:', error);
            return [];
        }
        
        return data.map(p => ({
            id: p.id,
            nombreEmpresa: p.nombre_empresa,
            nit: p.nit,
            contacto: p.contacto,
            telefono: p.telefono,
            servicio: p.servicio,
            fechaRegistro: p.fecha_registro
        }));
    }
};

// ============================================
// FUNCIONES DE TURNOS (SUPABASE)
// ============================================

const Turnos = {
    async solicitar(datosProveedor, motivo = '') {
        // Registrar o actualizar proveedor
        let proveedor = await Proveedores.buscarPorNIT(datosProveedor.nit);
        
        if (!proveedor) {
            proveedor = await Proveedores.registrar(datosProveedor);
        } else {
            await Proveedores.actualizar({
                id: proveedor.id,
                nombreEmpresa: datosProveedor.nombreEmpresa,
                contacto: datosProveedor.contacto,
                telefono: datosProveedor.telefono,
                servicio: datosProveedor.servicio
            });
        }
        
        // Incrementar contador
        const nuevoContador = await Utils.incrementarContadorTurnos();
        AppState.contadorTurnos = nuevoContador;
        
        const turnoData = {
            numero: 'T' + nuevoContador.toString().padStart(3, '0'),
            proveedor_id: proveedor.id,
            nombre_empresa: proveedor.nombreEmpresa,
            nit: proveedor.nit,
            motivo: motivo,
            hora_solicitud: Utils.obtenerHoraActual(),
            fecha_solicitud: new Date().toISOString(),
            estado: 'espera'
        };
        
        const { data, error } = await supabase
            .from('turnos')
            .insert([turnoData])
            .select()
            .single();
        
        if (error) {
            console.error('Error al crear turno:', error);
            throw error;
        }
        
        return {
            id: data.id,
            numero: data.numero,
            proveedorId: data.proveedor_id,
            nombreEmpresa: data.nombre_empresa,
            nit: data.nit,
            motivo: data.motivo,
            horaSolicitud: data.hora_solicitud,
            fechaSolicitud: data.fecha_solicitud,
            estado: data.estado
        };
    },

    async llamarSiguiente() {
        // Obtener el primer turno en espera
        const { data: turnosEspera, error: errorEspera } = await supabase
            .from('turnos')
            .select('*')
            .eq('estado', 'espera')
            .order('fecha_solicitud', { ascending: true })
            .limit(1);
        
        if (errorEspera || !turnosEspera || turnosEspera.length === 0) {
            return null;
        }
        
        const siguienteTurno = turnosEspera[0];
        
        // Si hay un turno actual, moverlo al historial
        if (AppState.turnoActual) {
            await this.completarTurnoActual();
        }
        
        // Actualizar el siguiente turno a "atendiendo"
        const { data, error } = await supabase
            .from('turnos')
            .update({
                estado: 'atendiendo',
                hora_llamada: Utils.obtenerHoraActual()
            })
            .eq('id', siguienteTurno.id)
            .select()
            .single();
        
        if (error) {
            console.error('Error al llamar turno:', error);
            return null;
        }
        
        const turnoActual = {
            id: data.id,
            numero: data.numero,
            proveedorId: data.proveedor_id,
            nombreEmpresa: data.nombre_empresa,
            nit: data.nit,
            motivo: data.motivo,
            horaSolicitud: data.hora_solicitud,
            horaLlamada: data.hora_llamada,
            estado: data.estado
        };
        
        AppState.turnoActual = turnoActual;
        return turnoActual;
    },

    async completarTurnoActual() {
        if (!AppState.turnoActual) return;
        
        const { error } = await supabase
            .from('historial_turnos')
            .insert([{
                turno_id: AppState.turnoActual.id,
                numero: AppState.turnoActual.numero,
                nombre_empresa: AppState.turnoActual.nombreEmpresa,
                nit: AppState.turnoActual.nit,
                motivo: AppState.turnoActual.motivo,
                hora_solicitud: AppState.turnoActual.horaSolicitud,
                hora_llamada: AppState.turnoActual.horaLlamada,
                hora_finalizacion: Utils.obtenerHoraActual(),
                estado: 'completado',
                fecha: new Date().toISOString()
            }]);
        
        if (error) {
            console.error('Error al completar turno:', error);
        }
        
        // Actualizar estado en turnos
        await supabase
            .from('turnos')
            .update({ estado: 'completado' })
            .eq('id', AppState.turnoActual.id);
    },

    async cancelar(turnoId) {
        const { error } = await supabase
            .from('turnos')
            .delete()
            .eq('id', turnoId);
        
        if (error) {
            console.error('Error al cancelar turno:', error);
            return false;
        }
        
        return true;
    },

    async reiniciarCola() {
        // Mover todos los turnos en espera al historial como cancelados
        const { data: turnosEspera } = await supabase
            .from('turnos')
            .select('*')
            .eq('estado', 'espera');
        
        if (turnosEspera && turnosEspera.length > 0) {
            const historialCancelados = turnosEspera.map(t => ({
                turno_id: t.id,
                numero: t.numero,
                nombre_empresa: t.nombre_empresa,
                nit: t.nit,
                motivo: t.motivo,
                hora_solicitud: t.hora_solicitud,
                hora_finalizacion: Utils.obtenerHoraActual(),
                estado: 'cancelado',
                fecha: new Date().toISOString()
            }));
            
            await supabase.from('historial_turnos').insert(historialCancelados);
        }
        
        // Cancelar turno actual si existe
        if (AppState.turnoActual) {
            await supabase.from('historial_turnos').insert([{
                turno_id: AppState.turnoActual.id,
                numero: AppState.turnoActual.numero,
                nombre_empresa: AppState.turnoActual.nombreEmpresa,
                nit: AppState.turnoActual.nit,
                motivo: AppState.turnoActual.motivo,
                hora_solicitud: AppState.turnoActual.horaSolicitud,
                hora_llamada: AppState.turnoActual.horaLlamada,
                hora_finalizacion: Utils.obtenerHoraActual(),
                estado: 'cancelado',
                fecha: new Date().toISOString()
            }]);
        }
        
        // Eliminar todos los turnos
        await supabase.from('turnos').delete().neq('id', 0);
        
        // Resetear contador
        await supabase
            .from('configuracion')
            .upsert({ clave: 'contador_turnos', valor: '0' });
        
        AppState.contadorTurnos = 0;
        AppState.turnoActual = null;
    },

    async cargarTurnosEnEspera() {
        const { data, error } = await supabase
            .from('turnos')
            .select('*')
            .eq('estado', 'espera')
            .order('fecha_solicitud', { ascending: true });
        
        if (error) {
            console.error('Error al cargar turnos:', error);
            return [];
        }
        
        return data.map(t => ({
            id: t.id,
            numero: t.numero,
            proveedorId: t.proveedor_id,
            nombreEmpresa: t.nombre_empresa,
            nit: t.nit,
            motivo: t.motivo,
            horaSolicitud: t.hora_solicitud,
            fechaSolicitud: t.fecha_solicitud,
            estado: t.estado
        }));
    },

    async cargarTurnoActual() {
        const { data, error } = await supabase
            .from('turnos')
            .select('*')
            .eq('estado', 'atendiendo')
            .single();
        
        if (error || !data) return null;
        
        return {
            id: data.id,
            numero: data.numero,
            proveedorId: data.proveedor_id,
            nombreEmpresa: data.nombre_empresa,
            nit: data.nit,
            motivo: data.motivo,
            horaSolicitud: data.hora_solicitud,
            horaLlamada: data.hora_llamada,
            estado: data.estado
        };
    },

    async obtenerPosicionEnCola(numeroTurno) {
        const turnos = await this.cargarTurnosEnEspera();
        const index = turnos.findIndex(t => t.numero === numeroTurno);
        return index !== -1 ? index + 1 : -1;
    },

    async obtenerPorNumero(numeroTurno) {
        const { data, error } = await supabase
            .from('turnos')
            .select('*')
            .eq('numero', numeroTurno)
            .single();
        
        if (error) return null;
        
        return {
            id: data.id,
            numero: data.numero,
            proveedorId: data.proveedor_id,
            nombreEmpresa: data.nombre_empresa,
            nit: data.nit,
            motivo: data.motivo,
            horaSolicitud: data.hora_solicitud,
            fechaSolicitud: data.fecha_solicitud,
            estado: data.estado
        };
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
                            <button class="btn btn-danger btn-small" onclick="AdminHandlers.cancelarTurno(${turno.id}, '${turno.numero}')">
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

    async historialTurnos() {
        const historialDiv = document.getElementById('historialTurnos');
        
        if (historialDiv) {
            const { data, error } = await supabase
                .from('historial_turnos')
                .select('*')
                .order('fecha', { ascending: false })
                .limit(20);
            
            if (error || !data || data.length === 0) {
                historialDiv.innerHTML = '<p class="empty-message">No hay historial de turnos</p>';
            } else {
                historialDiv.innerHTML = data.map(turno => `
                    <div class="history-item">
                        <span class="history-turn">${turno.numero}</span>
                        <span>${turno.nombre_empresa}</span>
                        <span class="history-time">${turno.hora_finalizacion || turno.hora_solicitud}</span>
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
            totalTurnosEl.textContent = AppState.historialTurnos.length;
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
            const posicion = AppState.turnos.findIndex(t => t.numero === turno.numero) + 1;
            
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
    async llamarTurno() {
        Utils.setLoading(true);
        
        setTimeout(async () => {
            const turno = await Turnos.llamarSiguiente();
            
            if (turno) {
                const modal = document.getElementById('turnoModal');
                const modalTurnNumber = document.getElementById('modalTurnNumber');
                const modalTurnInfo = document.getElementById('modalTurnInfo');
                
                if (modal && modalTurnNumber && modalTurnInfo) {
                    modalTurnNumber.textContent = turno.numero;
                    modalTurnInfo.textContent = turno.motivo ? 
                        `${turno.nombreEmpresa}\n${turno.motivo}` : 
                        turno.nombreEmpresa;
                    modal.style.display = 'block';
                }
                
                Utils.mostrarNotificacion(`Turno ${turno.numero} llamado`, 'success');
            } else {
                Utils.mostrarNotificacion('No hay turnos en espera', 'error');
            }
            
            Utils.setLoading(false);
        }, 300);
    },

    async cancelarTurno(id, numeroTurno) {
        if (confirm(`¿Está seguro de cancelar el turno ${numeroTurno}?`)) {
            await Turnos.cancelar(id);
            Utils.mostrarNotificacion(`Turno ${numeroTurno} cancelado`, 'success');
        }
    },

    async eliminarProveedor(id) {
        if (confirm('¿Está seguro de eliminar este proveedor?')) {
            await Proveedores.eliminar(id);
            Utils.mostrarNotificacion('Proveedor eliminado', 'success');
            await DataSync.cargarDatos();
            RenderAdmin.todo();
        }
    },

    async reiniciarCola() {
        if (confirm('¿Está seguro de reiniciar la cola? Se perderán todos los turnos en espera.')) {
            await Turnos.reiniciarCola();
            Utils.mostrarNotificacion('Cola reiniciada', 'success');
        }
    },

    async limpiarHistorial() {
        if (confirm('¿Está seguro de limpiar el historial de turnos?')) {
            const { error } = await supabase.from('historial_turnos').delete().neq('id', 0);
            if (!error) {
                Utils.mostrarNotificacion('Historial limpiado', 'success');
                RenderAdmin.todo();
            }
        }
    }
};

// ============================================
// MANEJADORES DE EVENTOS - USUARIO
// ============================================

const UsuarioHandlers = {
    async solicitarTurno(e) {
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
        
        setTimeout(async () => {
            try {
                const turno = await Turnos.solicitar(datosProveedor, motivo);
                
                localStorage.setItem('miTurnoActual', JSON.stringify(turno));
                
                const modal = document.getElementById('confirmacionModal');
                const modalMiTurno = document.getElementById('modalMiTurno');
                const modalTurnoInfo = document.getElementById('modalTurnoInfo');
                
                if (modal && modalMiTurno && modalTurnoInfo) {
                    modalMiTurno.textContent = turno.numero;
                    modalTurnoInfo.textContent = turno.motivo ? 
                        `${turno.nombreEmpresa}\n${turno.motivo}` : 
                        turno.nombreEmpresa;
                    modal.style.display = 'block';
                }
                
                Utils.mostrarNotificacion(`Turno ${turno.numero} solicitado`, 'success');
                
                e.target.reset();
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

const AdminAccess = {
    handleLogoClick() {
        console.log('Logo clicked, count:', logoClickCount);
        logoClickCount++;
        
        if (logoClickTimer) {
            clearTimeout(logoClickTimer);
        }
        
        logoClickTimer = setTimeout(() => {
            logoClickCount = 0;
        }, CONFIG.LOGO_CLICK_TIMEOUT);
        
        if (logoClickCount >= CONFIG.LOGO_CLICKS_REQUIRED) {
            console.log('5 clicks reached, showing modal');
            logoClickCount = 0;
            AdminAccess.mostrarModal();
        }
    },

    mostrarModal() {
        console.log('Showing admin modal');
        const modal = document.getElementById('adminAccessModal');
        if (modal) {
            modal.style.display = 'block';
            const passwordInput = document.getElementById('adminPassword');
            if (passwordInput) passwordInput.focus();
        }
    },

    handleLogin(e) {
        e.preventDefault();
        
        const passwordInput = document.getElementById('adminPassword');
        const password = passwordInput ? passwordInput.value : '';
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
// SINCRONIZACIÓN DE DATOS EN TIEMPO REAL
// ============================================

const DataSync = {
    async cargarDatos() {
        AppState.turnos = await Turnos.cargarTurnosEnEspera();
        AppState.turnoActual = await Turnos.cargarTurnoActual();
        AppState.proveedores = await Proveedores.cargarTodos();
        
        const { data: historial } = await supabase
            .from('historial_turnos')
            .select('*')
            .limit(100);
        AppState.historialTurnos = historial || [];
        
        const contador = await Utils.obtenerContadorTurnos();
        AppState.contadorTurnos = contador;
    },

    suscribirCambios() {
        // Suscribirse a cambios en la tabla turnos
        AppState.subscription = supabase
            .channel('turnos-channel')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'turnos' }, 
                async (payload) => {
                    console.log('Cambio detectado en turnos:', payload);
                    await this.cargarDatos();
                    
                    // Renderizar según la página actual
                    if (document.getElementById('btnLlamarTurno')) {
                        RenderAdmin.todo();
                    } else if (document.getElementById('formSolicitarTurno')) {
                        RenderUsuario.todo();
                    }
                }
            )
            .subscribe();
    },

    desuscribir() {
        if (AppState.subscription) {
            AppState.subscription.unsubscribe();
        }
    }
};

// ============================================
// CONFIGURACIÓN DE MODALES
// ============================================

const ModalConfig = {
    configurar() {
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
                loginForm.addEventListener('submit', AdminAccess.handleLogin);
            }
            
            window.onclick = (event) => {
                if (event.target === adminModal) {
                    adminModal.style.display = 'none';
                    const errorElement = document.getElementById('loginError');
                    if (errorElement) errorElement.style.display = 'none';
                }
            };
        }
        
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
    async initAdmin() {
        await DataSync.cargarDatos();
        DataSync.suscribirCambios();
        
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
        
        RenderAdmin.todo();
    },

    async initUsuario() {
        await DataSync.cargarDatos();
        DataSync.suscribirCambios();
        
        const formSolicitar = document.getElementById('formSolicitarTurno');
        if (formSolicitar) {
            formSolicitar.addEventListener('submit', UsuarioHandlers.solicitarTurno);
        }
        
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
        
        const nitInput = document.getElementById('nit');
        if (nitInput) {
            nitInput.addEventListener('input', function() {
                this.value = this.value.toUpperCase();
            });
        }
        
        RenderUsuario.todo();
    },

    initIndex() {
        const logo = document.getElementById('logoClick');
        if (logo) {
            logo.addEventListener('click', AdminAccess.handleLogoClick);
        }
    }
};

// ============================================
// INICIALIZACIÓN AL CARGAR EL DOM
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    ModalConfig.configurar();
    
    if (document.getElementById('logoClick')) {
        App.initIndex();
    }
    
    if (document.getElementById('btnLlamarTurno')) {
        await App.initAdmin();
    }
    
    if (document.getElementById('formSolicitarTurno')) {
        await App.initUsuario();
    }
});

// ============================================
// FUNCIONES GLOBALES
// ============================================

window.AdminHandlers = AdminHandlers;