import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { terraApi, jobsApi } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  Info,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useForceTerraSync } from '@/hooks/useForceTerraSync';

const getDateLocale = (lang: string) => lang === 'ru' ? ru : enUS;

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
  const { t, i18n } = useTranslation("integrations");
  const dateLocale = getDateLocale(i18n.language);
  const [status, setStatus] = useState<TerraStatus>({ connected: false, providers: [] });
  const [inactiveProviders, setInactiveProviders] = useState<InactiveProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [reactivatingProvider, setReactivatingProvider] = useState<string | null>(null);
  const [purgingProvider, setPurgingProvider] = useState<string | null>(null);
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [purgeTargetProvider, setPurgeTargetProvider] = useState<string | null>(null);
  const forceSyncMutation = useForceTerraSync();


  // Listen for messages from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'terra-connection-result') {
        console.log('📨 Received result from popup:', event.data);
        
        const providerName = PROVIDER_NAMES[event.data.provider] || event.data.provider;
        
        if (event.data.success) {
          toast({
            title: t("terra.deviceConnected"),
            description: t("terra.successConnected", { provider: providerName }),
          });
        } else {
          toast({
            title: t("terra.connectionError"),
            description: event.data.error || t("terra.couldNotConnect"),
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
          title: t("terra.deviceConnected"),
          description: t("terra.successConnected", { provider: '' }),
        });
      }
      
      checkStatus();
      checkInactiveProviders();
    }
  }, [user]);

  const connectProvider = async (provider: string) => {
    if (!user) return;
    
    setConnectingProvider(provider);
    
    // Store provider in sessionStorage as backup (main source is URL params now)
    sessionStorage.setItem('terra_last_provider', provider);
    sessionStorage.setItem('terra_return_url', window.location.pathname);
    console.log('📝 Stored provider in sessionStorage:', provider);
    
    try {
      // Get Terra widget URL with provider specified
      console.log('🔄 Fetching Terra widget URL for provider:', provider);
      
      const { data, error } = await terraApi.generateWidget(provider);
      
      if (error) throw error;
      if (!data?.url) throw new Error('No widget URL received');
      
      console.log('✅ Got Terra widget URL:', data.url);
      
      // ALWAYS use same-tab redirect for OAuth providers (WHOOP, etc.)
      // This avoids session/cookie issues with popups and cross-window communication
      console.log('🔄 Redirecting to Terra widget in same tab (avoids session issues)...');
      
      toast({
        title: t("terra.redirectingToAuth"),
        description: t("terra.connectingProvider", { provider: PROVIDER_NAMES[provider] || provider }),
      });
      
      // Small delay to show toast, then redirect
      setTimeout(() => {
        window.location.assign(data.url);
      }, 500);
      
    } catch (error: any) {
      console.error('❌ Failed to get Terra widget URL:', error);
      toast({
        title: t("common:errors.generic"),
        description: error.message || t("terra.couldNotConnect"),
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
      title: t("terra.redirectingToAuth"),
      description: t("terra.connectingProvider", { provider: PROVIDER_NAMES[provider] || provider }),
    });
    
    try {
      const { data, error } = await terraApi.generateWidget();
      
      if (error) throw error;
      if (!data?.url) throw new Error('No widget URL received');
      
      // Redirect in same tab (avoids cookie issues with popups)
      setTimeout(() => {
        window.location.href = data.url;
      }, 1000);
    } catch (error: any) {
      toast({
        title: t("common:errors.generic"),
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
        title: t("terra.preparingReconnect"),
        description: t("terra.removingOldToken"),
      });
      
      const { error: deauthError } = await terraApi.deauthenticate(provider);
      
      if (deauthError) {
        console.warn('⚠️ Deauth before reconnect failed:', deauthError);
        throw new Error(t('errors.failedToDeauth'));
      }
      
      // Шаг 2: Ждём 5 секунд, чтобы Whoop/провайдер очистил OAuth кэш
      console.log('⏳ Waiting 5s for provider OAuth cache to clear...');
      
      toast({
        title: t("terra.clearingSession"),
        description: t("terra.waitForProvider"),
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Шаг 3: Подключаем заново через Terra Widget
      console.log('🔄 Starting fresh connection...');
      await connectProvider(provider);
      
      // Обновляем списки
      await checkStatus();
      await checkInactiveProviders();
      
    } catch (error: any) {
      console.error('Reactivate error:', error);
      toast({
        title: t("common:errors.generic"),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setReactivatingProvider(null);
    }
  };

  const getConnectionStatus = (provider: TerraProvider) => {
    if (!provider.terraUserId) {
      return { variant: 'secondary' as const, text: t("terra.waitingForData") };
    }
    
    if (!provider.lastSync) {
      return { variant: 'secondary' as const, text: t("terra.connectedWaiting") };
    }
    
    const minutesSinceSync = (Date.now() - new Date(provider.lastSync).getTime()) / 60000;
    
    // Свежие данные (< 5 минут)
    if (minutesSinceSync < 5) {
      return { variant: 'success' as const, text: t("terra.justSynced") };
    }
    
    // Последние 24 часа
    if (minutesSinceSync < 1440) {
      return { variant: 'success' as const, text: t("terra.synced") };
    }
    
    // 1-3 дня
    if (minutesSinceSync < 4320) {
      return { variant: 'outline' as const, text: t("terra.needsSync") };
    }
    
    // > 3 дней
    return { variant: 'destructive' as const, text: t("terra.outdated") };
  };

  const syncData = async () => {
    if (!user) return;

    setSyncing(true);
    try {
      const { data, error } = await terraApi.syncData();

      if (error) throw error;

      // Trigger job-worker immediately
      try {
        await jobsApi.trigger();
      } catch (e) {
        console.warn('Failed to trigger job-worker:', e);
      }

      console.log('✅ Sync result:', data);

      toast({
        title: t("terra.syncStarted"),
        description: t("terra.syncBackground"),
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
        title: t("terra.syncError"),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const disconnectProvider = async (provider: string) => {
    if (!user) return;

    // Подтверждение от пользователя
    const confirmed = window.confirm(
      t("terra.confirmDisconnect", { provider: PROVIDER_NAMES[provider] })
    );
    
    if (!confirmed) return;

    // Оптимистичное обновление UI - сразу убираем провайдера из списка
    const previousStatus = status;
    setStatus(prev => ({
      ...prev,
      providers: prev.providers.filter(p => p.name !== provider)
    }));

    try {
      // Используем deauthenticate-user вместо disconnect для полного удаления
      const { error } = await terraApi.deauthenticate(provider);

      if (error) throw error;

      // Очищаем кэши
      localStorage.removeItem('fitness_metrics_cache');
      
      // Инвалидируем связанные запросы
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['device-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['metric-values'] });

      toast({
        title: t("terra.disconnected"),
        description: t("terra.canReconnect", { provider: PROVIDER_NAMES[provider] }),
      });

      // Обновляем статус
      await checkStatus();
      await checkInactiveProviders();
    } catch (error: any) {
      console.error('Disconnect error:', error);
      
      // Откатываем оптимистичное обновление при ошибке
      setStatus(previousStatus);
      
      toast({
        title: t("terra.disconnectError"),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Полная деавторизация (удаление и на Terra, и локально)
  const deauthenticateProvider = async (provider: string) => {
    if (!user) return;
    
    const confirmed = window.confirm(
      t("terra.confirmDeauth", { provider: PROVIDER_NAMES[provider] })
    );
    
    if (!confirmed) return;

    try {
      const { error } = await terraApi.deauthenticate(provider);

      if (error) throw error;

      // Очищаем кэши
      localStorage.removeItem('fitness_metrics_cache');
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['device-metrics'] });

      toast({
        title: t("terra.deviceDeleted"),
        description: t("terra.canReconnect", { provider: PROVIDER_NAMES[provider] }),
      });

      await checkStatus();
      await checkInactiveProviders();
    } catch (error: any) {
      console.error('Deauthenticate error:', error);
      toast({
        title: t("terra.deleteError"),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Полный сброс Terra (очистка всех сессий на стороне Terra + локальных токенов)
  const purgeProvider = async (provider: string) => {
    if (!user) return;
    
    setPurgingProvider(provider);
    setShowPurgeDialog(false);
    
    try {
      toast({
        title: t("terra.fullReset"),
        description: t("terra.clearingTerraSessions"),
      });
      
      const { data, error } = await terraApi.purgeUsers(provider);

      if (error) throw error;

      console.log('Purge result:', data);

      // Очищаем кэши
      localStorage.removeItem('fitness_metrics_cache');
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['device-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['terra-tokens'] });

      toast({
        title: t("terra.resetComplete"),
        description: t("terra.sessionsDeleted", { count: data.terra_users_found || 0 }),
      });

      // Показываем диалог с инструкциями
      setTimeout(() => {
        toast({
          title: t("terra.nextSteps"),
          description: t("terra.nextStepsDesc"),
          duration: 15000,
        });
      }, 2000);

      await checkStatus();
      await checkInactiveProviders();
    } catch (error: any) {
      console.error('Purge error:', error);
      toast({
        title: t("terra.resetError"),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPurgingProvider(null);
    }
  };

  const openPurgeDialog = (provider: string) => {
    setPurgeTargetProvider(provider);
    setShowPurgeDialog(true);
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
              {t("terra.connectedDevices")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button onClick={syncData} disabled={syncing} variant="default">
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("terra.syncing")}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t("terra.syncData")}
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
                    {t("terra.loading")}
                  </>
                ) : (
                  <>
                    <Dumbbell className="w-4 h-4" />
                    {t("terra.syncWorkouts")}
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
                          {t("terra.connected")} {new Date(provider.connectedAt).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}
                        </p>
                        {provider.lastSync && (
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDistanceToNow(new Date(provider.lastSync), { 
                              addSuffix: true, 
                              locale: dateLocale 
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
              {t("terra.disconnectedDevices")}
            </CardTitle>
            <CardDescription>
              {t("terra.disconnectedDesc")}
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
                        {t("terra.disconnectedNote")}
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
                          {t("terra.activating")}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {t("terra.activate")}
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
                          {t("common:actions.delete")}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>{t("terra.deleteTooltip")}</p>
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
          <CardTitle>{t("terra.connectDevice")}</CardTitle>
          <CardDescription>
            {t("terra.connectDeviceDesc")}
          </CardDescription>
        </CardHeader>
        
        {/* Предупреждение о лимите времени */}
        <CardContent className="pt-0 pb-2 space-y-2">
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Важно:</strong> После нажатия кнопки подключения завершите авторизацию 
              в приложении устройства в течение <strong>15 минут</strong>. 
            </AlertDescription>
          </Alert>
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Проблемы с подключением?</strong> Если видите "Session expired":
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Откройте приложение устройства (Whoop/Oura/etc)</li>
                <li>Выйдите из аккаунта и войдите заново</li>
                <li>Повторите подключение в Elite10</li>
              </ol>
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
              const isPurging = purgingProvider === provider;
              
              return (
                <div key={provider} className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant={isConnected ? "secondary" : "outline"}
                      className="h-auto py-4 justify-start flex-1"
                      onClick={() => !isConnected && connectProvider(provider)}
                      disabled={isConnected || isConnecting || isPurging}
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
                        ) : isPurging ? (
                          <p className="text-xs text-muted-foreground">Сброс...</p>
                        ) : null}
                      </div>
                      {isConnected ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <ExternalLink className="h-4 w-4 opacity-50" />
                      )}
                    </Button>
                    {!isConnected && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-auto aspect-square"
                              onClick={() => openPurgeDialog(provider)}
                              disabled={isPurging}
                            >
                              {isPurging ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>Полный сброс: очистить все застрявшие сессии перед подключением</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
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

      {/* Purge Dialog */}
      <Dialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Полный сброс {purgeTargetProvider ? PROVIDER_NAMES[purgeTargetProvider] : ''}
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p>
                Эта операция полностью удалит все сессии авторизации для {purgeTargetProvider ? PROVIDER_NAMES[purgeTargetProvider] : 'устройства'} на стороне Terra API и в нашей базе.
              </p>
              
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm">
                  <strong>После сброса выполните:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-2">
                    <li>
                      <strong>Очистите cookies в Safari</strong>
                      <br />
                      <span className="text-xs text-muted-foreground ml-4">
                        Настройки → Safari → Очистить историю и данные сайтов
                      </span>
                    </li>
                    <li>
                      <strong>Перезайдите в приложение {purgeTargetProvider ? PROVIDER_NAMES[purgeTargetProvider] : ''}</strong>
                      <br />
                      <span className="text-xs text-muted-foreground ml-4">
                        Выйдите из аккаунта в приложении и войдите заново
                      </span>
                    </li>
                    <li>
                      <strong>Подключите устройство заново</strong>
                      <br />
                      <span className="text-xs text-muted-foreground ml-4">
                        Вернитесь сюда и нажмите кнопку подключения
                      </span>
                    </li>
                  </ol>
                </AlertDescription>
              </Alert>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPurgeDialog(false)}>
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => purgeTargetProvider && purgeProvider(purgeTargetProvider)}
              disabled={!purgeTargetProvider || purgingProvider !== null}
            >
              {purgingProvider ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сброс...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Выполнить сброс
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
