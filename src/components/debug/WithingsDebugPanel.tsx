import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useForceTerraSync } from '@/hooks/useForceTerraSync';
import { useSyncAllDevices } from '@/hooks/useSyncAllDevices';
import { useWithingsBackfill } from '@/hooks/useWithingsBackfill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Database, Webhook, Activity, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function WithingsDebugPanel() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  
  const forceSyncMutation = useForceTerraSync();
  const syncAllMutation = useSyncAllDevices();
  const backfillMutation = useWithingsBackfill();

  // Fetch latest metrics from unified_metrics
  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['withings-debug-metrics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('unified_metrics')
        .select('metric_name, value, unit, measurement_date, source, created_at')
        .eq('user_id', user.id)
        .eq('source', 'WITHINGS')
        .in('metric_name', ['Weight', 'Body Fat Percentage'])
        .order('measurement_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  // Fetch recent webhooks
  const { data: webhooks, refetch: refetchWebhooks } = useQuery({
    queryKey: ['withings-debug-webhooks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('terra_webhooks_raw')
        .select('id, type, provider, status, processed_count, created_at')
        .eq('user_id', user.id)
        .eq('provider', 'WITHINGS')
        .eq('type', 'body')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  // Check connection status
  const checkConnectionStatus = async () => {
    setConnectionStatus({ checking: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setConnectionStatus({ connected: false, error: 'No user found', checking: false });
      return;
    }

    const { data: token, error } = await supabase
      .from('terra_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'WITHINGS')
      .eq('is_active', true)
      .single();

    if (error || !token) {
      setConnectionStatus({ connected: false, error: 'Token not found', checking: false });
      toast.error('Withings не подключен', {
        description: 'Подключите устройство Withings в разделе Интеграции',
      });
      return;
    }

    setConnectionStatus({
      connected: true,
      terraUserId: token.terra_user_id,
      lastSync: token.last_sync_date,
      updatedAt: token.updated_at,
      checking: false,
    });
    
    toast.success('Withings подключен', {
      description: `Terra User ID: ${token.terra_user_id}`,
    });
  };

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await forceSyncMutation.mutateAsync({ provider: 'withings', dataType: 'body' });
      toast.success('Синхронизация Withings запущена', {
        description: 'Подождите 30-60 секунд и обновите данные',
      });
      
      // Wait a bit for Terra to process and send webhook
      setTimeout(() => {
        refetchMetrics();
        refetchWebhooks();
        checkConnectionStatus();
      }, 5000);
    } catch (error) {
      console.error('Force sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await syncAllMutation.mutateAsync();
      toast.success('Синхронизация всех устройств запущена', {
        description: 'Подождите 30-60 секунд и обновите данные',
      });
      
      // Wait a bit for Terra to process and send webhooks
      setTimeout(() => {
        refetchMetrics();
        refetchWebhooks();
        checkConnectionStatus();
      }, 8000);
    } catch (error) {
      console.error('Sync all error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBackfill = async (days: number) => {
    try {
      await backfillMutation.mutateAsync({ daysBack: days });
      
      setTimeout(() => {
        refetchMetrics();
        refetchWebhooks();
        checkConnectionStatus();
      }, 3000);
    } catch (error) {
      console.error('Backfill error:', error);
    }
  };

  const handleRefresh = () => {
    refetchMetrics();
    refetchWebhooks();
    checkConnectionStatus();
    toast.info('Данные обновлены');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Withings Debug Panel
          </CardTitle>
          <CardDescription>
            Отладка синхронизации данных от Withings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Статус подключения</h3>
            {connectionStatus ? (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className={connectionStatus.connected ? 'text-green-500' : 'text-red-500'}>●</span>
                  <span className="text-sm">{connectionStatus.connected ? 'Подключено' : 'Не подключено'}</span>
                </div>
                {connectionStatus.connected && (
                  <>
                    <div className="text-xs text-muted-foreground">
                      <span>Terra User ID: </span>
                      <code className="bg-background px-1 rounded">{connectionStatus.terraUserId}</code>
                    </div>
                    {connectionStatus.lastSync && (
                      <div className="text-xs text-muted-foreground">
                        Последняя синхронизация: {new Date(connectionStatus.lastSync).toLocaleString('ru-RU')}
                      </div>
                    )}
                  </>
                )}
                {connectionStatus.error && (
                  <div className="text-xs text-red-500">{connectionStatus.error}</div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-muted rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Действия</h3>
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={checkConnectionStatus} 
                disabled={connectionStatus?.checking}
                variant="outline"
                className="gap-2"
              >
                {connectionStatus?.checking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                Check Connection Status
              </Button>

              <Button 
                onClick={handleForceSync} 
                disabled={isSyncing || !connectionStatus?.connected}
                variant="default"
                className="gap-2"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
                Sync Withings
              </Button>
              
              <Button 
                onClick={handleSyncAll} 
                disabled={isSyncing}
                variant="outline"
                className="gap-2"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
                Sync All Devices
              </Button>

              <Button 
                onClick={() => handleBackfill(30)} 
                disabled={backfillMutation.isPending}
                variant="secondary"
                className="gap-2"
              >
                {backfillMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                Загрузить данные (30 дней)
              </Button>

              <Button 
                onClick={() => handleBackfill(90)} 
                disabled={backfillMutation.isPending}
                variant="secondary"
                className="gap-2"
              >
                {backfillMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                Загрузить данные (90 дней)
              </Button>
              
              <Button 
                onClick={handleRefresh}
                variant="ghost"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Обновить данные
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Metrics from unified_metrics */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Метрики в unified_metrics ({metrics?.length || 0})
              </h3>
              {metrics && metrics.length > 0 ? (
                <div className="space-y-2">
                  {metrics.map((metric, idx) => (
                    <div key={idx} className="text-sm border rounded p-2 bg-muted/50">
                      <div className="font-medium">
                        {metric.metric_name}: {metric.value} {metric.unit}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Дата измерения: {metric.measurement_date}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Создано: {new Date(metric.created_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg text-center">
                  Нет данных
                </p>
              )}
            </div>

            {/* Webhooks */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Последние webhook'и ({webhooks?.length || 0})
              </h3>
              {webhooks && webhooks.length > 0 ? (
                <div className="space-y-2">
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="text-sm border rounded p-2 bg-muted/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {webhook.type} - {webhook.provider}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Status: {webhook.status} | Metrics: {webhook.processed_count || 0}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(webhook.created_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg text-center">
                  Нет webhook'ов
                </p>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground border-t pt-4 space-y-2">
            <p>💡 <strong>Как использовать:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>"Check Connection Status" - проверяет статус подключения Withings</li>
              <li>"Sync Withings" - запрашивает последние 7 дней данных через Terra API</li>
              <li>"Загрузить данные" - загружает исторические данные за указанный период напрямую</li>
              <li>"Sync All Devices" - синхронизирует все подключенные устройства</li>
              <li>После синхронизации подождите 30-60 секунд для обработки данных</li>
              <li>Если данных нет - попробуйте использовать "Загрузить данные" или переподключить Withings</li>
            </ol>
            <p className="mt-2">🔗 <strong>Полезные ссылки:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <a 
                  href="https://supabase.com/dashboard/project/ueykmmzmguzjppdudvef/functions/withings-backfill/logs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Логи Withings Backfill
                </a>
              </li>
              <li>
                <a 
                  href="https://supabase.com/dashboard/project/ueykmmzmguzjppdudvef/functions/force-terra-sync/logs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Логи Force Terra Sync
                </a>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
