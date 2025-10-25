import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Zap,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ConnectionHealth {
  provider: string;
  status: 'healthy' | 'warning' | 'error';
  lastSync: string | null;
  syncStatus: string;
  webhookStatus: 'active' | 'inactive';
}

export function TerraHealthMonitor() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectionHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkConnectionHealth = async () => {
    if (!user) return;

    try {
      const { data: tokens, error } = await supabase
        .from('terra_tokens')
        .select('provider, last_sync_date, is_active, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const healthData: ConnectionHealth[] = (tokens || []).map((token) => {
        const now = new Date();
        const lastSync = token.last_sync_date ? new Date(token.last_sync_date) : null;
        const hoursSinceSync = lastSync 
          ? Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60))
          : null;

        let status: 'healthy' | 'warning' | 'error' = 'healthy';
        let syncStatus = 'Синхронизировано';

        if (!lastSync) {
          status = 'warning';
          syncStatus = 'Ожидание первой синхронизации';
        } else if (hoursSinceSync !== null && hoursSinceSync > 48) {
          status = 'error';
          syncStatus = 'Синхронизация давно не выполнялась';
        } else if (hoursSinceSync !== null && hoursSinceSync > 24) {
          status = 'warning';
          syncStatus = 'Синхронизация устарела';
        }

        return {
          provider: token.provider,
          status,
          lastSync: token.last_sync_date,
          syncStatus,
          webhookStatus: 'active', // Предполагаем, что активные токены имеют активные webhooks
        };
      });

      setConnections(healthData);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Health check error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnectionHealth();

    // Auto-refresh every 30 seconds
    const interval = setInterval(checkConnectionHealth, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500">Здоров</Badge>;
      case 'warning':
        return <Badge variant="default" className="bg-yellow-500">Предупреждение</Badge>;
      case 'error':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Мониторинг подключений
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Загрузка...</div>
        </CardContent>
      </Card>
    );
  }

  if (connections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Мониторинг подключений
          </CardTitle>
          <CardDescription>
            Нет активных подключений для мониторинга
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const healthyCount = connections.filter(c => c.status === 'healthy').length;
  const warningCount = connections.filter(c => c.status === 'warning').length;
  const errorCount = connections.filter(c => c.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Мониторинг подключений
            </CardTitle>
            <CardDescription>
              Последняя проверка: {formatDistanceToNow(lastCheck, { addSuffix: true, locale: ru })}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkConnectionHealth}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2 p-3 border rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-2xl font-bold text-green-500">{healthyCount}</div>
              <div className="text-xs text-muted-foreground">Здоровые</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 border rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <div>
              <div className="text-2xl font-bold text-yellow-500">{warningCount}</div>
              <div className="text-xs text-muted-foreground">Предупреждения</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 border rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <div>
              <div className="text-2xl font-bold text-red-500">{errorCount}</div>
              <div className="text-xs text-muted-foreground">Ошибки</div>
            </div>
          </div>
        </div>

        {/* Connection Details */}
        <div className="space-y-2">
          {connections.map((connection) => (
            <div
              key={connection.provider}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(connection.status)}
                <div>
                  <div className="font-medium">{connection.provider}</div>
                  <div className="text-xs text-muted-foreground">
                    {connection.syncStatus}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {connection.lastSync && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(connection.lastSync), { addSuffix: true, locale: ru })}
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-500">Webhook</span>
                </div>

                {getStatusBadge(connection.status)}
              </div>
            </div>
          ))}
        </div>

        {/* Health Tips */}
        {(warningCount > 0 || errorCount > 0) && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-yellow-500 mb-1">Рекомендации</div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {warningCount > 0 && (
                    <li>• Синхронизация устарела - нажмите "Синхронизировать" в разделе подключений</li>
                  )}
                  {errorCount > 0 && (
                    <li>• Обнаружены проблемы - проверьте статус устройства и переподключитесь при необходимости</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
