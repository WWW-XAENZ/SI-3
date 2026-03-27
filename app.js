// ============================================
// SISTEMA DE TURNOS PARA PROVEEDORES
// Con Supabase Real-time - VERSIÓN FINAL
// ============================================

// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================

const SUPABASE_URL = 'https://kqqjlkpwctaekyzuzdqm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxcWpsa3B3Y3RhZWt5enV6ZHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQwNjA4MDAsImV4cCI6MjAxOTYzNjgwMH0.VhDAjJwgcqqiEw08i4g6CA__Y5aPGbp';

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

const CONFIG = {
    ADMIN_PASSWORD: '12345',
    LOGO_CLICKS_REQUIRED: 5,
    LOGO_CLICK_TIMEOUT: 2000,
    AUTO_REFRESH_INTERVAL: 5000,
    TURN_TIME_ESTIMATE: 5
};

let logoClickCount = 0;
let logoClickTimer = null;

// ============================================
// UTILIDADES
// ============================================

const Utils = {
    async obtenerContadorTurnos() {
        try {
            const { data, error } = await supabase
                .from('configuracion')
                .select('valor')
                .eq('clave', 'contador_turnos')
                .maybeSingle();
            
            if (error) {
                console.error('Error al obtener contador:', error);
                return 0;
            }
            
            return data && data.valor ? parseInt(data.valor) || 0 : 0;
        } catch (err) {
            console.error('Excepción en obtenerContadorTurnos:', err);
            return 0;
        }
    },

    async incrementarContadorTurnos() {
        try {
            const actual = await this.obtenerContadorTurnos();
            const nuevo = actual + 1;
            
            const { error } = await supabase
                .from('configuracion')
                .upsert(
                    { clave: 'contador_turnos', valor: nuevo.toString(), updated_at: new Date().toISOString() },
                    { onConflict: 'clave' }
                );
            
            if (error) {
                console.warn('Upsert falló:', error);
                
                const { error: insertError } = await supabase
                    .from('configuracion')
                    .insert({ 
                        clave: 'contador_turnos', 
                        valor: nuevo.toString(),
                        created_at: new Date().toISOString()
                    });
                
                if (insertError && !insertError.message.includes('duplicate')) {
                    throw insertError;
                }
            }
            
            console.log('Contador incrementado a:', nuevo);
            return nuevo;
        } catch (err) {
            console.error('Error en incrementarContadorTurnos:', err);
            AppState.contadorTurnos = (AppState.contadorTurnos || 0) + 1;
            return AppState.contadorTurnos;
        }
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
            animation: 'slideInRight 0.3s ease',
            maxWidth: '400px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        });

        if (!document.querySelector('#notificacion-styles')) {
            const style = document.createElement('style');
            style.id = 'notificacion-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                .notificacion-cerrar {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    margin-left: auto;
                    line-height: 1;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notificacion);

        const btnCerrar = notificacion.querySelector('.notificacion-cerrar');
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
// FUNCIONES DE PROVEEDORES (SUPABASE)
// ============================================

const Proveedores = {
    async registrar(datos) {
        try {
            const proveedor = {
                nombre_empresa: datos.nombreEmpresa,
                nit: datos.nit.toUpperCase(),
                contacto: datos.contacto,
                telefono: datos.telefono,
                servicio: datos.servicio,
                fecha_registro: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            
            console.log('Registrando proveedor:', proveedor);
            
            const { error: insertError } = await supabase
                .from('proveedores')
                .insert([proveedor]);
            
            if (insertError) {
                console.error('Error al insertar proveedor:', insertError);
                throw new Error(`Error al registrar proveedor: ${insertError.message}`);
            }
            
            const { data: proveedorInsertado, error: selectError } = await supabase
                .from('proveedores')
                .select('*')
                .eq('nit', proveedor.nit)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (selectError || !proveedorInsertado) {
                return {
                    id: null,
                    nombreEmpresa: proveedor.nombre_empresa,
                    nit: proveedor.nit,
                    contacto: proveedor.contacto,
                    telefono: proveedor.telefono,
                    servicio: proveedor.servicio,
                    fechaRegistro: proveedor.fecha_registro
                };
            }
            
            console.log('Proveedor registrado:', proveedorInsertado);
            
            return {
                id: proveedorInsertado.id,
                nombreEmpresa: proveedorInsertado.nombre_empresa,
                nit: proveedorInsertado.nit,
                contacto: proveedorInsertado.contacto,
                telefono: proveedorInsertado.telefono,
                servicio: proveedorInsertado.servicio,
                fechaRegistro: proveedorInsertado.fecha_registro
            };
        } catch (err) {
            console.error('Excepción en registrar proveedor:', err);
            throw err;
        }
    },

    async eliminar(id) {
        try {
            const { error } = await supabase
                .from('proveedores')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Error en eliminar proveedor:', err);
            throw err;
        }
    },

    async buscarPorNIT(nit) {
        try {
            if (!nit) return null;
            
            const nitLimpio = nit.toString().trim().toUpperCase();
            
            const { data, error } = await supabase
                .from('proveedores')
                .select('*')
                .eq('nit', nitLimpio)
                .maybeSingle();
            
            if (error) {
                console.error('Error al buscar proveedor por NIT:', error);
                return null;
            }
            
            if (!data) return null;
            
            return {
                id: data.id,
                nombreEmpresa: data.nombre_empresa,
                nit: data.nit,
                contacto: data.contacto,
                telefono: data.telefono,
                servicio: data.servicio,
                fechaRegistro: data.fecha_registro
            };
        } catch (err) {
            console.error('Error en buscarPorNIT:', err);
            return null;
        }
    },

    async actualizar(datos) {
        try {
            const updateData = {
                nombre_empresa: datos.nombreEmpresa,
                contacto: datos.contacto,
                telefono: datos.telefono,
                servicio: datos.servicio,
                updated_at: new Date().toISOString()
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
        } catch (err) {
            console.error('Error en actualizar proveedor:', err);
            return false;
        }
    },

    async cargarTodos() {
        try {
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
        } catch (err) {
            console.error('Error en cargarTodos proveedores:', err);
            return [];
        }
    }
};

// ============================================
// FUNCIONES DE TURNOS (SUPABASE)
// ============================================

const Turnos = {
    async solicitar(datosProveedor, motivo = '') {
        try {
            console.log('=== INICIANDO SOLICITUD DE TURNO ===');
            
            if (!datosProveedor.nit || !datosProveedor.nombreEmpresa) {
                throw new Error('NIT y Nombre de empresa son requeridos');
            }
            
            datosProveedor.nit = datosProveedor.nit.toString().trim().toUpperCase();
            
            console.log('Buscando proveedor por NIT:', datosProveedor.nit);
            let proveedor = await Proveedores.buscarPorNIT(datosProveedor.nit);
            
            if (!proveedor) {
                console.log('Proveedor no encontrado, registrando nuevo...');
                proveedor = await Proveedores.registrar(datosProveedor);
                if (!proveedor.id) {
                    throw new Error('No se pudo registrar el proveedor correctamente');
                }
            } else {
                console.log('Proveedor encontrado:', proveedor);
                await Proveedores.actualizar({
                    id: proveedor.id,
                    nombreEmpresa: datosProveedor.nombreEmpresa,
                    contacto: datosProveedor.contacto,
                    telefono: datosProveedor.telefono,
                    servicio: datosProveedor.servicio
                });
            }
            
            console.log('Incrementando contador...');
            const nuevoContador = await Utils.incrementarContadorTurnos();
            AppState.contadorTurnos = nuevoContador;
            
            const numeroTurno = 'T' + nuevoContador.toString().padStart(3, '0');
            console.log('Número de turno generado:', numeroTurno);
            
            const turnoData = {
                numero: numeroTurno,
                proveedor_id: proveedor.id,
                nombre_empresa: proveedor.nombreEmpresa || datosProveedor.nombreEmpresa,
                nit: proveedor.nit || datosProveedor.nit,
                motivo: motivo || '',
                hora_solicitud: Utils.obtenerHoraActual(),
                fecha_solicitud: new Date().toISOString(),
                estado: 'espera',
                created_at: new Date().toISOString()
            };
            
            console.log('Insertando turno:', turnoData);
            
            const { error: insertError } = await supabase
                .from('turnos')
                .insert([turnoData]);
            
            if (insertError) {
                console.error('Error al insertar turno:', insertError);
                console.error('Código:', insertError.code);
                console.error('Mensaje:', insertError.message);
                throw new Error(`Error al crear turno: ${insertError.message}`);
            }
            
            const { data: turnoCreado, error: selectError } = await supabase
                .from('turnos')
                .select('*')
                .eq('numero', numeroTurno)
                .eq('proveedor_id', proveedor.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (selectError || !turnoCreado) {
                console.log('Turno creado pero no se pudo consultar, usando datos locales');
                const turnoLocal = {
                    id: Date.now(),
                    numero: numeroTurno,
                    proveedorId: proveedor.id,
                    nombreEmpresa: turnoData.nombre_empresa,
                    nit: turnoData.nit,
                    motivo: turnoData.motivo,
                    horaSolicitud: turnoData.hora_solicitud,
                    fechaSolicitud: turnoData.fecha_solicitud,
                    estado: turnoData.estado
                };
                
                AppState.turnos.push(turnoLocal);
                return turnoLocal;
            }
            
            console.log('=== TURNO CREADO EXITOSAMENTE ===', turnoCreado);
            
            const resultado = {
                id: turnoCreado.id,
                numero: turnoCreado.numero,
                proveedorId: turnoCreado.proveedor_id,
                nombreEmpresa: turnoCreado.nombre_empresa,
                nit: turnoCreado.nit,
                motivo: turnoCreado.motivo,
                horaSolicitud: turnoCreado.hora_solicitud,
                fechaSolicitud: turnoCreado.fecha_solicitud,
                estado: turnoCreado.estado
            };
            
            AppState.turnos.push(resultado);
            return resultado;
            
        } catch (err) {
            console.error('=== ERROR EN SOLICITAR TURNO ===', err);
            console.error('Stack:', err.stack);
            throw err;
        }
    },

    async llamarSiguiente() {
        try {
            console.log('Buscando siguiente turno...');
            
            const { data: turnosEspera, error: errorEspera } = await supabase
                .from('turnos')
                .select('*')
                .eq('estado', 'espera')
                .order('fecha_solicitud', { ascending: true })
                .limit(1);
            
            if (errorEspera) {
                console.error('Error al buscar turnos:', errorEspera);
                return null;
            }
            
            if (!turnosEspera || turnosEspera.length === 0) {
                console.log('No hay turnos en espera');
                return null;
            }
            
            const siguienteTurno = turnosEspera[0];
            
            if (AppState.turnoActual) {
                await this.completarTurnoActual();
            }
            
            const { error: updateError } = await supabase
                .from('turnos')
                .update({
                    estado: 'atendiendo',
                    hora_llamada: Utils.obtenerHoraActual(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', siguienteTurno.id);
            
            if (updateError) {
                console.error('Error al actualizar turno:', updateError);
                return null;
            }
            
            const { data: turnoActualizado, error: selectError } = await supabase
                .from('turnos')
                .select('*')
                .eq('id', siguienteTurno.id)
                .maybeSingle();
            
            if (selectError || !turnoActualizado) {
                AppState.turnoActual = {
                    id: siguienteTurno.id,
                    numero: siguienteTurno.numero,
                    proveedorId: siguienteTurno.proveedor_id,
                    nombreEmpresa: siguienteTurno.nombre_empresa,
                    nit: siguienteTurno.nit,
                    motivo: siguienteTurno.motivo,
                    horaSolicitud: siguienteTurno.hora_solicitud,
                    horaLlamada: Utils.obtenerHoraActual(),
                    estado: 'atendiendo'
                };
            } else {
                AppState.turnoActual = {
                    id: turnoActualizado.id,
                    numero: turnoActualizado.numero,
                    proveedorId: turnoActualizado.proveedor_id,
                    nombreEmpresa: turnoActualizado.nombre_empresa,
                    nit: turnoActualizado.nit,
                    motivo: turnoActualizado.motivo,
                    horaSolicitud: turnoActualizado.hora_solicitud,
                    horaLlamada: turnoActualizado.hora_llamada,
                    estado: turnoActualizado.estado
                };
            }
            
            AppState.turnos = AppState.turnos.filter(t => t.id !== AppState.turnoActual.id);
            
            return AppState.turnoActual;
        } catch (err) {
            console.error('Error en llamarSiguiente:', err);
            return null;
        }
    },

    async completarTurnoActual() {
        if (!AppState.turnoActual) return;
        
        try {
            const historialData = {
                turno_id: AppState.turnoActual.id,
                numero: AppState.turnoActual.numero,
                nombre_empresa: AppState.turnoActual.nombreEmpresa,
                nit: AppState.turnoActual.nit,
                motivo: AppState.turnoActual.motivo,
                hora_solicitud: AppState.turnoActual.horaSolicitud,
                hora_llamada: AppState.turnoActual.horaLlamada,
                hora_finalizacion: Utils.obtenerHoraActual(),
                estado: 'completado',
                fecha: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            
            await supabase.from('historial_turnos').insert([historialData]);
            
            await supabase
                .from('turnos')
                .update({ estado: 'completado', updated_at: new Date().toISOString() })
                .eq('id', AppState.turnoActual.id);
            
            AppState.turnoActual = null;
        } catch (err) {
            console.error('Error en completarTurnoActual:', err);
        }
    },

    async cancelar(turnoId) {
        try {
            const { error } = await supabase
                .from('turnos')
                .delete()
                .eq('id', turnoId);
            
            if (error) {
                console.error('Error al cancelar:', error);
                return false;
            }
            
            AppState.turnos = AppState.turnos.filter(t => t.id !== turnoId);
            return true;
        } catch (err) {
            console.error('Error en cancelar turno:', err);
            return false;
        }
    },

    async reiniciarCola() {
        try {
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
                    fecha: new Date().toISOString(),
                    created_at: new Date().toISOString()
                }));
                
                await supabase.from('historial_turnos').insert(historialCancelados);
            }
            
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
                    fecha: new Date().toISOString(),
                    created_at: new Date().toISOString()
                }]);
            }
            
            await supabase.from('turnos').delete().neq('id', 0);
            
            await supabase
                .from('configuracion')
                .upsert(
                    { clave: 'contador_turnos', valor: '0', updated_at: new Date().toISOString() },
                    { onConflict: 'clave' }
                );
            
            AppState.contadorTurnos = 0;
            AppState.turnoActual = null;
            AppState.turnos = [];
            
            return true;
        } catch (err) {
            console.error('Error en reiniciarCola:', err);
            return false;
        }
    },

    async cargarTurnosEnEspera() {
        try {
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
        } catch (err) {
            console.error('Error en cargarTurnosEnEspera:', err);
            return [];
        }
    },

    async cargarTurnoActual() {
        try {
            const { data, error } = await supabase
                .from('turnos')
                .select('*')
                .eq('estado', 'atendiendo')
                .maybeSingle();
            
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
        } catch (err) {
            console.error('Error en cargarTurnoActual:', err);
            return null;
        }
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
            try {
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
            } catch (err) {
                historialDiv.innerHTML = '<p class="empty-message">Error al cargar historial</p>';
            }
        }
    },

    estadisticas() {
        const totalTurnosEl = document.getElementById('totalTurnos');
        const turnosEsperaEl = document.getElementById('turnosEspera');
        const totalProveedoresEl = document.getElementById('totalProveedores');
        
        if (totalTurnosEl) totalTurnosEl.textContent = AppState.historialTurnos.length;
        if (turnosEsperaEl) turnosEsperaEl.textContent = AppState.turnos.length;
        if (totalProveedoresEl) totalProveedoresEl.textContent = AppState.proveedores.length;
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
                    localStorage.removeItem('miTurnoActual');
                    container.innerHTML = `
                        <div class="no-turn-message">
                            <p>No tienes un turno activo</p>
                            <p class="hint">Solicita un turno usando el formulario</p>
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
        }
    },

    estadoCola() {
        const turnoActualEl = document.getElementById('turnoActualUsuario');
        const turnosEsperaEl = document.getElementById('turnosEnEsperaUsuario');
        const miPosicionEl = document.getElementById('miPosicion');
        const tiempoEstimadoEl = document.getElementById('tiempoEstimado');
        
        if (turnoActualEl) turnoActualEl.textContent = AppState.turnoActual ? AppState.turnoActual.numero : '--';
        if (turnosEsperaEl) turnosEsperaEl.textContent = AppState.turnos.length;
        
        const miTurno = localStorage.getItem('miTurnoActual');
        if (miTurno) {
            try {
                const turno = JSON.parse(miTurno);
                const posicion = AppState.turnos.findIndex(t => t.numero === turno.numero) + 1;
                
                if (miPosicionEl) miPosicionEl.textContent = posicion > 0 ? posicion : '--';
                if (tiempoEstimadoEl) tiempoEstimadoEl.textContent = posicion > 0 ? `${posicion * CONFIG.TURN_TIME_ESTIMATE} min` : '--';
            } catch (e) {
                if (miPosicionEl) miPosicionEl.textContent = '--';
                if (tiempoEstimadoEl) tiempoEstimadoEl.textContent = '--';
            }
        } else {
            if (miPosicionEl) miPosicionEl.textContent = '--';
            if (tiempoEstimadoEl) tiempoEstimadoEl.textContent = '--';
        }
    },

    turnosEnEspera() {
        const listaDiv = document.getElementById('listaTurnosUsuario');
        const miTurno = localStorage.getItem('miTurnoActual');
        let miTurnoNumero = null;
        
        try {
            miTurnoNumero = miTurno ? JSON.parse(miTurno).numero : null;
        } catch (e) {
            miTurnoNumero = null;
        }
        
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
        
        try {
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
                RenderAdmin.todo();
            } else {
                Utils.mostrarNotificacion('No hay turnos en espera', 'error');
            }
        } catch (err) {
            console.error('Error al llamar turno:', err);
            Utils.mostrarNotificacion('Error al llamar turno', 'error');
        } finally {
            Utils.setLoading(false);
        }
    },

    async cancelarTurno(id, numeroTurno) {
        if (confirm(`¿Está seguro de cancelar el turno ${numeroTurno}?`)) {
            try {
                const resultado = await Turnos.cancelar(id);
                if (resultado) {
                    Utils.mostrarNotificacion(`Turno ${numeroTurno} cancelado`, 'success');
                    await DataSync.cargarDatos();
                    RenderAdmin.todo();
                }
            } catch (err) {
                Utils.mostrarNotificacion('Error al cancelar turno', 'error');
            }
        }
    },

    async eliminarProveedor(id) {
        if (confirm('¿Está seguro de eliminar este proveedor?')) {
            try {
                await Proveedores.eliminar(id);
                Utils.mostrarNotificacion('Proveedor eliminado', 'success');
                await DataSync.cargarDatos();
                RenderAdmin.todo();
            } catch (err) {
                Utils.mostrarNotificacion('Error al eliminar proveedor', 'error');
            }
        }
    },

    async reiniciarCola() {
        if (confirm('¿Está seguro de reiniciar la cola?')) {
            try {
                await Turnos.reiniciarCola();
                Utils.mostrarNotificacion('Cola reiniciada', 'success');
                await DataSync.cargarDatos();
                RenderAdmin.todo();
            } catch (err) {
                Utils.mostrarNotificacion('Error al reiniciar cola', 'error');
            }
        }
    },

    async limpiarHistorial() {
        if (confirm('¿Está seguro de limpiar el historial?')) {
            try {
                await supabase.from('historial_turnos').delete().neq('id', 0);
                Utils.mostrarNotificacion('Historial limpiado', 'success');
                RenderAdmin.todo();
            } catch (err) {
                Utils.mostrarNotificacion('Error al limpiar historial', 'error');
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
        
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        Utils.setLoading(true);
        
        try {
            const datosProveedor = {
                nombreEmpresa: document.getElementById('nombreEmpresa')?.value?.trim(),
                nit: document.getElementById('nit')?.value?.trim(),
                contacto: document.getElementById('contacto')?.value?.trim(),
                telefono: document.getElementById('telefono')?.value?.trim(),
                servicio: document.getElementById('servicio')?.value
            };
            
            if (!datosProveedor.nit) throw new Error('El NIT es requerido');
            if (!datosProveedor.nombreEmpresa) throw new Error('El nombre de la empresa es requerido');
            
            const motivoInput = document.getElementById('motivoVisita');
            const motivo = motivoInput ? motivoInput.value?.trim() : '';
            
            console.log('Solicitando turno...', datosProveedor);
            
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
            
            Utils.mostrarNotificacion(`Turno ${turno.numero} solicitado exitosamente`, 'success');
            
            e.target.reset();
            const motivoGroup = document.getElementById('motivoGroup');
            if (motivoGroup) motivoGroup.style.display = 'none';
            
            await DataSync.cargarDatos();
            RenderUsuario.todo();
            
        } catch (error) {
            console.error('Error al solicitar turno:', error);
            Utils.mostrarNotificacion(error.message || 'Error al solicitar turno', 'error');
        } finally {
            Utils.setLoading(false);
        }
    }
};

// ============================================
// ACCESO AL ADMIN - 5 CLICS EN LOGO
// ============================================

const AdminAccess = {
    handleLogoClick() {
        logoClickCount++;
        console.log('Logo clicks:', logoClickCount);
        
        if (logoClickTimer) clearTimeout(logoClickTimer);
        
        logoClickTimer = setTimeout(() => {
            logoClickCount = 0;
        }, CONFIG.LOGO_CLICK_TIMEOUT);
        
        if (logoClickCount >= CONFIG.LOGO_CLICKS_REQUIRED) {
            logoClickCount = 0;
            AdminAccess.mostrarModal();
        }
    },

    mostrarModal() {
        const modal = document.getElementById('adminAccessModal');
        if (modal) {
            modal.style.display = 'block';
            const passwordInput = document.getElementById('adminPassword');
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
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
// SINCRONIZACIÓN DE DATOS
// ============================================

const DataSync = {
    async cargarDatos() {
        try {
            console.log('Cargando datos...');
            
            const [turnos, turnoActual, proveedores, historial, contador] = await Promise.all([
                Turnos.cargarTurnosEnEspera(),
                Turnos.cargarTurnoActual(),
                Proveedores.cargarTodos(),
                supabase.from('historial_turnos').select('*').limit(100),
                Utils.obtenerContadorTurnos()
            ]);
            
            AppState.turnos = turnos;
            AppState.turnoActual = turnoActual;
            AppState.proveedores = proveedores;
            AppState.historialTurnos = historial.data || [];
            AppState.contadorTurnos = contador;
            
            console.log('Datos cargados:', {
                turnos: turnos.length,
                turnoActual: turnoActual?.numero,
                proveedores: proveedores.length
            });
            
        } catch (err) {
            console.error('Error al cargar datos:', err);
        }
    },

    suscribirCambios() {
        AppState.subscription = supabase
            .channel('turnos-channel')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'turnos' }, 
                async (payload) => {
                    console.log('Cambio en turnos:', payload);
                    await this.cargarDatos();
                    if (document.getElementById('btnLlamarTurno')) {
                        RenderAdmin.todo();
                    } else {
                        RenderUsuario.todo();
                    }
                }
            )
            .subscribe();
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
        }
        
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
            }
        });
    }
};

// ============================================
// INICIALIZACIÓN DE CAMPOS DE PLACA/NIT
// ============================================

const InputConfig = {
    configurarPlacaInput() {
        const nitInput = document.getElementById('nit');
        if (nitInput) {
            nitInput.style.textTransform = 'uppercase';
            
            nitInput.addEventListener('input', function() {
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = this.value.toUpperCase();
                this.setSelectionRange(start, end);
            });
            
            nitInput.addEventListener('blur', function() {
                this.value = this.value.toUpperCase();
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
// INICIALIZACIÓN PRINCIPAL
// ============================================

const App = {
    async initAdmin() {
        console.log('Inicializando admin...');
        await DataSync.cargarDatos();
        DataSync.suscribirCambios();
        
        document.getElementById('btnLlamarTurno')?.addEventListener('click', AdminHandlers.llamarTurno);
        document.getElementById('btnReiniciarCola')?.addEventListener('click', AdminHandlers.reiniciarCola);
        document.getElementById('btnLimpiarHistorial')?.addEventListener('click', AdminHandlers.limpiarHistorial);
        
        RenderAdmin.todo();
    },

    async initUsuario() {
        console.log('Inicializando usuario...');
        await DataSync.cargarDatos();
        DataSync.suscribirCambios();
        
        InputConfig.configurarPlacaInput();
        InputConfig.configurarServicioSelect();
        
        document.getElementById('formSolicitarTurno')?.addEventListener('submit', UsuarioHandlers.solicitarTurno);
        
        RenderUsuario.todo();
    },

    initIndex() {
        console.log('Inicializando index...');
        const logo = document.getElementById('logoClick');
        if (logo) {
            logo.addEventListener('click', AdminAccess.handleLogoClick);
            logo.style.cursor = 'pointer';
        }
    }
};

// ============================================
// CARGA INICIAL
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM cargado');
    
    ModalConfig.configurar();
    
    if (document.getElementById('logoClick')) App.initIndex();
    if (document.getElementById('btnLlamarTurno')) await App.initAdmin();
    if (document.getElementById('formSolicitarTurno')) await App.initUsuario();
});

// ============================================
// EXPONER GLOBALMENTE PARA DEBUG
// ============================================

window.AdminHandlers = AdminHandlers;
window.Utils = Utils;
window.AppState = AppState;
window.supabaseClient = supabase;
