# Progressive Web App (PWA)

Этот документ описывает PWA функциональность проекта.

## Содержание

1. [Service Worker](#service-worker)
2. [Manifest](#manifest)
3. [Install Prompt](#install-prompt)
4. [Offline Support](#offline-support)
5. [Caching Strategies](#caching-strategies)
6. [Background Sync](#background-sync)
7. [Push Notifications](#push-notifications)
8. [Best Practices](#best-practices)

---

## Service Worker

### Регистрация

Service Worker регистрируется автоматически при запуске приложения:

```tsx
import { registerServiceWorker } from "@/lib/pwa-utils";

useEffect(() => {
  registerServiceWorker();
}, []);
```

### Возможности

- **Кеширование статических ресурсов** - JS, CSS, шрифты, изображения
- **Оффлайн поддержка** - приложение работает без интернета
- **Background Sync** - синхронизация данных в фоне
- **Push уведомления** - получение уведомлений
- **Автообновление** - проверка новых версий каждые 24 часа

### Файл

`public/service-worker.js` - главный Service Worker

---

## Manifest

### manifest.json

Файл манифеста определяет, как приложение выглядит при установке:

```json
{
  "name": "Fitness Tracker Pro",
  "short_name": "Fitness Pro",
  "theme_color": "#00ffff",
  "background_color": "#10121A",
  "display": "standalone",
  "start_url": "/"
}
```

### Иконки

Требуются иконки следующих размеров:
- 72x72, 96x96, 128x128, 144x144, 152x152
- 192x192, 384x384, 512x512

**Расположение:** `public/icon-{size}.png`

### Shortcuts (быстрые действия)

Приложение поддерживает shortcuts для быстрого доступа:

```json
{
  "shortcuts": [
    {
      "name": "Добавить тренировку",
      "url": "/dashboard?action=add-workout"
    },
    {
      "name": "Прогресс",
      "url": "/progress"
    },
    {
      "name": "Челленджи",
      "url": "/challenges"
    }
  ]
}
```

### Share Target

Поддержка Web Share API для шэринга фотографий:

```json
{
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "files": [
        {
          "name": "photos",
          "accept": ["image/*"]
        }
      ]
    }
  }
}
```

---

## Install Prompt

### InstallPrompt Component

Компонент для предложения установки приложения:

```tsx
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

function App() {
  return (
    <>
      <YourApp />
      <InstallPrompt />
    </>
  );
}
```

### Возможности

- **Автоматическое появление** - через 3 секунды после загрузки
- **Красивый UI** - с анимациями и описанием преимуществ
- **Адаптивность** - работает на всех устройствах
- **Dismissable** - пользователь может отклонить

### Проверка установки

```tsx
import { isAppInstalled } from "@/lib/pwa-utils";

if (isAppInstalled()) {
  console.log('Приложение уже установлено');
}
```

### Показать промпт вручную

```tsx
import { showInstallPrompt, isInstallAvailable } from "@/lib/pwa-utils";

if (isInstallAvailable()) {
  const accepted = await showInstallPrompt();
  console.log('Установка:', accepted ? 'принята' : 'отклонена');
}
```

---

## Update Prompt

### UpdatePrompt Component

Компонент для уведомления об обновлениях:

```tsx
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";

function App() {
  return (
    <>
      <YourApp />
      <UpdatePrompt />
    </>
  );
}
```

### Как работает

1. Service Worker проверяет обновления каждые 24 часа
2. Когда новая версия готова, появляется UpdatePrompt
3. Пользователь нажимает "Обновить"
4. Страница перезагружается с новой версией

### Ручное обновление

```tsx
import { updateServiceWorker } from "@/lib/pwa-utils";

// Обновить немедленно
updateServiceWorker();
```

---

## Offline Support

### Стратегии кеширования

Service Worker использует разные стратегии для разных типов ресурсов:

#### 1. Network First (для API)

```javascript
// Сначала пытаемся загрузить с сервера
// При неудаче - из кеша
strategies.networkFirst(request, DYNAMIC_CACHE, timeout);
```

**Где используется:**
- Supabase API запросы
- HTML страницы
- Динамические данные

#### 2. Cache First (для статики)

```javascript
// Сначала ищем в кеше
// Если нет - загружаем с сервера
strategies.cacheFirst(request, STATIC_CACHE);
```

**Где используется:**
- JavaScript файлы
- CSS стили
- Шрифты

#### 3. Stale While Revalidate (для изображений)

```javascript
// Отдаем из кеша немедленно
// Одновременно обновляем кеш в фоне
strategies.staleWhileRevalidate(request, IMAGE_CACHE);
```

**Где используется:**
- Изображения
- Аватары
- Прогресс фото

### Время жизни кеша

```javascript
const CACHE_LIFETIME = {
  images: 7 * 24 * 60 * 60 * 1000,  // 7 дней
  api: 5 * 60 * 1000,                // 5 минут
  static: 30 * 24 * 60 * 60 * 1000, // 30 дней
};
```

### Offline страница

Если запрошенная страница недоступна оффлайн, показывается `/offline.html`

---

## Caching Strategies

### Очистка кеша

```tsx
import { clearAllCaches } from "@/lib/pwa-utils";

// Очистить все кеши
await clearAllCaches();
```

### Размер кеша

```tsx
import { getCacheSize, formatBytes } from "@/lib/pwa-utils";

const size = await getCacheSize();
console.log('Размер кеша:', formatBytes(size));
```

### Квота хранилища

```tsx
import { getStorageQuota } from "@/lib/pwa-utils";

const quota = await getStorageQuota();
console.log('Использовано:', quota.percentage + '%');
```

### Persistent Storage

```tsx
import { requestPersistentStorage } from "@/lib/pwa-utils";

// Запросить постоянное хранилище
const granted = await requestPersistentStorage();
```

---

## Background Sync

### Регистрация sync задачи

```javascript
// В Service Worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-measurements') {
    event.waitUntil(syncMeasurements());
  }
});
```

### Использование в приложении

```tsx
// Регистрируем sync при сохранении оффлайн
if ('serviceWorker' in navigator && 'SyncManager' in window) {
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register('sync-measurements');
}
```

### Периодическая синхронизация

```javascript
// Проверяем каждые 12 часов (если браузер поддерживает)
if ('periodicSync' in registration) {
  await registration.periodicSync.register('update-fitness-data', {
    minInterval: 12 * 60 * 60 * 1000
  });
}
```

---

## Push Notifications

### Подписка на уведомления

```tsx
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  
  // Отправляем subscription на сервер
  await savePushSubscription(subscription);
}
```

### Обработка в Service Worker

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      vibrate: [200, 100, 200],
    })
  );
});
```

### Клики по уведомлениям

```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
```

---

## Network Status

### Слушаем online/offline

```tsx
import { setupOnlineStatusListener } from "@/lib/pwa-utils";

setupOnlineStatusListener(
  () => console.log('Online'),
  () => console.log('Offline')
);
```

### Информация о соединении

```tsx
import { getConnectionInfo } from "@/lib/pwa-utils";

const info = getConnectionInfo();
if (info) {
  console.log('Тип:', info.effectiveType); // '4g', '3g', etc.
  console.log('Скорость:', info.downlink, 'Mbps');
  console.log('Латентность:', info.rtt, 'ms');
  console.log('Data Saver:', info.saveData);
}
```

### Адаптивная загрузка

```tsx
const connection = getConnectionInfo();

// Загружаем изображения высокого качества только на быстром соединении
const imageQuality = 
  connection?.effectiveType === '4g' ? 'high' : 'medium';
```

---

## Best Practices

### 1. Размер кеша

```tsx
// ✅ Правильно - кешируем только необходимое
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
];

// ❌ Неправильно - кешируем слишком много
const STATIC_ASSETS = [
  /* сотни файлов */
];
```

### 2. Версионирование

```tsx
// ✅ Правильно - используем версии
const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `app-static-${CACHE_VERSION}`;

// ❌ Неправильно - без версий
const STATIC_CACHE = 'app-static';
```

### 3. Cleanup старых кешей

```javascript
// ✅ Правильно - удаляем старые версии
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => 
      Promise.all(
        names
          .filter(name => name.startsWith('app-') && name !== STATIC_CACHE)
          .map(name => caches.delete(name))
      )
    )
  );
});
```

### 4. Timeout для network requests

```tsx
// ✅ Правильно - используем timeout
const response = await Promise.race([
  fetch(request),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 5000)
  )
]);

