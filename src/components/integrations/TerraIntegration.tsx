import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Unlink,
  Activity,
  Zap,
  Heart,
  Moon,
  TrendingUp,
  Watch,
  ExternalLink,
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TerraProvider {
  name: string;
  connectedAt: string;
  lastSync?: string;
  terraUserId?: string | null;
}

interface TerraStatus {
  connected: boolean;
  providers: TerraProvider[];
}

const PROVIDER_ICONS: Record<string, any> = {
  WHOOP: Zap,
  GARMIN: Activity,
  FITBIT: Heart,
  OURA: Moon,
  WITHINGS: TrendingUp,
  POLAR: Heart,
  SUUNTO: Watch,
  PELOTON: Activity,
  GOOGLE: Activity,
};

const PROVIDER_NAMES: Record<string, string> = {
  WHOOP: 'Whoop',
  GARMIN: 'Garmin',
  FITBIT: 'Fitbit',
  OURA: 'Oura Ring',
  WITHINGS: 'Withings',
  POLAR: 'Polar',
  SUUNTO: 'Suunto',
  PELOTON: 'Peloton',
  ULTRAHUMAN: 'Ultrahuman',
  GOOGLE: 'Google Fit',
};

const AVAILABLE_PROVIDERS = [
  'WHOOP',
  'ULTRAHUMAN',
  'OURA',
  'GARMIN',
  'WITHINGS',
  'POLAR',
  'GOOGLE',
];

