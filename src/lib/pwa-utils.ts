/**
 * PWA Utilities
 * Функции для работы с Progressive Web App
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Регистрация Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker не поддерживается в этом браузере');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    console.log('Service Worker зарегистрирован:', registration.scope);

    // Проверяем обновления каждые 24 часа
    setInterval(() => {
      registration.update();
    }, 24 * 60 * 60 * 1000);

    // Слушаем обновления SW
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Новый SW готов, уведомляем пользователя
          notifyUserAboutUpdate();
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('Ошибка регистрации Service Worker:', error);
    return null;
  }
}

/**
 * Уведомляем пользователя об обновлении
 */
function notifyUserAboutUpdate() {
  const updateAvailable = new CustomEvent('sw-update-available');
  window.dispatchEvent(updateAvailable);
}

/**
 * Обновить Service Worker
 */
export function updateServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready.then((registration) => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });

  // Перезагружаем страницу после активации нового SW
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

/**
 * Проверить, установлено ли приложение
 */
export function isAppInstalled(): boolean {
  // Проверяем display mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Проверяем iOS standalone mode
  if ((navigator as any).standalone === true) {
    return true;
  }

  return false;
}

/**
 * Слушаем событие beforeinstallprompt
 */
export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    
    // Уведомляем приложение, что можно показать кнопку установки
    const installAvailable = new CustomEvent('pwa-install-available');
    window.dispatchEvent(installAvailable);
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA установлен');
    deferredPrompt = null;
    
    const installed = new CustomEvent('pwa-installed');
    window.dispatchEvent(installed);
  });
}

/**
 * Показать промпт установки
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('Промпт установки недоступен');
    return false;
  }

  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;
  console.log('Результат установки:', outcome);

  deferredPrompt = null;

  return outcome === 'accepted';
}

/**
 * Проверить, доступна ли установка
 */
export function isInstallAvailable(): boolean {
  return deferredPrompt !== null;
}

/**
 * Проверить статус онлайн/офлайн
 */
export function setupOnlineStatusListener(
  onOnline?: () => void,
  onOffline?: () => void
) {
  window.addEventListener('online', () => {
    console.log('Соединение восстановлено');
    onOnline?.();
  });

  window.addEventListener('offline', () => {
    console.log('Соединение потеряно');
    onOffline?.();
  });

  return navigator.onLine;
}

/**
 * Получить информацию о соединении (если доступно)
 */
export function getConnectionInfo() {
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;

  if (!connection) {
    return null;
  }

  return {
    effectiveType: connection.effectiveType, // '4g', '3g', '2g', 'slow-2g'
    downlink: connection.downlink, // Мбит/с
    rtt: connection.rtt, // round-trip time в мс
    saveData: connection.saveData, // экономия трафика включена
  };
}

/**
 * Очистить все кеши
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) return;

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map((cacheName) => caches.delete(cacheName))
  );

  console.log('Все кеши очищены');
}

/**
 * Получить размер кеша
 */
export async function getCacheSize(): Promise<number> {
  if (!('caches' in window)) return 0;

  let totalSize = 0;
  const cacheNames = await caches.keys();

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

/**
 * Форматировать размер в человекочитаемый формат
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Request Persistent Storage (для больших кешей)
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!('storage' in navigator) || !('persist' in navigator.storage)) {
    return false;
  }

  const isPersisted = await navigator.storage.persist();
  console.log('Persistent storage:', isPersisted ? 'разрешено' : 'не разрешено');

  return isPersisted;
}

/**
 * Проверить квоту хранилища
 */
export async function getStorageQuota() {
  if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  
  return {
    usage: estimate.usage || 0,
    quota: estimate.quota || 0,
    percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
  };
}

/**
 * Simple hash function for version checking
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Проверка новой версии приложения
 * Проверяет index.html на изменения и уведомляет пользователя
 */
export function setupVersionCheck() {
  const VERSION_KEY = 'app-version-hash';
  const CHECK_COOLDOWN_KEY = 'app-version-check-time';
  const COLD_START_KEY = 'app-cold-start-time';
  const COOLDOWN_MS = 60000; // Проверять не чаще раза в минуту
  const COLD_START_DELAY_MS = 90000; // Не проверять в течение 90 секунд после холодного старта
  
  // Записываем время холодного старта
  if (!sessionStorage.getItem(COLD_START_KEY)) {
    sessionStorage.setItem(COLD_START_KEY, Date.now().toString());
  }
  
  // Не работаем на dev-хостах
  const isDev = window.location.hostname.includes('.lovableproject.com') || 
                window.location.hostname === 'localhost';
  
  if (isDev) {
    console.log('✅ [Version] Version check disabled on dev host');
    return;
  }
  
  async function checkVersion() {
    try {
      // Cooldown для избежания частых проверок
      const lastCheck = localStorage.getItem(CHECK_COOLDOWN_KEY);
      if (lastCheck && (Date.now() - parseInt(lastCheck)) < COOLDOWN_MS) {
        return;
      }
      
      // Не проверяем в течение 90 секунд после холодного старта
      const coldStartTime = sessionStorage.getItem(COLD_START_KEY);
      if (coldStartTime && (Date.now() - parseInt(coldStartTime)) < COLD_START_DELAY_MS) {
        return;
      }
      
      localStorage.setItem(CHECK_COOLDOWN_KEY, Date.now().toString());
      
      // Fetch index.html с обходом кэша
      const response = await fetch('/', { 
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) return;
      
      const html = await response.text();
      const currentHash = hashString(html);
      const cachedHash = localStorage.getItem(VERSION_KEY);
      
      if (cachedHash && cachedHash !== currentHash) {
        console.log('🆕 [Version] New version detected!');
        
        // Диспатчим событие вместо confirm
        const updateEvent = new CustomEvent('app-update-available', {
          detail: { currentHash, cachedHash }
        });
        window.dispatchEvent(updateEvent);
        
        // Сохраняем новый хэш для следующей проверки
        localStorage.setItem(VERSION_KEY, currentHash);
      } else if (!cachedHash) {
        // Первый запуск - сохраняем текущую версию
        localStorage.setItem(VERSION_KEY, currentHash);
        console.log('✅ [Version] Initial version saved');
      }
    } catch (error) {
      console.error('⚠️ [Version] Failed to check version:', error);
    }
  }
  
  // Проверяем при возвращении на страницу
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkVersion();
    }
  });
  
  // Проверяем при фокусе окна
  window.addEventListener('focus', () => {
    checkVersion();
  });
  
  console.log('✅ [Version] Version check listener setup complete');
}

/**
 * Принудительная проверка версии (для ручного вызова)
 */
export async function forceVersionCheck(): Promise<boolean> {
  try {
    const response = await fetch('/', { 
      cache: 'no-cache',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) return false;
    
    const html = await response.text();
    const currentHash = hashString(html);
    const cachedHash = localStorage.getItem('app-version-hash');
    
    return cachedHash !== null && cachedHash !== currentHash;
  } catch (error) {
    console.error('Failed to check version:', error);
    return false;
  }
}
