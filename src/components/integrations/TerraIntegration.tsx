import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { WhoopSetupWizard } from './WhoopSetupWizard';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Unlink,
  Activity,
  Heart,
  Moon,
  Zap,
  TrendingUp,
  Watch,
  Info
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
};

export function TerraIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<TerraStatus>({ connected: false, providers: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showWhoopSetup, setShowWhoopSetup] = useState(false);

  useEffect(() => {
    if (user) {
      checkStatus();
    }
  }, [user]);

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

  const connectProvider = async (provider: string) => {
    if (!user) return;

    // Whoop требует специальной настройки
    if (provider === 'WHOOP') {
      setShowWhoopSetup(true);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'get-auth-url', provider },
      });

      if (error) throw error;
      if (!data?.authUrl) throw new Error('No auth URL received');

      // Открываем окно авторизации Terra
      window.location.href = data.authUrl;
    } catch (error: any) {
      console.error('Connect error:', error);
      toast({
        title: 'Ошибка подключения',
        description: error.message || 'Не удалось подключить устройство',
        variant: 'destructive',
      });
    }
  };

  const syncData = async () => {
    if (!user) return;

    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'sync-data' },
      });

      if (error) throw error;

      toast({
        title: 'Синхронизация запущена',
        description: 'Данные обновляются в фоне',
      });

      // Обновляем статус через 2 секунды
      setTimeout(checkStatus, 2000);
      
      // Очищаем кэши
      localStorage.removeItem('fitness_metrics_cache');
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

  if (showWhoopSetup) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setShowWhoopSetup(false)}>
          ← Назад к интеграциям
        </Button>
        <WhoopSetupWizard onComplete={() => {
          setShowWhoopSetup(false);
          checkStatus();
        }} />
      </div>
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
          <CardTitle>Доступные устройства</CardTitle>
          <CardDescription>
            Подключите ваши фитнес-трекеры для автоматической синхронизации данных
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ready" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ready">Готовые к использованию</TabsTrigger>
              <TabsTrigger value="whoop">Whoop (требует настройки)</TabsTrigger>
            </TabsList>

            <TabsContent value="ready" className="mt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(PROVIDER_NAMES)
                  .filter(([key]) => key !== 'WHOOP')
                  .map(([key, name]) => {
                    const Icon = PROVIDER_ICONS[key];
                    const isConnected = status.providers.some((p) => p.name === key);
                    
                    return (
                      <Button
                        key={key}
                        variant={isConnected ? 'outline' : 'default'}
                        className="h-auto p-4 justify-start"
                        onClick={() => !isConnected && connectProvider(key)}
                        disabled={isConnected}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        <span className="flex-1 text-left">{name}</span>
                        {isConnected && (
                          <Badge variant="secondary" className="ml-2">
                            Подключено
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription>
                  Эти устройства подключаются в один клик через Terra Widget
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="whoop" className="mt-4 space-y-3">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Whoop требует специальной настройки:</strong> собственный домен с DNS, регистрация в Whoop Developer Portal, координация с Terra Support для SSL сертификата. Процесс занимает 3-14 дней.
                </AlertDescription>
              </Alert>

              <Button
                className="w-full h-auto p-4 justify-start"
                variant={status.providers.some((p) => p.name === 'WHOOP') ? 'outline' : 'default'}
                onClick={() => connectProvider('WHOOP')}
                disabled={status.providers.some((p) => p.name === 'WHOOP')}
              >
                <Zap className="h-5 w-5 mr-3" />
                <span className="flex-1 text-left">Whoop</span>
                {status.providers.some((p) => p.name === 'WHOOP') ? (
                  <Badge variant="secondary" className="ml-2">Подключено</Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2">Настроить</Badge>
                )}
              </Button>

              <div className="p-4 glass-card space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Что потребуется:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Собственный домен с доступом к DNS</li>
                  <li>Регистрация в Whoop Developer Portal</li>
                  <li>Координация с Terra Support (SSL сертификат)</li>
                  <li>Настройка Terra Dashboard</li>
                  <li>Production Approval от Whoop (1-2 недели)</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              После подключения данные будут автоматически синхронизироваться каждые 6 часов
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
