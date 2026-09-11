// Service Worker para notificaciones push - SI-3
const CACHE_NAME = 'si3-v1';
const VAPID_PUBLIC_KEY = 'BJw2L9Jm3K8vX7zQ6Y5R4T3W2E1N0M9L8K7J6H5G4F3D2S1A0Z9Y8X7W6V5U4T3S2R1Q0P9O8I7U6Y5T4R3E2W1Q0';

// Instalación
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/admin.html',
                '/despachador.html',
                '/user.html',
                '/styles.css',
                '/app.js',
                '/Logo-Web-SI3.png'
            ]);
        })
    );
    self.skipWaiting();
});

// Activación
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

// Fetch
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Push notification
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'Nueva notificación',
        icon: data.icon || '/Logo-Web-SI3.png',
        badge: data.badge || '/Logo-Web-SI3.png',
        vibrate: data.vibrate || [200, 100, 200],
        data: data.data || {},
        actions: data.actions || [
            { action: 'open', title: 'Ver' },
            { action: 'close', title: 'Cerrar' }
        ],
        requireInteraction: data.requireInteraction || true,
        tag: data.tag || 'si3-notification',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'SI-3 Sistema de Turnos', options)
    );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const url = event.notification.data?.url || '/despachador.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Mensajes del cliente
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

console.log('SW SI-3 cargado');