import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageLoader } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';
import { terraApi } from '@/lib/api';
import { useTranslation } from 'react-i18next';

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 минут — реальный лимит Terra Widget

// Провайдеры, требующие OAuth авторизации (занимают больше времени)
const SLOW_OAUTH_PROVIDERS = ['WHOOP', 'OURA', 'GARMIN', 'WITHINGS', 'POLAR'];

export function TerraWidgetLoader() {
  const { t } = useTranslation('integrations');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSessionExpiredError, setIsSessionExpiredError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showPreparation, setShowPreparation] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const provider = searchParams.get('provider')?.toUpperCase();
  
  const isSlowProvider = provider && SLOW_OAUTH_PROVIDERS.includes(provider);

  const loadWidget = useCallback(async () => {
    setError(null);
    setIsSessionExpiredError(false);
    setRetrying(true);
    setShowPreparation(false);
    
    try {
      console.log('🔄 Loading Terra widget for provider:', provider);
      
      const { data, error } = await terraApi.generateWidget(provider || undefined);

      if (error) {
        console.error('❌ Terra widget error:', error);
        throw error;
      }
      
      if (!data?.url) {
        console.error('❌ No widget URL received:', data);
        throw new Error('No widget URL received');
      }

      console.log('✅ Redirecting to Terra widget:', data.url);
      setRedirecting(true);
      
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
        setError(t('widgetLoader.sessionExpiredError'));
      } else {
        setError(errorMessage);
      }
    } finally {
      setRetrying(false);
    }
  }, [provider, t]);

  const handleStartConnection = () => {
    loadWidget();
  };

  const handleRetry = () => {
    setShowPreparation(true);
  };

  const handleGoBack = () => {
    navigate('/fitness-data?tab=integrations');
  };

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Preparation screen - показываем ПЕРЕД началом авторизации
  if (showPreparation && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="text-6xl mb-4">⏱️</div>
          <h1 className="text-2xl font-bold">
            {t('widgetLoader.preparingConnection', { provider: provider || t('widgetLoader.device') })}
          </h1>
          
          <div className="space-y-4 text-left">
            {/* Warning about time limit */}
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <Clock className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong className="block mb-1">{t('widgetLoader.importantTimeLimit')}</strong>
                {t('widgetLoader.timeLimitDesc', { provider: provider || t('widgetLoader.provider') })}
              </AlertDescription>
            </Alert>

            {/* Preparation checklist */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="font-medium">{t('widgetLoader.beforeStarting')}:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>{t('widgetLoader.knowCredentials', { provider: provider || t('widgetLoader.app') })}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>{t('widgetLoader.stableConnection')}</span>
                </li>
                {isSlowProvider && (
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                    <span>{t('widgetLoader.loginFirst', { provider })}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Session expired tip */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>{t('widgetLoader.tip')}:</strong> {t('widgetLoader.sessionExpiredTip', { provider: provider || t('widgetLoader.provider') })}
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button 
              onClick={handleStartConnection} 
              size="lg" 
              className="w-full h-14 text-lg"
            >
              <Clock className="h-5 w-5 mr-2" />
              {t('widgetLoader.readyToStart')}
            </Button>
            <Button variant="ghost" onClick={handleGoBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('widgetLoader.backToIntegrations')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-6 max-w-md space-y-4">
          <div className="text-6xl mb-4">{isSessionExpiredError ? '⏱️' : '❌'}</div>
          <h2 className="text-xl font-semibold mb-2">
            {isSessionExpiredError ? t('widgetLoader.sessionExpired') : t('widgetLoader.loadError')}
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          
          {isSessionExpiredError && (
            <Alert className="text-left">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('widgetLoader.tip')}:</strong> {t('widgetLoader.sessionExpiredAdvice', { provider: provider || t('widgetLoader.app') })}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('widgetLoader.tryAgain')}
            </Button>
            <Button variant="outline" onClick={handleGoBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('widgetLoader.backToIntegrations')}
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
        message={redirecting ? t('widgetLoader.redirecting', { provider: provider || 'Terra' }) : t('widgetLoader.loadingWidget')}
      />
      
      {/* Countdown timer */}
      {redirecting && timeRemaining !== null && timeRemaining > 0 && (
        <div className="mt-8 max-w-md space-y-3">
          <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">{t('widgetLoader.timeRemaining')}:</p>
            <p className={`text-3xl font-mono font-bold ${timeRemaining < 60000 ? 'text-red-500' : 'text-primary'}`}>
              {formatTimeRemaining(timeRemaining)}
            </p>
            {timeRemaining < 60000 && (
              <p className="text-xs text-red-500 mt-1">{t('widgetLoader.hurryUp')}</p>
            )}
          </div>
          
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
              {t('widgetLoader.completeInWindow')}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
