// Local notification manager - SI-3
class PushNotificationManager {
    constructor() {
        this.isSupported = typeof window !== 'undefined' && 'Notification' in window;
        this._canalesBC = [];
        this._initInProgress = false;
        this._initBroadcastChannel();
    }

    async desregistrarServiceWorkers() {
        if (!('serviceWorker' in navigator)) return;

        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(async registration => {
            try {
                await registration.update();
            } catch (error) {
                console.warn('No se pudo actualizar el registro antiguo del service worker:', error);
                await registration.unregister();
            }
        }));

        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames
                    .filter(cacheName => cacheName.startsWith('si3-v'))
                    .map(cacheName => caches.delete(cacheName))
            );
        }
    }

    _initBroadcastChannel() {
        try {
            const bc = new BroadcastChannel('si3-notificaciones');
            bc.onmessage = (event) => {
                const msg = event.data;
                if (msg.type === 'reproducir-sonido') {
                    this._reproducirSonido(msg.tipo);
                }
            };
            this._canalesBC.push(bc);
        } catch (e) {}
    }

    _broadcast(msg) {
        this._canalesBC.forEach(bc => {
            try { bc.postMessage(msg); } catch(e) {}
        });
    }

    _reproducirSonido(tipo) {
        try {
            window.dispatchEvent(new CustomEvent('notificacion-sonido', { detail: { tipo: tipo || 'default' } }));
        } catch(e) {}
    }

    async init() {
        if (this._initInProgress) {
            return false;
        }

        this._initInProgress = true;

        try {
            await this.desregistrarServiceWorkers();

            if (!this.isSupported) {
                console.warn('Notificaciones del navegador no soportadas');
                return false;
            }

            if (Notification.permission === 'default') {
                await this.requestPermission();
            }
            console.info('Service worker desactivado; se usarán notificaciones locales.');
            return true;
        } catch (error) {
            console.error('No se pudo desregistrar el service worker:', error);
            return false;
        } finally {
            this._initInProgress = false;
        }
    }

    async requestPermission() {
        if (!this.isSupported) return 'denied';
        const permission = await Notification.requestPermission();
        console.log('Permiso notificaciones:', permission);
        return permission;
    }

    // Mostrar notificación local CON SONIDO
    showLocalNotification(title, options = {}) {
        this._reproducirSonido(options.tipo || 'default');

        const defaultOptions = {
            body: options.body || '',
            icon: options.icon || '/Logo-Web-SI3.png',
            badge: options.badge || '/Logo-Web-SI3.png',
            vibrate: options.vibrate || [200, 100, 200],
            data: options.data || {},
            actions: options.actions || [
                { action: 'open', title: 'Ver' },
                { action: 'close', title: 'Cerrar' }
            ],
            requireInteraction: options.requireInteraction !== false,
            tag: options.tag || 'si3-' + Date.now(),
            renotify: true,
            silent: false
        };

        if (this.isSupported && Notification.permission === 'granted') {
            new Notification(title, defaultOptions);
        }

        this._broadcast({
            type: 'notificacion-recibida',
            titulo: title,
            tipo: options.tipo || 'default'
        });
    }

    // Notificaciones específicas del sistema - CON SONIDO
    notifyTurnoLlamado(turno) {
        const materialesSap = Array.isArray(turno.materialesSap) ? turno.materialesSap : [];
        this.showLocalNotification('🔔 Turno Llamado', {
            body: `Turno ${turno.numero} - ${turno.nombreEmpresa}${materialesSap.length ? ` - SAP: ${materialesSap.join(', ')}` : ''}`,
            data: { url: '/despachador.html', tipo: 'turno_llamado', turno },
            tag: 'turno-llamado-' + turno.numero,
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
            tipo: 'turno_llamado'
        });
    }

    notifyProveedorListo(proveedor) {
        this.showLocalNotification('✅ Proveedor Listo para Salida', {
            body: `${proveedor.numero} - ${proveedor.nombre} - Placa: ${proveedor.nit}`,
            data: { url: '/despachador.html', tipo: 'proveedor_listo', proveedor },
            tag: 'proveedor-listo-' + proveedor.numero,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            tipo: 'proveedor_listo'
        });
    }

    notifyInspeccionRequerida(turno) {
        this.showLocalNotification('⚠️ Inspección Requerida', {
            body: `Turno ${turno.numero} - ${turno.nombreEmpresa} requiere inspección física`,
            data: { url: '/despachador.html', tipo: 'inspeccion', turno },
            tag: 'inspeccion-' + turno.numero,
            requireInteraction: true,
            vibrate: [500, 200, 500],
            tipo: 'inspeccion'
        });
    }

    notifyNuevoTurno(turno) {
        const materialesSap = Array.isArray(turno.materialesSap) ? turno.materialesSap : [];
        this.showLocalNotification('📋 Nuevo Turno Registrado', {
            body: `Turno ${turno.numero} - ${turno.nombreEmpresa} - ${turno.destino}${materialesSap.length ? ` - SAP: ${materialesSap.join(', ')}` : ''}`,
            data: { url: '/admin.html', tipo: 'nuevo_turno', turno },
            tag: 'nuevo-turno-' + turno.numero,
            requireInteraction: false,
            tipo: 'nuevo_turno'
        });
    }

    notifyTurnoCompletado(turno) {
        this.showLocalNotification('✅ Turno Completado', {
            body: `Turno ${turno.numero} - ${turno.nombreEmpresa} completado`,
            data: { url: '/admin.html', tipo: 'turno_completado', turno },
            tag: 'turno-completado-' + turno.numero,
            requireInteraction: false,
            tipo: 'turno_completado'
        });
    }
}

