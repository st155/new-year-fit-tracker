import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
  Watch
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
  'GARMIN',
  'FITBIT',
  'OURA',
  'WITHINGS',
  'POLAR',
  'SUUNTO',
  'ULTRAHUMAN',
];

export function TerraIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<TerraStatus>({ connected: false, providers: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [widgetLoading, setWidgetLoading] = useState(false);


  useEffect(() => {
    if (user) {
      checkStatus();
    }
  }, [user]);

  const connectProvider = async (provider: string) => {
    if (!user) return;
    
    setSelectedProvider(provider);
    setWidgetLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'generate-widget-session' },
      });

      if (error) {
        console.error('Widget error:', error);
        throw error;
      }
      if (!data?.url) {
        console.error('No widget URL in response:', data);
        throw new Error('No widget URL received');
      }

      console.log('Widget URL loaded:', data.url);
      setWidgetUrl(data.url);
    } catch (error: any) {
      console.error('Widget load error:', error);
      toast({
        title: 'Ошибка подключения',
        description: error.message || 'Не удалось подключить устройство',
        variant: 'destructive',
      });
      setSelectedProvider(null);
    } finally {
      setWidgetLoading(false);
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
      const { error } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'sync-data' },
      });

      if (error) throw error;

      toast({
        title: 'Синхронизация запущена',
        description: 'Данные обновляются в фоне',
      });

      setTimeout(checkStatus, 2000);
      
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
              
              return (
                <Button
                  key={provider}
                  variant={isConnected ? "secondary" : "outline"}
                  className="h-auto py-4 justify-start"
                  onClick={() => !isConnected && connectProvider(provider)}
                  disabled={isConnected || widgetLoading}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{PROVIDER_NAMES[provider]}</p>
                    {isConnected && (
                      <p className="text-xs text-muted-foreground">Подключено</p>
                    )}
                  </div>
                  {isConnected && <CheckCircle className="h-4 w-4 text-success" />}
                </Button>
              );
            })}
          </div>

          <Alert className="mt-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              После подключения данные будут автоматически синхронизироваться каждые 6 часов
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Widget Modal */}
      <Dialog open={selectedProvider !== null} onOpenChange={(open) => !open && setSelectedProvider(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Подключение {selectedProvider && PROVIDER_NAMES[selectedProvider]}
            </DialogTitle>
          </DialogHeader>
          {widgetLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : widgetUrl ? (
            <div className="w-full h-[500px]">
              <iframe
                src={widgetUrl}
                className="w-full h-full rounded-lg border"
                allow="camera; microphone"
                title="Terra Widget"
              />
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Не удалось загрузить виджет подключения
              </AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
