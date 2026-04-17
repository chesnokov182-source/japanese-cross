const CACHE_NAME = 'jlpt-crosswords-v9';

const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/n5.js', 
    '/n4.js',
    '/n3.js',
    '/n2.js',
    '/n1.js',
    '/manifest.json'
];

// 1. Установка: кэшируем статические ресурсы
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Активируем новый SW сразу после установки
    );
});

// 2. Активация: удаляем старые кэши
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => self.clients.claim()) // Захватываем контроль над всеми страницами сразу
    );
});

// 3. Перехват запросов: Стратегия "Network First" для HTML, "Cache First" для остального
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Для HTML (index.html и корень) используем стратегию "Network First"
    // Это гарантирует, что мы всегда получим свежую версию страницы
    if (event.request.mode === 'navigate' || requestUrl.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // Если сеть ответила успешно, обновляем кэш
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
                        return networkResponse;
                    }
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    // Если сети нет, отдаем из кэша
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Для CSS, JS, картинок и данных используем "Cache First" (быстрая загрузка)
    // Но с фоллбэком на сеть, если файла нет в кэше
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(networkResponse => {
                    // Опционально: можно кэшировать и новые JS/CSS файлы, если они изменились
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return networkResponse;
                });
            })
    );
});
