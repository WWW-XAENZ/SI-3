
 // Local notification manager - SI-3
// NOTIFICACIONES DESACTIVADAS TEMPORALMENTE

class PushNotificationManager {
    constructor() {
        this.isSupported =
            typeof window !== 'undefined' &&
            'Notification' in window;

        this._canalesBC = [];
        this._initInProgress = false;
        this._cleanupPromise = null;
        this._initBroadcastChannel();
    }

    async desregistrarServiceWorkers() {
        if (!this._cleanupPromise) {
            this._cleanupPromise = (async () => {
                let controladorSI3 = false;
                const rutasServiceWorker = new Set([
                    new URL('sw.js', document.baseURI).pathname,
                    new URL('/sw.js', window.location.origin).pathname
                ]);

                if ('serviceWorker' in navigator) {
                    const registros = await navigator.serviceWorker.getRegistrations();
                    const controlador = navigator.serviceWorker.controller;

                    for (const registro of registros) {
                        const workers = [registro.active, registro.waiting, registro.installing].filter(Boolean);
                        const esServiceWorkerSI3 = workers.some(worker => {
                            const url = new URL(worker.scriptURL, document.baseURI);
                            return url.origin === window.location.origin && rutasServiceWorker.has(url.pathname);
                        });

                        if (!esServiceWorkerSI3) continue;

                        if (controlador) {
                            const urlControlador = new URL(controlador.scriptURL, document.baseURI);
                            controladorSI3 = urlControlador.origin === window.location.origin
                                && rutasServiceWorker.has(urlControlador.pathname);
                        }

                        await registro.unregister();
                    }
                }

                if ('caches' in window) {
                    const nombresCache = await caches.keys();
                    await Promise.all(
                        nombresCache
                            .filter(nombre => nombre.startsWith('si3-v'))
                            .map(nombre => caches.delete(nombre))
                    );
                }

                const claveRecarga = 'si3-service-worker-cleanup-reloaded';
                if (controladorSI3 && sessionStorage.getItem(claveRecarga) !== '1') {
                    sessionStorage.setItem(claveRecarga, '1');
                    window.location.reload();
                    return true;
                }

                if (!controladorSI3) sessionStorage.removeItem(claveRecarga);
                return true;
            })();
        }

        return this._cleanupPromise;
    }

    _initBroadcastChannel() {
        try {
            if (!('BroadcastChannel' in window)) return;

            const bc = new BroadcastChannel(
                'si3-notificaciones'
            );

            bc.onmessage = (event) => {
                const msg = event.data;
                if (!msg) return;

                if (msg.type === 'reproducir-sonido') {
                    this._reproducirSonido(msg.tipo);
                }
            };

            this._canalesBC.push(bc);
        } catch (e) {
            console.warn(
                'No se pudo iniciar BroadcastChannel:',
                e
            );
        }
    }

    _broadcast(msg) {
        this._canalesBC.forEach(bc => {
            try {
                bc.postMessage(msg);
            } catch (e) {}
        });
    }

    _reproducirSonido(tipo) {
        try {
            window.dispatchEvent(
                new CustomEvent('notificacion-sonido', {
                    detail: {
                        tipo: tipo || 'default'
                    }
                })
            );
        } catch (e) {}
    }

    // Inicialización desactivada.
    // No solicita permisos ni registra Service Workers.
    async init() {
        await this.desregistrarServiceWorkers();
        return false;
    }

    async requestPermission() {
        console.info(
            'Solicitud de permisos desactivada temporalmente.'
        );
        return 'default';
    }

    // Se conserva el método para compatibilidad.
    // No muestra notificaciones del navegador.
    showLocalNotification(title, options = {}) {
        console.info(
            'Notificación desactivada:',
            title
        );

        // No se muestra ninguna notificación.
        // No se modifica ni se elimina información.
        return false;
    }

    // Métodos conservados para evitar errores
    // en los archivos que llaman a estas funciones.

    notifyTurnoLlamado(turno) {
        return this.showLocalNotification(
            '🔔 Turno Llamado',
            {
                body: `Turno ${turno.numero} - ${turno.nombreEmpresa}`
            }
        );
    }

    notifyProveedorListo(proveedor) {
        return this.showLocalNotification(
            '✅ Proveedor Listo para Salida',
            {
                body: `${proveedor.numero} - ${proveedor.nombre} - Placa: ${proveedor.nit}`
            }
        );
    }

    notifyInspeccionRequerida(turno) {
        return this.showLocalNotification(
            '⚠️ Inspección Requerida',
            {
                body: `Turno ${turno.numero} - ${turno.nombreEmpresa}`
            }
        );
    }

    notifyNuevoTurno(turno) {
        return this.showLocalNotification(
            '📋 Nuevo Turno Registrado',
            {
                body: `Turno ${turno.numero} - ${turno.nombreEmpresa}`
            }
        );
    }

    notifyTurnoCompletado(turno) {
        return this.showLocalNotification(
            '✅ Turno Completado',
            {
                body: `Turno ${turno.numero} - ${turno.nombreEmpresa}`
            }
        );
    }
}

// Instancia global conservada para compatibilidad.
window.SI3PushManager = new PushNotificationManager();

// Elimina workers y cachés antiguos de SI-3 al abrir la aplicación.
// Incluye el registro /sw.js que usaban versiones anteriores en GitHub Pages.
window.SI3PushManager.desregistrarServiceWorkers().catch(error => {
    console.error('No se pudieron limpiar los recursos antiguos de SI-3:', error);
});

// Se conserva el evento storage sin mostrar notificaciones.
window.addEventListener('storage', (e) => {
    if (!window.SI3PushManager) return;

    // Se ignoran los eventos de notificaciones
    // mientras permanezcan desactivadas.
});

// Se conserva la función global para evitar errores
// si otros archivos intentan llamarla.
window.dispararNotificacion = (tipo, datos) => {
    console.info(
        'Notificaciones desactivadas. Evento ignorado:',
        tipo
    );

    return false;
};
