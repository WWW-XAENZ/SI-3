// Push Notification Manager - SI-3
class PushNotificationManager {
    constructor() {
        this.swRegistration = null;
        this.subscription = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.serverUrl = window.location.origin;
    }

    async init() {
        if (!this.isSupported) {
            console.warn('Push notifications no soportadas');
            return false;
        }

        try {
            this.swRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registrado:', this.swRegistration.scope);

            // Escuchar actualizaciones
            this.swRegistration.addEventListener('updatefound', () => {
                const newWorker = this.swRegistration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('Nueva versión disponible');
                    }
                });
            });

            // Solicitar permiso
            const permission = await this.requestPermission();
            if (permission === 'granted') {
                await this.subscribe();
            }

            return true;
        } catch (error) {
            console.error('Error inicializando push:', error);
            return false;
        }
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

            console.log('Suscrito a push:', this.subscription);
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

    // Mostrar notificación local (fallback)
    showLocalNotification(title, options = {}) {
        if (!this.swRegistration) return;

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
            renotify: true
        };

        this.swRegistration.showNotification(title, defaultOptions);
    }

    // Notificaciones específicas del sistema
    notifyTurnoLlamado(turno) {
        this.showLocalNotification('🔔 Turno Llamado', {
            body: `Turno ${turno.numero} - ${turno.nombreEmpresa}`,
            data: { url: '/despachador.html', tipo: 'turno_llamado', turno },
            tag: 'turno-llamado-' + turno.numero,
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300]
        });
    }

    notifyProveedorListo(proveedor) {
        this.showLocalNotification('✅ Proveedor Listo para Salida', {
            body: `${proveedor.numero} - ${proveedor.nombre} - Placa: ${proveedor.nit}`,
            data: { url: '/despachador.html', tipo: 'proveedor_listo', proveedor },
            tag: 'proveedor-listo-' + proveedor.numero,
            requireInteraction: true,
            vibrate: [200, 100, 200]
        });
    }

    notifyInspeccionRequerida(turno) {
        this.showLocalNotification('⚠️ Inspección Requerida', {
            body: `Turno ${turno.numero} - ${turno.nombreEmpresa} requiere inspección física`,
            data: { url: '/despachador.html', tipo: 'inspeccion', turno },
            tag: 'inspeccion-' + turno.numero,
            requireInteraction: true,
            vibrate: [500, 200, 500]
        });
    }

    notifyNuevoTurno(turno) {
        this.showLocalNotification('📋 Nuevo Turno Registrado', {
            body: `Turno ${turno.numero} - ${turno.nombreEmpresa} - ${turno.destino}`,
            data: { url: '/admin.html', tipo: 'nuevo_turno', turno },
            tag: 'nuevo-turno-' + turno.numero,
            requireInteraction: false
        });
    }

    notifyTurnoCompletado(turno) {
        this.showLocalNotification('✅ Turno Completado', {
            body: `Turno ${turno.numero} - ${turno.nombreEmpresa} completado`,
            data: { url: '/admin.html', tipo: 'turno_completado', turno },
            tag: 'turno-completado-' + turno.numero,
            requireInteraction: false
        });
    }
}

// Instancia global
window.PushManager = new PushNotificationManager();

// Auto-inicializar si está en despachador o admin
document.addEventListener('DOMContentLoaded', () => {
    const isDespachador = window.location.pathname.includes('despachador');
    const isAdmin = window.location.pathname.includes('admin');
    const isRecepcion = window.location.pathname.includes('index') || window.location.pathname === '/' || window.location.pathname.endsWith('/');

    if (isDespachador || isAdmin || isRecepcion) {
        // Pequeño delay para no bloquear carga inicial
        setTimeout(() => {
            window.PushManager.init().then(success => {
                if (success) {
                    console.log('Push Manager inicializado correctamente');
                }
            });
        }, 1000);
    }
});

// Escuchar eventos de storage para notificaciones cruzadas
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

// Función helper para disparar notificaciones desde otras pestañas
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