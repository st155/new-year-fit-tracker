/**
 * AutoSyncMonitor - Мониторинг и автоматическая синхронизация данных
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useForceTerraSync } from '@/hooks/useForceTerraSync';

interface StaleIntegration {
  source: string;
  days_stale: number;
  client_id: string;
  full_name: string;
}

interface AutoSyncMonitorProps {
  clientId?: string;
}

export function AutoSyncMonitor({ clientId }: AutoSyncMonitorProps) {
  const { user } = useAuth();
  const [staleIntegrations, setStaleIntegrations] = useState<StaleIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string[]>([]);
  const { mutate: forceSync } = useForceTerraSync();

  useEffect(() => {
    if (!user?.id) return;
    loadStaleIntegrations();
    
    // Auto-check every 5 minutes
    const interval = setInterval(loadStaleIntegrations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, clientId]);

  const loadStaleIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_stale_integrations')
        .returns<StaleIntegration[]>();

      if (error) throw error;

      let filtered = data || [];
      if (clientId) {
        filtered = filtered.filter(item => item.client_id === clientId);
      }

      setStaleIntegrations(filtered);
    } catch (error) {
      console.error('Error loading stale integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (source: string, clientName: string) => {
    setSyncing(prev => [...prev, source]);
    
    try {
      forceSync(
        { provider: source.toLowerCase(), dataType: 'body' },
        {
          onSuccess: () => {
            toast.success(`Синхронизация ${source} запущена для ${clientName}`);
            setTimeout(loadStaleIntegrations, 3000);
          },
          onError: (error) => {
            toast.error(`Ошибка синхронизации: ${error.message}`);
          },
          onSettled: () => {
            setSyncing(prev => prev.filter(s => s !== source));
          },
        }
      );
    } catch (error) {
      setSyncing(prev => prev.filter(s => s !== source));
    }
  };

  const handleAutoSyncAll = async () => {
    if (staleIntegrations.length === 0) return;
    
    toast.info(`Запуск синхронизации для ${staleIntegrations.length} интеграций...`);
    
    for (const integration of staleIntegrations) {
      await handleSync(integration.source, integration.full_name);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Проверка синхронизации...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (staleIntegrations.length === 0) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          Все интеграции синхронизированы. Последние данные получены в течение 7 дней.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Устаревшие данные
            </CardTitle>
            <CardDescription>
              {staleIntegrations.length} интеграций требуют синхронизации
            </CardDescription>
          </div>
          <Button
            onClick={handleAutoSyncAll}
            disabled={syncing.length > 0}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing.length > 0 ? 'animate-spin' : ''}`} />
            Синхронизировать все
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {staleIntegrations.map((integration, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {integration.full_name} - {integration.source}
                </div>
                <div className="text-sm text-muted-foreground">
                  Последние данные: {integration.days_stale} дней назад
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={integration.days_stale > 14 ? 'destructive' : 'outline'}
              >
                {integration.days_stale > 14 ? 'Критично' : 'Устарело'}
              </Badge>
              <Button
                onClick={() => handleSync(integration.source, integration.full_name)}
                disabled={syncing.includes(integration.source)}
                size="sm"
                variant="outline"
              >
                {syncing.includes(integration.source) ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
