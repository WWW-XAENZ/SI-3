// Service Worker para notificaciones push - SI-3 v3
const CACHE_NAME = 'si3-v3';
const VAPID_PUBLIC_KEY = 'BJw2L9Jm3K8vX7zQ6Y5R4T3W2E1N0M9L8K7J6H5G4F3D2S1A0Z9Y8X7W6V5U4T3S2R1Q0P9O8I7U6Y5T4R3E2W1Q0';

const ARCHIVOS_CACHE = [
    'index.html',
    'admin.html',
    'despachador.html',
    'user.html',
    'qr-llegada.html',
    'tv.html',
    'facturas.html',
    'llegada.html',
    'styles.css',
    'app.js',
    'push-notifications.js',
    'sonido.js',
    'supabase-config.js',
    'materiales_sie.js',
    'materiales_sip.js',
    'Logo-Web-SI3.png',
    'IconosVehiculos.png',
    'manifest.json',
    'vehiculo-carpado.png',
    'vehiculo-contenedor.png',
    'vehiculo-furgon.png',
    'vehiculo-moto.png',
    'vehiculo-mula.png',
    'vehiculo-particular.png'
];

const PAGINAS_CACHEABLES = new Set([
    'index.html',
    'admin.html',
    'despachador.html',
    'user.html',
    'qr-llegada.html',
    'tv.html',
    'facturas.html',
    'llegada.html'
]);

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            cache.addAll(ARCHIVOS_CACHE.map((archivo) => new URL(archivo, self.registration.scope).href))
        )
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName.startsWith('si3-v') && cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    const scope = new URL(self.registration.scope);

    if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) {
        return;
    }

    const rutaRelativa = url.pathname.slice(scope.pathname.length) || (request.mode === 'navigate' ? 'index.html' : '');
    const esNavegacion = request.mode === 'navigate' && PAGINAS_CACHEABLES.has(rutaRelativa);
    const esRecursoCacheable = ARCHIVOS_CACHE.includes(rutaRelativa);
    if (!esNavegacion && !esRecursoCacheable) return;

    const urlCache = new URL(rutaRelativa, scope).href;
    event.respondWith((async () => {
        let respuesta;
        try {
            respuesta = await fetch(request);
        } catch (errorRed) {
            const respuestaEnCache = await caches.match(urlCache);
            if (respuestaEnCache) return respuestaEnCache;

            if (esNavegacion && rutaRelativa !== 'index.html') {
                const inicioEnCache = await caches.match(new URL('index.html', scope).href);
                if (inicioEnCache) return inicioEnCache;
            }

            throw errorRed;
        }

        if (respuesta.ok) {
            try {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(urlCache, respuesta.clone());
            } catch (errorCache) {
                console.warn('No se pudo actualizar la caché de SI-3:', errorCache);
            }
        }

        return respuesta;
    })());
});

self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'Nueva notificación',
        icon: data.icon || new URL('Logo-Web-SI3.png', self.registration.scope).href,
        badge: data.badge || new URL('Logo-Web-SI3.png', self.registration.scope).href,
        vibrate: data.vibrate || [200, 100, 200],
        data: Object.assign({}, data.data || {}, {
            tipo: data.tipo || 'default',
            tituloNotif: data.title || 'SI-3 Sistema de Turnos'
        }),
        actions: data.actions || [
            { action: 'open', title: 'Ver' },
            { action: 'close', title: 'Cerrar' }
        ],
        requireInteraction: data.requireInteraction !== false,
        tag: data.tag || 'si3-notification-' + Date.now(),
        renotify: true,
        silent: false
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'SI-3 Sistema de Turnos', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const url = new URL(event.notification.data?.url || 'despachador.html', self.registration.scope).href;
    const notifData = event.notification.data || {};

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(url) && 'focus' in client) {
                    client.postMessage({
                        type: 'notificacion-click',
                        tipo: notifData.tipo || 'default',
                        url: url
                    });
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-notificaciones') {
        event.waitUntil(
            self.registration.showNotification('SI-3', {
                body: 'Conexión recuperada. Actualizando datos...',
                icon: new URL('Logo-Web-SI3.png', self.registration.scope).href,
                vibrate: [100, 50, 100]
            })
        );
    }
});

console.log('SW SI-3 v3 cargado');
