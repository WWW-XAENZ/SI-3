// Service Worker para notificaciones push - SI-3 v2
// Mejoras: cache mejorado, sync offline, robustez
const CACHE_NAME = 'si3-v2';
const VAPID_PUBLIC_KEY = 'BJw2L9Jm3K8vX7zQ6Y5R4T3W2E1N0M9L8K7J6H5G4F3D2S1A0Z9Y8X7W6V5U4T3S2R1Q0P9O8I7U6Y5T4R3E2W1Q0';

const ARCHIVOS_CACHE = [
    '/',
    '/index.html',
    '/admin.html',
    '/despachador.html',
    '/user.html',
    '/qr-llegada.html',
    '/tv.html',
    '/facturas.html',
    '/llegada.html',
    '/styles.css',
    '/app.js',
    '/push-notifications.js',
    '/sonido.js',
    '/supabase-config.js',
    '/Logo-Web-SI3.png',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ARCHIVOS_CACHE).catch(() => {});
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.protocol === 'http:' && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
        event.respondWith(fetch(event.request));
        return;
    }
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone).catch(() => {});
                    });
                }
                return networkResponse;
            }).catch(() => {
                return caches.match('/index.html');
            });
        })
    );
});

self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'Nueva notificación',
        icon: data.icon || '/Logo-Web-SI3.png',
        badge: data.badge || '/Logo-Web-SI3.png',
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

    const url = event.notification.data?.url || '/despachador.html';
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
                icon: '/Logo-Web-SI3.png',
                vibrate: [100, 50, 100]
            })
        );
    }
});

console.log('SW SI-3 v2 cargado');
