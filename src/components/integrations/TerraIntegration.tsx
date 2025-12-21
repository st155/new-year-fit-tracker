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
  Clock,
  Dumbbell,
  Trash2,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useForceTerraSync } from '@/hooks/useForceTerraSync';

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

interface InactiveProvider {
  name: string;
  terraUserId: string | null;
  deactivatedAt: string;
}

export function TerraIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TerraStatus>({ connected: false, providers: [] });
  const [inactiveProviders, setInactiveProviders] = useState<InactiveProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [reactivatingProvider, setReactivatingProvider] = useState<string | null>(null);
  const forceSyncMutation = useForceTerraSync();


  // Listen for messages from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'terra-connection-result') {
        console.log('📨 Received result from popup:', event.data);
        
        const providerName = PROVIDER_NAMES[event.data.provider] || event.data.provider;
        
        if (event.data.success) {
          toast({
            title: 'Устройство подключено!',
            description: `${providerName} успешно подключен.`,
          });
        } else {
          toast({
            title: 'Ошибка подключения',
            description: event.data.error || 'Не удалось подключить устройство',
            variant: 'destructive',
          });
        }
        
        // Update status
        setConnectingProvider(null);
        checkStatus();
        checkInactiveProviders();
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast]);

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
      checkInactiveProviders();
    }
  }, [user]);

  const connectProvider = async (provider: string) => {
    if (!user) return;
    
    setConnectingProvider(provider);
    
    // Store provider in sessionStorage for callback handling
    sessionStorage.setItem('terra_last_provider', provider);
    console.log('📝 Stored provider in sessionStorage:', provider);
    
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    try {
      // Get Terra widget URL FIRST, before opening any window
      console.log('🔄 Fetching Terra widget URL...');
      
      const { data, error } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'generate-widget-session' },
      });
      
      if (error) throw error;
      if (!data?.url) throw new Error('No widget URL received');
      
      console.log('✅ Got Terra widget URL:', data.url);
      
      if (isIOS) {
        // iOS: redirect in same tab (popup blockers are aggressive)
        console.log('📱 iOS detected, redirecting directly to Terra widget...');
        sessionStorage.setItem('terra_return_url', window.location.pathname);
        window.location.assign(data.url);
        return;
      }
      
      // Desktop/Android: open Terra widget DIRECTLY in new window
      console.log('🖥️ Desktop/Android detected, opening Terra widget directly');
      
      const popup = window.open(
        data.url,
        '_blank',
        'width=600,height=800,scrollbars=yes,resizable=yes,popup=yes'
      );
      
      if (popup) {
        console.log('✅ Terra widget opened directly in new window');
        
        toast({
          title: 'Окно авторизации открыто',
          description: 'Завершите авторизацию в открывшемся окне. У вас есть 5 минут.',
        });
        
        // Track when popup closes
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            setConnectingProvider(null);
            console.log('🔄 Auth window closed, checking status...');
            
            // Check status after delays to allow webhook processing
            setTimeout(() => checkStatus(), 2000);
            setTimeout(() => checkStatus(), 5000);
            setTimeout(() => checkInactiveProviders(), 5000);
          }
        }, 1000);
      } else {
        // Popup blocked - fallback to same-tab redirect
        console.log('⚠️ Popup blocked by browser, falling back to redirect');
        
        toast({
          title: 'Попап заблокирован',
          description: 'Открываем авторизацию в этой вкладке',
        });
        
        sessionStorage.setItem('terra_return_url', window.location.pathname);
        setTimeout(() => {
          window.location.assign(data.url);
        }, 500);
      }
    } catch (error: any) {
      console.error('❌ Failed to get Terra widget URL:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось получить ссылку для авторизации',
        variant: 'destructive',
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

  const checkInactiveProviders = async () => {
    if (!user) return;
    
    try {
      const { data: tokens, error } = await supabase
        .from('terra_tokens')
        .select('provider, terra_user_id, updated_at')
        .eq('user_id', user.id)
        .eq('is_active', false);

      if (error) throw error;

      const inactive: InactiveProvider[] = (tokens || [])
        .filter(t => t.terra_user_id) // Only show if we have a terra_user_id (can be reactivated)
        .map(t => ({
          name: t.provider,
          terraUserId: t.terra_user_id,
          deactivatedAt: t.updated_at,
        }));

      setInactiveProviders(inactive);
      console.log('📋 Inactive providers found:', inactive.length);
    } catch (error: any) {
      console.error('Error checking inactive providers:', error);
    }
  };

  const reactivateProvider = async (provider: string) => {
    if (!user) return;
    
    setReactivatingProvider(provider);
    
    try {
      // Шаг 1: Автоматически полностью деавторизуем старый токен
      console.log('🧹 Auto-deauthenticating before reconnect:', provider);
      
      toast({
        title: 'Подготовка к переподключению...',
        description: 'Удаляем старый токен авторизации',
      });
      
      const { error: deauthError } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'deauthenticate-user', provider },
      });
      
      if (deauthError) {
        console.warn('⚠️ Deauth before reconnect failed:', deauthError);
        throw new Error('Не удалось удалить старый токен');
      }
      
      // Шаг 2: Ждём 3 секунды, чтобы Whoop/провайдер очистил OAuth кэш
      console.log('⏳ Waiting 3s for provider OAuth cache to clear...');
      
      toast({
        title: 'Очистка сессии...',
        description: 'Подождите 3 секунды для синхронизации',
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Шаг 3: Подключаем заново через Terra Widget
      console.log('🔄 Starting fresh connection...');
      await connectProvider(provider);
      
      // Обновляем списки
      await checkStatus();
      await checkInactiveProviders();
      
    } catch (error: any) {
      console.error('Reactivate error:', error);
      toast({
        title: 'Ошибка переподключения',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setReactivatingProvider(null);
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

  // Полная деавторизация (удаление и на Terra, и локально)
  const deauthenticateProvider = async (provider: string) => {
    if (!user) return;
    
    const confirmed = window.confirm(
      `Вы уверены, что хотите полностью удалить подключение ${PROVIDER_NAMES[provider]}?\n\nЭто отзовёт OAuth-токен на стороне ${PROVIDER_NAMES[provider]} и удалит запись. После этого вы сможете подключить устройство заново.`
    );
    
    if (!confirmed) return;

    try {
      const { error } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'deauthenticate-user', provider },
      });

      if (error) throw error;

      // Очищаем кэши
      localStorage.removeItem('fitness_metrics_cache');
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['device-metrics'] });

      toast({
        title: 'Устройство полностью удалено',
        description: `${PROVIDER_NAMES[provider]} удалён. Теперь можно подключить заново.`,
      });

      await checkStatus();
      await checkInactiveProviders();
    } catch (error: any) {
      console.error('Deauthenticate error:', error);
      toast({
        title: 'Ошибка удаления',
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button onClick={syncData} disabled={syncing} variant="default">
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

              <Button 
                onClick={() => {
                  status.providers.forEach(provider => {
                    forceSyncMutation.mutate({
                      provider: provider.name,
                      dataType: 'activity'
                    });
                  });
                }}
                disabled={forceSyncMutation.isPending}
                variant="outline"
                className="gap-2"
              >
                {forceSyncMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Dumbbell className="w-4 h-4" />
                    Синхронизировать тренировки (14 дней)
                  </>
                )}
              </Button>
            </div>


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

      {/* Inactive Providers - Can be reactivated */}
      {inactiveProviders.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              Отключенные устройства
            </CardTitle>
            <CardDescription>
              Эти устройства были ранее подключены. Нажмите "Активировать" для автоматического переподключения.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {inactiveProviders.map((provider) => {
              const Icon = PROVIDER_ICONS[provider.name] || Activity;
              const isReactivating = reactivatingProvider === provider.name;
              
              return (
                <div
                  key={provider.name}
                  className="flex items-center justify-between p-3 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-950/20"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium">{PROVIDER_NAMES[provider.name]}</p>
                      <p className="text-xs text-muted-foreground">
                        Отключен • Можно переподключить без повторной авторизации
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reactivateProvider(provider.name)}
                      disabled={isReactivating}
                      className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/30"
                    >
                      {isReactivating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Активация...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Активировать
                        </>
                      )}
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deauthenticateProvider(provider.name)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Удалить
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Полностью удалить токен авторизации. После этого подключите устройство заново для решения проблем с синхронизацией.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Подключить устройство</CardTitle>
          <CardDescription>
            Подключите фитнес-трекер для автоматической синхронизации данных
          </CardDescription>
        </CardHeader>
        
        {/* Предупреждение о лимите времени */}
        <CardContent className="pt-0 pb-2">
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Важно:</strong> После нажатия кнопки подключения завершите авторизацию 
              в приложении устройства в течение <strong>5 минут</strong>. 
              Если увидите ошибку "Session expired" — нажмите "Попробовать снова".
            </AlertDescription>
          </Alert>
        </CardContent>
        
        <CardHeader className="pt-2">
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
