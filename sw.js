self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const cachesSI3 = await caches.keys();
        await Promise.all(
            cachesSI3
                .filter(nombre => nombre.startsWith('si3-v'))
                .map(nombre => caches.delete(nombre))
        );
        await self.clients.claim();
        await self.registration.unregister();
    })());
});
