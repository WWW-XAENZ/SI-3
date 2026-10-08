// ============================================
// SISTEMA DE TURNOS PROFESIONAL - ESTILO EPS
// VERSI�N CON RECARGA AUTO Y ELIMINAR PROVEEDOR CORREGIDO
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

const escaparHtml = valor => String(valor).replace(/[&<>"']/g, caracter => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[caracter]));

const normalizarTipoVehiculo = valor => String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

const iconoTipoVehiculoSvg = (valor, incluirRuedas = true) => {
    const tipoNormalizado = normalizarTipoVehiculo(valor);
    const tipo = tipoNormalizado.includes('CONTEN') ? 'contenedor'
        : tipoNormalizado.includes('CARPADO') ? 'carpado'
            : tipoNormalizado.includes('FURGON') ? 'furgon'
                : tipoNormalizado.includes('MULA') ? 'mula'
                    : tipoNormalizado.includes('MOTO') ? 'moto'
                        : tipoNormalizado.includes('OTRO') ? 'otro'
                            : tipoNormalizado.includes('PARTICULAR') ? 'particular'
                                : 'sencillo';
        if (tipo === 'otro') {
            return '<svg class="dispatch-vehicle-svg vehicle-type-icon" viewBox="0 0 120 64" role="img" aria-label="Persona"><g class="dispatch-person-figure"><circle cx="60" cy="12" r="8"/><path d="M45 31q0-9 9-9h12q9 0 9 9v14h-8v15H54V45h-9z"/><path d="m47 31-11 16m37-16 11 16"/></g></svg>';
        }
        const sprites = {
            mula: { src: 'vehiculo-mula.png', ratio: 490 / 190, wheelSize: 11, wheels: [[11.2, 78.9], [23, 78.9], [58.4, 78.9], [85.2, 78.9]], label: 'MULA' },
            contenedor: { src: 'vehiculo-contenedor.png', ratio: 465 / 215, wheelSize: 11, wheels: [[13.2, 80.9], [26.5, 80.9], [83, 80.9]], label: 'CONTENEDOR' },
            carpado: { src: 'vehiculo-carpado.png', ratio: 450 / 208, wheelSize: 12, wheels: [[16.9, 82.7], [31.7, 82.7], [81.8, 82.7]], label: 'CARPADO' },
            furgon: { src: 'vehiculo-furgon.png', ratio: 395 / 215, wheelSize: 14, wheels: [[22.2, 79.5], [80.6, 79.5]], label: 'FURGON' },
            moto: { src: 'vehiculo-moto.png', ratio: 340 / 220, wheelSize: 28, wheels: [[18.7, 70.2], [80.4, 70.5]], label: 'MOTO' },
            particular: { src: 'vehiculo-particular.png', ratio: 390 / 185, wheelSize: 13, wheels: [[21.8, 77], [80.3, 77]], label: 'PARTICULAR' },
            sencillo: { src: 'vehiculo-particular.png', ratio: 390 / 185, wheelSize: 13, wheels: [[21.8, 77], [80.3, 77]], label: 'SENCILLO' }
        };
        const sprite = sprites[tipo] || sprites.sencillo;
        const ruedasRecortadas = incluirRuedas ? sprite.wheels.map(([x, y]) => `
            <span class="dispatch-crop-wheel" style="left:${x}%;top:${y}%;--wheel-size:${sprite.wheelSize}%">
                <svg class="dispatch-crop-wheel-spin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1v22M1 12h22M4.2 4.2l15.6 15.6M19.8 4.2 4.2 19.8"/><circle cx="12" cy="12" r="3"/></svg>
            </span>
        `).join('') : '';
        return `<span class="dispatch-vehicle-crop" data-vehicle-type="${tipo}" style="--sprite-ratio:${sprite.ratio}" role="img" aria-label="${sprite.label} en ruta"><img class="dispatch-vehicle-crop-image" src="${sprite.src}" alt="" draggable="false">${ruedasRecortadas}</span>`;

};

window.iconoTipoVehiculoSvg = iconoTipoVehiculoSvg;

const iconoTipoServicioSvg = valor => {
    const iconos = {
        entrega: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.2l8 4.5"/>',
        servicio: '<path d="M14.5 6.5a4 4 0 0 0-5.2 5.2l-5.5 5.5a1.4 1.4 0 0 0 2 2l5.5-5.5a4 4 0 0 0 5.2-5.2l-2.2 2.2-2-2 2.2-2.2Z"/>',
        reunion: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20M16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.5 4.4V20"/>',
        otro: '<circle cx="12" cy="12" r="9"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>'
    };
    const tipo = String(valor || '').toLowerCase();
    return `<svg class="service-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconos[tipo] || iconos.otro}</svg>`;
};

function inicializarIconoSelect(select, crearIcono) {
    if (!select) return;

    let control = select.closest('.select-icon-wrap');
    if (!control) {
        control = document.createElement('div');
        control.className = 'select-icon-wrap';
        select.parentElement.insertBefore(control, select);
        control.appendChild(select);
        const icon = document.createElement('span');
        icon.className = 'select-icon';
        icon.hidden = true;
        icon.setAttribute('aria-hidden', 'true');
        control.appendChild(icon);
    }

    const icon = control.querySelector('.select-icon');
    const actualizar = () => {
        const tipo = select.value;
        icon.hidden = !tipo;
        icon.innerHTML = tipo ? crearIcono(tipo) : '';
    };

    select.addEventListener('change', actualizar);
    select.addEventListener('focus', actualizar);
    select.form?.addEventListener('reset', () => requestAnimationFrame(actualizar));
    actualizar();
}

function inicializarVistasPreviasTipoVehiculo() {
    ['#despachoTipoVehiculo', '#transportistaTipoVehiculo', '#editHistTipo', '#sinTurnoTipo']
        .forEach(selector => inicializarIconoSelect(document.querySelector(selector), tipo => iconoTipoVehiculoSvg(tipo, false)));

    inicializarIconoSelect(document.getElementById('servicio'), iconoTipoServicioSvg);
}

function formatearFacturasHistorial(turno) {
    const factura = String(turno.numFactura || turno.num_factura || '').trim();
    if (!factura) return '-';

    const coincidencias = [...factura.matchAll(/\b(SI3\s+ZF|SIE)\s*\(([^)]+)\)/gi)];
    if (normalizarTipoVehiculo(turno.destino || turno.destino_vehiculo) !== 'AMBOS' || coincidencias.length < 2) {
        return escaparHtml(factura);
    }

    return `<div class="history-invoice-list">${coincidencias.map(([, destino, numero]) => `
        <span class="history-invoice-chip"><small>${escaparHtml(destino.toUpperCase())}</small><strong>${escaparHtml(numero.trim())}</strong></span>
    `).join('')}</div>`;
}

window.formatearFacturasHistorial = formatearFacturasHistorial;

window.refrescarVistaPreviaTipoVehiculo = selector => {
    const select = typeof selector === 'string' ? document.getElementById(selector) : selector;
    select?.dispatchEvent(new Event('change', { bubbles: true }));
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarVistasPreviasTipoVehiculo, { once: true });
} else {
    inicializarVistasPreviasTipoVehiculo();
}

const tarjetaMaterialSapAdminHtml = (material, claseAdicional = '') => {
    const codigo = typeof material === 'string'
        ? material
        : material?.codigoSap || material?.codigo_sap || '';
    const descripcion = window.CatalogoMaterialesSIE?.get(String(codigo))
        || window.CatalogoMaterialesSIP?.get(String(codigo));
    const clases = `admin-sap-item${claseAdicional ? ` ${claseAdicional}` : ''}`;
    return `<span class="${clases}"><strong>${escaparHtml(codigo || 'Código no disponible')}</strong><span>${escaparHtml(descripcion || 'Descripción no disponible')}</span></span>`;
};

const botonMostrarMaterialesSapHtml = (materiales, etiqueta = 'Mostrar', mostrarCantidad = true) => {
    const lista = Array.isArray(materiales) ? materiales : [];
    const cantidad = mostrarCantidad ? ` <span>${lista.length}</span>` : '';
    return `<button type="button" class="sap-materials-trigger" aria-haspopup="dialog" data-materiales-sap="${escaparHtml(JSON.stringify(lista))}">${escaparHtml(etiqueta)}${cantidad}</button>`;
};

window.botonMostrarMaterialesSapHtml = botonMostrarMaterialesSapHtml;
document.addEventListener('click', event => {
    const botonMateriales = event.target instanceof Element
        ? event.target.closest('.sap-materials-trigger')
        : null;
    if (botonMateriales) window.mostrarMaterialesSapDialogo?.(botonMateriales);
});

window.mostrarMaterialesSapDialogo = trigger => {
    let materiales;
    try {
        materiales = JSON.parse(trigger.dataset.materialesSap || '[]');
    } catch (error) {
        return;
    }
    if (!Array.isArray(materiales)) return;

    let dialogo = document.getElementById('sapMaterialsDialog');
    if (!dialogo) {
        dialogo = document.createElement('dialog');
        dialogo.id = 'sapMaterialsDialog';
        dialogo.className = 'sap-materials-dialog';
        dialogo.innerHTML = `
            <div class="sap-materials-dialog-head">
                <div>
                    <h2>Materiales SAP</h2>
                    <span class="sap-materials-dialog-count"></span>
                </div>
                <button type="button" class="sap-materials-dialog-close" aria-label="Cerrar materiales">&times;</button>
            </div>
            <div class="sap-materials-dialog-list"></div>
        `;
        dialogo.querySelector('.sap-materials-dialog-close').addEventListener('click', () => dialogo.close());
        dialogo.addEventListener('click', event => {
            if (event.target === dialogo) dialogo.close();
        });
        document.body.appendChild(dialogo);
    }

    dialogo.querySelector('.sap-materials-dialog-count').textContent = `${materiales.length} material(es)`;
    dialogo.querySelector('.sap-materials-dialog-list').innerHTML = `
        <div class="admin-sap-list">${materiales.map(material => tarjetaMaterialSapAdminHtml(material)).join('')}</div>
    `;
    if (!dialogo.open) dialogo.showModal();
};

const bloqueMaterialesSapAdminHtml = materiales => {
    const lista = Array.isArray(materiales) ? materiales : [];
    return `
        <div class="admin-sap-materials">
            <strong>Materiales SAP</strong>
            ${botonMostrarMaterialesSapHtml(lista)}
        </div>
    `;
};

const CONFIG = {
    ADMIN_PASSWORD: 'RECEPCIONCEDI2',
    DESPACHADOR_PASSWORD: 'RECEPCIONDESPACHO',
    FACTURAS_PASSWORD: 'FACTURASLOG2',
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
    proveedoresTransporte: [],
    historial: [],
    editandoProveedorIndex: null
};

let logoClickCount = 0;
let logoClickTimer = null;
let syncInterval = null;

const SonidoAlerta = {
    contexto: null,
    
    inicializar() {
        if (window.SonidoSI3) {
            window.SonidoSI3.inicializar();
        }
        if (!this.contexto) {
            try {
                this.contexto = new (window.AudioContext || window.webkitAudioContext)();
            } catch(e) {}
        }
        if (this.contexto && this.contexto.state === 'suspended') {
            this.contexto.resume().catch(() => {});
        }
        if (window.SonidoSI3) {
            window.SonidoSI3.asegurarContexto();
        }
    },
    
    reproducir(veces = 3) {
        if (window.SonidoSI3) {
            window.SonidoSI3.tocarAlerta();
            return;
        }
        this.inicializar();
    }
};

window.addEventListener('visibilitychange', () => {
    if (!document.hidden && SonidoAlerta.contexto && SonidoAlerta.contexto.state === 'suspended') {
        SonidoAlerta.contexto.resume().catch(() => {});
    }
});

// ============================================
// UTILIDADES
// ============================================

