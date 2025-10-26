import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { updateServiceWorker } from '@/lib/pwa-utils';

export function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setShowUpdate(true);
    };

    // Listen for both SW updates and app version updates
    window.addEventListener('sw-update-available', handleUpdateAvailable);
    window.addEventListener('app-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
      window.removeEventListener('app-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = async () => {
    // For app updates, clear caches and reload
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (err) {
        console.warn('Failed to clear caches:', err);
      }
    }
    
    // Try to update service worker if available
    updateServiceWorker();
    
    // Reload after a short delay to ensure SW update propagates
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className="fixed top-20 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-slide-in-right">
      <Alert className="glass-card border-primary/20 shadow-glow">
        <RefreshCw className="h-4 w-4" />
        <AlertTitle>Доступно обновление</AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p className="text-sm">
            Новая версия приложения готова к использованию
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleUpdate}
              size="sm"
              className="bg-gradient-primary ripple"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Обновить
            </Button>
            <Button
              onClick={() => setShowUpdate(false)}
              size="sm"
              variant="ghost"
            >
              Позже
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