window.SI3PushManager = new PushNotificationManager();

window.SI3PushManager.desregistrarServiceWorkers().catch(error => {
    console.error('No se pudo desactivar el service worker:', error);
});

document.addEventListener('DOMContentLoaded', () => {
    const isDespachador = window.location.pathname.includes('despachador');
    const isAdmin = window.location.pathname.includes('admin');

    if ((isDespachador || isAdmin) && window.SI3PushManager && typeof window.SI3PushManager.init === 'function') {
        setTimeout(() => {
            Promise.resolve(window.SI3PushManager.init()).then(success => {
                if (success) {
                    console.log('Notificaciones locales inicializadas correctamente');
                }
            }).catch(err => console.warn('No se pudo inicializar SI3PushManager:', err));
        }, 1000);
    }
});

window.addEventListener('storage', (e) => {
    if (!window.SI3PushManager) return;

    switch (e.key) {
        case 'proveedorListoSalir':
            if (e.newValue) {
                try {
                    const proveedor = JSON.parse(e.newValue);
                    window.SI3PushManager.notifyProveedorListo(proveedor);
                } catch (err) {
                    console.error('Error parseando proveedorListoSalir:', err);
                }
            }
            break;
        case 'nuevoTurno':
            if (e.newValue) {
                try {
                    const turno = JSON.parse(e.newValue);
                    window.SI3PushManager.notifyNuevoTurno(turno);
                } catch (err) {
                    console.error('Error parseando nuevoTurno:', err);
                }
            }
            break;
        case 'turnoCompletado':
            if (e.newValue) {
                try {
                    const turno = JSON.parse(e.newValue);
                    window.SI3PushManager.notifyTurnoCompletado(turno);
                } catch (err) {
                    console.error('Error parseando turnoCompletado:', err);
                }
            }
            break;
    }
});

window.dispararNotificacion = (tipo, datos) => {
    if (!window.SI3PushManager) return;

    switch (tipo) {
        case 'turno_llamado':
            window.SI3PushManager.notifyTurnoLlamado(datos);
            break;
        case 'proveedor_listo':
            window.SI3PushManager.notifyProveedorListo(datos);
            break;
        case 'inspeccion':
            window.SI3PushManager.notifyInspeccionRequerida(datos);
            break;
        case 'nuevo_turno':
            window.SI3PushManager.notifyNuevoTurno(datos);
            break;
        case 'turno_completado':
            window.SI3PushManager.notifyTurnoCompletado(datos);
            break;
    }
};
