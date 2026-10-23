
 // Local notification manager - SI-3
// NOTIFICACIONES DESACTIVADAS TEMPORALMENTE

class PushNotificationManager {
    constructor() {
        this.isSupported =
            typeof window !== 'undefined' &&
            'Notification' in window;

        this._canalesBC = [];
        this._initInProgress = false;
        this._initBroadcastChannel();
    }

    // Desactivado: no modificar los Service Workers existentes.
    async desregistrarServiceWorkers() {
        console.info(
            'Desregistración de Service Workers desactivada.'
        );
        return false;
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
        console.info(
            'Notificaciones SI-3 desactivadas temporalmente.'
        );
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

// IMPORTANTE:
// No se registra ni se desregistra ningún Service Worker.
// No se solicitan permisos.
// No se inicializan notificaciones automáticamente.

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
