const CACHE_VERSION = 'v2.0.0';
const CACHE_NAMES = {
  STATIC: `fitness-tracker-static-${CACHE_VERSION}`,
  DYNAMIC: `fitness-tracker-dynamic-${CACHE_VERSION}`,
  IMAGES: `fitness-tracker-images-${CACHE_VERSION}`,
  API: `fitness-tracker-api-${CACHE_VERSION}`,
};

// Критические роуты для pre-cache
const CRITICAL_ROUTES = [
  '/',
  '/progress',
  '/goals',
  '/habits',
];

// Статические ресурсы для кеширования при установке
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  ...CRITICAL_ROUTES,
];

// Время жизни кеша (в миллисекундах)
const CACHE_LIFETIME = {
  images: 7 * 24 * 60 * 60 * 1000, // 7 дней
  api: 5 * 60 * 1000, // 5 минут
  static: 30 * 24 * 60 * 60 * 1000, // 30 дней
};

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Pre-cache static assets
      caches.open(CACHE_NAMES.STATIC)
        .then((cache) => cache.addAll(STATIC_ASSETS))
        .catch(() => {}), // Silent fail
      
      // Pre-cache critical routes
      caches.open(CACHE_NAMES.DYNAMIC)
        .then((cache) => cache.addAll(CRITICAL_ROUTES))
        .catch(() => {}),
    ])
  );
  
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('fitness-tracker-') &&
                     !Object.values(CACHE_NAMES).includes(cacheName);
            })
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Стратегии кеширования
const strategies = {
  // Network First - для API запросов
  networkFirst: async (request, cacheName, timeout = 5000) => {
    try {
      const networkPromise = fetch(request);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      );

      const response = await Promise.race([networkPromise, timeoutPromise]);
      
      if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
      
      return response;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Если нет кеша, возвращаем офлайн страницу или ошибку
      if (request.destination === 'document') {
        return caches.match('/offline.html') || new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
      
      throw error;
    }
  },

  // Cache First - для статических ресурсов
  cacheFirst: async (request, cacheName) => {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Проверяем возраст кеша
      const cacheDate = new Date(cachedResponse.headers.get('date'));
      const now = new Date();
      const age = now - cacheDate;
      
      if (age < CACHE_LIFETIME.static) {
        return cachedResponse;
      }
    }
    
    try {
      const response = await fetch(request);
      
      if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
      
      return response;
    } catch (error) {
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  },

  // Stale While Revalidate - для изображений
  staleWhileRevalidate: async (request, cacheName) => {
    const cachedResponse = await caches.match(request);
    
    const fetchPromise = fetch(request)
      .then((response) => {
        if (response.ok) {
          const cache = caches.open(cacheName);
          cache.then((c) => c.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => null);
    
    return cachedResponse || fetchPromise;
  },
};

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Игнорируем не-GET запросы
  if (request.method !== 'GET') {
    return;
  }

  // Игнорируем chrome extensions и другие схемы
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip Vite dev/HMR requests
  if (url.pathname.startsWith('/@vite') ||
      url.pathname.startsWith('/@react-refresh') ||
      url.pathname.startsWith('/@id/') ||
      url.pathname.startsWith('/node_modules/.vite/') ||
      url.pathname.startsWith('/vite/') ||
      url.pathname.startsWith('/src/') ||
      url.pathname.includes('__vite')) {
    return;
  }

  // ⚡ ИСКЛЮЧАЕМ Supabase REST/Realtime/Auth из кэширования
  if (url.hostname.includes('supabase.co')) {
    // НЕ кешировать realtime/auth вообще
    if (url.pathname.includes('/realtime') || url.pathname.includes('/auth')) {
      return;
    }
    
    // Для REST API используем Stale-While-Revalidate с коротким временем
    if (url.pathname.startsWith('/rest/v1/client_unified_metrics')) {
      event.respondWith(
        caches.open(CACHE_NAMES.API).then(async (cache) => {
          const cachedResponse = await cache.match(request);
          
          const fetchPromise = fetch(request).then(response => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
          
          // Вернуть кеш сразу, обновить в фоне
          return cachedResponse || fetchPromise;
        })
      );
      return;
    }
    
    // Остальные Supabase запросы - network only
    return;
  }

  // Изображения - Stale While Revalidate
  if (request.destination === 'image') {
    event.respondWith(strategies.staleWhileRevalidate(request, CACHE_NAMES.IMAGES));
    return;
  }

  // Статические ресурсы - Cache First
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(strategies.cacheFirst(request, CACHE_NAMES.STATIC));
    return;
  }

  // HTML страницы - Network First
  if (request.destination === 'document') {
    event.respondWith(strategies.networkFirst(request, CACHE_NAMES.DYNAMIC));
    return;
  }

  // Все остальное - Network First
  event.respondWith(strategies.networkFirst(request, CACHE_NAMES.DYNAMIC));
});

// Background Sync для оффлайн действий
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-measurements') {
    event.waitUntil(syncMeasurements());
  }
  
  if (event.tag === 'sync-workouts') {
    event.waitUntil(syncWorkouts());
  }
});

async function syncMeasurements() {
  // TODO: Получить из IndexedDB и отправить на сервер
}

async function syncWorkouts() {
  // TODO: Получить из IndexedDB и отправить на сервер
}

// Push уведомления
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Fitness Tracker';
  const options = {
    body: data.body || 'У вас есть новое уведомление',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: data.tag || 'default',
    data: data.url || '/',
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

// Периодическая синхронизация (если поддерживается)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-fitness-data') {
    event.waitUntil(updateFitnessData());
  }
});

async function updateFitnessData() {
  // TODO: Проверить обновления от интеграций
}

// Обработка сообщений от клиентов
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAMES.DYNAMIC)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
    );
  }
});
