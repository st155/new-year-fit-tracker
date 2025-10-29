import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useForceTerraSync } from '@/hooks/useForceTerraSync';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Database, Webhook } from 'lucide-react';
import { toast } from 'sonner';

export function WithingsDebugPanel() {
  const [isSyncing, setIsSyncing] = useState(false);
  const forceSyncMutation = useForceTerraSync();

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
        .eq('source', 'withings')
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
        .eq('provider', 'withings')
        .eq('type', 'body')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await forceSyncMutation.mutateAsync({ provider: 'withings' });
      toast.success('Синхронизация запущена', {
        description: 'Подождите 30-60 секунд и обновите данные',
      });
      
      // Wait a bit for Terra to process and send webhook
      setTimeout(() => {
        refetchMetrics();
        refetchWebhooks();
      }, 5000);
    } catch (error) {
      console.error('Force sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefresh = () => {
    refetchMetrics();
    refetchWebhooks();
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
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={handleForceSync} 
              disabled={isSyncing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Force Sync Withings
            </Button>
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="gap-2"
            >
              <Database className="h-4 w-4" />
              Обновить данные
            </Button>
          </div>

          <div className="space-y-4">
            {/* Metrics from unified_metrics */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Метрики в unified_metrics
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
                <p className="text-sm text-muted-foreground">Нет данных</p>
              )}
            </div>

            {/* Webhooks */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Последние webhook'и
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
                <p className="text-sm text-muted-foreground">Нет webhook'ов</p>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
            <p>💡 <strong>Как использовать:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Нажмите "Force Sync Withings" для запроса данных у Terra</li>
              <li>Подождите 30-60 секунд пока Terra обработает запрос</li>
              <li>Terra отправит webhook на наш сервер</li>
              <li>job-worker обработает webhook и запишет в unified_metrics</li>
              <li>Нажмите "Обновить данные" чтобы увидеть новые записи</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
