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
  ExternalLink
} from 'lucide-react';

interface TerraProvider {
  name: string;
  connectedAt: string;
  lastSync?: string;
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
};

const AVAILABLE_PROVIDERS = [
  'WHOOP',
  'ULTRAHUMAN',
  'OURA',
  'GARMIN',
  'WITHINGS',
  'POLAR',
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
    try {
      console.log('🔗 Connecting to Terra for provider:', provider);
      
      // Создаем promise с timeout для защиты от долгих ответов
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 8000);
      });
      
      const requestPromise = supabase.functions.invoke('terra-integration', {
        body: { action: 'generate-widget-session' },
      });
      
      // Гонка между запросом и timeout
      const { data, error } = await Promise.race([requestPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Widget error:', error);
        throw error;
      }
      if (!data?.url) {
        console.error('No widget URL in response:', data);
        throw new Error('No widget URL received');
      }

      console.log('✅ Widget URL received, opening window...');
      
      // Открываем в новом окне для предотвращения релоада страницы
      const authWindow = window.open(data.url, '_blank', 'width=600,height=800,scrollbars=yes,resizable=yes');
      if (authWindow) {
        toast({
          title: 'Окно авторизации открыто',
          description: 'Завершите авторизацию в открывшемся окне',
        });
        
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            setConnectingProvider(null);
            console.log('🔄 Auth window closed, checking connection status...');
            setTimeout(() => checkStatus(), 2000);
          }
        }, 1000);
      } else {
        // Fallback - если popup заблокирован
        console.log('⚠️ Popup blocked, redirecting...');
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('❌ Widget load error:', error);
      
      // Улучшенная обработка ошибок
      let errorMessage = 'Не удалось подключить устройство';
      let errorTitle = 'Ошибка подключения';
      
      if (error.message === 'Request timeout') {
        errorTitle = 'Превышено время ожидания';
        errorMessage = 'Сервер не ответил вовремя. Пожалуйста, попробуйте еще раз через несколько секунд.';
      } else if (error.message?.includes('502') || error.message?.includes('Bad Gateway')) {
        errorTitle = 'Сервер недоступен';
        errorMessage = 'Временные проблемы с сервером. Попробуйте через 1-2 минуты.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
        action: (
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

  const checkStatus = async () => {
    if (!user) return;
    
    try {
      const { data: tokens } = await supabase
        .from('terra_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const providers: TerraProvider[] = (tokens || []).map(t => ({
        name: t.provider,
        connectedAt: t.created_at,
        lastSync: t.last_sync_date,
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

  const syncData = async () => {
    if (!user) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'sync-data' },
      });

      if (error) throw error;

      console.log('✅ Sync result:', data);

      toast({
        title: 'Синхронизация завершена',
        description: data?.message || 'Данные успешно обновлены',
      });

      setTimeout(checkStatus, 2000);
      
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

    try {
      const { error } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'disconnect', provider },
      });

      if (error) throw error;

      toast({
        title: 'Устройство отключено',
        description: `${PROVIDER_NAMES[provider]} успешно отключен`,
      });

      await checkStatus();
    } catch (error: any) {
      console.error('Disconnect error:', error);
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
                      <div>
                        <p className="font-medium">{PROVIDER_NAMES[provider.name]}</p>
                        <p className="text-xs text-muted-foreground">
                          Подключен {new Date(provider.connectedAt).toLocaleDateString('ru-RU')}
                        </p>
                        {provider.lastSync && (
                          <p className="text-xs text-muted-foreground">
                            Последняя синхронизация: {new Date(provider.lastSync).toLocaleString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
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
                <Button
                  key={provider}
                  variant={isConnected ? "secondary" : "outline"}
                  className="h-auto py-4 justify-start"
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
