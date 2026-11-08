/* ============================================================
   VERDIX SERVICE WORKER - PWA Offline
   ============================================================ */

const CACHE_NAME = "verdix-v1.0.0";
const STATIC_CACHE = "verdix-static-v1.0.0";
const API_CACHE = "verdix-api-v1.0.0";

// Archivos para cachear inmediatamente
const STATIC_FILES = [
    "/",
    "/index.html",
    "/browser.html",
    "/search.html",
    "/ai.html",
    "/download.html",
    "/test-errors.html",
    "/assets/css/style.css",
    "/assets/js/app.js",
    "/assets/js/auth.js",
    "/assets/js/security.js",
    "/assets/js/device-adapter.js",
    "/assets/js/security-audit.js",
    "/assets/icons/icon-192.png",
    "/assets/icons/icon-512.png",
    "/manifest.json",
];

// Instalar Service Worker
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(STATIC_FILES);
        })
    );
    self.skipWaiting();
});

// Activar Service Worker
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((name) => {
                    return name !== STATIC_CACHE && name !== API_CACHE;
                }).map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Interceptar peticiones
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Estrategia: Cache First para archivos estáticos
    if (STATIC_FILES.includes(url.pathname) || url.pathname.startsWith("/assets/")) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
        return;
    }

    // Estrategia: Network First para API
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clonar respuesta para cachear
                    const responseClone = response.clone();
                    caches.open(API_CACHE).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Si falla la red, intentar cache
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Estrategia: Cache First para páginas HTML
    if (event.request.mode === "navigate") {
        event.respondWith(
            caches.match(event.request).then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
        );
        return;
    }

    // Estrategia predeterminada
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Sincronización en segundo plano
self.addEventListener("sync", (event) => {
    if (event.tag === "sync-chats") {
        event.waitUntil(
            // Sincronizar chats pendientes
            console.log("Sincronizando chats pendientes...")
        );
    }
});

// Notificaciones push
self.addEventListener("push", (event) => {
    const options = {
        body: event.data ? event.data.text() : "Nueva notificación de Verdix",
        icon: "/assets/icons/icon-192.png",
        badge: "/assets/icons/icon-192.png",
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1,
        },
    };
    event.waitUntil(
        self.registration.showNotification("Verdix AI", options)
    );
});

// Clic en notificación
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow("https://verdix-oficial.vercel.app/ai.html")
    );
});
