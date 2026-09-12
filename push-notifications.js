// Push Notification Manager - SI-3 v2
// Mejoras: sonido automático, BroadcastChannel, fiabilidad
class PushNotificationManager {
    constructor() {
        this.swRegistration = null;
        this.subscription = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.serverUrl = window.location.origin;
        this._canalesBC = [];
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
        if (!this.isSupported) {
            console.warn('Push notifications no soportadas');
            return false;
        }

        for (let intento = 0; intento < 3; intento++) {
            try {
                this.swRegistration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registrado:', this.swRegistration.scope);

                this.swRegistration.addEventListener('updatefound', () => {
                    const newWorker = this.swRegistration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('Nueva versión disponible');
                            newWorker.postMessage('skipWaiting');
                        }
                    });
                });

                const permission = await this.requestPermission();
                if (permission === 'granted') {
                    await this.subscribe();
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
        try {
            const applicationServerKey = this.urlB64ToUint8Array(
                'BJw2L9Jm3K8vX7zQ6Y5R4T3W2E1N0M9L8K7J6H5G4F3D2S1A0Z9Y8X7W6V5U4T3S2R1Q0P9O8I7U6Y5T4R3E2W1Q0'
            );

            this.subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            });

            console.log('Suscrito a push:', this.subscription.endpoint ? '✓' : '?');
            await this.sendSubscriptionToServer(this.subscription);
            return this.subscription;
        } catch (error) {
            console.error('Error suscribiendo:', error);
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
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
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

window.PushManager = new PushNotificationManager();

document.addEventListener('DOMContentLoaded', () => {
    const isDespachador = window.location.pathname.includes('despachador');
    const isAdmin = window.location.pathname.includes('admin');
    const isRecepcion = window.location.pathname.includes('index') || window.location.pathname === '/' || window.location.pathname.endsWith('/');

    if (isDespachador || isAdmin || isRecepcion) {
        setTimeout(() => {
            window.PushManager.init().then(success => {
                if (success) {
                    console.log('Push Manager inicializado correctamente');
                }
            });
        }, 1000);
    }
});

window.addEventListener('storage', (e) => {
    if (!window.PushManager) return;

    switch (e.key) {
        case 'proveedorListoSalir':
            if (e.newValue) {
                try {
                    const proveedor = JSON.parse(e.newValue);
                    window.PushManager.notifyProveedorListo(proveedor);
                } catch (err) {
                    console.error('Error parseando proveedorListoSalir:', err);
                }
            }
            break;
        case 'nuevoTurno':
            if (e.newValue) {
                try {
                    const turno = JSON.parse(e.newValue);
                    window.PushManager.notifyNuevoTurno(turno);
                } catch (err) {
                    console.error('Error parseando nuevoTurno:', err);
                }
            }
            break;
        case 'turnoCompletado':
            if (e.newValue) {
                try {
                    const turno = JSON.parse(e.newValue);
                    window.PushManager.notifyTurnoCompletado(turno);
                } catch (err) {
                    console.error('Error parseando turnoCompletado:', err);
                }
            }
            break;
    }
});

window.dispararNotificacion = (tipo, datos) => {
    if (!window.PushManager) return;

    switch (tipo) {
        case 'turno_llamado':
            window.PushManager.notifyTurnoLlamado(datos);
            break;
        case 'proveedor_listo':
            window.PushManager.notifyProveedorListo(datos);
            break;
        case 'inspeccion':
            window.PushManager.notifyInspeccionRequerida(datos);
            break;
        case 'nuevo_turno':
            window.PushManager.notifyNuevoTurno(datos);
            break;
        case 'turno_completado':
            window.PushManager.notifyTurnoCompletado(datos);
            break;
    }
};