const Utils = {
    notificacionesRecientes: new Map(),

    reordenarNotificaciones() {
        let top = 20;
        document.querySelectorAll('.notificacion').forEach(notificacion => {
            notificacion.style.top = `${top}px`;
            top += notificacion.offsetHeight + 10;
        });
    },

    setLoading(loading) {
        const btn = document.getElementById('btnSolicitar');
        if (btn) {
            btn.disabled = loading;
            btn.textContent = loading ? 'Solicitando...' : 'Solicitar Turno';
        }
    },

    mostrarNotificacion(mensaje, tipo = 'info', requireAccept = false) {
        const texto = String(mensaje ?? '');
        const ahora = Date.now();
        const clave = `${tipo}:${texto}`;
        const visibleDuplicada = Array.from(document.querySelectorAll('.notificacion'))
            .find(notificacion => notificacion.dataset.notificationKey === clave);
        if (visibleDuplicada) return null;

        const notificacionReciente = this.notificacionesRecientes.get(clave);
        if (notificacionReciente && ahora - notificacionReciente < 2500) return null;
        this.notificacionesRecientes.set(clave, ahora);
        for (const [notificacionClave, timestamp] of this.notificacionesRecientes) {
            if (ahora - timestamp > 10000) this.notificacionesRecientes.delete(notificacionClave);
        }

        const visibles = document.querySelectorAll('.notificacion');
        if (visibles.length >= 3) {
            visibles[0].remove();
            this.reordenarNotificaciones();
        }

        const notificacion = document.createElement('div');
        notificacion.className = 'notificacion';
        notificacion.dataset.notificationKey = clave;

        const iconos = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠︝',
            'info': 'ℹ︝'
        };

        let contenido = `
            <span class="notif-icon">${iconos[tipo] || 'ℹ'}</span>
            <span class="notificacion-mensaje">${texto}</span>
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
        this.reordenarNotificaciones();

        const quitarNotificacion = () => {
            notificacion.remove();
            this.reordenarNotificaciones();
        };

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
                setTimeout(quitarNotificacion, 300);
            };
        } else {
            const btnCerrar = notificacion.querySelector('.notificacion-cerrar');
            btnCerrar.style.cssText = 'background: none; border: none; color: white; font-size: 22px; cursor: pointer; padding: 0; margin-left: auto; opacity: 0.8;';
            btnCerrar.onclick = () => {
                notificacion.style.animation = 'notifSlideOut 0.3s ease forwards';
                setTimeout(quitarNotificacion, 300);
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
                        if (notificacion.parentNode) quitarNotificacion();
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
                 console.error(`Intento ${intento}/${maxIntentos} fall�:`, error.message);
                if (intento === maxIntentos) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            }
        }
    },

    formatearFecha(fechaISO) {
        if (!fechaISO) return 'N/A';
        const fechaTexto = String(fechaISO).split('T')[0];
        const partes = fechaTexto.split('-');
        if (partes.length === 3 && partes[0].length === 4) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        const fecha = new Date(fechaISO);
        if (Number.isNaN(fecha.getTime())) return 'N/A';
        return fecha.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    },

    formatearHora(hora) {
        if (!hora) return '-';
        try {
            const horaTexto = String(hora).split('T').pop();
            const partes = horaTexto.split(':');
            if (partes.length >= 2) {
                let h = parseInt(partes[0]);
                if (Number.isNaN(h)) return hora;
                const min = partes[1].slice(0, 2);
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

    guardarContadorPrefijo(prefijo, contador) {
        localStorage.setItem(`contadorTurnos_${prefijo}`, contador.toString());
    },

    obtenerContadorPrefijo(prefijo) {
        return parseInt(localStorage.getItem(`contadorTurnos_${prefijo}`)) || 0;
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
             console.warn('Supabase no est� inicializado');
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
            
             console.log('? Conexi�n con Supabase exitosa');
            return true;
        } catch (error) {
             console.warn('Error de conexi�n:', error.message);
            return false;
        }
    },

    async obtenerFechaReinicioContador() {
        const clave = 'contador_reinicio_fecha';
        const fechaLocal = localStorage.getItem(clave);
        if (!window.supabaseClient) return fechaLocal;

        try {
            const { data, error } = await window.supabaseClient
                .from('configuracion')
                .select('valor')
                .eq('clave', clave)
                .maybeSingle();
            if (error) throw error;

            const fechaRemota = data?.valor || '';
            if (!fechaRemota && fechaLocal) {
                const { error: errorGuardar } = await window.supabaseClient
                    .from('configuracion')
                    .upsert({ clave, valor: fechaLocal, descripcion: 'Fecha de reinicio de contadores' }, { onConflict: 'clave' });
                if (errorGuardar) throw errorGuardar;
                return fechaLocal;
            }

            if (fechaRemota !== fechaLocal) {
                LocalStorage.guardarContadorPrefijo('T', 0);
                LocalStorage.guardarContadorPrefijo('C', 0);
                AppState.contadorTurnos = 0;
                AppState.contadorTurnosT = 0;
                AppState.contadorTurnosC = 0;
                if (fechaRemota) localStorage.setItem(clave, fechaRemota);
                else localStorage.removeItem(clave);
            }

            return fechaRemota || null;
        } catch (error) {
            console.warn('Error al obtener fecha de reinicio del contador:', error.message);
            return fechaLocal;
        }
    },

    async guardarFechaReinicioContador(fecha) {
        const clave = 'contador_reinicio_fecha';
        if (window.supabaseClient) {
            const { error } = await window.supabaseClient
                .from('configuracion')
                .upsert({ clave, valor: fecha, descripcion: 'Fecha de reinicio de contadores' }, { onConflict: 'clave' });
            if (error) throw error;
        }
        localStorage.setItem(clave, fecha);
    },

    obtenerMaximosTurnos(turnos, fechaReinicio) {
        let maxT = 0;
        let maxC = 0;
        const timestampReinicio = fechaReinicio ? Date.parse(fechaReinicio) : null;

        turnos.forEach(turno => {
            if (Number.isFinite(timestampReinicio)) {
                const fechaTurno = Date.parse(turno.fechaSolicitud || '');
                if (!Number.isFinite(fechaTurno) || fechaTurno < timestampReinicio) return;
            }

            const coincidencia = String(turno.numero || '').match(/^([TC])(\d+)$/i);
            if (!coincidencia) return;
            const numero = parseInt(coincidencia[2], 10);
            if (coincidencia[1].toUpperCase() === 'T') maxT = Math.max(maxT, numero);
            else maxC = Math.max(maxC, numero);
        });

        return { maxT, maxC };
    },

    async obtenerContadorTurnos(prefijo = 'T') {
        const claveLocal = prefijo === 'C' ? 'contador_turnos_C' : 'contador_turnos';
        const contadorLocal = LocalStorage.obtenerContadorPrefijo(prefijo);
        
        if (!window.supabaseClient) {
            return contadorLocal;
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('configuracion')
                .select('valor')
                .eq('clave', claveLocal)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    await window.supabaseClient
                        .from('configuracion')
                        .insert({ 
                            clave: claveLocal, 
                            valor: contadorLocal.toString(), 
                            descripcion: `Contador de turnos ${prefijo}` 
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

    async incrementarContadorTurnos(prefijo = 'T', signal = null) {
        console.log('=== Incrementando contador ===');
        await this.obtenerFechaReinicioContador();
        
        if (!window.supabaseClient) {
            const contadorLocal = LocalStorage.obtenerContadorPrefijo(prefijo);
            console.log('Supabase no disponible, usando contador local');
            const nuevoContador = contadorLocal + 1;
            LocalStorage.guardarContadorPrefijo(prefijo, nuevoContador);
            return nuevoContador;
        }
        
        try {
            const contadorActual = await this.obtenerContadorTurnos(prefijo);
            console.log('Contador actual (max local+supabase):', contadorActual);
            const nuevoContador = contadorActual + 1;
            console.log('Nuevo contador:', nuevoContador);
            LocalStorage.guardarContadorPrefijo(prefijo, nuevoContador);
            
            const claveLocal = prefijo === 'C' ? 'contador_turnos_C' : 'contador_turnos';
            console.log('Actualizando contador en Supabase...');
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout Supabase (contador)')), 5000)
            );
            const upsertPromise = window.supabaseClient
                .from('configuracion')
                .upsert({ 
                    clave: claveLocal, 
                    valor: nuevoContador.toString(),
                    descripcion: `Contador global de turnos ${prefijo}`,
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
            console.warn('Error al incrementar contador, usando local:', error.message);
            const contadorLocal = LocalStorage.obtenerContadorPrefijo(prefijo);
            const nuevoContador = contadorLocal + 1;
            LocalStorage.guardarContadorPrefijo(prefijo, nuevoContador);
            return nuevoContador;
        }
    },

    async incrementarContadorTurnosHasta(prefijo, valor) {
        const claveLocal = prefijo === 'C' ? 'contador_turnos_C' : 'contador_turnos';
        LocalStorage.guardarContadorPrefijo(prefijo, valor);
        if (!window.supabaseClient) return;
        try {
            const { error } = await window.supabaseClient
                .from('configuracion')
                .upsert({ 
                    clave: claveLocal, 
                    valor: valor.toString(),
                    descripcion: `Contador global de turnos ${prefijo}`,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'clave' });
            if (error) throw error;
        } catch (e) {
            console.warn('Error al fijar contador en Supabase:', e.message);
            throw e;
        }
    },

    async guardarProveedor(proveedor, signal = null) {
        console.log('🔹 SupabaseDB.guardarProveedor llamado con:', proveedor.nit);
        if (!window.supabaseClient) {
             console.error('? Supabase no está disponible - usando localStorage');
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
                consecutivo_ingreso: proveedor.consecutivoIngreso || null,
                num_facturas: proveedor.numFacturas ?? null,
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
                console.log('🔹 Verificando duplicado por NIT:', proveedor.nit);
                const selectPromise = window.supabaseClient
                    .from('proveedores')
                    .select('id, nombre_empresa, nit, contacto, telefono, servicio, consecutivo_ingreso, num_facturas, num_factura')
                    .eq('nit', proveedor.nit)
                    .maybeSingle()
                    .abortSignal(signal);
                
                const { data: existente, error: errorSelect } = await Promise.race([selectPromise, timeoutPromise]);
                
                if (errorSelect) {
                    console.warn('Error al buscar proveedor existente:', errorSelect.message);
                }
                
                if (existente) {
                    const mismoNombre = existente.nombre_empresa === proveedor.nombreEmpresa;
                    const mismaPlaca = existente.nit === proveedor.nit;
                    
                    if (mismoNombre && mismaPlaca) {
                        console.log('🔹 Proveedor ya existe; actualizando también consecutivo y facturas');
                        const updatePromiseExistente = window.supabaseClient
                            .from('proveedores')
                            .update(proveedorData)
                            .eq('id', existente.id)
                            .select()
                            .single()
                            .abortSignal(signal);

                        const { data: proveedorActualizado, error: errorActualizacion } = await Promise.race([
                            updatePromiseExistente,
                            timeoutPromise
                        ]);

                        if (errorActualizacion) throw errorActualizacion;
                        return this._mapearProveedor(proveedorActualizado);
                    } else {
                        console.log('🔹 Proveedor existe pero cambió datos, actualizando...');
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
                }
                
                console.log('🔹 Insertando nuevo proveedor NIT:', proveedor.nit);
                const insertPromise = window.supabaseClient
                    .from('proveedores')
                    .insert(proveedorData)
                    .select()
                    .single()
                    .abortSignal(signal);
                
                const { data, error } = await Promise.race([insertPromise, timeoutPromise]);
                
                if (error) {
                    console.log('⚠︝ Error en insert, código:', error.code, 'mensaje:', error.message);
                    if (error.code === '23505') {
                        console.log('🔹 Duplicado, actualizando por NIT...');
                        const updatePromise3 = window.supabaseClient
                            .from('proveedores')
                            .update(proveedorData)
                            .eq('nit', proveedor.nit)
                            .select()
                            .single()
                            .abortSignal(signal);
                        
                        const { data: updateData2, error: updateError2 } = await Promise.race([updatePromise3, timeoutPromise]);
                        
                        if (updateError2) throw updateError2;
                        return this._mapearProveedor(updateData2);
                    }
                    throw error;
                }
                
                return this._mapearProveedor(data);
            }
         } catch (error) {
            console.error('❌ Error al guardar proveedor:', error);
            // Si el error es por columna inexistente, reintentar sin los campos nuevos
            if (error.message?.includes('consecutivo_ingreso') || error.message?.includes('num_facturas')) {
                console.warn('⚠️ Columnas nuevas no existen en proveedores, reintentando sin ellas...');
                const proveedorDataBasico = {
                    nombre_empresa: proveedor.nombreEmpresa,
                    nit: proveedor.nit,
                    contacto: proveedor.contacto || null,
                    telefono: proveedor.telefono || null,
                    servicio: proveedor.servicio || null,
                    activo: true,
                    updated_at: new Date().toISOString()
                };
                try {
                    if (proveedor.id) {
                        const { data, error: errUpdate } = await window.supabaseClient
                            .from('proveedores')
                            .update(proveedorDataBasico)
                            .eq('id', proveedor.id)
                            .select()
                            .single()
                            .abortSignal(signal);
                        if (errUpdate) throw errUpdate;
                        return this._mapearProveedor(data);
                    } else {
                        const { data, error: errInsert } = await window.supabaseClient
                            .from('proveedores')
                            .insert(proveedorDataBasico)
                            .select()
                            .single()
                            .abortSignal(signal);
                        if (errInsert) throw errInsert;
                        return this._mapearProveedor(data);
                    }
                } catch (retryError) {
                    console.error('❌ Reintento de proveedor también falló:', retryError);
                    return null;
                }
            }
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
            consecutivoIngreso: p.consecutivo_ingreso,
            numFacturas: p.num_facturas,
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
                consecutivo_ingreso: turno.consecutivoIngreso || null,
                num_facturas: turno.numFacturas ?? null,
                materiales_sap: turno.materialesSap || [],
                autorizado_salida: turno.autorizadoSalida || false
            };
            
            console.log('📤 Insertando en Supabase:', JSON.stringify(turnoData, null, 2));
            
            const { data: existente, error: errorExistente } = await window.supabaseClient
                .from('turnos')
                .select('id')
                .eq('numero', turno.numero)
                .eq('fecha_solicitud', getLocalDate())
                .maybeSingle();
            
            if (existente && !errorExistente) {
                console.warn('⚠️ Turno duplicado detectado:', turno.numero);
                throw new Error(`El turno ${turno.numero} ya fue registrado hoy.`);
            }
            
            const fechaTurnoPlaca = turno.fechaCita?.split('T')[0] || getLocalDate();
            const columnaFechaPlaca = turno.fechaCita ? 'fecha_cita' : 'fecha_solicitud';
            const { data: turnoPlaca, error: errorPlaca } = await window.supabaseClient
                .from('turnos')
                .select('id, numero, estado')
                .eq('nit', turno.nit)
                .gte(columnaFechaPlaca, `${fechaTurnoPlaca}T00:00:00`)
                .lt(columnaFechaPlaca, `${fechaTurnoPlaca}T23:59:59.999`)
                .in('estado', ['espera', 'citado', 'atendiendo'])
                .limit(1)
                .maybeSingle();
            
            if (turnoPlaca && !errorPlaca) {
                console.warn('⚠️ Placa con turno activo:', turno.nit, 'Turno:', turnoPlaca.numero);
                throw new Error(`La placa ${turno.nit} ya tiene un turno activo (${turnoPlaca.numero}). Complete o cancele ese turno antes de solicitar uno nuevo.`);
            }
            
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
                
                // Reintentar sin los campos nuevos si las columnas no existen aún en la BD
                if ((turnoData.consecutivo_ingreso !== undefined || turnoData.num_facturas !== undefined) && 
                    (error.message?.includes('consecutivo_ingreso') || error.message?.includes('consecutivo') ||
                     error.message?.includes('num_facturas'))) {
                    console.warn('⚠️ Columnas nuevas no existen en la BD, reintentando sin ellas...');
                    if (turnoData.consecutivo_ingreso !== undefined) delete turnoData.consecutivo_ingreso;
                    if (turnoData.num_facturas !== undefined) delete turnoData.num_facturas;
                    const retryTimeout = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout Supabase (turno retry)')), 5000)
                    );
                    const retryPromise = window.supabaseClient
                        .from('turnos')
                        .insert([turnoData])
                        .select()
                        .single()
                        .abortSignal(signal);
                    
                    const { data: retryData, error: retryError } = await Promise.race([retryPromise, retryTimeout]);
                    if (retryError) throw retryError;
                    console.log('✅ Turno guardado exitosamente (sin consecutivo_ingreso):', retryData);
                    return this._mapearTurno(retryData);
                }
                
                throw error;
            }
            
            console.log('✅ Turno guardado exitosamente:', data);
            const turnoGuardado = this._mapearTurno(data);
            
            // Push notification - Nuevo turno
            if (window.PushManager) {
                window.PushManager.notifyNuevoTurno(turnoGuardado);
            }
            
            return turnoGuardado;
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
            
            if (infoDespacho && infoDespacho.esTransporte !== undefined) {
                updateData.es_transporte = infoDespacho.esTransporte;
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
            
            // Push notification - Turno llamado (con sonido garantizado)
            window.dispatchEvent(new CustomEvent('notificacion-sonido', { detail: { tipo: 'turno_llamado' } }));
            if (window.SonidoAlerta) SonidoAlerta.reproducir(3);
            if (window.PushManager) {
                window.PushManager.notifyTurnoLlamado(turnoActualizado);
            }
            
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
                .maybeSingle();
            
            console.log('completarTurno - turno desde DB:', turno);
            console.log('completarTurno - tipo_vehiculo desde DB:', turno?.tipo_vehiculo);
            
            if (errorGet) throw errorGet;
            
            if (!turno) {
                console.warn('Turno no encontrado en BD (ya fue eliminado o ID inválido):', turnoId);
                return false;
            }
            
            const turnoMapeado = this._mapearTurno(turno);
            console.log('completarTurno - turno mapeado:', turnoMapeado);
            console.log('completarTurno - tipoVehiculo mapeado:', turnoMapeado?.tipoVehiculo);
            
            const historialGuardado = await this.guardarEnHistorial(turnoMapeado);
            if (!historialGuardado) {
                throw new Error('No se pudo guardar el turno en el historial');
            }
            
            const { error } = await window.supabaseClient
                .from('turnos')
                .delete()
                .eq('id', turnoId);
            
            if (error) throw error;
            
            if (window.supabaseClient) {
                try {
                    const datosNotificacion = {
                        numero: turnoMapeado.numero,
                        nombreEmpresa: turnoMapeado.nombreEmpresa,
                        nombre: turnoMapeado.nombreEmpresa,
                        nit: turnoMapeado.nit || '',
                        contacto: turnoMapeado.contacto || '',
                        telefono: turnoMapeado.telefono || '',
                        servicio: turnoMapeado.servicio || '',
                        destino: turnoMapeado.destino || '',
                        fechaCita: turnoMapeado.fechaCita || '',
                        numFactura: turnoMapeado.numFactura || '',
                        numFacturas: turnoMapeado.numFacturas || null,
                        tipoVehiculo: turnoMapeado.tipoVehiculo || '',
                        bultos: turnoMapeado.bultos || null,
                        peso: turnoMapeado.peso || '',
                        responsable: turnoMapeado.responsable || '',
                        consecutivoIngreso: turnoMapeado.consecutivoIngreso || '',
                        inspeccionFisica: turnoMapeado.inspeccionFisica || false,
                        autorizadoSalida: turnoMapeado.autorizadoSalida || false,
                        horaSolicitud: turnoMapeado.horaSolicitud || '',
                        horaLlamada: turnoMapeado.horaLlamada || '',
                        timestamp: Date.now()
                    };
                    await window.supabaseClient.from('notificaciones_salida').insert({
                        mensaje: `Turno ${turnoMapeado.numero} completado por recepción`,
                        remitente: 'admin',
                        leido: false,
                        tipo: 'salida_pendiente',
                        proveedor_nit: turnoMapeado.nit || null,
                        nombre_empresa: turnoMapeado.nombreEmpresa || null,
                        datos: datosNotificacion
                    });
                } catch (notifError) {
                    console.warn('⚠️ No se pudo insertar notificación de salida (no bloqueante):', notifError.message);
                }
            }
            
            // Alerts must not turn a successful deletion into a reported completion failure.
            try {
                window.dispatchEvent(new CustomEvent('notificacion-sonido', { detail: { tipo: 'turno_completado' } }));
                if (window.SonidoAlerta) SonidoAlerta.reproducir(2);
                this._notificarTurnoCompletado(turnoMapeado);
            } catch (alertError) {
                console.warn('El turno se completó, pero no se pudo reproducir un aviso:', alertError);
            }
            
            return true;
        } catch (error) {
            console.error('Error al completar turno:', error);
            return false;
        }
    },

    // Push notification - Turno completado
    _notificarTurnoCompletado(turnoMapeado) {
        const pushManager = window.SI3PushManager;
        if (typeof pushManager?.notifyTurnoCompletado !== 'function') return;
        try {
            const notificacion = pushManager.notifyTurnoCompletado(turnoMapeado);
            notificacion?.catch?.(error => console.warn('No se pudo enviar la notificación de turno completado:', error));
        } catch (error) {
            console.warn('No se pudo enviar la notificación de turno completado:', error);
        }
    },

    async cancelarTurno(turnoId, numeroTurno = null) {
        if (!window.supabaseClient) {
            throw new Error('Supabase no está disponible');
        }

        const estadosActivos = ['espera', 'citado', 'llegado', 'atendiendo'];
        
        const { count, error } = await window.supabaseClient
            .from('turnos')
            .delete({ count: 'exact' })
            .eq('id', turnoId)
            .in('estado', estadosActivos);

        if (error) throw error;
        if (count) return true;

        if (numeroTurno) {
            const { count: countPorNumero, error: errorPorNumero } = await window.supabaseClient
                .from('turnos')
                .delete({ count: 'exact' })
                .eq('numero', numeroTurno)
                .in('estado', estadosActivos);

            if (errorPorNumero) throw errorPorNumero;
            if (countPorNumero) return true;
        }

        throw new Error('Supabase no encontró un turno activo con ese ID o número. Recargue la página para sincronizar sus turnos.');
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
            materialesSap: t.materiales_sap || [],
            numFactura: t.num_factura,
            tipoVehiculo: t.tipo_vehiculo,
            bultos: t.bultos,
            peso: t.peso,
            responsable: t.responsable,
            contacto: t.contacto,
            telefono: t.telefono,
            servicio: t.servicio,
            consecutivoIngreso: t.consecutivo_ingreso,
            numFacturas: t.num_facturas,
            autorizadoSalida: t.autorizado_salida,
            inspeccionFisica: t.inspeccion_fisica,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
            esTransporte: t.es_transporte === true
        };
    },

    async guardarEnHistorial(turno) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return false;
        }
        let historialData;
        try {
            historialData = {
                numero: turno.numero,
                nombre_empresa: turno.nombreEmpresa,
                nit: turno.nit,
                motivo: turno.motivo || '',
                hora_solicitud: turno.horaSolicitud,
                hora_llamada: turno.horaLlamada || null,
                hora_finalizacion: null,
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
                consecutivo_ingreso: turno.consecutivoIngreso || null,
                num_facturas: turno.numFacturas ?? null,
                materiales_sap: turno.materialesSap || [],
                autorizado_salida: false,
                inspeccion_fisica: false,
                es_transporte: turno.esTransporte === true || false,
                nombre_proveedor: turno.esTransporte ? (turno.nombreProveedor || null) : null,
                proveedor_transporte_id: turno.proveedorTransporteId || null,
                fecha: getLocalISOString()
            };
            
            console.log('Guardando en historial - tipoVehiculo:', turno.tipoVehiculo);
            
            const { data, error } = await window.supabaseClient
                .from('historial_turnos')
                .insert([historialData])
                .select()
                .single();
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error al guardar en historial:', error);
            const columnsToStrip = ['consecutivo_ingreso', 'num_facturas', 'materiales_sap', 'es_transporte', 'nombre_proveedor', 'proveedor_transporte_id'];
            const strippedData = { ...historialData };
            let anyStripped = false;
            for (const col of columnsToStrip) {
                if (error.message?.includes(col) && strippedData[col] !== undefined) {
                    delete strippedData[col];
                    anyStripped = true;
                }
            }
            if (anyStripped) {
                console.warn('⚠️ Columnas no existen en historial_turnos, reintentando sin ellas...');
                try {
                    const { data: retryData, error: retryError } = await window.supabaseClient
                        .from('historial_turnos')
                        .insert([strippedData])
                        .select()
                        .single();
                    if (retryError) throw retryError;
                    return true;
                } catch (retryErr) {
                    console.error('❌ Reintento de historial también falló:', retryErr);
                    return false;
                }
            }
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
                consecutivoIngreso: h.consecutivo_ingreso,
                numFacturas: h.num_facturas,
                materialesSap: h.materiales_sap || [],
                autorizadoSalida: h.autorizado_salida,
                inspeccionFisica: h.inspeccion_fisica,
                esTransporte: h.es_transporte === true,
                proveedorTransporteId: h.proveedor_transporte_id,
                nombreProveedor: h.nombre_proveedor,
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
                        if (callback && typeof callback === 'function') {
                            callback({ eventType: 'SUBSCRIPTION', new: null, old: null });
                        }
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ Error en canal de turnos:', err);
                        window.supabaseClient.removeChannel(channel);
                        setTimeout(() => this.suscribirCambiosTurnos(callback), 3000);
                    } else if (status === 'TIMED_OUT') {
                        console.error('❰ Timeout en canal de turnos, reconectando...');
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
                        console.error('❰ Timeout en canal de historial, reconectando...');
                        window.supabaseClient.removeChannel(channel);
                        setTimeout(() => this.suscribirCambiosHistorial(callback), 3000);
                    }
                });
            
            return channel;
        } catch (error) {
            console.error('❌ Error al suscribirse a historial:', error);
            return null;
        }
    },

    async guardarProveedorTransporte(proveedor, signal = null) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible para proveedor transporte');
            return null;
        }
        
        try {
            const proveedorData = {
                numero_turno: proveedor.numeroTurno,
                nombre_empresa: proveedor.nombreEmpresa,
                nit: proveedor.nit.toUpperCase(),
                motivo: proveedor.motivo || null,
                num_factura: proveedor.numFactura || null,
                tipo_vehiculo: proveedor.tipoVehiculo || null,
                bultos: proveedor.bultos ? parseInt(proveedor.bultos) : null,
                peso: proveedor.peso || null,
                responsable: proveedor.responsable || null,
                contacto: proveedor.contacto || null,
                telefono: proveedor.telefono || null,
                servicio: proveedor.servicio || null,
                destino: proveedor.destino || null,
                nombre_proveedor: proveedor.nombreProveedor || null,
                estado: 'pendiente',
                autorizado_salida: false,
                inspeccion_fisica: false,
                consecutivo_ingreso: proveedor.consecutivoIngreso || null,
                num_facturas: proveedor.numFacturas ?? null,
                hora_solicitud: proveedor.horaSolicitud || null,
                updated_at: new Date().toISOString()
            };
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout Supabase (proveedor transporte)')), 5000)
            );
            
            const insertPromise = window.supabaseClient
                .from('proveedores_transporte')
                .insert([proveedorData])
                .select()
                .single()
                .abortSignal(signal);
            
            const { data, error } = await Promise.race([insertPromise, timeoutPromise]);
            
            if (error) throw error;
            return this._mapearProveedorTransporte(data);
        } catch (error) {
            console.error('Error al guardar proveedor transporte:', error);
            // Reintentar sin consecutivo_ingreso / num_facturas si las columnas no existen
            if (error.message?.includes('consecutivo_ingreso') || error.message?.includes('num_facturas')) {
                console.warn('⚠️ Columnas consecutivo_ingreso/num_facturas no existen en proveedores_transporte, reintentando...');
                if (error.message?.includes('consecutivo_ingreso')) delete proveedorData.consecutivo_ingreso;
                if (error.message?.includes('num_facturas')) delete proveedorData.num_facturas;
                try {
                    const retryTimeout = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout Supabase (proveedor transporte retry)')), 5000)
                    );
                    const retryPromise = window.supabaseClient
                        .from('proveedores_transporte')
                        .insert([proveedorData])
                        .select()
                        .single()
                        .abortSignal(signal);
                    
                    const { data: retryData, error: retryError } = await Promise.race([retryPromise, retryTimeout]);
                    if (retryError) throw retryError;
                    return this._mapearProveedorTransporte(retryData);
                } catch (retryErr) {
                    console.error('❌ Reintento de proveedor transporte también falló:', retryErr);
                    return null;
                }
            }
            return null;
        }
    },

    async cargarProveedoresTransporte(numeroTurno) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return [];
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('proveedores_transporte')
                .select('*')
                .eq('numero_turno', numeroTurno)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return data.map(p => this._mapearProveedorTransporte(p));
        } catch (error) {
            console.error('Error al cargar proveedores transporte:', error);
            return [];
        }
    },

    async actualizarProveedorTransporte(id, updates) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return false;
        }
        
        try {
            const { error } = await window.supabaseClient
                .from('proveedores_transporte')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error al actualizar proveedor transporte:', error);
            return false;
        }
    },

    async actualizarEstadoProveedorTransporte(id, estado, autorizadoSalida = null, inspeccionFisica = null) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return false;
        }
        
        try {
            const updateData = { 
                estado: estado,
                updated_at: new Date().toISOString()
            };
            
            if (autorizadoSalida !== null) updateData.autorizado_salida = autorizadoSalida;
            if (inspeccionFisica !== null) updateData.inspeccion_fisica = inspeccionFisica;
            
            const { error } = await window.supabaseClient
                .from('proveedores_transporte')
                .update(updateData)
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error al actualizar estado proveedor transporte:', error);
            return false;
        }
    },

    async eliminarProveedorTransporte(id) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return false;
        }
        
        try {
            const { error } = await window.supabaseClient
                .from('proveedores_transporte')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error al eliminar proveedor transporte:', error);
            return false;
        }
    },

    async cargarProveedoresTransportePendientes(numeroTurno) {
        if (!window.supabaseClient) {
            return [];
        }
        
        try {
            const { data, error } = await window.supabaseClient
                .from('proveedores_transporte')
                .select('*')
                .eq('numero_turno', numeroTurno)
                .in('estado', ['pendiente', 'inspeccion'])
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return data.map(p => this._mapearProveedorTransporte(p));
        } catch (error) {
            console.error('Error al cargar proveedores pendientes:', error);
            return [];
        }
    },

    async cargarProveedoresTransporteParaSalida() {
        if (!window.supabaseClient) {
            return [];
        }
        
        try {
            const hoy = getLocalDate();
            const { data, error } = await window.supabaseClient
                .from('proveedores_transporte')
                .select('*')
                .gte('fecha_registro', `${hoy}T00:00:00`)
                .lt('fecha_registro', `${hoy}T23:59:59`)
                .neq('autorizado_salida', true)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return data.map(p => this._mapearProveedorTransporte(p));
        } catch (error) {
            console.error('Error al cargar proveedores para salida:', error);
            return [];
        }
    },

    async crearHistorialDesdeProveedorTransporte(proveedor) {
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            return null;
        }
        
        try {
            const historialData = {
                numero: proveedor.numeroTurno,
                nombre_empresa: proveedor.nombreEmpresa || proveedor.nombre,
                nombre_proveedor: proveedor.nombreProveedor || null,
                nit: proveedor.nit,
                motivo: proveedor.motivo || '',
                hora_solicitud: proveedor.horaSolicitud || null,
                hora_llamada: proveedor.horaLlamada || null,
                hora_finalizacion: null,
                estado: 'completado',
                destino: proveedor.destino || null,
                num_factura: proveedor.numFactura || null,
                tipo_vehiculo: proveedor.tipoVehiculo || null,
                bultos: proveedor.bultos ? parseInt(proveedor.bultos) : null,
                peso: proveedor.peso || null,
                responsable: proveedor.responsable || null,
                contacto: proveedor.contacto || null,
                telefono: proveedor.telefono || null,
                servicio: proveedor.servicio || null,
                consecutivo_ingreso: proveedor.consecutivoIngreso || null,
                num_facturas: proveedor.numFacturas ?? null,
                autorizado_salida: false,
                inspeccion_fisica: false,
                fecha: getLocalISOString(),
                es_transporte: true,
                proveedor_transporte_id: proveedor.id
            };
            
            const { data, error } = await window.supabaseClient
                .from('historial_turnos')
                .insert([historialData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error al crear historial desde proveedor transporte:', error);
            return null;
        }
    },

    _mapearProveedorTransporte(p) {
        return {
            id: p.id,
            numeroTurno: p.numero_turno,
            nombreEmpresa: p.nombre_empresa,
            nit: p.nit,
            motivo: p.motivo,
            numFactura: p.num_factura,
            tipoVehiculo: p.tipo_vehiculo,
            bultos: p.bultos,
            peso: p.peso,
            responsable: p.responsable,
            contacto: p.contacto,
            telefono: p.telefono,
            servicio: p.servicio,
            destino: p.destino,
            nombreProveedor: p.nombre_proveedor,
            estado: p.estado,
            autorizadoSalida: p.autorizado_salida,
            inspeccionFisica: p.inspeccion_fisica,
            consecutivoIngreso: p.consecutivo_ingreso || null,
            numFacturas: p.num_facturas || null,
            horaSolicitud: p.hora_solicitud,
            horaLlamada: p.hora_llamada,
            horaFinalizacion: p.hora_finalizacion,
            fechaRegistro: p.fecha_registro,
            createdAt: p.created_at,
            updatedAt: p.updated_at
        };
    },

    suscribirCambiosProveedoresTransporte(callback) {
        if (!window.supabaseClient) {
            console.error('❌ Supabase no está disponible');
            return null;
        }
        
        try {
            const channelName = 'proveedores-transporte-changes-' + Date.now();
            const channel = window.supabaseClient
                .channel(channelName)
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'proveedores_transporte' 
                    },
                    (payload) => {
                        console.log('🔄 Cambio en proveedores_transporte:', payload);
                        if (callback && typeof callback === 'function') {
                            callback(payload);
                        }
                    }
                )
                .subscribe((status, err) => {
                    console.log('📡 Estado canal proveedores_transporte:', status);
                    
                    if (status === 'CHANNEL_ERROR') {
                        console.error('❌ Error en canal de proveedores_transporte:', err);
                        window.supabaseClient.removeChannel(channel);
                        setTimeout(() => this.suscribirCambiosProveedoresTransporte(callback), 3000);
                    } else if (status === 'TIMED_OUT') {
                        console.error('❰ Timeout en canal de proveedores_transporte, reconectando...');
                        window.supabaseClient.removeChannel(channel);
                        setTimeout(() => this.suscribirCambiosProveedoresTransporte(callback), 3000);
                    }
                });
            
            return channel;
        } catch (error) {
            console.error('❌ Error al suscribirse a proveedores_transporte:', error);
            return null;
        }
    }
};



// ============================================
// NOTIFICACIONES DE SALIDA (POLLING FALLBACK)
// ============================================

const SI3Realtime = {
    _notificaciones: new Map(),
    _eventos: new Map(),

    reclamarNotificacion(notificacion) {
        const id = notificacion?.id;
        if (id === undefined || id === null) return true;
        if (this._notificaciones.has(id)) return false;
        this._notificaciones.set(id, Date.now());
        this._limpiar(this._notificaciones);
        return true;
    },

    reclamarEvento(tabla, payload) {
        const registro = payload?.new || payload?.old || {};
        const id = registro.id ?? `${payload?.eventType || 'evento'}:${registro.numero || ''}:${registro.updated_at || registro.created_at || ''}`;
        const clave = `${tabla}:${payload?.eventType || 'evento'}:${id}`;
        if (this._eventos.has(clave)) return false;
        this._eventos.set(clave, Date.now());
        this._limpiar(this._eventos);
        return true;
    },

    _limpiar(mapa) {
        const limite = Date.now() - 10 * 60 * 1000;
        for (const [clave, timestamp] of mapa) {
            if (timestamp < limite) mapa.delete(clave);
        }
    }
};

window.SI3Realtime = SI3Realtime;

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
                    for (const notif of data) {
                        if (SI3Realtime.reclamarNotificacion(notif)) {
                            this._ultimoTimestamp = notif.created_at;
if (window.SonidoAlerta) SonidoAlerta.reproducir(3);
                            if (window.SonidoSI3) { window.SonidoSI3.inicializar(); window.SonidoSI3.tocarAlerta(); }
                            
                            const isFromAdmin = notif.remitente === 'admin';
                            const isSalidaPendiente = notif.tipo === 'salida_pendiente';
                            const isSalidaAutorizada = notif.tipo === 'salida_autorizada';
                            
                            if (isFromAdmin && isSalidaPendiente && notif.datos) {
                                if (typeof window.mostrarProveedorListo === 'function') {
                                    try {
                                        window.mostrarProveedorListo(notif.datos);
                                    } catch (e) {
                                        console.warn('Error al mostrar proveedor:', e);
                                        Utils.mostrarNotificacion(`Notificación: ${notif.mensaje}`, 'warning');
                                    }
                                } else {
                                    Utils.mostrarNotificacion(`Notificación: ${notif.mensaje}`, 'warning');
                                }
                            } else if (isFromAdmin && isSalidaAutorizada && notif.datos) {
                                if (window.mostrarAlertaSalidaDespachador) {
                                    window.mostrarAlertaSalidaDespachador({
                                        numero: notif.datos.numero || '---',
                                        nombre: notif.mensaje,
                                        timestamp: Date.now(),
                                        datos: notif.datos
                                    });
                                } else {
                                    Utils.mostrarNotificacion(`Notificación: ${notif.mensaje}`, 'warning');
                                }
                            } else {
                                Utils.mostrarNotificacion(`Notificación: ${notif.mensaje}`, 'warning');
                            }
                            
                            await window.supabaseClient.from('notificaciones_salida').update({ leido: true }).eq('id', notif.id);
                        }
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
                    if (!SI3Realtime.reclamarEvento('turnos', payload)) return;
                    console.log('🔄 Cambio en turnos:', payload);
                    if (callback) callback(payload);
                    if (window.SonidoAlerta && payload.eventType === 'INSERT') {
                        if (window.SonidoSI3) window.SonidoSI3.inicializar();
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
                    if (!SI3Realtime.reclamarEvento('historial_turnos', payload)) return;
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
                async (payload) => {
                    if (!SI3Realtime.reclamarNotificacion(payload.new)) return;
                    console.log('🔔 Nueva notificación:', payload);
                    const notificacion = payload.new;
                    
                    if (window.SonidoAlerta) {
                        if (window.SonidoSI3) window.SonidoSI3.inicializar();
                        SonidoAlerta.reproducir(3);
                    }
                    
                    if (!notificacion.leido) {
                        Utils.mostrarNotificacion(notificacion.mensaje || 'Nueva notificación', 'warning');
                    }
                    
                    if (window.supabaseClient) {
                        await window.supabaseClient.from('notificaciones_salida').update({ leido: true }).eq('id', notificacion.id);
                    }
                    if (callback) callback(payload);
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
    async solicitar(datosProveedor, motivo = '', signal = null, estadoOverride = null) {
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

        if (window.supabaseClient) {
            try {
                const fechaTurno = datosProveedor.fechaCita?.split('T')[0] || getLocalDate();
                const columnaFecha = datosProveedor.fechaCita ? 'fecha_cita' : 'fecha_solicitud';
                const estadosActivos = estadoOverride === 'llegado'
                    ? ['espera', 'citado', 'atendiendo', 'llegado']
                    : ['espera', 'citado', 'atendiendo'];
                const { data: turnoActivo, error: errorActivo } = await window.supabaseClient
                    .from('turnos')
                    .select('id, numero, estado')
                    .eq('nit', placa)
                    .gte(columnaFecha, `${fechaTurno}T00:00:00`)
                    .lt(columnaFecha, `${fechaTurno}T23:59:59.999`)
                    .in('estado', estadosActivos)
                    .limit(1)
                    .maybeSingle();
                
                if (turnoActivo && !errorActivo) {
                    console.warn('⚠️ Placa con turno activo:', placa, 'Turno:', turnoActivo.numero);
                    throw new Error(`La placa ${placa} ya tiene un turno activo (${turnoActivo.numero}). Complete o cancele ese turno antes de solicitar uno nuevo.`);
                }
            } catch (e) {
                if (e.message.includes('La placa')) throw e;
                console.warn('Error validando placa activa:', e.message);
            }
        }
        
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
            console.warn('⚠︝ Proveedor no guardado en Supabase, continuando...');
        }
        
        if (window.RenderAdmin && typeof window.RenderAdmin.proveedores === 'function') {
            await window.RenderAdmin.proveedores();
        }

        // Determinar prefijo según si la fecha es posterior a hoy
        const fechaCitaSola = datosProveedor.fechaCita ? datosProveedor.fechaCita.split('T')[0] : null;
        const hoy = new Date();
        const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        const prefijoTurno = (fechaCitaSola && fechaCitaSola > hoyStr) ? 'C' : 'T';
        
        let nuevoContador;
        try {
            console.log('📦 Paso 2: Incrementando contador de turnos...');
            nuevoContador = await SupabaseDB.incrementarContadorTurnos(prefijoTurno, signal);
            console.log('✅ Contador incrementado:', nuevoContador);
        } catch (error) {
            console.error('❌ Error al incrementar contador:', error);
            AppState.contadorTurnos++;
            nuevoContador = AppState.contadorTurnos;
            LocalStorage.guardarContadorPrefijo(prefijoTurno, nuevoContador);
        }
        
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
            estado: estadoOverride || (prefijoTurno === 'C' ? 'citado' : 'espera'),
            consecutivoIngreso: datosProveedor.consecutivoIngreso || null,
            numFactura: datosProveedor.numFactura || null,
            numFacturas: datosProveedor.numFacturas || null,
            materialesSap: datosProveedor.materialesSap || [],
            tipoVehiculo: datosProveedor.tipoVehiculo || null,
            bultos: datosProveedor.bultos || null,
            peso: datosProveedor.peso || null,
            responsable: datosProveedor.responsable || null
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

    async cancelar(turnoId, numeroTurno = null) {
        const cancelado = await SupabaseDB.cancelarTurno(turnoId, numeroTurno);
        AppState.turnos = AppState.turnos.filter(t => String(t.id) !== String(turnoId));
        LocalStorage.guardarTurnos(AppState.turnos);
        return cancelado;
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
            
            if (window.MetricasRT && typeof window.MetricasRT.registrarFin === 'function') {
                window.MetricasRT.registrarFin(turnoCompletado.id);
            }
            
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
            const turnosBackup = AppState.turnos || [];
            if (turnosBackup.length > 0) {
                try {
                    localStorage.setItem('backup_turnos_reinicio', JSON.stringify({
                        timestamp: new Date().toISOString(),
                        turnos: turnosBackup
                    }));
                    console.log('✅ Backup de turnos creado antes de reiniciar cola');
                } catch (e) {
                    console.warn('⚠️ No se pudo crear backup:', e);
                }
            }

            for (const turno of AppState.turnos) {
                await SupabaseDB.cancelarTurno(turno.id);
            }

            AppState.turnos = [];
            AppState.turnoActual = null;
            AppState.contadorTurnos = 0;

            LocalStorage.guardarTurnos([]);
            LocalStorage.guardarTurnoActual(null);
            LocalStorage.guardarContadorPrefijo('T', 0);
            LocalStorage.guardarContadorPrefijo('C', 0);
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
                    
                    const fechaReinicioContador = await SupabaseDB.obtenerFechaReinicioContador();
                    const { maxT, maxC } = SupabaseDB.obtenerMaximosTurnos(todosLosTurnos, fechaReinicioContador);
                    
                    const [contadorT, contadorC] = await Promise.all([
                        SupabaseDB.obtenerContadorTurnos('T'),
                        SupabaseDB.obtenerContadorTurnos('C')
                    ]);
                    
                    const nuevoMaxT = Math.max(contadorT, maxT);
                    const nuevoMaxC = Math.max(contadorC, maxC);
                    
                    AppState.contadorTurnosT = nuevoMaxT;
                    AppState.contadorTurnosC = nuevoMaxC;
                    AppState.contadorTurnos = Math.max(nuevoMaxT, nuevoMaxC);
                    
                    if (nuevoMaxT > contadorT) {
                        await SupabaseDB.incrementarContadorTurnosHasta('T', nuevoMaxT);
                        LocalStorage.guardarContadorPrefijo('T', nuevoMaxT);
                    }
                    if (nuevoMaxC > contadorC) {
                        await SupabaseDB.incrementarContadorTurnosHasta('C', nuevoMaxC);
                        LocalStorage.guardarContadorPrefijo('C', nuevoMaxC);
                    }
                    
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
        console.log('🔝 Actualizando citas para hoy:', hoyStr);

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
                const destinoLabel = { 'ensambles': 'SI ENSAMBLES', 'plasticos': 'SI3 ZF SAS', 'ambos': 'AMBOS' };
                
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
        const despachoDetail = document.getElementById('despachoDetail');
        const btnFormulario = document.getElementById('btnFormularioDespacho');
        
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

        if (btnFormulario) {
            btnFormulario.style.display = AppState.turnoActual ? 'inline-block' : 'none';
        }
        
        if (despachoDetail) {
            if (AppState.turnoActual) {
                const lines = [];
                if (AppState.turnoActual.numFactura) lines.push(`Factura: ${AppState.turnoActual.numFactura}`);
                if (AppState.turnoActual.tipoVehiculo) lines.push(`Tipo Vehículo: ${AppState.turnoActual.tipoVehiculo}`);
                if (AppState.turnoActual.bultos) lines.push(`Bultos: ${AppState.turnoActual.bultos}`);
                if (AppState.turnoActual.peso) lines.push(`Peso: ${AppState.turnoActual.peso} kg`);
                if (AppState.turnoActual.responsable) lines.push(`Responsable: ${AppState.turnoActual.responsable}`);
                if (AppState.turnoActual.destino) lines.push(`Destino: ${AppState.turnoActual.destino}`);
                if (AppState.turnoActual.materialesSap?.length) {
                    lines.push(bloqueMaterialesSapAdminHtml(AppState.turnoActual.materialesSap));
                }
                if (AppState.turnoActual.autorizadoSalida) lines.push(`✓ SALIDA AUTORIZADA`);
                
                despachoDetail.innerHTML = lines.map(line => `<div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px dashed #e2e8f0;">${line}</div>`).join('');
            } else {
                despachoDetail.innerHTML = '';
            }
        }
    },

    listaTurnosLlegados() {
        const listaDiv = document.getElementById('listaTurnosLlegados');
        const contadorDiv = document.getElementById('contadorTurnosLlegados');
        const busqueda = document.getElementById('busquedaLlegados')?.value?.toLowerCase() || '';
        const hayTurnosConfirmados = AppState.turnos.some(t => t.estado === 'llegado');
        const seccionConfirmados = listaDiv?.closest('.arrived-list');

        if (seccionConfirmados) {
            seccionConfirmados.hidden = !hayTurnosConfirmados;
            seccionConfirmados.closest('.admin-grid')?.classList.toggle('has-confirmed-turns', hayTurnosConfirmados);
        }
        
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
            listaDiv.innerHTML = turnosLlegados.map(turno => {
                const fechaTurno = turno.fechaCita || turno.fechaSolicitud;
                const fechaHoraTurno = [
                    fechaTurno ? Utils.formatearFecha(fechaTurno) : '',
                    turno.horaSolicitud ? Utils.formatearHora(turno.horaSolicitud) : ''
                ].filter(Boolean).join(' ');
                return `
                <div class="turn-item turn-item-llegado">
                    <span class="turn-item-number">${turno.numero}</span>
                    <div class="turn-item-info">
                        <div class="turn-item-company">${turno.nombreEmpresa}</div>
                        <div class="turn-item-details">
                            ${turno.nit ? `<span>Placa: ${turno.nit}</span>` : ''}
                            ${turno.contacto ? `<span>Contacto: ${turno.contacto}</span>` : ''}
                            ${turno.telefono ? `<span>Tel: ${turno.telefono}</span>` : ''}
                            ${turno.destino ? `<span>Destino: ${turno.destino === 'ensambles' ? 'SIE' : turno.destino === 'plasticos' ? 'SI3 ZF' : turno.destino}</span>` : ''}
                            ${turno.numFactura ? `<span>Fact: ${turno.numFactura}</span>` : ''}
                            ${turno.tipoVehiculo ? `<span>Tipo: ${turno.tipoVehiculo}</span>` : ''}
                            ${turno.bultos ? `<span>Bultos: ${turno.bultos}</span>` : ''}
                            ${turno.peso ? `<span>Peso: ${turno.peso.toString().toUpperCase().includes('KG') ? turno.peso : turno.peso + ' kg'}</span>` : ''}
                            ${turno.responsable ? `<span>Resp: ${turno.responsable}</span>` : ''}
                            ${turno.consecutivoIngreso ? `<span>FMM: ${turno.consecutivoIngreso}</span>` : ''}
                            ${turno.materialesSap?.length ? bloqueMaterialesSapAdminHtml(turno.materialesSap) : ''}
                        </div>
                        <div class="turn-item-time">
                            ${fechaHoraTurno}${turno.motivo ? ' - ' + turno.motivo : ''}
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
            listaDiv.innerHTML = turnosNormales.map(turno => {
                const horaTurno = turno.horaSolicitud || turno.fechaCita?.split('T')[1];
                const fechaHoraTurno = [
                    turno.fechaCita ? Utils.formatearFecha(turno.fechaCita) : '',
                    horaTurno ? Utils.formatearHora(horaTurno) : ''
                ].filter(Boolean).join(' ');
                return `
                <div class="turn-item turn-item-espera">
                    <span class="turn-item-number">${turno.numero}</span>
                    <div class="turn-item-info">
                        <div class="turn-item-company">${turno.nombreEmpresa}</div>
                        <div class="turn-item-details">
                            ${turno.nit ? `<span>Placa: ${turno.nit}</span>` : ''}
                            ${turno.contacto ? `<span>Contacto: ${turno.contacto}</span>` : ''}
                            ${turno.telefono ? `<span>Tel: ${turno.telefono}</span>` : ''}
                            ${turno.destino ? `<span>Destino: ${turno.destino === 'ensambles' ? 'SIE' : turno.destino === 'plasticos' ? 'SI3 ZF' : turno.destino}</span>` : ''}
                            ${turno.numFactura ? `<span>Fact: ${turno.numFactura}</span>` : ''}
                            ${turno.tipoVehiculo ? `<span>Tipo: ${turno.tipoVehiculo}</span>` : ''}
                            ${turno.bultos ? `<span>Bultos: ${turno.bultos}</span>` : ''}
                            ${turno.peso ? `<span>Peso: ${turno.peso} kg</span>` : ''}
                            ${turno.responsable ? `<span>Resp: ${turno.responsable}</span>` : ''}
                            ${turno.consecutivoIngreso ? `<span>Cons: ${turno.consecutivoIngreso}</span>` : ''}
                            ${turno.materialesSap?.length ? bloqueMaterialesSapAdminHtml(turno.materialesSap) : ''}
                        </div>
                        <div class="turn-item-time">
                            ${fechaHoraTurno}${turno.motivo ? ' - ' + turno.motivo : ''}
                        </div>
                    </div>
                    <div class="turn-item-actions">
                        <button class="btn btn-danger btn-small" onclick="AdminHandlers.cancelarTurno(${turno.id})">
                            Cancelar
                        </button>
                    </div>
                </div>
            `}).join('');
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
            const destinoLabel = { 'ensambles': 'SIE', 'plasticos': 'SI3 ZF', 'ambos': 'AMBOS' };
            
            // Agrupar por fecha
            const gruposPorFecha = {};
            turnosCitados.forEach(turno => {
                const fecha = turno.fechaCita ? turno.fechaCita.split('T')[0] : 'Sin fecha';
                if (!gruposPorFecha[fecha]) gruposPorFecha[fecha] = [];
                gruposPorFecha[fecha].push(turno);
            });
            
            let html = '';
            for (const [fecha, turnos] of Object.entries(gruposPorFecha)) {
                const fechaVisible = fecha === 'Sin fecha'
                    ? fecha
                    : `${new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long' })} · ${Utils.formatearFecha(fecha)}`;
                html += `<div class="cited-day-header">${fechaVisible}</div>`;
                html += turnos.map(turno => {
                    const horaCita = Utils.formatearHora(turno.fechaCita?.split('T')[1] || turno.horaSolicitud);
                    const empresa = String(turno.nombreEmpresa || '').trim();
                    const contacto = String(turno.contacto || '').trim();
                    return `
                    <div class="turn-item turn-item-citado">
                        <span class="turn-item-number">${turno.numero}</span>
                        <div class="turn-item-info">
                            <div class="turn-item-company">${turno.nombreEmpresa}</div>
                            <div class="turn-item-details">
                                ${turno.nit ? `<div style="font-size:11px;color:#475569;">Placa: ${turno.nit}</div>` : ''}
                                ${contacto && contacto.toLocaleLowerCase() !== empresa.toLocaleLowerCase() ? `<div style="font-size:11px;color:#475569;">Contacto: ${escaparHtml(contacto)}</div>` : ''}
                                ${turno.telefono ? `<div style="font-size:11px;color:#475569;">Tel: ${turno.telefono}</div>` : ''}
                                ${turno.destino ? `<div style="font-size:11px;color:#475569;">Destino: ${destinoLabel[turno.destino] || turno.destino}</div>` : ''}
                                ${turno.consecutivoIngreso ? `<div style="font-size:11px;color:#475569;">Cons: ${turno.consecutivoIngreso}</div>` : ''}
                                ${turno.materialesSap?.length ? bloqueMaterialesSapAdminHtml(turno.materialesSap) : ''}
                            </div>
                            <div class="turn-item-time">${horaCita}${turno.motivo ? ` - ${turno.motivo}` : ''}</div>
                        </div>
                        <div class="turn-item-actions">
                            ${AppState.turnoActual && AppState.turnoActual.id === turno.id
                                ? `<button class="btn btn-warning btn-small btn-llamar-turno" data-turno-id="${turno.id}" onclick="AdminHandlers.mostrarModalDespacho(AppState.turnoActual, 'especifico', ${turno.id})">FORMULARIO</button>`
                                : `<button class="btn btn-primary btn-small btn-llamar-turno" data-turno-id="${turno.id}" onclick="AdminHandlers.llamarTurnoEspecifico(${turno.id})">Llamar</button>`
                            }
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

    async proveedores() {
        const proveedoresBody = document.getElementById('proveedoresBody');
        const contadorDiv = document.getElementById('contadorProveedores');
        const busquedaInput = document.getElementById('busquedaProveedores');
        const busqueda = busquedaInput?.value?.toLowerCase() || '';

        if (!proveedoresBody) return;

        try {
            const proveedores = await SupabaseDB.cargarProveedores();

            // Filtrar por búsqueda
            const proveedoresFiltrados = proveedores.filter(p => {
                if (!busqueda) return true;
                return (p.nombreEmpresa || '').toLowerCase().includes(busqueda) ||
                       (p.nit || '').toLowerCase().includes(busqueda) ||
                       (p.contacto || '').toLowerCase().includes(busqueda) ||
                       (p.telefono || '').toLowerCase().includes(busqueda) ||
                       (p.consecutivoIngreso || '').toLowerCase().includes(busqueda);
            });

            if (contadorDiv) contadorDiv.textContent = proveedoresFiltrados.length;

            if (proveedoresFiltrados.length === 0) {
                proveedoresBody.innerHTML = busqueda 
                    ? '<p class="empty-message">No se encontraron proveedores</p>'
                    : '<p class="empty-message">No hay proveedores registrados</p>';
                return;
            }

            const grupos = {};
            proveedoresFiltrados.forEach(p => {
                const empresa = p.nombreEmpresa || 'Sin empresa';
                if (!grupos[empresa]) grupos[empresa] = [];
                grupos[empresa].push(p);
            });

            const empresas = Object.keys(grupos).sort((a, b) => a.localeCompare(b));

            proveedoresBody.innerHTML = empresas.map((empresa, idx) => {
                const lista = grupos[empresa];
                const color = this._colorPorEmpresa(empresa);
                const iniciales = this._iniciales(empresa);
                const multiple = lista.length > 1;
                const detallesId = 'prov-det-' + idx;
                const chevronId = 'prov-chev-' + idx;
                const expandido = !multiple;

                const proveedoresHtml = lista.map(p => {
                    const esTransporte = (p.servicio || '').toLowerCase() === 'transporte';
                    const badge = esTransporte
                        ? '<span class="prov-badge transporte">TRANSPORTE</span>'
                        : (p.servicio ? `<span class="prov-badge normal">${this._labelServicio(p.servicio)}</span>` : '');
                    return `
                        <div class="prov-proveedor">
                            <div class="prov-proveedor-info">
                                <div class="prov-proveedor-nombre">${p.contacto || 'Proveedor'}${badge}</div>
                                <div class="prov-proveedor-meta">${p.nit || '—'}${p.telefono ? ` · ${p.telefono}` : ''}${p.consecutivoIngreso ? ` · Cons: ${p.consecutivoIngreso}` : ''}</div>
                            </div>
                            <button class="btn btn-danger btn-small" onclick="AdminHandlers.eliminarProveedor(${p.id})">Eliminar</button>
                        </div>
                    `;
                }).join('');

                const subTexto = multiple
                    ? `${lista.length} conductores · ${lista.map(p => p.nit).filter(Boolean).join(', ')}`
                    : (lista[0].servicio ? this._labelServicio(lista[0].servicio) : 'Proveedor');

                const header = `
                    <div class="prov-empresa-header" onclick="window.toggleProveedoresEmpresa('${detallesId}', '${chevronId}')">
                        <div class="prov-avatar" style="background:${color};">${iniciales}</div>
                        <div class="prov-empresa-info">
                            <div class="prov-empresa-nombre">${empresa}</div>
                            <div class="prov-empresa-sub">${subTexto}</div>
                        </div>
                        ${multiple ? `<span class="prov-chevron ${expandido ? 'abierto' : ''}" id="${chevronId}">▶</span>` : ''}
                    </div>
                `;

                const detalles = `
                    <div class="prov-detalles" id="${detallesId}" style="display:${expandido ? 'block' : 'none'};">
                        ${proveedoresHtml}
                    </div>
                `;

                return `<div class="prov-empresa-card">${header}${detalles}</div>`;
            }).join('');
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
            proveedoresBody.innerHTML = '<p class="empty-message">Error al cargar proveedores</p>';
        }
    },

    _iniciales(nombre) {
        const palabras = (nombre || '?').trim().split(/\s+/).filter(Boolean);
        if (palabras.length === 0) return '?';
        if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
        return (palabras[0][0] + palabras[1][0]).toUpperCase();
    },

    _colorPorEmpresa(nombre) {
        let hash = 0;
        for (let i = 0; i < (nombre || '').length; i++) {
            hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 55%, 45%)`;
    },

    _labelServicio(servicio) {
        const mapa = {
            'entrega': 'ENTREGA',
            'servicio': 'SERV. TÉCNICO',
            'reunion': 'REUNIÓN',
            'otro': 'OTRO',
            'transporte': 'TRANSPORTE'
        };
        return mapa[(servicio || '').toLowerCase()] || (servicio || '').toUpperCase();
    },

    async historial(historialParam) {
        // Debounce no bloqueante: evita recargas bruscas del historial cuando
        // polling/realtime disparan varios renderizados seguidos.
        if (!document.getElementById('historialTurnos')) return;
        this._historialParams = historialParam;
        if (this._historialTimer) {
            clearTimeout(this._historialTimer);
        }
        this._historialTimer = setTimeout(() => {
            this._historialTimer = null;
            this._renderHistorial(this._historialParams).catch(e => console.error('Error historial:', e));
        }, 600);
    },

    async _renderHistorial(historialParam) {
        const historialDiv = document.getElementById('historialTurnos');
        if (!historialDiv) return;

        const tablaHistorialActual = historialDiv.querySelector('.history-table');
        const scrollTop = historialDiv.scrollTop;
        const scrollLeft = tablaHistorialActual ? tablaHistorialActual.scrollLeft : 0;

        const restaurarScrollHistorial = () => {
            historialDiv.scrollTop = scrollTop;
            const tablaHistorial = historialDiv.querySelector('.history-table');
            if (tablaHistorial) tablaHistorial.scrollLeft = scrollLeft;
            requestAnimationFrame(() => {
                historialDiv.scrollTop = scrollTop;
                const tablaRenderizada = historialDiv.querySelector('.history-table');
                if (tablaRenderizada) tablaRenderizada.scrollLeft = scrollLeft;
            });
        };

        // Evitar recargas bruscas del historial mientras se edita un registro:
        // el polling/realtime no debe reconstruir la tabla durante la edición.
        const modalEditar = document.getElementById('modalEditarHistorial');
        if (modalEditar && modalEditar.style.display === 'flex') return;

        console.log('RenderAdmin.historial llamado');

        let historial;
        if (Array.isArray(historialParam)) {
            historial = historialParam;
        } else {
            const fechaInput = document.getElementById('fechaHistorial');
            const fechaFiltro = fechaInput && fechaInput.value ? fechaInput.value : null;
            historial = await SupabaseDB.cargarHistorial(100, fechaFiltro);
        }
        AppState.historial = historial;
        if (window.BusquedaHistorial) BusquedaHistorial.setHistorial(historial || []);
        console.log('Historial cargado:', historial.length, 'registros');
        
        try {
            if (historial.length === 0) {
                historialDiv.innerHTML = '<p class="empty-message">No hay historial de turnos</p>';
            } else {
                const destinoLabel = { 'ensambles': 'SI ENSAMBLES', 'plasticos': 'SI3 ZF SAS', 'ambos': 'AMBOS' };
                const turnosTransporte = historial.filter(h => h.esTransporte);
                const soloTransporte = historial.filter(h => h.esTransporte && h.proveedorTransporteId);
                
                historialDiv.innerHTML = `
                    <div style="margin-bottom: 12px; display: flex; gap: 12px; align-items: center;">
                        <label style="font-size: 13px; color: #64748b;">
                            <input type="checkbox" id="historialFiltroTransporte" onchange="RenderAdmin.historial()">
                            Solo transportistas
                        </label>
                        <span style="font-size: 13px; color: #8b5cf6;">${turnosTransporte.length} turno(s) transporte | ${soloTransporte.length} proveedor(es)</span>
                    </div>
<table class="history-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Empresa transportadora</th>
                                <th>Proveedor</th>
                                <th>Placa</th>
                                <th>Factura</th>
                                <th>Tipo</th>
                                <th>Bultos</th>
                                <th>Peso</th>
                                <th>Responsable</th>
                                <th>Hora Inicio</th>
                                <th>Hora Fin</th>
                                <th>Materiales SAP</th>
                                <th>Inspeccion</th>
                                <th>Estado</th>
                                <th>Destino</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${historial.filter(h => {
                                const chk = document.getElementById('historialFiltroTransporte');
                                return !chk || !chk.checked || h.esTransporte;
                            }).map(h => `
                                <tr>
                                    <td><strong>${h.numero}</strong></td>
                                      <td>${h.esTransporte ? (h.nombreEmpresa || '-') : ''}</td>
                                      <td>${(h.esTransporte && h.nombreProveedor) ? h.nombreProveedor : (h.nombreEmpresa || h.nombreProveedor || '-')}</td>
                                    <td>${h.nit || '-'}</td>
                                    <td>${formatearFacturasHistorial(h)}</td>
                                    <td>${h.tipoVehiculo || '-'}</td>
                                    <td>${h.bultos || '-'}</td>
                                    <td>${h.peso || '-'}</td>
                                    <td>${h.responsable || '-'}</td>
                                    <td>${Utils.formatearHora(h.horaLlamada)}</td>
                                    <td>${Utils.formatearHora(h.horaFinalizacion)}</td>
                                    <td class="history-sap-cell">${Array.isArray(h.materialesSap) && h.materialesSap.length
                                        ? botonMostrarMaterialesSapHtml(h.materialesSap)
                                        : '<span class="history-sap-empty">—</span>'}</td>
                                    <td>${h.inspeccionFisica ? '<span style="color:#dc2626;font-weight:600;">SI</span>' : '<span style="color:#64748b;">NO</span>'}</td>
                                    <td>${h.autorizadoSalida ? '<span style="color:#10b981;font-weight:600;">✓ SALIDA OK</span>' : '<span style="color:#f59e0b;">PENDIENTE</span>'}</td>
                                    <td>${destinoLabel[h.destino] || h.destino || '-'}</td>
                                    <td>
                                        <button class="btn btn-secondary btn-small" onclick="AdminHandlers.editarHistorial(${h.id})">Editar</button>
                                        <button class="btn btn-danger btn-small" onclick="AdminHandlers.eliminarHistorial(${h.id})">Eliminar</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
            restaurarScrollHistorial();
        } catch (error) {
            console.error('Error al cargar historial:', error);
            historialDiv.innerHTML = '<p class="empty-message">Error al cargar historial</p>';
            restaurarScrollHistorial();
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
            
            const materialesSap = Array.from(document.querySelectorAll('#materialesSapLista input'))
                .map(input => input.value.trim())
                .filter(Boolean);

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
                consecutivoIngreso: document.getElementById('consecutivoIngreso')?.value?.trim() || null,
                numFacturas: parseInt(document.getElementById('numFacturas')?.value) || 0,
                materialesSap,
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
            InputConfig.resetearMaterialesSap();
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
                console.warn('⚠︝ Timeout detectado, verficando si turno se guardó en localStorage...');
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
                    InputConfig.resetearMaterialesSap();
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
        
        if (await ConfirmDialog.confirmar(`¿Cancelar turno ${miTurno.numero}?`, 'Cancelar turno', 'Cancelar turno')) {
            try {
                const cancelado = await Turnos.cancelar(miTurno.id, miTurno.numero);
                if (!cancelado) {
                    Utils.mostrarNotificacion('No fue posible cancelar el turno. Verifique la conexión e inténtelo nuevamente.', 'error');
                    return;
                }

                LocalStorage.eliminarMiTurno();
                if (typeof ModoEspera !== 'undefined') {
                    ModoEspera.desactivar();
                }
                Utils.mostrarNotificacion('Turno cancelado', 'success');
                await Turnos.cargarTurnos();
                RenderUsuario.todo();
            } catch (error) {
                console.error('Error al cancelar turno:', error);
                Utils.mostrarNotificacion(error.message || 'Error al cancelar turno', 'error');
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

        if (AppState.turnoActual && AppState.turnoActual.id === turnoId) {
            this.mostrarModalDespacho(AppState.turnoActual, 'especifico', turnoId);
            Utils.mostrarNotificacion(`Reabriendo formulario del turno ${turno.numero}`, 'info');
            return;
        }

        if (AppState.turnoActual) {
            Utils.mostrarNotificacion(`Ya hay un turno en atención (${AppState.turnoActual.numero}). Complételo primero.`, 'error');
            return;
        }

        if (!(await ConfirmDialog.confirmar(`¿Llamar al turno ${turno.numero}?`, 'Confirmar llamada', 'Sí, llamar'))) return;

        AppState.turnoActual = turno;
        AppState.turnos = AppState.turnos.filter(t => t.id !== turno.id);
        LocalStorage.guardarTurnoActual(AppState.turnoActual);
        LocalStorage.guardarTurnos(AppState.turnos);
        
        if (window.MetricasRT && typeof window.MetricasRT.registrarInicio === 'function') {
            window.MetricasRT.registrarInicio(turno.id);
        }

        if (window.supabaseClient) {
            try {
                await SupabaseDB.llamarTurno(turno.id, {
                    numFactura: turno.numFactura,
                    tipoVehiculo: turno.tipoVehiculo,
                    bultos: turno.bultos,
                    peso: turno.peso,
                    responsable: turno.responsable,
                    contacto: turno.contacto,
                    telefono: turno.telefono,
                    servicio: turno.servicio,
                    destino: turno.destino
                });
            } catch (error) {
                console.error('Error sincronizando turno con Supabase:', error);
            }
        }

        this.mostrarModalDespacho(turno, 'especifico', turnoId);
        Utils.mostrarNotificacion(`TURNO ${turno.numero} LLAMADO`, 'success');
        await RenderAdmin.todo();
    },

    async llamarTurno() {
        if (AppState.turnoActual) {
            Utils.mostrarNotificacion(`Ya hay un turno en atención (${AppState.turnoActual.numero}). Complételo primero.`, 'error');
            return;
        }

        if (AppState.turnos.length === 0) {
            Utils.mostrarNotificacion('No hay turnos en espera', 'error');
            return;
        }

        const turno = AppState.turnos[0];
        if (!(await ConfirmDialog.confirmar(`¿Llamar al siguiente turno ${turno.numero}?`, 'Confirmar llamada', 'Sí, llamar'))) return;
        
        AppState.turnoActual = turno;
        AppState.turnos = AppState.turnos.filter(t => t.id !== turno.id);
        LocalStorage.guardarTurnoActual(AppState.turnoActual);
        LocalStorage.guardarTurnos(AppState.turnos);
        
        if (window.MetricasRT && typeof window.MetricasRT.registrarInicio === 'function') {
            window.MetricasRT.registrarInicio(turno.id);
        }

        if (window.supabaseClient) {
            try {
                await SupabaseDB.llamarTurno(turno.id, {
                    numFactura: turno.numFactura,
                    tipoVehiculo: turno.tipoVehiculo,
                    bultos: turno.bultos,
                    peso: turno.peso,
                    responsable: turno.responsable,
                    contacto: turno.contacto,
                    telefono: turno.telefono,
                    servicio: turno.servicio,
                    destino: turno.destino
                });
            } catch (error) {
                console.error('Error sincronizando turno con Supabase:', error);
            }
        }

        this.mostrarModalDespacho(turno, 'siguiente');
        Utils.mostrarNotificacion(`TURNO ${turno.numero} LLAMADO`, 'success');
        await RenderAdmin.todo();
    },

    mostrarModalDespacho(turno, tipo, turnoId = null) {
        const modal = document.getElementById('despachoModal');
        if (!modal) {
            Utils.mostrarNotificacion('Error: Modal de despacho no encontrado', 'error');
            return;
        }

        modal.classList.add('no-close');

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
            if (infoDespachoDiv) infoDespachoDiv.innerHTML = '';
        }

        const numFacturaInput = document.getElementById('despachoNumFactura');
        const tipoVehiculoInput = document.getElementById('despachoTipoVehiculo');
        const bultosInput = document.getElementById('despachoBultos');
        const pesoInput = document.getElementById('despachoPeso');
        const responsableInput = document.getElementById('despachoResponsable');
        const placaInput = document.getElementById('despachoPlaca');
        
        const facturaGroup = document.getElementById('despachoFacturaGroup');
        const facturaAmbosGroup = document.getElementById('despachoFacturaAmbosGroup');
        const facturaSIEInput = document.getElementById('despachoNumFacturaSIE');
        const facturaSI3Input = document.getElementById('despachoNumFacturaSI3');
        
        const destino = turno.destino || '';
        if (destino === 'ambos') {
            // Parse combined factura: "SI3 ZF (FEM149394) SIE (FEM14386)"
            const si3Match = (turno.numFactura || '').match(/SI3 ZF \(([^)]+)\)/);
            const sieMatch = (turno.numFactura || '').match(/SIE \(([^)]+)\)/);
            if (facturaSIEInput) facturaSIEInput.value = sieMatch ? sieMatch[1] : '';
            if (facturaSI3Input) facturaSI3Input.value = si3Match ? si3Match[1] : '';
            if (facturaGroup) facturaGroup.style.display = 'none';
            if (facturaAmbosGroup) facturaAmbosGroup.style.display = 'grid';
        } else {
            if (numFacturaInput) numFacturaInput.value = turno.numFactura || '';
            if (facturaGroup) facturaGroup.style.display = 'block';
            if (facturaAmbosGroup) facturaAmbosGroup.style.display = 'none';
        }

        if (placaInput) placaInput.value = turno.nit || '';
        if (tipoVehiculoInput) tipoVehiculoInput.value = turno.tipoVehiculo || '';
        if (bultosInput) bultosInput.value = turno.bultos || '';
        if (pesoInput) pesoInput.value = turno.peso || '';
        if (responsableInput) responsableInput.value = turno.responsable || '';
        
        const despachoDestinoSelect = document.getElementById('despachoDestino');
        if (despachoDestinoSelect) despachoDestinoSelect.value = turno.destino || '';
        
        const esTransporteCheckbox = document.getElementById('esTransporteCheckbox');
        const btnEsTransporte = document.getElementById('btnEsTransporte');
        if (esTransporteCheckbox) esTransporteCheckbox.checked = false;
        if (btnEsTransporte) btnEsTransporte.style.display = 'none';

        // Add event listener for destino change in despacho modal
        if (despachoDestinoSelect) {
            despachoDestinoSelect.onchange = () => {
                const facturaGroup = document.getElementById('despachoFacturaGroup');
                const facturaAmbosGroup = document.getElementById('despachoFacturaAmbosGroup');
                if (despachoDestinoSelect.value === 'ambos') {
                    facturaGroup.style.display = 'none';
                    facturaAmbosGroup.style.display = 'grid';
                } else {
                    facturaGroup.style.display = 'block';
                    facturaAmbosGroup.style.display = 'none';
                }
            };
        }
        
        modal.dataset.turnoId = turnoId || turno.id;
        modal.dataset.tipo = tipo;
        modal.style.display = 'flex';
    },

    revisarFormularioDespacho() {
        const confirmModal = document.getElementById('turnoModal');
        const despachoModal = document.getElementById('despachoModal');
        if (confirmModal) confirmModal.style.display = 'none';
        if (despachoModal) {
            despachoModal.classList.add('no-close');
            despachoModal.style.display = 'flex';
            document.getElementById('despachoDestino')?.focus();
        }
    },

    async guardarDespacho() {
        const result = await this._guardarDespachoBase();
        if (!result) return;
        
        const { turnoActual, infoDespacho } = result;
        const modal = document.getElementById('despachoModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('no-close');
        }

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

    async _guardarDespachoBase() {
        const modal = document.getElementById('despachoModal');
        if (!modal) return null;

        const turnoId = parseInt(modal.dataset.turnoId);
        const tipo = modal.dataset.tipo;

        const numFacturaInput = document.getElementById('despachoNumFactura');
        const tipoVehiculoInput = document.getElementById('despachoTipoVehiculo');
        const bultosInput = document.getElementById('despachoBultos');
        const pesoInput = document.getElementById('despachoPeso');
        const responsableInput = document.getElementById('despachoResponsable');
        const placaInput = document.getElementById('despachoPlaca');
        
        const facturaSIEInput = document.getElementById('despachoNumFacturaSIE');
        const facturaSI3Input = document.getElementById('despachoNumFacturaSI3');
        const despachoDestinoSelect = document.getElementById('despachoDestino');

        const turnoActual = AppState.turnoActual;

        if (!turnoActual) {
            Utils.mostrarNotificacion('No hay turno en atención', 'error');
            return null;
        }

        const placaIngresada = placaInput?.value?.trim().toUpperCase() || '';
        const placaOriginal = (turnoActual.nit || '').toUpperCase();
        if (placaIngresada && placaOriginal && placaIngresada !== placaOriginal) {
            Utils.mostrarNotificacion(`La placa ingresada (${placaIngresada}) no coincide con la placa del turno (${placaOriginal})`, 'error');
            return null;
        }

        // Handle factura(s) based on destino
        let numFactura = null;
        const destino = despachoDestinoSelect?.value || turnoActual.destino || '';
        if (destino === 'ambos') {
            const facturaSIE = facturaSIEInput?.value?.trim();
            const facturaSI3 = facturaSI3Input?.value?.trim();
            if (!facturaSIE || !facturaSI3) {
                Utils.mostrarNotificacion('Ambas facturas (SIE y SI3 ZF) son requeridas para destino AMBOS', 'error');
                return null;
            }
            numFactura = `SI3 ZF (${facturaSI3}) SIE (${facturaSIE})`;
        } else {
            numFactura = numFacturaInput?.value?.trim() || null;
        }

        const infoDespacho = {
            numFactura: numFactura,
            tipoVehiculo: tipoVehiculoInput?.value ? tipoVehiculoInput.value.trim() : null,
            bultos: bultosInput?.value?.trim() || null,
            peso: pesoInput?.value?.trim() || null,
            responsable: responsableInput?.value?.trim() || null,
            contacto: turnoActual.contacto || null,
            telefono: turnoActual.telefono || null,
            servicio: turnoActual.servicio || null,
            nit: turnoActual.nit || null,
            destino: destino
        };

        turnoActual.numFactura = infoDespacho.numFactura;
        turnoActual.tipoVehiculo = infoDespacho.tipoVehiculo;
        turnoActual.bultos = infoDespacho.bultos;
        turnoActual.peso = infoDespacho.peso;
        turnoActual.responsable = infoDespacho.responsable;
        turnoActual.contacto = infoDespacho.contacto;
        turnoActual.telefono = infoDespacho.telefono;
        turnoActual.servicio = infoDespacho.servicio;
        turnoActual.destino = infoDespacho.destino;
        turnoActual.estado = 'atendiendo';
        turnoActual.horaLlamada = Utils.obtenerHoraActual();
        
        const esTransporteCheckbox = document.getElementById('esTransporteCheckbox');
        turnoActual.esTransporte = esTransporteCheckbox ? !!esTransporteCheckbox.checked : false;
        infoDespacho.esTransporte = turnoActual.esTransporte;

        LocalStorage.guardarTurnoActual(AppState.turnoActual);
        LocalStorage.guardarTurnos(AppState.turnos);

        if (window.supabaseClient) {
            try {
                await SupabaseDB.llamarTurno(turnoActual.id, infoDespacho);
            } catch (error) {
                console.error('Error sincronizando con Supabase:', error);
            }
        }

        return { turnoActual, infoDespacho };
    },

    toggleEsTransporte() {
        const checkbox = document.getElementById('esTransporteCheckbox');
        const btn = document.getElementById('btnEsTransporte');
        if (checkbox && btn) {
            btn.style.display = checkbox.checked ? 'inline-block' : 'none';
        }
    },

    async abrirModalTransportista() {
        const result = await this._guardarDespachoBase();
        if (!result) return;
        
        const { turnoActual } = result;
        const modal = document.getElementById('despachoModal');
        if (modal) modal.style.display = 'none';

        AppState.proveedoresTransporte = [];

        const transportistaModal = document.getElementById('transportistaModal');
        if (!transportistaModal) return;

        const turnoNumero = document.getElementById('transportistaTurnoNumero');
        const turnoInfo = document.getElementById('transportistaTurnoInfo');
        if (turnoNumero) turnoNumero.textContent = turnoActual.numero;
        if (turnoInfo) turnoInfo.textContent = `${turnoActual.nombreEmpresa}${turnoActual.nit ? ' - ' + turnoActual.nit : ''}`;
        
        const placaInfo = document.getElementById('transportistaPlacaInfo');
        if (placaInfo) placaInfo.textContent = turnoActual.nit || '--';

        const tipoInfo = document.getElementById('transportistaTipoInfo');
        if (tipoInfo) tipoInfo.textContent = turnoActual.tipoVehiculo || '--';

        transportistaModal.classList.add('no-close');
        transportistaModal.style.display = 'flex';
        this._renderProveedoresTransporte();
        
        // Clear form fields
        document.getElementById('transportistaNombreProveedor').value = '';
        document.getElementById('transportistaFactura').value = '';
        document.getElementById('transportistaConsecutivo').value = '';
        document.getElementById('transportistaBultos').value = '';
        document.getElementById('transportistaPeso').value = '';
        document.getElementById('transportistaResponsable').value = '';
        document.getElementById('transportistaTipoVehiculo').value = '';
        document.getElementById('transportistaDestino').value = '';
        
        Utils.mostrarNotificacion(`Turno ${turnoActual.numero} - Registre proveedores`, 'info');
    },

    agregarProveedorTransportista() {
        const nombreProveedorInput = document.getElementById('transportistaNombreProveedor');
        const facturaInput = document.getElementById('transportistaFactura');
        const consecutivoInput = document.getElementById('transportistaConsecutivo');
        const destinoInput = document.getElementById('transportistaDestino');
        const bultosInput = document.getElementById('transportistaBultos');
        const pesoInput = document.getElementById('transportistaPeso');
        const responsableInput = document.getElementById('transportistaResponsable');
        const tipoVehiculoInput = document.getElementById('transportistaTipoVehiculo');
        
        const turnoActual = AppState.turnoActual;
        if (!turnoActual) {
            Utils.mostrarNotificacion('No hay turno en atención', 'error');
            return;
        }

        const nombreProveedor = nombreProveedorInput?.value?.trim() || '';
        if (!nombreProveedor) {
            Utils.mostrarNotificacion('El nombre del proveedor es requerido', 'error');
            nombreProveedorInput?.focus();
            return;
        }

        const tipoVehiculo = tipoVehiculoInput?.value ? tipoVehiculoInput.value.trim() : '';

        const destino = destinoInput?.value ? destinoInput.value.trim() : '';

        const proveedor = {
            id: null,
            numeroTurno: turnoActual.numero,
            nombreEmpresa: turnoActual.nombreEmpresa,
            nit: turnoActual.nit || '',
            motivo: turnoActual.motivo || '',
            nombreProveedor: nombreProveedor,
            numFactura: facturaInput?.value?.trim() || null,
            tipoVehiculo: tipoVehiculo,
            bultos: bultosInput?.value?.trim() || null,
            peso: pesoInput?.value?.trim() || null,
            responsable: responsableInput?.value?.trim() || null,
            contacto: turnoActual.contacto || null,
            telefono: turnoActual.telefono || null,
            servicio: turnoActual.servicio || null,
            destino: destino || (turnoActual.destino || null),
            horaSolicitud: turnoActual.horaSolicitud || Utils.obtenerHoraActual(),
            estado: 'pendiente',
            autorizadoSalida: false,
            inspeccionFisica: false,
            consecutivoIngreso: consecutivoInput?.value?.trim() || turnoActual.consecutivoIngreso || null
        };

        if (AppState.editandoProveedorIndex !== null) {
            const idx = AppState.editandoProveedorIndex;
            const existente = AppState.proveedoresTransporte[idx];
            if (existente && existente.id) {
                proveedor.id = existente.id;
                SupabaseDB.actualizarProveedorTransporte(existente.id, {
                    nombre_proveedor: proveedor.nombreProveedor,
                    num_factura: proveedor.numFactura,
                    tipo_vehiculo: proveedor.tipoVehiculo,
                    bultos: proveedor.bultos,
                    peso: proveedor.peso,
                    responsable: proveedor.responsable,
                    destino: proveedor.destino,
                    consecutivo_ingreso: proveedor.consecutivoIngreso || null
                });
            }
            AppState.proveedoresTransporte[idx] = proveedor;
            AppState.editandoProveedorIndex = null;
        } else {
            AppState.proveedoresTransporte.push(proveedor);
        }

        this._renderProveedoresTransporte();
        this._limpiarFormularioTransportista();
        Utils.mostrarNotificacion(`Proveedor ${nombreProveedor} agregado`, 'success');
    },
    _limpiarFormularioTransportista() {
        const ids = ['transportistaFactura',
                     'transportistaBultos', 
                     'transportistaPeso',
                     'transportistaResponsable',
                     'transportistaNombreProveedor', 'transportistaDestino', 'transportistaTipoVehiculo'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const destinoSelect = document.getElementById('transportistaDestino');
        if (destinoSelect) destinoSelect.value = '';
        const tipoVehiculoSelect = document.getElementById('transportistaTipoVehiculo');
        if (tipoVehiculoSelect) tipoVehiculoSelect.value = '';
        const nombreProveedorInput = document.getElementById('transportistaNombreProveedor');
        if (nombreProveedorInput) nombreProveedorInput.focus();
        AppState.editandoProveedorIndex = null;
    },

    editarProveedorTransportista(index) {
        const proveedor = AppState.proveedoresTransporte[index];
        if (!proveedor) return;

        document.getElementById('transportistaFactura').value = proveedor.numFactura || '';
        document.getElementById('transportistaBultos').value = proveedor.bultos || '';
        document.getElementById('transportistaPeso').value = proveedor.peso || '';
        document.getElementById('transportistaResponsable').value = proveedor.responsable || '';
        document.getElementById('transportistaNombreProveedor').value = proveedor.nombreProveedor || '';
        document.getElementById('transportistaDestino').value = proveedor.destino || '';
        document.getElementById('transportistaTipoVehiculo').value = proveedor.tipoVehiculo || '';
        window.refrescarVistaPreviaTipoVehiculo('transportistaTipoVehiculo');

        AppState.editandoProveedorIndex = index;
        Utils.mostrarNotificacion(`Editando proveedor ${proveedor.nombreProveedor || proveedor.nit}`, 'info');
    },

    async eliminarProveedorTransportista(index) {
        const proveedor = AppState.proveedoresTransporte[index];
        if (!proveedor) return;
        
        if (await ConfirmDialog.confirmar(`¿Eliminar proveedor ${proveedor.nombreProveedor || proveedor.nit}?`, 'Eliminar proveedor', 'Eliminar')) {
            if (proveedor.id) {
                await SupabaseDB.eliminarProveedorTransporte(proveedor.id);
            }
            AppState.proveedoresTransporte.splice(index, 1);
            this._renderProveedoresTransporte();
            Utils.mostrarNotificacion('Proveedor eliminado', 'success');
        }
    },

    _renderProveedoresTransporte() {
        const listaDiv = document.getElementById('listaProveedoresTransporte');
        const contadorDiv = document.getElementById('contadorProveedoresTransporte');
        const destinoLabel = { 'ensambles': 'ENSAMBLES', 'plasticos': 'SI3 ZF SAS', 'ambos': 'AMBOS' };
        
        if (contadorDiv) contadorDiv.textContent = AppState.proveedoresTransporte.length;
        
        if (!listaDiv) return;
        
        const proveedores = AppState.proveedoresTransporte;
        
        if (proveedores.length === 0) {
            listaDiv.innerHTML = '<p class="empty-message">No hay proveedores agregados</p>';
        } else {
            listaDiv.innerHTML = proveedores.map((p, index) => {
                let pesoDisplay = p.peso || 'N/A';
                if (pesoDisplay.toLowerCase().includes('kg')) pesoDisplay = pesoDisplay.replace(/kg/i, '').trim() + ' kg';
                else if (pesoDisplay !== 'N/A') pesoDisplay += ' kg';
                const destinoDisplay = destinoLabel[p.destino] || p.destino || 'N/A';
                return `
                <div class="turn-item" style="border-left: 3px solid #8b5cf6;">
                    <span class="turn-item-number" style="color: #8b5cf6;">${index + 1}</span>
                    <div class="turn-item-info">
                        <div class="turn-item-company">${p.nombreProveedor || 'N/A'}</div>
                    <div class="turn-item-details">
                        <span>Factura: ${p.numFactura || 'N/A'}</span>
                        <span>Tipo: ${p.tipoVehiculo || 'N/A'}</span>
                        <span>Bultos: ${p.bultos || 'N/A'}</span>
                        <span>Peso: ${pesoDisplay}</span>
                        <span>Responsable: ${p.responsable || 'N/A'}</span>
                        <span>Destino: ${destinoDisplay}</span>
                    </div>
                    </div>
                    <div class="turn-item-actions">
                        <button class="btn btn-secondary btn-small" onclick="AdminHandlers.editarProveedorTransportista(${index})">Editar</button>
                        <button class="btn btn-danger btn-small" onclick="AdminHandlers.eliminarProveedorTransportista(${index})">Eliminar</button>
                    </div>
                </div>
                `;
            }).join('');
        }
    },

    cerrarModalTransportista() {
        const modal = document.getElementById('transportistaModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('no-close');
        }
        AppState.editandoProveedorIndex = null;
    },

    async finalizarProveedores() {
        const proveedores = AppState.proveedoresTransporte;
        
        if (proveedores.length === 0) {
            Utils.mostrarNotificacion('Debe agregar al menos un proveedor', 'error');
            return;
        }

        if (!(await ConfirmDialog.confirmar(`¿Finalizar registro de ${proveedores.length} proveedor(es)?`, 'Finalizar registro', 'Finalizar'))) {
            return;
        }

        const turnoActual = AppState.turnoActual;
        if (!turnoActual) {
            Utils.mostrarNotificacion('No hay turno en atención', 'error');
            return;
        }

        if (window.supabaseClient && turnoActual.nit) {
            try {
                const empresa = turnoActual.nombre_empresa || 'Transportadora';
                const { data: provExistente, error: errSel } = await window.supabaseClient
                    .from('proveedores')
                    .select('id')
                    .eq('nit', turnoActual.nit)
                    .limit(1);
                
                if (!errSel && provExistente && provExistente.length > 0) {
                    await window.supabaseClient
                        .from('proveedores')
                        .update({
                            servicio: 'transporte',
                            nombre_empresa: empresa,
                            activo: true,
                            updated_at: new Date().toISOString()
                        })
                        .eq('nit', turnoActual.nit);
                } else {
                    await window.supabaseClient
                        .from('proveedores')
                        .insert({
                            nombre_empresa: empresa,
                            nit: turnoActual.nit,
                            servicio: 'transporte',
                            activo: true,
                            fecha_registro: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        });
                }
            } catch (e) {
                console.warn('No se pudo marcar la empresa como transporte en el directorio:', e);
            }
        }

        Utils.setLoading(true);

        try {
            const horaFin = Utils.obtenerHoraActual();
            const proveedoresListos = [];

            for (const proveedor of proveedores) {
                if (proveedor.id) {
                    proveedoresListos.push(proveedor);
                    continue;
                }

                const proveedorConId = await SupabaseDB.guardarProveedorTransporte(proveedor);
                if (proveedorConId) {
                    proveedor.id = proveedorConId.id;
                }
                proveedoresListos.push(proveedor);
            }

            const proveedorDataPrincipal = {
                numero: turnoActual.numero,
                esTransporte: true,
                proveedores: proveedoresListos.map(p => ({
                    id: p.id,
                    nombreProveedor: p.nombreProveedor || '',
                    numFactura: p.numFactura,
                    tipoVehiculo: p.tipoVehiculo,
                    bultos: p.bultos,
                    peso: p.peso,
                    responsable: p.responsable,
                    destino: p.destino || '',
                    consecutivoIngreso: p.consecutivoIngreso || ''
                })),
                timestamp: Date.now()
            };

            try {
                localStorage.setItem('proveedorListoSalir', JSON.stringify(proveedorDataPrincipal));
            } catch (e) {
                console.error('Error al guardar en localStorage:', e);
            }

            try {
                await window.supabaseClient
                    .from('turnos')
                    .delete()
                    .eq('id', turnoActual.id);
                
                const miTurno = LocalStorage.obtenerMiTurno();
                if (miTurno && miTurno.numero === turnoActual.numero) {
                    LocalStorage.eliminarMiTurno();
                    if (typeof ModoEspera !== 'undefined') {
                        ModoEspera.desactivar();
                    }
                }
                
                AppState.turnoActual = null;
                LocalStorage.guardarTurnoActual(null);
            } catch (dbError) {
                console.error('Error al eliminar turno de transportista:', dbError);
            }

            await this._crearHistorialProveedoresTransporte(proveedoresListos, horaFin);
            
            if (window.supabaseClient) {
                try {
                    await window.supabaseClient.from('notificaciones_salida').insert({
                        mensaje: `Turno ${turnoActual.numero} - ${proveedoresListos.length} proveedores registrados`,
                        remitente: 'admin',
                        leido: false,
                        tipo: 'salida_pendiente',
                        proveedor_nit: turnoActual.nit || null,
                        nombre_empresa: turnoActual.nombreEmpresa || null,
                        datos: JSON.parse(JSON.stringify(proveedorDataPrincipal))
                    });
                } catch(err) { console.warn('Notificación:', err); }
            }
            
            if (typeof SonidoAlerta !== 'undefined' && SonidoAlerta.reproducir) {
                if (window.SonidoSI3) window.SonidoSI3.inicializar();
                SonidoAlerta.reproducir(3);
            }
            
            const transportistaModal = document.getElementById('transportistaModal');
            if (transportistaModal) {
                transportistaModal.style.display = 'none';
                transportistaModal.classList.remove('no-close');
            }
            
            this.cerrarModalTransportista();
            AppState.proveedoresTransporte = [];
            
            Utils.mostrarNotificacion(
                `Turno ${turnoActual.numero} completado. ${proveedoresListos.length} proveedor(es) registrados.`,
                'success',
                true
            );
            
            await RenderAdmin.todo();
        } catch (error) {
            console.error('Error en finalizarProveedores:', error);
            Utils.mostrarNotificacion('Error al finalizar: ' + error.message, 'error');
        } finally {
            Utils.setLoading(false);
        }
    },

    async _crearHistorialProveedoresTransporte(proveedores, horaFin) {
        if (!window.supabaseClient) return;

        try {
            for (const proveedor of proveedores) {
                const historialData = {
                    numero: proveedor.numeroTurno,
                    nombre_empresa: proveedor.nombreEmpresa || '',
                    nit: proveedor.nit,
                    motivo: proveedor.motivo || '',
                    hora_solicitud: proveedor.horaSolicitud || null,
                    hora_llamada: proveedor.horaLlamada || null,
                    hora_finalizacion: horaFin || null,
                    estado: 'completado',
                    destino: proveedor.destino || null,
                    nombre_proveedor: proveedor.nombreProveedor || null,
                    num_factura: proveedor.numFactura || null,
                    tipo_vehiculo: proveedor.tipoVehiculo || null,
                    bultos: proveedor.bultos ? parseInt(proveedor.bultos) : null,
                    peso: proveedor.peso || null,
                    responsable: proveedor.responsable || null,
                    contacto: proveedor.contacto || null,
                    telefono: proveedor.telefono || null,
                    servicio: proveedor.servicio || null,
                    consecutivo_ingreso: proveedor.consecutivoIngreso || null,
                    num_facturas: proveedor.numFacturas ?? null,
                    autorizado_salida: false,
                    inspeccion_fisica: false,
                    es_transporte: true,
                    proveedor_transporte_id: proveedor.id,
                    fecha: getLocalISOString()
                };

                try {
                    const { error: historialError } = await window.supabaseClient
                        .from('historial_turnos')
                        .insert([historialData])
                        .single();
                    if (historialError) throw historialError;
                } catch (error) {
                    const msg = error.message || '';
                    if (msg.includes('consecutivo_ingreso') || msg.includes('num_facturas') || msg.includes('es_transporte') || msg.includes('proveedor_transporte_id') || msg.includes('nombre_proveedor')) {
                        const retryData = { ...historialData };
                        if (msg.includes('consecutivo_ingreso')) delete retryData.consecutivo_ingreso;
                        if (msg.includes('num_facturas')) delete retryData.num_facturas;
                        if (msg.includes('es_transporte')) delete retryData.es_transporte;
                        if (msg.includes('proveedor_transporte_id')) delete retryData.proveedor_transporte_id;
                        if (msg.includes('nombre_proveedor')) delete retryData.nombre_proveedor;
                        try {
                            await window.supabaseClient
                                .from('historial_turnos')
                                .insert([retryData])
                                .single();
                        } catch (retryError) {
                            console.error('Error al crear historial (reintento):', retryError);
                        }
                    } else {
                        console.error('Error al crear historial:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Error al crear historial de proveedores transporte:', error);
        }
    },

    async llamarTurno() {
        if (AppState.turnoActual) {
            Utils.mostrarNotificacion(`Ya hay un turno en atención (${AppState.turnoActual.numero}). Complételo primero.`, 'error');
            return;
        }

        if (AppState.turnos.length === 0) {
            Utils.mostrarNotificacion('No hay turnos en espera', 'error');
            return;
        }

        const turno = AppState.turnos[0];
        if (!(await ConfirmDialog.confirmar(`¿Llamar al siguiente turno ${turno.numero}?`, 'Confirmar llamada', 'Sí, llamar'))) return;
        
        AppState.turnoActual = turno;
        AppState.turnos = AppState.turnos.filter(t => t.id !== turno.id);
        LocalStorage.guardarTurnoActual(AppState.turnoActual);
        LocalStorage.guardarTurnos(AppState.turnos);
        
        if (window.MetricasRT && typeof window.MetricasRT.registrarInicio === 'function') {
            window.MetricasRT.registrarInicio(turno.id);
        }

        this.mostrarModalDespacho(turno, 'siguiente');
        Utils.mostrarNotificacion(`TURNO ${turno.numero} LLAMADO`, 'success');
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
        
        if (!(await ConfirmDialog.confirmar(`¿Completar turno ${turnoNumero}?`, 'Completar turno', 'Completar turno'))) return;
        
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
            materialesSap: turnoParaDespacho.materialesSap || [],
            tipoVehiculo: turnoParaDespacho.tipoVehiculo || '',
            bultos: turnoParaDespacho.bultos || '',
            peso: turnoParaDespacho.peso || '',
            responsable: turnoParaDespacho.responsable || '',
            consecutivoIngreso: turnoParaDespacho.consecutivoIngreso || '',
            inspeccionFisica: turnoParaDespacho.inspeccionFisica || false,
            autorizadoSalida: turnoParaDespacho.autorizadoSalida || false,
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
        if (await ConfirmDialog.confirmar('¿Cancelar turno?', 'Cancelar turno', 'Cancelar turno')) {
            try {
                await Turnos.cancelar(id);
                await RenderAdmin.todo();
                Utils.mostrarNotificacion('Turno cancelado', 'success');
            } catch (error) {
                console.error('Error al cancelar turno:', error);
                Utils.mostrarNotificacion(error.message || 'Error al cancelar turno', 'error');
            }
        }
    },

    async reiniciarCola() {
        const numTurnos = AppState.turnos ? AppState.turnos.length : 0;

        if (numTurnos === 0) {
            if (await ConfirmDialog.confirmar('¿Reiniciar cola? No hay turnos en espera.', 'Reiniciar cola', 'Reiniciar cola')) {
                await Turnos.reiniciarCola();
                Utils.mostrarNotificacion('Cola reiniciada', 'success');
                await RenderAdmin.todo();
            }
            return;
        }

        if (!(await ConfirmDialog.confirmar(`Se perderán ${numTurnos} turno(s) en espera de forma permanente.`, 'Reiniciar cola', 'Continuar'))) {
            return;
        }

        const confirmacion = await ConfirmDialog.pedirTexto(
            `Se eliminarán ${numTurnos} turno(s). Escribe REINICIAR para confirmar.`,
            'Confirmación adicional',
            'Escribe REINICIAR',
            'REINICIAR'
        );

        if (confirmacion?.toUpperCase() === 'REINICIAR') {
            await Turnos.reiniciarCola();
            Utils.mostrarNotificacion('Cola reiniciada', 'success');
            await RenderAdmin.todo();
        }
    },

    async reiniciarContador() {
        if (await ConfirmDialog.confirmar('Los próximos turnos empezarán en T001 y C001.', 'Reiniciar contador', 'Reiniciar contador')) {
            try {
                await SupabaseDB.guardarFechaReinicioContador(new Date().toISOString());
                LocalStorage.guardarContadorPrefijo('T', 0);
                LocalStorage.guardarContadorPrefijo('C', 0);
                localStorage.removeItem('contador_reiniciado');
                AppState.contadorTurnos = 0;
                AppState.contadorTurnosT = 0;
                AppState.contadorTurnosC = 0;
                
                if (window.supabaseClient) {
                    await SupabaseDB.incrementarContadorTurnosHasta('T', 0);
                    await SupabaseDB.incrementarContadorTurnosHasta('C', 0);
                    
                    const [verifT, verifC] = await Promise.all([
                        SupabaseDB.obtenerContadorTurnos('T'),
                        SupabaseDB.obtenerContadorTurnos('C')
                    ]);
                    
                    if (verifT > 0 || verifC > 0) {
                        console.warn('⚠️ Contadores no se resetearon completamente en Supabase. Reintentando...');
                        await SupabaseDB.incrementarContadorTurnosHasta('T', 0);
                        await SupabaseDB.incrementarContadorTurnosHasta('C', 0);
                        const [verifFinalT, verifFinalC] = await Promise.all([
                            SupabaseDB.obtenerContadorTurnos('T'),
                            SupabaseDB.obtenerContadorTurnos('C')
                        ]);
                        if (verifFinalT > 0 || verifFinalC > 0) {
                            throw new Error('Supabase no confirmó el reinicio de ambos contadores.');
                        }
                    }
                }
                
                Utils.mostrarNotificacion('Contador reiniciado. Próximo turno: T001 / C001', 'success');
                await RenderAdmin.todo();
            } catch (error) {
                console.error('Error al reiniciar contador:', error);
                Utils.mostrarNotificacion('Error al reiniciar contador', 'error');
            }
        }
    },

    // CORRECCIÓN: Función eliminarProveedor añadida correctamente
    async eliminarProveedor(id) {
        if (await ConfirmDialog.confirmar('¿Eliminar este proveedor?', 'Eliminar proveedor', 'Eliminar')) {
            const resultado = await SupabaseDB.eliminarProveedor(id);
            if (resultado) {
                Utils.mostrarNotificacion('Proveedor eliminado', 'success');
                await RenderAdmin.proveedores();
            } else {
                Utils.mostrarNotificacion('Error al eliminar proveedor', 'error');
            }
        }
    },

    abrirModalProveedorSinTurno() {
        const modal = document.getElementById('proveedorSinTurnoModal');
        if (!modal) return;

        const limpiar = (id, val = '') => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };
        limpiar('sinTurnoProveedor');
        limpiar('sinTurnoPlaca');
        limpiar('sinTurnoFactura');
        limpiar('sinTurnoFacturaSIE');
        limpiar('sinTurnoFacturaSI3');
        limpiar('sinTurnoBultos');
        limpiar('sinTurnoPeso');
        limpiar('sinTurnoResponsable');
        limpiar('sinTurnoDestino');
        limpiar('sinTurnoTipo');
        limpiar('sinTurnoConsecutivo');

        modal.style.display = 'flex';
        const proveedorInput = document.getElementById('sinTurnoProveedor');
        if (proveedorInput) proveedorInput.focus();
        
        // Toggle factura fields based on destino (one-time listener)
        if (!window._sinTurnoDestinoListener) {
            window._sinTurnoDestinoListener = true;
            const destinoSelect = document.getElementById('sinTurnoDestino');
            if (destinoSelect) {
                destinoSelect.addEventListener('change', () => {
                    const facturaGroup = document.getElementById('sinTurnoFacturaGroup');
                    const facturaAmbosGroup = document.getElementById('sinTurnoFacturaAmbosGroup');
                    if (destinoSelect.value === 'ambos') {
                        facturaGroup.style.display = 'none';
                        facturaAmbosGroup.style.display = 'grid';
                    } else {
                        facturaGroup.style.display = 'block';
                        facturaAmbosGroup.style.display = 'none';
                    }
                });
            }
        }
    },
    cerrarModalProveedorSinTurno() {
        const modal = document.getElementById('proveedorSinTurnoModal');
        if (modal) modal.style.display = 'none';
    },

    async registrarProveedorSinTurno(e) {
        if (e) e.preventDefault();

        const proveedorInput = (document.getElementById('sinTurnoProveedor')?.value?.trim() || '');
        const placa = (document.getElementById('sinTurnoPlaca')?.value?.trim().toUpperCase() || '');
        const destino = document.getElementById('sinTurnoDestino')?.value || '';
        const tipo = document.getElementById('sinTurnoTipo')?.value || null;
        const bultos = document.getElementById('sinTurnoBultos')?.value?.trim() || null;
        const peso = document.getElementById('sinTurnoPeso')?.value?.trim() || null;
        const responsable = document.getElementById('sinTurnoResponsable')?.value?.trim() || null;
        const consecutivo = document.getElementById('sinTurnoConsecutivo')?.value?.trim() || null;

        // Handle factura(s) based on destino
        let factura = null;
        if (destino === 'ambos') {
            const facturaSIE = document.getElementById('sinTurnoFacturaSIE')?.value?.trim();
            const facturaSI3 = document.getElementById('sinTurnoFacturaSI3')?.value?.trim();
            if (!facturaSIE || !facturaSI3) {
                Utils.mostrarNotificacion('Ambas facturas (SIE y SI3 ZF) son requeridas para destino AMBOS', 'error');
                return;
            }
            factura = `SI3 ZF (${facturaSI3}) SIE (${facturaSIE})`;
        } else {
            factura = document.getElementById('sinTurnoFactura')?.value?.trim() || null;
        }

        if (!proveedorInput) {
            Utils.mostrarNotificacion('El nombre del proveedor es requerido', 'error');
            return;
        }
        if (!placa || placa.length !== 6) {
            Utils.mostrarNotificacion('La placa debe tener exactamente 6 caracteres', 'error');
            return;
        }
        if (!destino) {
            Utils.mostrarNotificacion('El destino es requerido', 'error');
            return;
        }

        Utils.setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const datosProveedor = {
                nombreEmpresa: proveedorInput,
                nit: placa,
                contacto: responsable || proveedorInput,
                telefono: '',
                servicio: '',
                destino: destino,
                fechaCita: null,
                numFactura: factura,
                tipoVehiculo: tipo,
                bultos: bultos,
                peso: peso,
                responsable: responsable,
                consecutivoIngreso: consecutivo
            };

            const turno = await Turnos.solicitar(datosProveedor, '', controller.signal, 'llegado');

            if (turno) {
                Utils.mostrarNotificacion(`Proveedor ${proveedorInput} registrado. Turno ${turno.numero} confirmado`, 'success');
                this.cerrarModalProveedorSinTurno();
                await RenderAdmin.todo();
            }
        } catch (error) {
            console.error('Error registrando proveedor sin turno:', error);
            if (error.name === 'AbortError' || (error.message && error.message.includes('Timeout'))) {
                Utils.mostrarNotificacion('Tiempo de espera agotado. Intente nuevamente.', 'error');
            } else {
                Utils.mostrarNotificacion(error.message || 'Error al registrar proveedor', 'error');
            }
        } finally {
            clearTimeout(timeoutId);
            Utils.setLoading(false);
        }
    },

    async eliminarHistorial(id) {
        if (!(await ConfirmDialog.confirmar('¿Eliminar este registro del historial?', 'Eliminar registro', 'Eliminar'))) return;
        try {
            if (window.supabaseClient) {
                const { error } = await window.supabaseClient
                    .from('historial_turnos')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
            }
            const coincideId = registro => String(registro.id) !== String(id);
            const historial = LocalStorage.obtenerHistorial().filter(coincideId);
            LocalStorage.guardarHistorial(historial);
            AppState.historial = (Array.isArray(AppState.historial) ? AppState.historial : historial).filter(coincideId);
            Utils.mostrarNotificacion('Registro eliminado', 'success');
            await RenderAdmin.historial();
        } catch (error) {
            console.error('Error al eliminar historial:', error);
            Utils.mostrarNotificacion('Error al eliminar', 'error');
        }
    },

    async editarHistorial(id) {
        try {
            if (!window.supabaseClient) {
                Utils.mostrarNotificacion('Sin conexión', 'error');
                return;
            }
            const { data, error } = await window.supabaseClient
                .from('historial_turnos')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error) throw error;
            if (!data) {
                Utils.mostrarNotificacion('Registro no encontrado', 'error');
                return;
            }
            const esTransporte = data.es_transporte === true;
            document.getElementById('editHistId').value = data.id;
            document.getElementById('editHistEmpresa').value = data.nombre_empresa || data.nombre_proveedor || '';
            document.getElementById('editHistProveedor').value = data.nombre_proveedor || '';
            document.getElementById('editHistPlaca').value = data.nit || '';
            document.getElementById('editHistFmm').value = data.consecutivo_ingreso || '';
            InputConfig.cargarMaterialesSap(
                document.getElementById('editHistMaterialesSapLista'),
                data.materiales_sap
            );
            
            // Handle factura fields based on destino
            const editDestino = data.destino || '';
            const facturaGroup = document.getElementById('editHistFacturaGroup');
            const facturaAmbosGroup = document.getElementById('editHistFacturaAmbosGroup');
            const numFactura = data.num_factura || '';
            
            if (editDestino === 'ambos' && numFactura) {
                // Parse combined factura: "SI3 ZF (FEM149394) SIE (FEM14386)"
                const si3Match = numFactura.match(/SI3 ZF \(([^)]+)\)/);
                const sieMatch = numFactura.match(/SIE \(([^)]+)\)/);
                document.getElementById('editHistFacturaSIE').value = sieMatch ? sieMatch[1] : '';
                document.getElementById('editHistFacturaSI3').value = si3Match ? si3Match[1] : '';
                facturaGroup.style.display = 'none';
                facturaAmbosGroup.style.display = 'grid';
            } else {
                document.getElementById('editHistFactura').value = numFactura;
                facturaGroup.style.display = 'block';
                facturaAmbosGroup.style.display = 'none';
            }
            
            document.getElementById('editHistTipo').value = data.tipo_vehiculo || '';
            window.refrescarVistaPreviaTipoVehiculo('editHistTipo');
            document.getElementById('editHistBultos').value = data.bultos || '';
            document.getElementById('editHistPeso').value = data.peso || '';
            document.getElementById('editHistResponsable').value = data.responsable || '';
document.getElementById('editHistDestino').value = editDestino;
            this._editTransporteId = data.proveedor_transporte_id || null;
            this._editOriginalPayload = {
                nombre_empresa: data.nombre_empresa || data.nombre_proveedor || '',
                nombre_proveedor: data.nombre_proveedor || data.nombre_empresa || '',
                nit: data.nit || '',
                num_factura: data.num_factura || '',
                tipo_vehiculo: data.tipo_vehiculo || '',
                bultos: data.bultos || '',
                peso: data.peso || '',
                responsable: data.responsable || '',
                destino: data.destino || ''
            };
            
            // Add event listener for destino change in edit modal
            const editDestinoSelect = document.getElementById('editHistDestino');
            if (editDestinoSelect) {
                editDestinoSelect.onchange = () => {
                    const facturaGroup = document.getElementById('editHistFacturaGroup');
                    const facturaAmbosGroup = document.getElementById('editHistFacturaAmbosGroup');
                    if (editDestinoSelect.value === 'ambos') {
                        facturaGroup.style.display = 'none';
                        facturaAmbosGroup.style.display = 'grid';
                    } else {
                        facturaGroup.style.display = 'block';
                        facturaAmbosGroup.style.display = 'none';
                    }
                };
            }
            
            document.getElementById('modalEditarHistorial').style.display = 'flex';
        } catch (error) {
            console.error('Error al cargar registro:', error);
            Utils.mostrarNotificacion('Error al cargar', 'error');
        }
    },

    async guardarEdicionHistorial() {
        const id = parseInt(document.getElementById('editHistId').value, 10);
        if (!id) return;
        const bultosRaw = document.getElementById('editHistBultos').value;
        const bultosVal = bultosRaw !== '' ? parseInt(bultosRaw, 10) : null;
        const empresaVal = (document.getElementById('editHistEmpresa').value || '').trim();
        const proveedorVal = (document.getElementById('editHistProveedor').value || '').trim();
        const destino = document.getElementById('editHistDestino').value || null;
        const listaMaterialesSap = document.getElementById('editHistMaterialesSapLista');
        const materialesSap = Array.from(listaMaterialesSap?.querySelectorAll('.material-sap-input') || [])
            .map(entrada => entrada.value.trim())
            .filter(Boolean);
        
        // Handle factura(s) based on destino
        let numFactura = '';
        if (destino === 'ambos') {
            const facturaSIE = document.getElementById('editHistFacturaSIE')?.value?.trim();
            const facturaSI3 = document.getElementById('editHistFacturaSI3')?.value?.trim();
            if (!facturaSIE || !facturaSI3) {
                Utils.mostrarNotificacion('Ambas facturas (SIE y SI3 ZF) son requeridas para destino AMBOS', 'error');
                return;
            }
            numFactura = `SI3 ZF (${facturaSI3}) SIE (${facturaSIE})`;
        } else {
            numFactura = (document.getElementById('editHistFactura').value || '').trim();
        }
        
        const payload = {
            nombre_empresa: empresaVal || proveedorVal,
            nombre_proveedor: proveedorVal,
            nit: (document.getElementById('editHistPlaca').value || '').trim(),
            consecutivo_ingreso: (document.getElementById('editHistFmm').value || '').trim() || null,
            materiales_sap: materialesSap,
            num_factura: numFactura,
            tipo_vehiculo: document.getElementById('editHistTipo').value || null,
            bultos: (bultosVal !== null && !isNaN(bultosVal)) ? bultosVal : null,
            peso: (document.getElementById('editHistPeso').value || '').trim() || null,
            responsable: (document.getElementById('editHistResponsable').value || '').trim(),
            destino: destino
        };
        try {
            const { data, error } = await window.supabaseClient
                .from('historial_turnos')
                .update(payload)
                .eq('id', id)
                .select();
            if (error) throw error;
            console.log('Edicion historial - update response:', data);

            if (this._editTransporteId) {
                try {
                    const { data: propData, error: propError } = await window.supabaseClient
                        .from('historial_turnos')
                        .update({
                            nombre_empresa: payload.nombre_empresa,
                            nombre_proveedor: payload.nombre_proveedor,
                            destino: payload.destino
                        })
                        .eq('proveedor_transporte_id', this._editTransporteId)
                        .select();
                    if (propError) throw propError;
                    console.log('Edicion historial - propagate response:', propData);
                } catch (e) {
                    console.warn('No se pudo propagar a los demás proveedores de la transportadora:', e);
                }
            }

            document.getElementById('modalEditarHistorial').style.display = 'none';
            Utils.mostrarNotificacion('Registro actualizado', 'success');
            await new Promise(r => setTimeout(r, 500));
            await RenderAdmin.historial();
        } catch (error) {
            console.error('Error al guardar registro:', error);
            Utils.mostrarNotificacion('Error al guardar: ' + (error?.message || error), 'error');
        }
    },

    async limpiarHistorial() {
        if (await ConfirmDialog.confirmar('¿Está seguro de que desea limpiar todo el historial?', 'Limpiar historial', 'Limpiar historial')) {
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
            sessionStorage.removeItem('accesoAdmin');
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
                sessionStorage.setItem('accesoAdmin', 'ok');
                window.location.href = 'despachador.html';
            } else {
                sessionStorage.removeItem('accesoAdmin');
                const errorEl = document.getElementById('loginError');
                if (errorEl) {
                    errorEl.textContent = 'Contraseña de despachador incorrecta';
                    errorEl.style.display = 'block';
                }
                Utils.mostrarNotificacion('Contraseña incorrecta', 'error');
            }
        } else if (accessType === 'facturas') {
            if (password === CONFIG.FACTURAS_PASSWORD) {
                sessionStorage.setItem('accesoAdmin', 'ok');
                window.location.href = 'facturas.html';
            } else {
                sessionStorage.removeItem('accesoAdmin');
                const errorEl = document.getElementById('loginError');
                if (errorEl) {
                    errorEl.textContent = 'Contraseña de facturas incorrecta';
                    errorEl.style.display = 'block';
                }
                Utils.mostrarNotificacion('Contraseña incorrecta', 'error');
            }
        } else {
            if (password === CONFIG.ADMIN_PASSWORD) {
                sessionStorage.setItem('accesoAdmin', 'ok');
                window.location.href = 'admin.html';
            } else {
                sessionStorage.removeItem('accesoAdmin');
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
    configurarMaterialesSap() {
        const lista = document.getElementById('materialesSapLista');
        const botonAgregar = document.getElementById('btnAgregarMaterialSap');
        if (!lista || !botonAgregar) return;

        botonAgregar.addEventListener('click', () => this.agregarMaterialSap(lista));
        lista.addEventListener('input', event => {
            if (event.target.matches('.material-sap-input')) {
                this.mostrarSugerenciasMaterialSap(event.target);
                clearTimeout(event.target.catalogSearchTimer);
                event.target.catalogSearchTimer = setTimeout(() => {
                    this.mostrarDescripcionMaterialSap(event.target);
                }, 180);
            }
        });
        document.getElementById('destino')?.addEventListener('change', () => {
            lista.querySelectorAll('.material-sap-input').forEach(entrada => {
                this.mostrarSugerenciasMaterialSap(entrada);
                this.mostrarDescripcionMaterialSap(entrada);
            });
        });
        lista.addEventListener('click', event => {
            const sugerencia = event.target.closest('.material-sap-suggestion');
            if (sugerencia) {
                const fila = sugerencia.closest('.material-sap-row');
                const entrada = fila.querySelector('.material-sap-input');
                entrada.value = sugerencia.dataset.codigoSap;
                fila.querySelector('.material-sap-suggestions').hidden = true;
                entrada.setAttribute('aria-expanded', 'false');
                this.mostrarDescripcionMaterialSap(entrada);
                entrada.focus();
                return;
            }

            const botonQuitar = event.target.closest('.material-sap-remove');
            if (!botonQuitar) return;
            botonQuitar.closest('.material-sap-row').remove();
            this.actualizarEtiquetasMaterialesSap(lista);
        });
        this.resetearMaterialesSap();
    },

    configurarListaMaterialesSap(lista, botonAgregar) {
        if (!lista || !botonAgregar || lista.dataset.materialesSapConfigured === 'true') return;
        lista.dataset.materialesSapConfigured = 'true';
        botonAgregar.addEventListener('click', () => this.agregarMaterialSap(lista));
        lista.addEventListener('input', event => {
            if (!event.target.matches('.material-sap-input')) return;
            this.mostrarSugerenciasMaterialSap(event.target);
            clearTimeout(event.target.catalogSearchTimer);
            event.target.catalogSearchTimer = setTimeout(() => {
                this.mostrarDescripcionMaterialSap(event.target);
            }, 180);
        });
        lista.addEventListener('click', event => {
            const sugerencia = event.target.closest('.material-sap-suggestion');
            if (sugerencia) {
                const fila = sugerencia.closest('.material-sap-row');
                const entrada = fila.querySelector('.material-sap-input');
                entrada.value = sugerencia.dataset.codigoSap;
                fila.querySelector('.material-sap-suggestions').hidden = true;
                entrada.setAttribute('aria-expanded', 'false');
                this.mostrarDescripcionMaterialSap(entrada);
                entrada.focus();
                return;
            }

            const botonQuitar = event.target.closest('.material-sap-remove');
            if (!botonQuitar) return;
            botonQuitar.closest('.material-sap-row').remove();
            this.actualizarEtiquetasMaterialesSap(lista);
        });
    },

    cargarMaterialesSap(lista, materiales) {
        if (!lista) return;
        lista.replaceChildren();

        (Array.isArray(materiales) ? materiales : []).forEach(material => {
            const codigo = typeof material === 'string'
                ? material
                : material?.codigoSap || material?.codigo_sap || '';
            if (!codigo) return;

            this.agregarMaterialSap(lista, false);
            const entrada = lista.lastElementChild.querySelector('.material-sap-input');
            entrada.value = codigo;
            this.mostrarDescripcionMaterialSap(entrada);
        });

        if (!lista.children.length) this.agregarMaterialSap(lista, false);
    },

    agregarMaterialSap(lista = document.getElementById('materialesSapLista'), enfocar = true) {
        if (!lista) return;
        const fila = document.createElement('div');
        fila.className = 'material-sap-row';

        const entrada = document.createElement('input');
        entrada.type = 'text';
        entrada.className = 'material-sap-input';
        entrada.placeholder = 'Buscar por código SAP o nombre';
        entrada.autocomplete = 'off';
        entrada.setAttribute('role', 'combobox');
        entrada.setAttribute('aria-autocomplete', 'list');
        entrada.setAttribute('aria-expanded', 'false');

        entrada.addEventListener('keydown', event => {
            const sugerencias = campo.querySelector('.material-sap-suggestions');
            if (event.key === 'ArrowDown' && sugerencias && !sugerencias.hidden) {
                event.preventDefault();
                sugerencias.querySelector('button')?.focus();
            } else if (event.key === 'Escape' && sugerencias) {
                sugerencias.hidden = true;
                entrada.setAttribute('aria-expanded', 'false');
            }
        });

        const campo = document.createElement('div');
        campo.className = 'material-sap-field';

        const descripcion = document.createElement('small');
        descripcion.className = 'material-sap-description';
        descripcion.setAttribute('aria-live', 'polite');
        const sugerencias = document.createElement('div');
        sugerencias.className = 'material-sap-suggestions';
        sugerencias.setAttribute('role', 'listbox');
        sugerencias.hidden = true;
        campo.append(entrada, sugerencias, descripcion);

        const botonQuitar = document.createElement('button');
        botonQuitar.type = 'button';
        botonQuitar.className = 'material-sap-remove';
        botonQuitar.textContent = 'Quitar';

        fila.append(campo, botonQuitar);
        lista.appendChild(fila);
        this.actualizarEtiquetasMaterialesSap(lista);
        if (enfocar) entrada.focus();
    },

    mostrarSugerenciasMaterialSap(entrada) {
        const lista = entrada.closest('.material-sap-field')?.querySelector('.material-sap-suggestions');
        if (!lista) return;

        const normalizar = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
        const termino = normalizar(entrada.value.trim());
        lista.replaceChildren();
        if (!termino) {
            lista.hidden = true;
            entrada.setAttribute('aria-expanded', 'false');
            return;
        }

        const catalogos = [
            ['SIE', window.CatalogoMaterialesSIE],
            ['SIP / SI3 ZF', window.CatalogoMaterialesSIP]
        ];

        const coincidenciasMap = new Map();
        catalogos.forEach(([etiqueta, catalogo]) => {
            if (!(catalogo instanceof Map)) return;
            catalogo.forEach((material, codigoSap) => {
                const descripcion = typeof material === 'string' ? material : material?.descripcion || '';
                const codigoNormalizado = normalizar(codigoSap);
                const descripcionNormalizada = normalizar(descripcion);
                if (codigoNormalizado.includes(termino) || descripcionNormalizada.includes(termino)) {
                    const prioridad = codigoNormalizado.startsWith(termino) || descripcionNormalizada.startsWith(termino) ? 0 : 1;
                    const candidata = {
                        codigoSap,
                        descripcion,
                        etiqueta,
                        prioridad
                    };
                    const clave = String(codigoSap);
                    const existente = coincidenciasMap.get(clave);
                    if (!existente || candidata.prioridad < existente.prioridad) {
                        coincidenciasMap.set(clave, candidata);
                    }
                }
            });
        });

        const coincidencias = [...coincidenciasMap.values()];
        coincidencias.sort((a, b) => a.prioridad - b.prioridad || a.codigoSap.localeCompare(b.codigoSap, 'en', { numeric: true }));
        coincidencias.slice(0, 8).forEach(material => {
            const opcion = document.createElement('button');
            opcion.type = 'button';
            opcion.className = 'material-sap-suggestion';
            opcion.setAttribute('role', 'option');
            opcion.dataset.codigoSap = material.codigoSap;

            const codigo = document.createElement('strong');
            codigo.textContent = material.codigoSap;
            const descripcion = document.createElement('span');
            descripcion.textContent = material.descripcion;
            const catalogo = document.createElement('small');
            catalogo.textContent = material.etiqueta;
            opcion.append(codigo, descripcion, catalogo);
            lista.appendChild(opcion);
        });

        lista.hidden = coincidencias.length === 0;
        entrada.setAttribute('aria-expanded', String(!lista.hidden));
    },

    async mostrarDescripcionMaterialSap(entrada) {
        const detalle = entrada.closest('.material-sap-field')?.querySelector('.material-sap-description');
        if (!detalle) return;

        const requestId = String(Number(entrada.dataset.catalogRequest || 0) + 1);
        entrada.dataset.catalogRequest = requestId;
        const codigo = entrada.value.trim();
        if (!codigo) {
            detalle.textContent = '';
            detalle.dataset.estado = '';
            return;
        }

        const resultados = [];

        const materialSIE = window.CatalogoMaterialesSIE?.get(codigo);
        if (materialSIE) resultados.push(`SIE: ${materialSIE}`);

        const materialSIP = window.CatalogoMaterialesSIP?.get(codigo);
        if (materialSIP) {
            resultados.push(`SI3 ZF: ${materialSIP}`);
        }

        if (codigo.length >= 5 && window.supabaseClient) {
            if (!resultados.length) detalle.textContent = 'Buscando en el catálogo...';
            const consultas = [
                ['SIE', 'materiales_sie'],
                ['SI3 ZF', 'materiales_sip']
            ];
            let errorConsulta = false;
            const encontrados = await Promise.all(consultas.map(async ([etiqueta, tabla]) => {
                try {
                    const { data, error } = await window.supabaseClient
                        .from(tabla)
                        .select('descripcion')
                        .eq('codigo_sap', codigo)
                        .maybeSingle();
                    if (error) {
                        errorConsulta = true;
                        return null;
                    }
                    return data?.descripcion ? [etiqueta, data.descripcion] : null;
                } catch (error) {
                    errorConsulta = true;
                    return null;
                }
            }));

            if (!entrada.isConnected || entrada.dataset.catalogRequest !== requestId) return;
            if (!errorConsulta) {
                resultados.length = 0;
                encontrados.filter(Boolean).forEach(([etiqueta, descripcion]) => resultados.push(`${etiqueta}: ${descripcion}`));
            }
        }

        detalle.textContent = resultados.join(' | ') || 'Código no encontrado en los catálogos SIE ni SIP.';
        detalle.dataset.estado = resultados.length ? 'encontrado' : 'no-encontrado';
    },

    actualizarEtiquetasMaterialesSap(lista) {
        lista.querySelectorAll('.material-sap-row').forEach((fila, indice) => {
            const numero = indice + 1;
            const entrada = fila.querySelector('input');
            entrada.setAttribute('aria-label', `Código SAP del material ${numero}`);
            fila.querySelector('.material-sap-description').id = `materialSapDescripcion${numero}`;
            fila.querySelector('.material-sap-suggestions').id = `materialSapSugerencias${numero}`;
            entrada.setAttribute('aria-controls', `materialSapSugerencias${numero}`);
            entrada.setAttribute('aria-describedby', `materialSapDescripcion${numero}`);
            fila.querySelector('button').setAttribute('aria-label', `Quitar material ${numero}`);
        });
    },

    resetearMaterialesSap() {
        const lista = document.getElementById('materialesSapLista');
        if (!lista) return;
        lista.replaceChildren();
        this.agregarMaterialSap(lista, false);
    },

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
        console.log('🔝 configurando password toggle...');
        const agregarToggle = () => {
            const inputs = document.querySelectorAll('input[type="password"]');
            console.log('🔝 Encontrados inputs de password:', inputs.length);
            
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
                const modal = this.closest('.modal');
                if (!modal) return;
                
                if (modal.classList.contains('no-close')) {
                    return;
                }
                
                if (modal.id === 'despachoModal') {
                    this._cancelarDespacho();
                }
                modal.style.display = 'none';
                if (modal.id === 'adminAccessModal') {
                    sessionStorage.removeItem('accesoAdmin');
                }
            };
        });

        window.onclick = (e) => {
            if (e.target.classList.contains('modal')) {
                if (e.target.classList.contains('no-close')) {
                    return;
                }
                e.target.style.display = 'none';
                if (e.target.id === 'adminAccessModal') {
                    sessionStorage.removeItem('accesoAdmin');
                }
            }
        };
    },
    
    _cancelarDespacho() {
        if (AppState.turnoActual) {
            AppState.turnos.push(AppState.turnoActual);
            AppState.turnoActual = null;
            LocalStorage.guardarTurnoActual(null);
            LocalStorage.guardarTurnos(AppState.turnos);
            RenderAdmin.todo();
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
        if (window.SonidoSI3) { window.SonidoSI3.inicializar(); window.SonidoSI3.tocarAlerta(); }
        
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
        
        const adminLoginForm = document.getElementById('adminLoginForm');
        if (adminLoginForm) {
            adminLoginForm.addEventListener('submit', AdminAccess.handleLogin);
        }
        
        // Página de usuario (index.html)
        if (document.getElementById('formSolicitarTurno')) {
            InputConfig.configurarPlacaInput();
            InputConfig.configurarMaterialesSap();
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
                        if (window.SonidoSI3) { window.SonidoSI3.inicializar(); window.SonidoSI3.tocarAlerta(); }
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
        }

        const listaSapHistorial = document.getElementById('editHistMaterialesSapLista');
        const btnAgregarSapHistorial = document.getElementById('btnAgregarSapHistorial');
        if (listaSapHistorial && btnAgregarSapHistorial) {
            InputConfig.configurarListaMaterialesSap(listaSapHistorial, btnAgregarSapHistorial);
        }
        
        const btnCompletarTurno = document.getElementById('btnCompletarTurno');
        if (btnCompletarTurno) {
            btnCompletarTurno.addEventListener('click', AdminHandlers.completarTurno);
        }
        
        const btnReiniciar = document.getElementById('btnReiniciarCola');
        if (btnReiniciar) btnReiniciar.addEventListener('click', AdminHandlers.reiniciarCola);
        
        const btnReiniciarContador = document.getElementById('btnReiniciarContador');
        if (btnReiniciarContador) btnReiniciarContador.addEventListener('click', AdminHandlers.reiniciarContador);

        const btnProveedorSinTurno = document.getElementById('btnProveedorSinTurno');
        if (btnProveedorSinTurno) {
            btnProveedorSinTurno.addEventListener('click', AdminHandlers.abrirModalProveedorSinTurno);
        }
        
        const btnLimpiar = document.getElementById('btnLimpiarHistorial');
        if (btnLimpiar) btnLimpiar.addEventListener('click', AdminHandlers.limpiarHistorial);
        
        const fechaHistorialInput = document.getElementById('fechaHistorial');
        if (fechaHistorialInput) {
            fechaHistorialInput.value = getLocalDate();
            fechaHistorialInput.addEventListener('change', () => RenderAdmin.historial());
        }
        if (window.InputConfig) {
            window.InputConfig.configurarMayusculas();
            window.InputConfig.configurarTelefono();
            window.InputConfig.configurarPasswordToggle();
        }
        
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

        const btnToggleProveedores = document.getElementById('btnToggleProveedores');
        const proveedoresContainer = document.getElementById('proveedoresContainer');
        if (btnToggleProveedores && proveedoresContainer) {
            btnToggleProveedores.addEventListener('click', () => {
                const oculto = proveedoresContainer.style.display === 'none';
                proveedoresContainer.style.display = oculto ? '' : 'none';
                btnToggleProveedores.textContent = oculto ? 'Ocultar' : 'Mostrar';
            });
        }

        // Búsquedas en tiempo real
        document.getElementById('busquedaLlegados')?.addEventListener('input', () => RenderAdmin.listaTurnosLlegados());
        document.getElementById('busquedaEspera')?.addEventListener('input', () => RenderAdmin.listaTurnosEspera());
        document.getElementById('busquedaCitados')?.addEventListener('input', () => RenderAdmin.listaTurnosCitados());
        document.getElementById('busquedaProveedores')?.addEventListener('input', () => RenderAdmin.proveedores());
        
        console.log('Renderizando admin...');
        RenderAdmin.todo();
        RenderAdmin.cargarMesesDisponibles();
        
        // Toggle function for provider cards
        window.toggleProveedoresEmpresa = (detallesId, chevronId) => {
            const detalles = document.getElementById(detallesId);
            const chevron = document.getElementById(chevronId);
            if (detalles && chevron) {
                const abierto = detalles.style.display !== 'none';
                detalles.style.display = abierto ? 'none' : 'block';
                chevron.classList.toggle('abierto', !abierto);
            }
        };
        
        if (window.PanelRendimiento && typeof window.PanelRendimiento.cargar === 'function') {
            window.PanelRendimiento.cargar();
        }
        
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
                })
                .subscribe();
                
            Conectividad.suscribirTodos({
                turnos: async (payload) => {
                    console.log('Cambio en turnos (admin):', payload);
                    await Turnos.cargarTurnos();
                    await RenderAdmin.todo();
                },
                historial: async (payload) => {
                    console.log('Cambio en historial (admin):', payload);
                    await RenderAdmin.todo();
                },
                notificaciones: (payload) => {
                    console.log('Notificación recibida en admin:', payload);
                    if (window.SonidoAlerta) {
                        if (window.SonidoSI3) window.SonidoSI3.inicializar();
                        SonidoAlerta.reproducir(3);
                    }
                    Utils.mostrarNotificacion(payload.new.mensaje, 'warning');
                }
            });
        } else {
            console.warn('Supabase no disponible');
        }
        
        setInterval(async () => {
            try {
                await Turnos.cargarTurnos();
                await RenderAdmin.todo();
            } catch (e) {
                console.error('Error en actualización periódica admin:', e);
            }
        }, 5000);
        
        if (window.NotificacionesPolling && typeof window.NotificacionesPolling.iniciar === 'function') {
            window.NotificacionesPolling.iniciar();
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
                if (btnAutorizar && !document.querySelector('.despacho-dashboard')) {
                    btnAutorizar.disabled = true;
                }

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
                
                Conectividad.suscribirTodos({
                    turnos: async (payload) => {
                        console.log('Cambio en turnos (despachador):', payload);
                        await Turnos.cargarTurnos();
                        if (window.RenderAdmin && typeof window.RenderAdmin.todo === 'function') await window.RenderAdmin.todo();
                    },
                    historial: async (payload) => {
                        console.log('Cambio en historial (despachador):', payload);
                        if (window.RenderAdmin && typeof window.RenderAdmin.todo === 'function') await window.RenderAdmin.todo();
                    },
                    notificaciones: (payload) => {
                        console.log('Notificación recibida en despachador:', payload);
if (window.SonidoAlerta) {
                            if (window.SonidoSI3) window.SonidoSI3.inicializar();
                            SonidoAlerta.reproducir(3);
                        }
                        Utils.mostrarNotificacion(payload.new.mensaje, 'warning');
                    }
                });
            } catch (e) {
                console.warn('Suscripcion despachador fallo:', e);
            }
            
            if (window.NotificacionesPolling && typeof window.NotificacionesPolling.iniciar === 'function') {
                window.NotificacionesPolling.iniciar();
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

window.toggleProveedoresEmpresa = function(detallesId, chevronId) {
    const det = document.getElementById(detallesId);
    const chev = document.getElementById(chevronId);
    if (!det) return;
    const abierto = det.style.display !== 'none';
    det.style.display = abierto ? 'none' : 'block';
    if (chev) chev.classList.toggle('abierto', !abierto);
};
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

        if (!(await ConfirmDialog.confirmar(`¿Autorizar la salida del turno ${turno.numero}?`, 'Autorizar salida', 'Autorizar salida'))) return;
        
        try {
            if (turno.esTransporte && Array.isArray(turno.proveedores) && turno.proveedores.length > 0) {
                await this._autorizarTodosProveedoresTransporte(turno);
            } else if (turno.proveedorTransporteId) {
                await this._autorizarProveedorTransporteIndividual(turno);
            } else {
                await this._autorizarTurnoNormal(turno);
            }
            
            try {
                localStorage.setItem('salidaAutorizada', JSON.stringify({
                    numero: turno.numero,
                    nombre: turno.nombre || turno.nombreEmpresa || turno.nombre,
                    nit: turno.nit || '',
                    tipoVehiculo: turno.tipoVehiculo || turno.tipo_vehiculo || '',
                    timestamp: Date.now()
                }));
                localStorage.removeItem('proveedorListoSalir');
            } catch (e) {
                console.error('Error en localStorage:', e);
            }
            
            if (window.supabaseClient) {
                await window.supabaseClient.from('notificaciones_salida').insert({
                    mensaje: `Salida autorizada para ${turno.nombre || turno.nombreEmpresa || turno.numero}`,
                    remitente: 'despachador',
                    leido: false,
                    tipo: 'salida_autorizada',
                    turno_id: turno.id || null,
                    proveedor_nit: turno.nit || null,
                    nombre_empresa: turno.nombreEmpresa || null,
                    datos: JSON.parse(JSON.stringify({
                        numero: turno.numero,
                        nombreEmpresa: turno.nombreEmpresa,
                        nit: turno.nit || '',
                        destino: turno.destino || '',
                        numFactura: turno.numFactura || '',
                        numFacturas: turno.numFacturas || null,
                        tipoVehiculo: turno.tipoVehiculo || '',
                        bultos: turno.bultos || null,
                        peso: turno.peso || '',
                        responsable: turno.responsable || '',
                        contacto: turno.contacto || '',
                        telefono: turno.telefono || '',
                        servicio: turno.servicio || '',
                        fechaCita: turno.fechaCita || '',
                        autorizadoSalida: true
                    }))
                });
            }
            
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
                    if (typeof window.renderizarSeguimientoSalida === 'function') {
                        const horaAutorizacion = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
                        window.renderizarSeguimientoSalida({ ...turno, autorizadoSalida: true, horaAutorizacion }, false);
                    } else {
                        infoDespachoDiv.innerHTML = '<div class="despacho-empty">No hay proveedor esperando autorización</div>';
                    }
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
                nombre: turno.nombre || turno.nombreEmpresa || '',
                nit: turno.nit || '',
                tipoVehiculo: turno.tipoVehiculo || turno.tipo_vehiculo || '',
                timestamp: Date.now()
            }));
            localStorage.removeItem('proveedorListoSalir');
        }
    },

    async _autorizarTurnoNormal(turno) {
        const horaFin = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
        
        try {
            const { data: historialActual, error: errorGet } = await window.supabaseClient
                .from('historial_turnos')
                .select('id')
                .eq('numero', turno.numero)
                .gte('fecha', getLocalDate() + 'T00:00:00')
                .maybeSingle();
            
            if (historialActual && !errorGet) {
                const { error: errorUpdate } = await window.supabaseClient
                    .from('historial_turnos')
                    .update({ 
                        autorizado_salida: true,
                        hora_finalizacion: horaFin,
                        consecutivo_ingreso: turno.consecutivoIngreso || null,
                        num_facturas: turno.numFacturas ?? null
                    })
                    .eq('id', historialActual.id);
                
                if (errorUpdate) console.warn('No se pudo actualizar historial:', errorUpdate.message);
            } else {
                const { data, error } = await window.supabaseClient
                    .from('historial_turnos')
                    .insert([{
                        numero: turno.numero,
                        nombre_empresa: turno.nombre || turno.nombreEmpresa || turno.nombre,
                        nombre_proveedor: turno.esTransporte ? (turno.nombreProveedor || turno.nombre || turno.nombreEmpresa || null) : null,
                        nit: turno.nit || '',
                        motivo: turno.motivo || '',
                        hora_solicitud: turno.horaSolicitud || '',
                        hora_llamada: turno.horaLlamada || null,
                        hora_finalizacion: horaFin,
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
                        consecutivo_ingreso: turno.consecutivoIngreso || null,
                        num_facturas: turno.numFacturas ?? null,
                        autorizado_salida: true,
                        inspeccion_fisica: false,
                        es_transporte: turno.esTransporte === true || false,
                        fecha: getLocalISOString()
                    }])
                    .select()
                    .single();
                
                if (error) console.warn('No se pudo guardar en historial_turnos:', error.message);
            }
        } catch (e) {
            console.warn('Error al guardar en historial:', e.message);
        }
    },

    async _autorizarProveedorTransporteIndividual(turno) {
        if (!window.supabaseClient) return;
        
        try {
            const { error: errorPT } = await window.supabaseClient
                .from('proveedores_transporte')
                .update({ 
                    autorizado_salida: true,
                    estado: 'autorizado_salida',
                    hora_finalizacion: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
                    updated_at: new Date().toISOString()
                })
                .eq('id', turno.proveedorTransporteId);
            
            if (errorPT) console.warn('No se pudo actualizar proveedor transporte:', errorPT.message);
            
            const { error: errorH } = await window.supabaseClient
                .from('historial_turnos')
                .update({ 
                    autorizado_salida: true,
                    hora_finalizacion: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
                })
                .eq('proveedor_transporte_id', turno.proveedorTransporteId);
            
            if (errorH) console.warn('No se pudo actualizar historial para proveedor transporte:', errorH.message);
        } catch (e) {
            console.warn('Error al autorizar proveedor individual:', e.message);
        }
    },

    async _autorizarTodosProveedoresTransporte(turno) {
        if (!window.supabaseClient) return;
        
        for (const proveedor of turno.proveedores) {
            if (proveedor.id) {
                const { error } = await window.supabaseClient
                    .from('proveedores_transporte')
                    .update({ 
                        autorizado_salida: true,
                        estado: 'autorizado_salida'
                    })
                    .eq('id', proveedor.id);
                
                if (error) console.warn('No se pudo actualizar proveedor:', error.message);
                
                await window.supabaseClient
                    .from('historial_turnos')
                    .update({ 
                        autorizado_salida: true,
                        hora_finalizacion: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
                    })
                    .eq('proveedor_transporte_id', proveedor.id);
            }
        }
    },

    async autorizarProveedorTransporteIndividual(proveedorId, turnoNumero, nombreEmpresa) {
        if (!window.supabaseClient) return;
        
        try {
            const { error } = await window.supabaseClient
                .from('proveedores_transporte')
                .update({ 
                    autorizado_salida: true,
                    estado: 'autorizado_salida',
                    hora_finalizacion: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
                })
                .eq('id', proveedorId);
            
            if (error) throw error;
            
            await window.supabaseClient
                .from('historial_turnos')
                .update({ 
                    autorizado_salida: true,
                    hora_finalizacion: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
                })
                .eq('proveedor_transporte_id', proveedorId);
            
            if (window.supabaseClient) {
                await window.supabaseClient.from('notificaciones_salida').insert({
                    mensaje: `Salida autorizada para proveedor ${nombreEmpresa || proveedorId}`,
                    remitente: 'despachador',
                    leido: false,
                    tipo: 'salida_autorizada',
                    proveedor_nit: turnoNumero || null,
                    nombre_empresa: nombreEmpresa || null,
                    datos: JSON.parse(JSON.stringify({
                        nombreEmpresa: nombreEmpresa || '',
                        proveedorId: proveedorId,
                        turnoNumero: turnoNumero || ''
                    }))
                });
            }

            try {
                localStorage.setItem('salidaAutorizada', JSON.stringify({
                    numero: turnoNumero || '---',
                    nombre: `TRANSPORTADORA - Proveedor ${nombreEmpresa || proveedorId}`,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.warn('No se pudo enviar señal de salida a recepción:', e);
            }
            
            try {
                const datos = localStorage.getItem('proveedorListoSalir');
                if (datos) {
                    const d = JSON.parse(datos);
                    if (d.proveedores) {
                        const prov = d.proveedores.find(p => p.id === proveedorId);
                        if (prov) prov.autorizadoSalida = true;
                        localStorage.setItem('proveedorListoSalir', JSON.stringify(d));
                    }
                }
            } catch (e) {
                console.warn('No se pudo actualizar localStorage:', e);
            }
            
            Utils.mostrarNotificacion(`Proveedor ${nombreEmpresa} - salida autorizada`, 'success');
        } catch (error) {
            console.error('Error al autorizar proveedor individual:', error);
            Utils.mostrarNotificacion('Error al autorizar salida', 'error');
        }
    },

    async autorizarTodaTransportadora(turnoNumero) {
        if (!window.supabaseClient) return;

        try {
            const datos = localStorage.getItem('proveedorListoSalir');
            if (!datos) {
                Utils.mostrarNotificacion('No hay transportadora pendiente', 'error');
                return;
            }

            const d = JSON.parse(datos);
            if (!d.esTransporte || !Array.isArray(d.proveedores) || d.proveedores.length === 0) {
                Utils.mostrarNotificacion('No hay transportadora pendiente', 'error');
                return;
            }

            if (turnoNumero && d.numero && String(d.numero) !== String(turnoNumero)) {
                Utils.mostrarNotificacion('El turno no coincide', 'error');
                return;
            }

            const pendientes = d.proveedores.filter(p => !p.autorizadoSalida && p.id);
            if (pendientes.length === 0) {
                Utils.mostrarNotificacion('Todos los proveedores ya están autorizados', 'info');
                return;
            }

            if (!(await ConfirmDialog.confirmar(
                `¿Autorizar la salida de ${pendientes.length} proveedor(es) de la transportadora ${d.numero}?`,
                'Autorizar transportadora',
                'Autorizar salida'
            ))) return;

            const ids = pendientes.map(p => p.id);
            const horaFin = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });

            const { error } = await window.supabaseClient
                .from('proveedores_transporte')
                .update({
                    autorizado_salida: true,
                    estado: 'autorizado_salida',
                    hora_finalizacion: horaFin
                })
                .in('id', ids);

            if (error) throw error;

            await window.supabaseClient
                .from('historial_turnos')
                .update({ 
                    autorizado_salida: true,
                    hora_finalizacion: horaFin
                })
                .in('proveedor_transporte_id', ids);

            if (window.supabaseClient) {
                await window.supabaseClient.from('notificaciones_salida').insert({
                    mensaje: `Salida autorizada para toda la transportadora - Turno ${d.numero}`,
                    remitente: 'despachador',
                    leido: false,
                    tipo: 'salida_autorizada',
                    proveedor_nit: null,
                    nombre_empresa: d.nombreEmpresa || null,
                    datos: JSON.parse(JSON.stringify({
                        numero: d.numero,
                        esTransporte: true,
                        nombreEmpresa: d.nombreEmpresa || '',
                        proveedores: d.proveedores.map(p => ({
                            id: p.id,
                            nombreProveedor: p.nombreProveedor || '',
                            numFactura: p.numFactura || '',
                            tipoVehiculo: p.tipoVehiculo || '',
                            bultos: p.bultos || null,
                            peso: p.peso || '',
                            responsable: p.responsable || '',
                            destino: p.destino || '',
                            autorizadoSalida: true
                        }))
                    }))
                });
            }

            d.proveedores.forEach(p => { if (ids.includes(p.id)) p.autorizadoSalida = true; });
            localStorage.setItem('proveedorListoSalir', JSON.stringify(d));

            try {
                localStorage.setItem('salidaAutorizada', JSON.stringify({
                    numero: d.numero,
                    nombre: `TRANSPORTADORA - Turno ${d.numero} (${pendientes.length} proveedor(es))`,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.warn('No se pudo enviar señal de salida a recepción:', e);
            }

            Utils.mostrarNotificacion(`Transportadora ${d.numero} - salida autorizada (${pendientes.length} proveedor(es))`, 'success');
        } catch (error) {
            console.error('Error al autorizar toda la transportadora:', error);
            Utils.mostrarNotificacion('Error al autorizar salida', 'error');
        }
    },

    async solicitarInspeccion(turnoData = null) {
        const turno = turnoData || AppState.turnoActual;
        
        if (!turno) {
            Utils.mostrarNotificacion('No hay proveedor esperando', 'error');
            return;
        }

        if (!(await ConfirmDialog.confirmar(`¿Solicitar inspección para el turno ${turno.numero}?`, 'Solicitar inspección', 'Solicitar inspección'))) return;
        
        try {
            if (turno.proveedorTransporteId) {
                await this._solicitarInspeccionProveedorTransporte(turno.proveedorTransporteId);
            } else {
                await this._solicitarInspeccionTurnoNormal(turno);
            }
            
            try {
                localStorage.setItem('inspeccionSolicitada', JSON.stringify({
                    numero: turno.numero,
                    nombre: turno.nombre || turno.nombreEmpresa || turno.nombre,
                    nit: turno.nit || '',
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.error('Error en localStorage:', e);
            }
            
            if (window.supabaseClient) {
                await window.supabaseClient.from('notificaciones_salida').insert({
                    mensaje: `Inspección física solicitada para ${turno.nombre || turno.nombreEmpresa || turno.numero}`,
                    remitente: 'despachador',
                    leido: false,
                    tipo: 'salida_pendiente',
                    turno_id: turno.id || null,
                    proveedor_nit: turno.nit || null,
                    nombre_empresa: turno.nombreEmpresa || null,
                    datos: JSON.parse(JSON.stringify({
                        numero: turno.numero,
                        nombreEmpresa: turno.nombreEmpresa,
                        nit: turno.nit || '',
                        tipoVehiculo: turno.tipoVehiculo || '',
                        bultos: turno.bultos || null,
                        peso: turno.peso || '',
                        responsable: turno.responsable || ''
                    }))
                });
            }
            
            // Push notification - Inspección requerida
            if (window.PushManager) {
                window.PushManager.notifyInspeccionRequerida(turno);
            }
            
            const btnInspeccion = document.getElementById('btnSolicitarInspeccion');
            if (btnInspeccion) {
                btnInspeccion.disabled = true;
                btnInspeccion.textContent = 'Inspección Solicitada';
            }
        } catch (error) {
            console.error('Error al solicitar inspección:', error);
        }
    },

    async _solicitarInspeccionTurnoNormal(turno) {
        if (!window.supabaseClient) return;
        
        try {
            const { data: historialActual, error: errorGet } = await window.supabaseClient
                .from('historial_turnos')
                .select('id')
                .eq('numero', turno.numero)
                .gte('fecha', getLocalDate() + 'T00:00:00')
                .maybeSingle();
            
            if (historialActual && !errorGet) {
                const { error: errorUpdate } = await window.supabaseClient
                    .from('historial_turnos')
                    .update({ inspeccion_fisica: true })
                    .eq('id', historialActual.id);
                
                if (errorUpdate) console.warn('No se pudo actualizar inspección:', errorUpdate.message);
            }
        } catch (e) {
            console.warn('Error al guardar inspección:', e.message);
        }
    },

    async _solicitarInspeccionProveedorTransporte(proveedorId) {
        if (!window.supabaseClient) return;
        
        try {
            const { error } = await window.supabaseClient
                .from('proveedores_transporte')
                .update({ 
                    inspeccion_fisica: true,
                    estado: 'inspeccion'
                })
                .eq('id', proveedorId);
            
            if (error) throw error;
            
            await window.supabaseClient
                .from('historial_turnos')
                .update({ inspeccion_fisica: true })
                .eq('proveedor_transporte_id', proveedorId);
        } catch (e) {
            console.warn('Error al solicitar inspección de proveedor transporte:', e.message);
        }
    },

    async solicitarInspeccionProveedorTransporteIndividual(proveedorId, nombreEmpresa) {
        if (!window.supabaseClient) return;
        
        try {
            const { error } = await window.supabaseClient
                .from('proveedores_transporte')
                .update({ 
                    inspeccion_fisica: true,
                    estado: 'inspeccion'
                })
                .eq('id', proveedorId);
            
            if (error) throw error;
            
            await window.supabaseClient
                .from('historial_turnos')
                .update({ inspeccion_fisica: true })
                .eq('proveedor_transporte_id', proveedorId);
            
            if (window.supabaseClient) {
                await window.supabaseClient.from('notificaciones_salida').insert({
                    mensaje: `Inspección solicitada para proveedor ${nombreEmpresa || proveedorId}`,
                    remitente: 'despachador',
                    leido: false,
                    tipo: 'salida_pendiente',
                    proveedor_nit: null,
                    nombre_empresa: nombreEmpresa || null,
                    datos: JSON.parse(JSON.stringify({
                        nombreEmpresa: nombreEmpresa || '',
                        proveedorId: proveedorId
                    }))
                });
            }

            try {
                localStorage.setItem('inspeccionSolicitada', JSON.stringify({
                    numero: '---',
                    nombre: `TRANSPORTADORA - Proveedor ${nombreEmpresa || proveedorId}`,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.warn('No se pudo enviar señal de inspección a recepción:', e);
            }
            
            Utils.mostrarNotificacion(`Proveedor ${nombreEmpresa} - inspección solicitada`, 'success');
        } catch (error) {
            console.error('Error al solicitar inspección:', error);
            Utils.mostrarNotificacion('Error al solicitar inspección', 'error');
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

function actualizarBotonInspeccion() {
    const btnInspeccion = document.getElementById('btnSolicitarInspeccion');
    if (!btnInspeccion) return;
    
    if (window.AppState && window.AppState.turnoActual) {
        btnInspeccion.disabled = false;
        btnInspeccion.textContent = 'Solicitar Inspeccion';
    } else {
        btnInspeccion.disabled = true;
        btnInspeccion.textContent = 'Solicitar Inspeccion';
    }
}

window.actualizarBotonInspeccion = actualizarBotonInspeccion;

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

              // Nuevos contadores
              const proveedoresIndiv = historial.filter(h => h.nombre_proveedor && h.es_transporte).map(h => h.nombre_proveedor);
               const proveedorIndSet = new Set(proveedoresIndiv);
               const transportistas = historial.filter(h => h.es_transporte);
               const inspeccionesRequeridas = historial.filter(h => h.inspeccion_fisica).length;
               const turnosConConsecutivo = historial.filter(h => h.consecutivo_ingreso).length;
               const proveedoresSinTurno = historial.filter(h => h.estado === 'llegado' || h.estado === 'espera').length;
               const turnosConHoraInicio = historial.filter(h => h.hora_solicitud).length;
               const turnosConHoraFin = historial.filter(h => h.hora_finalizacion).length;

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
              // Notificaciones sonidas
              const notifSonidoCount = { turno_llamado: 0, proveedor_listo: 0, turno_completado: 0, inspeccion: 0, nuevo_turno: 0 };
              // Eventos de sonido (de sonido.js via CustomEvent tracking)
              const eventosSonido = [];

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
                  if (h.nombre_proveedor && h.es_transporte) {
                      notifSonidoCount[h.tipo_evento || 'default'] = (notifSonidoCount[h.tipo_evento || 'default'] || 0) + 1;
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
                  nombreMesMayus,
                  proveedorIndSet: Array.from(proveedorIndSet),
                  totalProveedoresInd: proveedorIndSet.size,
                  totalTransportistas: transportistas.length,
                  inspeccionesRequeridas,
                   turnosConConsecutivo,
                   proveedoresSinTurno,
                   turnosConHoraInicio,
                   turnosConHoraFin
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
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
                  <div style="background: #eff6ff; padding: 12px; border-radius: 8px; text-align: center;">
                      <div style="font-size: 18px; font-weight: 600; color: #2563eb;">${d.turnosConHoraInicio}</div>
                      <div style="font-size: 11px; color: #64748b;">Con Hora Inicio</div>
                  </div>
                  <div style="background: #eff6ff; padding: 12px; border-radius: 8px; text-align: center;">
                      <div style="font-size: 18px; font-weight: 600; color: #2563eb;">${d.turnosConHoraFin}</div>
                      <div style="font-size: 11px; color: #64748b;">Con Hora Fin</div>
                  </div>
                  <div style="background: #eff6ff; padding: 12px; border-radius: 8px; text-align: center;">
                      <div style="font-size: 18px; font-weight: 600; color: #2563eb;">${d.turnosConConsecutivo}</div>
                      <div style="font-size: 11px; color: #64748b;">Con Consecutivo</div>
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

        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        // HOJA 1 — PORTADA
        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        const portadaData = [
            [''],
            ['SI3'],
            [''],
            ['CERTIFICADO MENSUAL DE DESPACHOS'],
            [nombreMesMayus.toUpperCase()],
            [''],
            ['Zona Franca Bodegas SIE 240, 239 y SIP 221'],
            [''],
            ['┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝'],
            [''],
            ['Total Vehículos', totalVehiculos],
            ['Días Operativos', numDias],
            ['Período', primerDia + ' — ' + ultimoDia],
            [''],
            ['┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝┝'],
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

        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        // HOJA 2 — RESUMEN EJECUTIVO
        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
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

        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        // HOJA 3 — DETALLE DIARIO
        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
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

        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        // HELPER: crear hoja de tabla simple (encabezado + filas + total)
        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
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

        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        // HOJA 4 — TIPOS DE VEHÝCULO
        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        const tiposData = [['Tipo de Vehículo', 'Cantidad', '% del Total']];
        Object.entries(tipoVehiculoCount).forEach(([tipo, count]) => {
            tiposData.push([tipo, count, ((count / totalVehiculos) * 100).toFixed(1) + '%']);
        });
        crearHojaTabla(tiposData, [{ wch: 28 }, { wch: 14 }, { wch: 14 }], C_AZUL_MEDIO, 'Tipos Vehículo');

        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        // HOJA 5 — DESTINOS
        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        const destinosData = [['Destino', 'Cantidad', '% del Total']];
        Object.entries(destinoCount).forEach(([destino, count]) => {
            const nombre = destino === 'ensambles' ? 'SI ENSAMBLES' : destino === 'plasticos' ? 'SI3 ZF SAS' : 'AMBOS';
            destinosData.push([nombre, count, ((count / totalVehiculos) * 100).toFixed(1) + '%']);
        });
        crearHojaTabla(destinosData, [{ wch: 22 }, { wch: 14 }, { wch: 14 }], C_AZUL_MEDIO, 'Destinos');

        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        // HOJA 6 — SERVICIOS
        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        const servicioLabel = { 'entrega': 'Entrega de Mercancía', 'servicio': 'Servicio Técnico', 'reunion': 'Reunión', 'otro': 'Otro' };
        const serviciosData = [['Tipo de Servicio', 'Cantidad', '% del Total']];
        Object.entries(servicioCount).forEach(([srv, count]) => {
            serviciosData.push([servicioLabel[srv] || srv, count, ((count / totalVehiculos) * 100).toFixed(1) + '%']);
        });
        crearHojaTabla(serviciosData, [{ wch: 26 }, { wch: 14 }, { wch: 14 }], C_AZUL_MEDIO, 'Servicios');

        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        // HELPER: crear hoja de detalle (historial filtrado)
        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        const crearHojaDetalle = (filtroFn, colorHeader, nombreHoja) => {
            const data = [['#', 'Fecha', 'Turno', 'Empresa', 'Tipo Vehículo', 'Peso (kg)', 'Bultos', 'Factura', 'Salida OK', 'Hora Inicio', 'Hora Fin', 'Consecutivo', 'Proveedor', 'Empresa Transporte']];
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
                        h.autorizado_salida ? 'Sí' : 'No',
                        h.horaSolicitud     || '',
                        h.horaFinalizacion  || '',
                        h.consecutivoIngreso || '',
                        h.nombreProveedor   || '',
                        h.esTransporte ? (h.nombreEmpresa || '') : ''
                    ]);
                }
            });
            if (data.length > 1) {
                const rows = data.slice(1);
                data.push([
                    'TOTAL', '', '', '', '',
                    rows.reduce((s, r) => s + (parseFloat(r[5]) || 0), 0).toLocaleString('es-CO'),
                    rows.reduce((s, r) => s + (parseInt(r[6]) || 0), 0),
                    '',
                    rows.filter(r => r[8] === 'Sí').length + ' ✓',
                    '', '', '', '', ''
                ]);
            }

            const ws  = XLSX.utils.aoa_to_sheet(data);
            const rng = XLSX.utils.decode_range(ws['!ref']);
            const lastR = rng.e.r;
            for (let R = 0; R <= lastR; ++R) {
                for (let C = 0; C <= 13; ++C) {
                    const ref = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[ref]) { ws[ref] = { v: "", t: "s" }; }
                    if (R === 0) {
                        ws[ref].s = estiloEncabezado(colorHeader);
                    } else if (R === lastR && data.length > 1) {
                        ws[ref].s = estiloTotal();
                    } else {
                        let alin = C === 0 ? "center" : C === 3 || C === 4 ? "left" : "right";
                        if (C >= 9 && C <= 13) alin = "center";
                        const numFmt = (C === 5 || C === 6) ? '#,##0' : undefined;
                        ws[ref].s = estiloFila(R % 2 === 1, alin, numFmt);
                    }
                }
            }
            ws['!cols'] = [{ wch: 5 }, { wch: 13 }, { wch: 10 }, { wch: 26 }, { wch: 16 }, { wch: 13 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 20 }];
            ws['!rows'] = Array.from({ length: data.length }, (_, i) => ({ hpt: i === 0 ? 28 : 18 }));
            ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }) };
            XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
        };

        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        // HOJA 7 — SI ENSAMBLES
        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        crearHojaDetalle(h => h.destino === 'ensambles' || h.destino === 'ambos', C_VERDE, 'SI ENSAMBLES');

        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        // HOJA 8 — SI3 ZF SAS
        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        crearHojaDetalle(h => h.destino === 'plasticos' || h.destino === 'ambos', C_AZUL_MEDIO, 'SI3 ZF SAS');

        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        // GENERAR Y DESCARGAR
        // ╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝╝
        const fechaGen = new Date().toISOString().slice(0, 10);
        const nombreArchivo = `Certificado_${nombreMesMayus.replace(/ /g, '_')}_${fechaGen}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);

        Utils.mostrarNotificacion('Excel exportado correctamente', 'success');
    }

};

window.GenerarCertificado = GenerarCertificado;

// ============================================
// MEJORAS SI-3 — INTEGRADAS EN app.js
// ============================================

const MetricasRT = {
    tiemposAtencion: [],
    MAX_MUESTRAS: 20,
    registrarInicio(turnoId) {
        try {
            const data = JSON.parse(localStorage.getItem('mt_inicio') || '{}');
            data[turnoId] = Date.now();
            localStorage.setItem('mt_inicio', JSON.stringify(data));
        } catch(e) {}
    },
    registrarFin(turnoId) {
        try {
            const data = JSON.parse(localStorage.getItem('mt_inicio') || '{}');
            if (data[turnoId]) {
                const duracionMin = Math.round((Date.now() - data[turnoId]) / 60000);
                this.tiemposAtencion.push(duracionMin);
                if (this.tiemposAtencion.length > this.MAX_MUESTRAS) this.tiemposAtencion.shift();
                delete data[turnoId];
                localStorage.setItem('mt_inicio', JSON.stringify(data));
                localStorage.setItem('mt_tiempos', JSON.stringify(this.tiemposAtencion));
                this.actualizarUI();
            }
        } catch(e) {}
    },
    cargar() {
        try {
            this.tiemposAtencion = JSON.parse(localStorage.getItem('mt_tiempos') || '[]');
        } catch(e) {}
    },
    promedioAtencion() {
        if (this.tiemposAtencion.length === 0) return null;
        const sum = this.tiemposAtencion.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.tiemposAtencion.length);
    },
    actualizarUI() {
        const el = document.getElementById('metricaTiempoPromedio');
        if (!el) return;
        const prom = this.promedioAtencion();
        el.textContent = prom !== null ? `${prom} min` : '-';
    }
};

const BusquedaHistorial = {
    _historialCompleto: [],
    setHistorial(data) { this._historialCompleto = data; },
    filtrar(q) {
        if (!q || q.trim() === '') return this._historialCompleto;
        const lower = q.toLowerCase();
        return this._historialCompleto.filter(h =>
            (h.numero && h.numero.toLowerCase().includes(lower)) ||
            (h.nombreEmpresa && h.nombreEmpresa.toLowerCase().includes(lower)) ||
            (h.nit && h.nit.toLowerCase().includes(lower)) ||
            (h.numFactura && h.numFactura.toLowerCase().includes(lower)) ||
            (h.responsable && h.responsable.toLowerCase().includes(lower))
        );
    },
    inicializar() {
        const input = document.getElementById('busquedaHistorial');
        if (!input) return;
        input.addEventListener('input', () => {
            const filtrado = this.filtrar(input.value);
            RenderAdmin.historial(filtrado);
        });
    }
};

const ExportarHoy = {
    async exportar() {
        if (!window.supabaseClient) {
            Utils.mostrarNotificacion('Se necesita conexión a Supabase', 'error');
            return;
        }
        try {
            const fechaInput = document.getElementById('fechaHistorial');
            const hoy = (fechaInput && fechaInput.value) ? fechaInput.value : (window.getLocalDate ? window.getLocalDate() : new Date().toISOString().split('T')[0]);
            const historial = await SupabaseDB.cargarHistorial(500, hoy);
            if (!historial.length) {
                Utils.mostrarNotificacion('No hay turnos completados hoy', 'warning');
                return;
            }
            const cols = ['Turno','Empresa','Placa','Factura','Tipo Vehículo','Bultos','Peso','Responsable','Destino','Hora Solicitud','Hora Llamada','Hora Fin','Salida OK'];
            const rows = historial.map(h => [
                h.numero, h.nombreEmpresa, h.nit || '', h.numFactura || '',
                h.tipoVehiculo || '', h.bultos || '', h.peso || '',
                h.responsable || '', h.destino || '',
                h.horaSolicitud || '', h.horaLlamada || '', h.horaFinalizacion || '',
                h.autorizadoSalida ? 'Sí' : 'No'
            ]);
            const csv = [cols, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `turnos_${hoy}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            Utils.mostrarNotificacion(`${historial.length} registros exportados`, 'success');
        } catch(e) {
            Utils.mostrarNotificacion('Error al exportar: ' + e.message, 'error');
        }
    }
};

const RelojVivo = {
    _interval: null,
    iniciar() {
        this._interval = setInterval(() => {
            const relojes = document.querySelectorAll('.reloj-vivo');
            const ahora = new Date();
            const hora = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            relojes.forEach(el => {
                if (el.id !== 'tiempoTranscurrido') {
                    el.textContent = hora;
                }
            });
            const elTiempo = document.getElementById('tiempoTranscurrido');
            if (elTiempo && window.AppState && window.AppState.turnoActual) {
                const inicio = localStorage.getItem('mt_inicio') ? JSON.parse(localStorage.getItem('mt_inicio'))[window.AppState.turnoActual.id] : null;
                if (inicio) {
                    const diff = Math.floor((Date.now() - inicio) / 1000);
                    const min = Math.floor(diff / 60);
                    const seg = diff % 60;
                    elTiempo.textContent = `${String(min).padStart(2,'0')}:${String(seg).padStart(2,'0')}`;
                    if (min >= 30) elTiempo.style.color = '#dc2626';
                    else if (min >= 15) elTiempo.style.color = '#f59e0b';
                    else elTiempo.style.color = '';
                } else {
                    elTiempo.textContent = '-';
                }
            }
        }, 1000);
    },
    detener() {
        if (this._interval) clearInterval(this._interval);
    }
};

const ConfirmDialog = {
    mostrar(mensaje, titulo = 'Confirmar', onConfirm) {
        this.confirmar(mensaje, titulo).then(confirmado => {
            if (confirmado && onConfirm) onConfirm();
        });
    },
    confirmar(mensaje, titulo = 'Confirmar', textoConfirmar = 'Confirmar') {
        return new Promise(resolve => {
        let modal = document.getElementById('confirmDialogModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'confirmDialogModal';
            modal.className = 'modal confirm-dialog-overlay';
            modal.tabIndex = -1;
            modal.innerHTML = `
                <div class="confirm-dialog-card" role="dialog" aria-modal="true" aria-labelledby="confirmDialogTitulo" aria-describedby="confirmDialogMensaje">
                    <div class="confirm-dialog-heading">
                        <span class="confirm-dialog-mark" aria-hidden="true">?</span>
                        <div>
                            <span class="confirm-dialog-kicker">ACCIÓN DE RECEPCIÓN</span>
                            <h3 id="confirmDialogTitulo"></h3>
                        </div>
                    </div>
                    <p id="confirmDialogMensaje"></p>
                    <div class="confirm-dialog-actions">
                        <button type="button" id="confirmDialogNo" class="confirm-dialog-cancel">Cancelar</button>
                        <button type="button" id="confirmDialogSi" class="confirm-dialog-accept"></button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.querySelector('#confirmDialogTitulo').textContent = titulo;
        modal.querySelector('#confirmDialogMensaje').textContent = mensaje;
        modal.querySelector('#confirmDialogSi').textContent = textoConfirmar;
        const resolver = valor => {
            modal.style.display = 'none';
            modal.onclick = null;
            modal.onkeydown = null;
            resolve(valor);
        };
        modal.querySelector('#confirmDialogNo').onclick = () => resolver(false);
        const btnSi = modal.querySelector('#confirmDialogSi');
        btnSi.onclick = () => resolver(true);
        modal.onclick = event => { if (event.target === modal) resolver(false); };
        modal.onkeydown = event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                resolver(false);
            }
        };
        modal.style.display = 'flex';
        modal.querySelector('#confirmDialogNo').focus();
        });
    },
    pedirTexto(mensaje, titulo = 'Confirmación adicional', placeholder = '', textoRequerido = '') {
        return new Promise(resolve => {
            let modal = document.getElementById('confirmDialogTextModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'confirmDialogTextModal';
                modal.className = 'modal confirm-dialog-overlay';
                modal.tabIndex = -1;
                modal.innerHTML = `
                    <div class="confirm-dialog-card" role="dialog" aria-modal="true" aria-labelledby="confirmDialogTextTitulo" aria-describedby="confirmDialogTextMensaje">
                        <div class="confirm-dialog-heading">
                            <span class="confirm-dialog-mark confirm-dialog-mark-danger" aria-hidden="true">!</span>
                            <div>
                                <span class="confirm-dialog-kicker">CONFIRMACIÓN ADICIONAL</span>
                                <h3 id="confirmDialogTextTitulo"></h3>
                            </div>
                        </div>
                        <p id="confirmDialogTextMensaje"></p>
                        <input id="confirmDialogTextInput" class="confirm-dialog-input" type="text" autocomplete="off" spellcheck="false">
                        <div class="confirm-dialog-actions">
                            <button type="button" id="confirmDialogTextNo" class="confirm-dialog-cancel">Cancelar</button>
                            <button type="button" id="confirmDialogTextSi" class="confirm-dialog-accept" disabled></button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            const input = modal.querySelector('#confirmDialogTextInput');
            const btnNo = modal.querySelector('#confirmDialogTextNo');
            const btnSi = modal.querySelector('#confirmDialogTextSi');
            const requeridoNormalizado = textoRequerido.trim().toLocaleUpperCase();
            const actualizarBoton = () => {
                btnSi.disabled = Boolean(requeridoNormalizado) && input.value.trim().toLocaleUpperCase() !== requeridoNormalizado;
            };
            const resolver = valor => {
                modal.style.display = 'none';
                input.oninput = null;
                btnNo.onclick = null;
                btnSi.onclick = null;
                modal.onclick = null;
                modal.onkeydown = null;
                resolve(valor);
            };

            modal.querySelector('#confirmDialogTextTitulo').textContent = titulo;
            modal.querySelector('#confirmDialogTextMensaje').textContent = mensaje;
            input.value = '';
            input.placeholder = placeholder;
            btnSi.textContent = textoRequerido ? 'Confirmar' : 'Continuar';
            input.oninput = actualizarBoton;
            btnNo.onclick = () => resolver(null);
            btnSi.onclick = () => resolver(input.value.trim());
            modal.onclick = event => { if (event.target === modal) resolver(null); };
            modal.onkeydown = event => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    resolver(null);
                } else if (event.key === 'Enter' && !btnSi.disabled) {
                    event.preventDefault();
                    btnSi.click();
                }
            };
            actualizarBoton();
            modal.style.display = 'flex';
            input.focus();
        });
    }
};

const IndicadorPosicion = {
    actualizar(posicion, total) {
        const barra = document.getElementById('barraProgreso');
        const texto = document.getElementById('textoPosicion');
        if (!barra) return;
        const pct = total > 0 ? Math.max(5, Math.round(((total - posicion + 1) / total) * 100)) : 5;
        barra.style.width = pct + '%';
        if (texto) texto.textContent = posicion > 0 ? `Posición ${posicion} de ${total}` : '¡Es tu turno!';
    }
};

const SonidoMejorado = {
    ctx: null,
    _init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },
    reproducirTono(freq, duracion, tipo = 'sine', volumen = 0.4) {
        this._init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.frequency.value = freq; osc.type = tipo;
        gain.gain.setValueAtTime(volumen, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duracion);
        osc.start(this.ctx.currentTime); osc.stop(this.ctx.currentTime + duracion);
    },
    turnoLlamado() {
        [523, 659, 784].forEach((f, i) => {
            setTimeout(() => this.reproducirTono(f, 0.4, 'sine', 0.5), i * 250);
        });
    },
    turnoCompletado() {
        [784, 523].forEach((f, i) => setTimeout(() => this.reproducirTono(f, 0.3, 'sine', 0.3), i * 200));
    }
};

const PanelRendimiento = {
    async cargar() {
        const panel = document.getElementById('panelRendimientoDia');
        if (!panel || !window.supabaseClient) return;
        try {
            const hoy = window.getLocalDate ? window.getLocalDate() : new Date().toISOString().split('T')[0];
            const historialHoy = await SupabaseDB.cargarHistorial(500, hoy);
            const conSalida = historialHoy.filter(h => h.autorizadoSalida).length;
            const sinSalida = historialHoy.filter(h => !h.autorizadoSalida).length;
            const empresasUnicas = new Set(historialHoy.map(h => h.nombreEmpresa)).size;
            const pesoTotal = historialHoy.reduce((s, h) => s + (parseFloat(h.peso) || 0), 0);
            const bultosTotal = historialHoy.reduce((s, h) => s + (parseInt(h.bultos) || 0), 0);
            panel.innerHTML = `
                <div class="rendimiento-grid">
                    <div class="rendimiento-item"><span class="rendimiento-val">${historialHoy.length}</span><span class="rendimiento-lbl">Completados hoy</span></div>
                    <div class="rendimiento-item verde"><span class="rendimiento-val">${conSalida}</span><span class="rendimiento-lbl">Salidas OK</span></div>
                    <div class="rendimiento-item naranja"><span class="rendimiento-val">${sinSalida}</span><span class="rendimiento-lbl">Sin autorizar</span></div>
                    <div class="rendimiento-item azul"><span class="rendimiento-val">${empresasUnicas}</span><span class="rendimiento-lbl">Empresas</span></div>
                    <div class="rendimiento-item"><span class="rendimiento-val">${pesoTotal > 0 ? pesoTotal.toLocaleString('es-CO') + ' kg' : '—'}</span><span class="rendimiento-lbl">Peso total</span></div>
                    <div class="rendimiento-item"><span class="rendimiento-val">${bultosTotal > 0 ? bultosTotal : '—'}</span><span class="rendimiento-lbl">Bultos totales</span></div>
                </div>
            `;
        } catch(e) { console.warn('Error cargando rendimiento:', e); }
    }
};

(function inyectarEstilosMejoras() {
    const style = document.createElement('style');
    style.textContent = `
        .rendimiento-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
        .rendimiento-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
        .rendimiento-item.verde { background: #f0fdf4; border-color: #86efac; }
        .rendimiento-item.naranja { background: #fff7ed; border-color: #fed7aa; }
        .rendimiento-item.azul { background: #eff6ff; border-color: #bfdbfe; }
        .rendimiento-val { display: block; font-size: 22px; font-weight: 700; color: #1e293b; }
        .rendimiento-lbl { display: block; font-size: 11px; color: #64748b; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.3px; }
        .barra-progreso-wrap { background: #e2e8f0; border-radius: 20px; height: 8px; overflow: hidden; margin: 8px 0; }
        #barraProgreso { height: 100%; background: linear-gradient(90deg, #3b82f6, #22c55e); border-radius: 20px; transition: width 0.6s ease; width: 5%; }
        #tiempoTranscurrido { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; color: #2563eb; letter-spacing: 2px; }
        .historial-toolbar { display: flex; gap: 10px; margin-bottom: 12px; align-items: center; flex-wrap: wrap; }
        #busquedaHistorial { flex: 1; min-width: 180px; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #f8fafc; }
        #busquedaHistorial:focus { outline: none; border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        #fechaHistorial { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #f8fafc; color: #1e293b; }
        #fechaHistorial:focus { outline: none; border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        .reloj-vivo { font-variant-numeric: tabular-nums; font-weight: 600; letter-spacing: 1px; }
        .metrica-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; padding: 8px 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        .metrica-val { font-weight: 700; color: #2563eb; font-size: 15px; }
        @media (max-width: 600px) { .rendimiento-grid { grid-template-columns: repeat(2, 1fr); } }
    `;
    document.head.appendChild(style);
})();

document.addEventListener('DOMContentLoaded', () => {
    const patchModoEspera = () => {
        if (!window.ModoEspera) { setTimeout(patchModoEspera, 200); return; }
        const _origActualizar = window.ModoEspera.actualizar.bind(window.ModoEspera);
        window.ModoEspera.actualizar = function() {
            _origActualizar();
            if (this.activo && this.miTurno && window.AppState) {
                const turnosEspera = window.AppState.turnos || [];
                const posicion = turnosEspera.findIndex(t => t.numero === this.miTurno.numero) + 1;
                IndicadorPosicion.actualizar(posicion, turnosEspera.length);
                const el = document.getElementById('waitingTime');
                if (el && posicion > 0) {
                    const min = posicion * (window.CONFIG?.TURN_TIME_ESTIMATE || 5);
                    el.textContent = `~${min} min`;
                }
            }
        };
    };
    setTimeout(patchModoEspera, 500);
    if (window.RelojVivo && document.querySelector('.reloj-vivo')) RelojVivo.iniciar();
    if (window.PanelRendimiento && document.getElementById('panelRendimientoDia')) PanelRendimiento.cargar();
    if (window.BusquedaHistorial) BusquedaHistorial.inicializar();
    if (window.MetricasRT) {
        window.MetricasRT.cargar();
        window.MetricasRT.actualizarUI();
    }
});

window.MetricasRT = MetricasRT;
window.BusquedaHistorial = BusquedaHistorial;
window.ExportarHoy = ExportarHoy;
window.RelojVivo = RelojVivo;
window.ConfirmDialog = ConfirmDialog;
window.IndicadorPosicion = IndicadorPosicion;
window.SonidoMejorado = SonidoMejorado;
window.PanelRendimiento = PanelRendimiento;



