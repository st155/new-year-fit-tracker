import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { updateServiceWorker } from '@/lib/pwa-utils';

export function RecoveryBar() {
  const [showRecovery, setShowRecovery] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    // Show recovery bar if page takes too long to load
    const timer = setTimeout(() => {
      setShowRecovery(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleRecover = async () => {
    setIsRecovering(true);
    
    try {
      // 1. Update service worker (sends SKIP_WAITING)
      await updateServiceWorker();
      
      // 2. Clear all caches via message to SW
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_ALL_CACHES'
        });
      }
      
      // 3. Wait a bit for cache clear, then reload
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Recovery failed:', error);
      // Force reload anyway
      window.location.reload();
    }
  };

  if (!showRecovery) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-4 max-w-md">
        <div className="flex-1">
          <p className="text-sm font-medium">Приложение не загружается?</p>
          <p className="text-xs text-muted-foreground">
            Попробуйте обновить кэш приложения
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={handleRecover}
          disabled={isRecovering}
          className="shrink-0"
        >
          {isRecovering ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Обновление...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowRecovery(false)}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
