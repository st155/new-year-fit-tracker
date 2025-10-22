const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `fitness-tracker-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `fitness-tracker-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `fitness-tracker-images-${CACHE_VERSION}`;

// Статические ресурсы для кеширования при установке
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Время жизни кеша (в миллисекундах)
const CACHE_LIFETIME = {
  images: 7 * 24 * 60 * 60 * 1000, // 7 дней
  api: 5 * 60 * 1000, // 5 минут
  static: 30 * 24 * 60 * 60 * 1000, // 30 дней
};

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
  
  // Немедленно активируем новый SW
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Удаляем старые версии кеша
              return cacheName.startsWith('fitness-tracker-') &&
                     cacheName !== STATIC_CACHE &&
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== IMAGE_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Берем контроль над всеми клиентами
        return self.clients.claim();
      })
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
      console.log('[SW] Network first failed, trying cache:', error.message);
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
      url.pathname.startsWith('/src/') ||
      url.pathname.includes('__vite')) {
    return;
  }

  // ⚡ ИСКЛЮЧАЕМ Supabase REST/Realtime из кэширования
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/rest/v1/')) {
    console.log('⚡ [SW] Bypassing cache for Supabase:', url.pathname);
    return; // Просто пропускаем без кэширования
  }

  // Изображения - Stale While Revalidate
  if (request.destination === 'image') {
    event.respondWith(strategies.staleWhileRevalidate(request, IMAGE_CACHE));
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
    event.respondWith(strategies.cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML страницы - Network First
  if (request.destination === 'document') {
    event.respondWith(strategies.networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // Все остальное - Network First
  event.respondWith(strategies.networkFirst(request, DYNAMIC_CACHE));
});

// Background Sync для оффлайн действий
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync:', event.tag);
  
  if (event.tag === 'sync-measurements') {
    event.waitUntil(syncMeasurements());
  }
  
  if (event.tag === 'sync-workouts') {
    event.waitUntil(syncWorkouts());
  }
});

async function syncMeasurements() {
  // Реализация синхронизации измерений
  console.log('[SW] Syncing measurements...');
  // TODO: Получить из IndexedDB и отправить на сервер
}

async function syncWorkouts() {
  // Реализация синхронизации тренировок
  console.log('[SW] Syncing workouts...');
  // TODO: Получить из IndexedDB и отправить на сервер
}

// Push уведомления
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
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
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

// Периодическая синхронизация (если поддерживается)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic Sync:', event.tag);
  
  if (event.tag === 'update-fitness-data') {
    event.waitUntil(updateFitnessData());
  }
});

async function updateFitnessData() {
  console.log('[SW] Updating fitness data in background...');
  // TODO: Проверить обновления от интеграций
}

// Обработка сообщений от клиентов
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
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
