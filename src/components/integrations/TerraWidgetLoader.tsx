import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageLoader } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, ArrowLeft, Clock } from 'lucide-react';

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 минут — рекомендуемый лимит

export function TerraWidgetLoader() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSessionExpiredError, setIsSessionExpiredError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const provider = searchParams.get('provider');

  const loadWidget = useCallback(async () => {
    setError(null);
    setIsSessionExpiredError(false);
    setRetrying(true);
    
    try {
      console.log('🔄 Loading Terra widget for provider:', provider);
      
      const { data, error } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'generate-widget-session' },
      });

      if (error) {
        console.error('❌ Terra widget error:', error);
        throw error;
      }
      
      if (!data?.url) {
        console.error('❌ No widget URL received:', data);
        throw new Error('No widget URL received');
      }

      console.log('✅ Redirecting to Terra widget:', data.url);
      
      // Запускаем таймер обратного отсчета
      const startTime = Date.now();
      setTimeRemaining(SESSION_TIMEOUT_MS);
      
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = SESSION_TIMEOUT_MS - elapsed;
        
        if (remaining <= 0) {
          clearInterval(timer);
          setTimeRemaining(0);
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);
      
      // Redirect to Terra widget
      window.location.replace(data.url);
    } catch (err: any) {
      console.error('❌ Widget load error:', err);
      const errorMessage = err.message || 'Failed to load Terra widget';
      
      // Проверяем на Session expired
      if (errorMessage.toLowerCase().includes('session') || 
          errorMessage.toLowerCase().includes('expired') ||
          errorMessage.toLowerCase().includes('timeout')) {
        setIsSessionExpiredError(true);
        setError('Сессия авторизации истекла. Это может произойти, если авторизация заняла больше 5 минут.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setRetrying(false);
    }
  }, [provider]);

  useEffect(() => {
    loadWidget();
  }, [loadWidget]);

  const handleRetry = () => {
    loadWidget();
  };

  const handleGoBack = () => {
    navigate('/fitness-data?tab=integrations');
  };

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-6 max-w-md space-y-4">
          <div className="text-6xl mb-4">{isSessionExpiredError ? '⏱️' : '❌'}</div>
          <h2 className="text-xl font-semibold mb-2">
            {isSessionExpiredError ? 'Сессия истекла' : 'Ошибка загрузки'}
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          
          {isSessionExpiredError && (
            <Alert className="text-left">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Совет:</strong> После нажатия "Попробовать снова" завершите авторизацию 
                в Whoop/другом приложении в течение 5 минут.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} disabled={retrying} className="w-full">
              {retrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Попробовать снова
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleGoBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться к интеграциям
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <PageLoader 
        size="lg" 
        message={provider ? `Подключение ${provider}...` : 'Загружаем Terra Widget...'}
      />
      
      {/* Предупреждение о лимите времени */}
      <div className="mt-8 max-w-md">
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Важно:</strong> Завершите авторизацию в течение 5 минут, 
            иначе сессия истечёт и потребуется повторная попытка.
            {timeRemaining !== null && timeRemaining > 0 && (
              <span className="block mt-1 font-mono text-primary">
                Осталось: {formatTimeRemaining(timeRemaining)}
              </span>
            )}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