export function TerraIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TerraStatus>({ connected: false, providers: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);


  useEffect(() => {
    if (user) {
      // Проверяем, не возвращаемся ли мы из Terra widget
      const urlParams = new URLSearchParams(window.location.search);
      const hasSuccess = urlParams.has('success') || urlParams.has('reference_id');
      
      if (hasSuccess) {
        // Очищаем URL параметры
        window.history.replaceState({}, '', window.location.pathname);
        toast({
          title: 'Устройство подключено',
          description: 'Ваше устройство успешно подключено. Данные начнут синхронизироваться автоматически.',
        });
      }
      
      checkStatus();
    }
  }, [user]);

  const connectProvider = async (provider: string) => {
    if (!user) return;
    
    setConnectingProvider(provider);
    
    // Store provider in sessionStorage before opening widget
    sessionStorage.setItem('terra_last_provider', provider);
    console.log('📝 Stored provider in sessionStorage:', provider);
    
    console.log('🔗 Connecting to Terra for provider:', provider);
    
    // Определяем платформу для выбора стратегии открытия окна
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isMobile = isIOS || /Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    console.log('📱 Platform:', { isIOS, isMobile });
    
    // КРИТИЧНО: открываем popup СИНХРОННО (до любых await) чтобы избежать блокировки браузером
    let popup: Window | null = null;
    if (!isIOS) {
      popup = window.open('', '_blank', 'width=600,height=800,scrollbars=yes,resizable=yes,noopener=1,noreferrer=1');
      if (popup) {
        try {
          popup.document.write(`
            <html>
              <head>
                <title>Подключение Terra...</title>
                <meta name="referrer" content="no-referrer">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5;">
                <div style="text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
                  <h2 style="color: #333; margin: 0 0 8px 0;">Открываем Terra...</h2>
                  <p style="color: #666; margin: 0;">Подождите несколько секунд</p>
                </div>
              </body>
            </html>
          `);
        } catch (e) {
          console.warn('⚠️ Could not write to popup (cross-origin?)', e);
        }
      }
      console.log(popup ? '✅ Popup opened successfully' : '❌ Popup was blocked');
    }
    
    try {
      // Функция с ретраями и таймаутом
      const fetchWithRetry = async (retries = 1) => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            console.log(`🔄 Attempt ${attempt + 1}/${retries + 1}`);
            
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Request timeout')), 15000);
            });
            
            const requestPromise = supabase.functions.invoke('terra-integration', {
              body: { action: 'generate-widget-session' },
            });
            
            const result = await Promise.race([requestPromise, timeoutPromise]) as any;
            
            if (result.error) throw result.error;
            if (!result.data?.url) throw new Error('No widget URL received');
            
            return result.data;
          } catch (err) {
            if (attempt === retries) throw err;
            console.log(`⚠️ Attempt ${attempt + 1} failed, retrying in 1.5s...`);
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      };
      
      const data = await fetchWithRetry(1);
      const url = data.url;
      
      console.log('✅ Widget URL received:', url.substring(0, 50) + '...');
      
      // Стратегия открытия зависит от платформы
      if (isIOS) {
        // iOS: редирект в той же вкладке (попапы работают плохо)
        console.log('📱 iOS detected, redirecting in same tab...');
        toast({
          title: 'Открываем Terra...',
          description: 'Сейчас произойдет переход на страницу авторизации',
        });
        setTimeout(() => {
          window.location.assign(url);
        }, 500);
      } else if (popup && !popup.closed) {
        // Desktop/Android: используем уже открытый popup
        console.log('🪟 Redirecting popup to Terra URL...');
        popup.location.replace(url);
        
        toast({
          title: 'Окно авторизации открыто',
          description: 'Завершите авторизацию в открывшемся окне',
        });
        
        // Отслеживаем закрытие окна
        const checkClosed = setInterval(() => {
          if (popup!.closed) {
            clearInterval(checkClosed);
            setConnectingProvider(null);
            console.log('🔄 Auth window closed, checking connection status...');
            // Auto-refresh status after widget closes
            setTimeout(() => checkStatus(), 2000);
            setTimeout(() => checkStatus(), 5000);
            setTimeout(() => checkStatus(), 15000);
          }
        }, 1000);
      } else {
        // Fallback: попап был заблокирован, редиректим в той же вкладке
        console.log('⚠️ Popup blocked, fallback to same-tab redirect');
        toast({
          title: 'Открываем Terra...',
          description: 'Попап заблокирован браузером, открываем в этой вкладке',
        });
        setTimeout(() => {
          window.location.assign(url);
        }, 500);
      }
    } catch (error: any) {
      console.error('❌ Widget load error:', error);
      
      // Закрываем попап если он был открыт
      if (popup && !popup.closed) {
        popup.close();
        console.log('🔒 Closed popup due to error');
      }
      
      // Сохраняем попытку подключения в localStorage для retry
      try {
        localStorage.setItem('pending_terra_connection', JSON.stringify({
          userId: user?.id,
          timestamp: Date.now(),
          provider
        }));
        console.log('💾 Saved pending connection to localStorage');
      } catch (e) {
        console.warn('Failed to save pending connection:', e);
      }
      
      // Улучшенная обработка ошибок с детальной диагностикой
      let errorMessage = 'Не удалось подключить устройство';
      let errorTitle = 'Ошибка подключения';
      let showSupabaseStatus = false;
      let showCookieFix = false;
      
      if (error.message?.includes('400') || error.message?.includes('Bad Request') || error.message?.includes('Cookie Too Large')) {
        errorTitle = '400 Bad Request - Слишком много cookies';
        errorMessage = `Браузер отправляет слишком много данных (cookies) на сервер Terra.`;
        showCookieFix = true;
      } else if (error.message === 'Request timeout') {
        errorTitle = 'Превышено время ожидания';
        errorMessage = 'Сервер не ответил вовремя. Пожалуйста, попробуйте еще раз через несколько секунд.';
        showSupabaseStatus = true;
      } else if (error.message?.includes('502') || error.message?.includes('Bad Gateway')) {
        errorTitle = 'Сервер недоступен (502 Bad Gateway)';
        errorMessage = `Временные проблемы с инфраструктурой Supabase/Cloudflare. 
        
🔄 Что происходит:
• База данных временно недоступна из-за таймаутов
• Это известная проблема, обычно решается за 2-5 минут
• Ваши данные из ${PROVIDER_NAMES[provider]} продолжат синхронизироваться через webhooks в фоне

💡 Что делать:
• Подождите 2-5 минут и попробуйте снова
• Проверьте статус Supabase ниже
• Если проблема сохраняется >10 минут, обратитесь в поддержку`;
        showSupabaseStatus = true;
      } else if (error.message?.includes('Internal server error') || 
                 error.message?.includes('500') ||
                 error.message?.includes('Cloudflare') ||
                 error.message?.includes('Connection terminated') ||
                 error.message?.includes('timeout')) {
        errorTitle = 'Временная проблема сервера (500)';
        errorMessage = `База данных временно недоступна.

🔄 Автоматические механизмы:
• Webhooks продолжают работать в фоне
• Данные синхронизируются автоматически
• Retry механизм (3 попытки) активен

⏰ Рекомендуемые действия:
• Подождите 2-5 минут
• Проверьте status.supabase.com
• Попробуйте снова через несколько минут`;
        showSupabaseStatus = true;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: errorTitle,
        description: (
          <div className="space-y-2">
            <div className="whitespace-pre-line">{errorMessage}</div>
            {showCookieFix && (
              <div className="text-xs space-y-2 mt-3 p-2 bg-muted rounded">
                <div className="font-semibold">💡 Как исправить:</div>
                <div>1. Очистите cookies браузера (Настройки → Конфиденциальность)</div>
                <div>2. Попробуйте в режиме Инкогнито</div>
                <div>3. Или используйте альтернативный метод подключения (кнопка ниже)</div>
              </div>
            )}
            {showSupabaseStatus && (
              <a 
                href="https://status.supabase.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2"
              >
                <ExternalLink className="h-3 w-3" />
                Проверить статус Supabase
              </a>
            )}
          </div>
        ),
        variant: 'destructive',
        action: showCookieFix ? undefined : (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => connectProvider(provider)}
          >
            Повторить
          </Button>
        ),
      });
      setConnectingProvider(null);
    }
  };

  const connectViaRedirect = async (provider: string) => {
    if (!user) return;
    
    // Save current location to return after auth
    sessionStorage.setItem('terra_return_url', window.location.pathname);
    sessionStorage.setItem('terra_last_provider', provider);
    
    toast({
      title: 'Переходим на страницу авторизации...',
      description: 'Вы будете перенаправлены на Terra для подключения устройства',
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'generate-widget-session' },
      });
      
      if (error) throw error;
      if (!data?.url) throw new Error('No widget URL received');
      
      // Redirect in same tab (avoids cookie issues with popups)
      setTimeout(() => {
        window.location.href = data.url;
      }, 1000);
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
      setConnectingProvider(null);
    }
  };

  const checkStatus = async () => {
    if (!user) return;
    
    try {
      // Retry механизм для проверки статуса
      let tokens = null;
      let lastError = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { data, error } = await supabase
            .from('terra_tokens')
            .select('provider, created_at, last_sync_date, is_active, terra_user_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .abortSignal(AbortSignal.timeout(5000));

          if (error) throw error;
          tokens = data;
          break;
        } catch (e: any) {
          lastError = e;
          if (attempt < 2) {
            console.warn(`⚠️ Retry checkStatus ${attempt + 1}/3...`);
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      }

      if (lastError && !tokens) {
        console.error('Status check failed after retries:', lastError);
        throw lastError;
      }

      const providers: TerraProvider[] = (tokens || []).map(t => ({
        name: t.provider,
        connectedAt: t.created_at,
        lastSync: t.last_sync_date,
        terraUserId: t.terra_user_id,
      }));

      setStatus({
        connected: providers.length > 0,
        providers,
      });
    } catch (error: any) {
      console.error('Status check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatus = (provider: TerraProvider) => {
    if (!provider.terraUserId) {
      return { variant: 'secondary' as const, text: 'Ожидание данных от Terra...' };
    }
    
    if (!provider.lastSync) {
      return { variant: 'secondary' as const, text: 'Подключено, ожидание данных' };
    }
    
    const minutesSinceSync = (Date.now() - new Date(provider.lastSync).getTime()) / 60000;
    
    // Свежие данные (< 5 минут)
    if (minutesSinceSync < 5) {
      return { variant: 'success' as const, text: 'Только что синхронизировано' };
    }
    
    // Последние 24 часа
    if (minutesSinceSync < 1440) {
      return { variant: 'success' as const, text: 'Синхронизировано' };
    }
    
    // 1-3 дня
    if (minutesSinceSync < 4320) {
      return { variant: 'outline' as const, text: 'Требует синхронизации' };
    }
    
    // > 3 дней
    return { variant: 'destructive' as const, text: 'Устарело' };
  };

  const syncData = async () => {
    if (!user) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'sync-data' },
      });

      if (error) throw error;

      // Trigger job-worker immediately
      try {
        await supabase.functions.invoke('job-worker');
      } catch (e) {
        console.warn('Failed to trigger job-worker:', e);
      }

      console.log('✅ Sync result:', data);

      toast({
        title: 'Синхронизация запущена',
        description: 'Данные обновляются в фоновом режиме',
      });

      setTimeout(() => {
        checkStatus();
        queryClient.invalidateQueries({ queryKey: ['metrics'] });
        queryClient.invalidateQueries({ queryKey: ['system-status'] });
      }, 3000);
      
      // Очистка всех кэшей метрик
      localStorage.removeItem('fitness_metrics_cache');
      
      // Invalidate React Query caches
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['device-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['metric-values'] });
      
      window.dispatchEvent(new CustomEvent('terra-data-updated'));
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Ошибка синхронизации',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const disconnectProvider = async (provider: string) => {
    if (!user) return;

    // Оптимистичное обновление UI - сразу убираем провайдера из списка
    const previousStatus = status;
    setStatus(prev => ({
      ...prev,
      providers: prev.providers.filter(p => p.name !== provider)
    }));

    try {
      const { error } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'disconnect', provider },
      });

      if (error) throw error;

      // Очищаем кэши
      localStorage.removeItem('fitness_metrics_cache');
      
      // Инвалидируем связанные запросы
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['device-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['metric-values'] });

      toast({
        title: 'Устройство отключено',
        description: `${PROVIDER_NAMES[provider]} успешно отключен`,
      });

      // Обновляем статус
      await checkStatus();
    } catch (error: any) {
      console.error('Disconnect error:', error);
      
      // Откатываем оптимистичное обновление при ошибке
      setStatus(previousStatus);
      
      toast({
        title: 'Ошибка отключения',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      {/* Connected Providers */}
      {status.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Подключенные устройства
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={syncData} disabled={syncing} className="w-full">
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Синхронизация...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Синхронизировать данные
                </>
              )}
            </Button>

            <div className="space-y-2">
              {status.providers.map((provider) => {
                const Icon = PROVIDER_ICONS[provider.name] || Activity;
                return (
                  <div
                    key={provider.name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{PROVIDER_NAMES[provider.name]}</p>
                          <Badge variant={getConnectionStatus(provider).variant}>
                            {getConnectionStatus(provider).text}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Подключен {new Date(provider.connectedAt).toLocaleDateString('ru-RU')}
                        </p>
                        {provider.lastSync && (
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDistanceToNow(new Date(provider.lastSync), { 
                              addSuffix: true, 
                              locale: ru 
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnectProvider(provider.name)}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Подключить устройство</CardTitle>
          <CardDescription>
            Выберите ваш фитнес-трекер для подключения
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AVAILABLE_PROVIDERS.map((provider) => {
              const Icon = PROVIDER_ICONS[provider] || Activity;
              const isConnected = status.providers.some(p => p.name === provider);
              const isConnecting = connectingProvider === provider;
              
              return (
                <div key={provider} className="space-y-2">
                  <Button
                    variant={isConnected ? "secondary" : "outline"}
                    className="h-auto py-4 justify-start w-full"
                    onClick={() => !isConnected && connectProvider(provider)}
                    disabled={isConnected || isConnecting}
                  >
                    {isConnecting ? (
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5 mr-3" />
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium">{PROVIDER_NAMES[provider]}</p>
                      {isConnected ? (
                        <p className="text-xs text-muted-foreground">Подключено</p>
                      ) : isConnecting ? (
                        <p className="text-xs text-muted-foreground">Открываем окно...</p>
                      ) : null}
                    </div>
                    {isConnected ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <ExternalLink className="h-4 w-4 opacity-50" />
                    )}
                  </Button>
                  {isConnecting && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => connectViaRedirect(provider)}
                      className="w-full text-xs"
                    >
                      Альтернативный метод (Redirect)
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <Alert className="mt-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              При подключении вы будете перенаправлены на страницу авторизации устройства. После успешного подключения данные будут автоматически синхронизироваться каждые 6 часов
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