// ❌ Неправильно - без timeout
const response = await fetch(request);
```

### 5. Error handling

```tsx
// ✅ Правильно - обрабатываем ошибки
try {
  const response = await fetch(request);
  if (!response.ok) throw new Error('Network error');
  return response;
} catch (error) {
  return caches.match(request) || new Response('Offline');
}

// ❌ Неправильно - без обработки
const response = await fetch(request);
return response;
```

---

## Тестирование PWA

### Chrome DevTools

1. **Application tab** → Service Workers
   - Проверить статус SW
   - Обновить SW
   - Симулировать offline

2. **Application tab** → Cache Storage
   - Посмотреть закешированные ресурсы
   - Очистить кеш

3. **Lighthouse**
   - Запустить PWA аудит
   - Проверить Progressive Web App score

### Тестирование установки

```bash
# Проверить manifest
https://yourdomain.com/manifest.json

# Проверить service worker
https://yourdomain.com/service-worker.js
```

### Тестирование offline

1. Chrome DevTools → Network → Offline
2. Попробовать навигацию по приложению
3. Проверить, что кешированные данные доступны

---

## Интеграция

### index.html

Добавьте ссылку на manifest:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#00ffff">
<link rel="apple-touch-icon" href="/icon-192x192.png">
```

### App.tsx

```tsx
import { registerServiceWorker } from "@/lib/pwa-utils";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";

function App() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <>
      <YourApp />
      <InstallPrompt />
      <UpdatePrompt />
    </>
  );
}
```

---

## Связанные файлы

- `public/service-worker.js` - Service Worker
- `public/manifest.json` - PWA Manifest
- `src/lib/pwa-utils.ts` - PWA утилиты
- `src/components/pwa/InstallPrompt.tsx` - промпт установки
- `src/components/pwa/UpdatePrompt.tsx` - промпт обновления

## Связанные документы

- **LOADING_STATES.md** - skeleton screens для offline
- **ERROR_HANDLING.md** - обработка network errors
- **PERFORMANCE_OPTIMIZATION.md** - оптимизация загрузки
