// Push Notification Manager - SI-3 v2
// Mejoras: sonido automático, BroadcastChannel, fiabilidad
class PushNotificationManager {
    constructor() {
        this.swRegistration = null;
        this.subscription = null;
        this.isSupported = !!(navigator && 'serviceWorker' in navigator && window && 'PushManager' in window);
        this.serverUrl = window.location.origin;
        this.publicVapidKey = window.SI3_VAPID_PUBLIC_KEY || '';
        this._canalesBC = [];
        this._useServiceWorker = this.isSupported && window.location.protocol !== 'file:';
        this._initInProgress = false;
        this._initBroadcastChannel();
    }

    _initBroadcastChannel() {
        try {
            const bc = new BroadcastChannel('si3-notificaciones');
            bc.onmessage = (event) => {
                const msg = event.data;
                if (msg.type === 'notificacion-click') {
                    this._manejarClickNotificacion(msg);
                }
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

    _manejarClickNotificacion(msg) {
        // Puede ser expandido para manejar clicks entre pestañas
    }

    async init() {
        if (this._initInProgress) {
            return false;
        }

        this._initInProgress = true;

        try {
            if (!this.isSupported) {
                console.warn('Push notifications no soportadas');
                return false;
            }

            if (!this._useServiceWorker) {
                console.log('Service Worker deshabilitado en file://, usando notificaciones locales');
                return true;
            }

            for (let intento = 0; intento < 3; intento++) {
                try {
                    this.swRegistration = await navigator.serviceWorker.register('/sw.js');
                    console.log('Service Worker registrado:', this.swRegistration.scope);

                    this.swRegistration.addEventListener('updatefound', () => {
                        const newWorker = this.swRegistration.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('Nueva versión disponible');
                                newWorker.postMessage('skipWaiting');
                            }
                        });
                    });

                    const permission = await this.requestPermission();
                    if (permission === 'granted') {
                        const subscription = await this.subscribe();
                        if (subscription) {
                            console.log('Suscripcion push activa');
                        }
                    }

                    this._escucharMensajesSW();
                    return true;
                } catch (error) {
                    console.error(`Error inicializando push (intento ${intento + 1}):`, error);
                    if (intento < 2) {
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }
            return false;
        } finally {
            this._initInProgress = false;
        }
    }

    _escucharMensajesSW() {
        if (!this.swRegistration) return;
        navigator.serviceWorker.addEventListener('message', (event) => {
            const data = event.data || {};
            if (data.type === 'notificacion-click') {
                this._reproducirSonido(data.tipo);
                this._manejarClickNotificacion(data);
            }
            if (data.type === 'reproducir-sonido') {
                this._reproducirSonido(data.tipo);
            }
        });
    }

    async requestPermission() {
        if (!this.isSupported) return 'denied';
        const permission = await Notification.requestPermission();
        console.log('Permiso notificaciones:', permission);
        return permission;
    }

    async subscribe() {
        if (!this.publicVapidKey || this.publicVapidKey.length < 20) {
            console.info('Push deshabilitado: no hay clave VAPID válida configurada. Usando avisos locales.');
            return null;
        }

        try {
            const applicationServerKey = this.urlB64ToUint8Array(this.publicVapidKey);
            if (!applicationServerKey || applicationServerKey.length === 0) {
                console.warn('Clave VAPID inválida; no se suscribe a push.');
                return null;
            }

            this.subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            });

            console.log('Suscrito a push:', this.subscription.endpoint ? '✓' : '?');
            await this.sendSubscriptionToServer(this.subscription);
            return this.subscription;
        } catch (error) {
            console.warn('Push no disponible o no configurado; usando avisos locales:', error.message || error);
            return null;
        }
    }

    async sendSubscriptionToServer(subscription) {
        try {
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription })
            });
        } catch (error) {
            console.warn('No se pudo enviar suscripción al servidor:', error);
        }
    }

    urlB64ToUint8Array(base64String) {
        if (!base64String || typeof base64String !== 'string' || base64String.length < 20) {
            return new Uint8Array();
        }

        try {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        } catch (error) {
            console.warn('Clave VAPID no válida:', error.message || error);
            return new Uint8Array();
        }
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

        if (this.swRegistration) {
            this.swRegistration.showNotification(title, defaultOptions);
        } else if (Notification.permission === 'granted') {
            // Fallback: usar Notification API directa sin Service Worker
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
        this.showLocalNotification('🔔 Turno Llamado', {
            body: `Turno ${turno.numero} - ${turno.nombreEmpresa}`,
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
        this.showLocalNotification('📋 Nuevo Turno Registrado', {
            body: `Turno ${turno.numero} - ${turno.nombreEmpresa} - ${turno.destino}`,
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

document.addEventListener('DOMContentLoaded', () => {
    const isDespachador = window.location.pathname.includes('despachador');
    const isAdmin = window.location.pathname.includes('admin');

    if ((isDespachador || isAdmin) && window.SI3PushManager && typeof window.SI3PushManager.init === 'function') {
        setTimeout(() => {
            Promise.resolve(window.SI3PushManager.init()).then(success => {
                if (success) {
                    console.log('Push Manager inicializado correctamente');
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
