// Retira los service workers antiguos de SI-3 y sus cachés; este archivo no registra workers.
(async () => {
    if (!('serviceWorker' in navigator)) return;

    const rutasSI3 = new Set([
        new URL('sw.js', document.baseURI).pathname,
        new URL('/sw.js', window.location.origin).pathname
    ]);
    const claveRecarga = 'si3-service-worker-removed';
    const controlador = navigator.serviceWorker.controller;
    let controladorSI3 = false;

    try {
        const registros = await navigator.serviceWorker.getRegistrations();
        for (const registro of registros) {
            const workers = [registro.active, registro.waiting, registro.installing].filter(Boolean);
            const registroSI3 = workers.some(worker => {
                const url = new URL(worker.scriptURL, document.baseURI);
                return url.origin === window.location.origin && rutasSI3.has(url.pathname);
            });
            if (!registroSI3) continue;

            if (controlador) {
                const url = new URL(controlador.scriptURL, document.baseURI);
                controladorSI3 = url.origin === window.location.origin && rutasSI3.has(url.pathname);
            }
            await registro.unregister();
        }

        if ('caches' in window) {
            const nombresCache = await caches.keys();
            await Promise.all(nombresCache
                .filter(nombre => nombre.startsWith('si3-v'))
                .map(nombre => caches.delete(nombre)));
        }

        if (controladorSI3 && sessionStorage.getItem(claveRecarga) !== '1') {
            sessionStorage.setItem(claveRecarga, '1');
            window.location.reload();
        } else if (!controladorSI3) {
            sessionStorage.removeItem(claveRecarga);
        }
    } catch (error) {
        console.error('No se pudieron retirar los recursos antiguos de SI-3:', error);
    }
})();
