import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface SupabaseConnectionCheckProps {
  children: React.ReactNode;
}

export function SupabaseConnectionCheck({ children }: SupabaseConnectionCheckProps) {
  const { t } = useTranslation('common');
  const [isChecking, setIsChecking] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const checkConnection = async () => {
    console.log('🔌 [SupabaseConnectionCheck] Testing connection...', {
      attempt: retryCount + 1,
      timestamp: new Date().toISOString()
    });

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );

      const pingPromise = supabase
        .from('profiles')
        .select('user_id')
        .limit(1);

      await Promise.race([pingPromise, timeoutPromise]);

      console.log('✅ [SupabaseConnectionCheck] Connection successful');
      setIsConnected(true);
      setError(null);
      setIsChecking(false);
    } catch (err) {
      const error = err as Error;
      console.error('❌ [SupabaseConnectionCheck] Connection failed:', {
        message: error.message,
        attempt: retryCount + 1
      });

      setIsConnected(false);
      setError(error.message);

      // Auto-retry up to 3 times
      if (retryCount < 3) {
        console.log(`🔄 [SupabaseConnectionCheck] Retrying in 2 seconds... (${retryCount + 1}/3)`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 2000);
      } else {
        setIsChecking(false);
      }
    }
  };

  useEffect(() => {
    checkConnection();
  }, [retryCount]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="animate-spin mx-auto">
            <Wifi className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">{t('connection.connecting')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('connection.attempt', { current: retryCount + 1, total: 4 })}
          </p>
        </div>
      </div>
    );
  }

  if (!isConnected && error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">{t('connection.failed')}</h3>
              <p className="text-sm mb-4">{error}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <WifiOff className="h-3 w-3" />
                <span>{t('connection.checkInternet')}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setRetryCount(0);
                  setIsChecking(true);
                }}
                size="sm"
                className="flex-1"
              >
                {t('connection.retry')}
              </Button>
              <Button
                onClick={() => window.location.reload()}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                {t('connection.reload')}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
