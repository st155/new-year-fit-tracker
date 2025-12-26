import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Zap,
  ExternalLink,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

// Whitelist of users who can use direct Whoop integration
const WHOOP_DIRECT_USERS = [
  'b9fc3f8b-e7bf-44f9-a591-cec47f9c93ae', // Alexey Gubarev
  'f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', // Anton
  '932aab9d-a104-4ba2-885f-2dfdc5dd5df2', // Pavel Radaev
];

interface WhoopStatus {
  connected: boolean;
  whoop_user_id?: string;
  expires_at?: string;
  is_expired?: boolean;
  last_sync_at?: string;
  connected_at?: string;
}

export function WhoopDirectIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<WhoopStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Check if user is whitelisted
  const isWhitelisted = user && WHOOP_DIRECT_USERS.includes(user.id);

  useEffect(() => {
    if (user && isWhitelisted) {
      checkStatus();
    } else {
      setLoading(false);
    }
  }, [user, isWhitelisted]);

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whoop-auth', {
        body: { action: 'status' },
      });

      if (error) throw error;
      setStatus(data);
    } catch (error: any) {
      console.error('Failed to check Whoop status:', error);
    } finally {
      setLoading(false);
    }
  };

  const connect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('whoop-auth', {
        body: { action: 'get-auth-url' },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No auth URL received');

      // Store return URL
      sessionStorage.setItem('whoop_return_url', window.location.pathname);

      toast({
        title: 'Переход на Whoop',
        description: 'Авторизуйтесь в Whoop для подключения',
      });

      // Redirect to Whoop auth
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Failed to get auth URL:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось начать авторизацию',
        variant: 'destructive',
      });
      setConnecting(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('whoop-sync', {
        body: { days_back: 7 },
      });

      if (error) throw error;

      toast({
        title: 'Синхронизация завершена',
        description: `Получено ${data.metrics_count} метрик и ${data.workouts_count} тренировок`,
      });

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['device-metrics'] });
      
      await checkStatus();
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast({
        title: 'Ошибка синхронизации',
        description: error.message || 'Не удалось синхронизировать данные',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    const confirmed = window.confirm('Вы уверены, что хотите отключить Whoop?');
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke('whoop-auth', {
        body: { action: 'disconnect' },
      });

      if (error) throw error;

      toast({
        title: 'Whoop отключен',
        description: 'Вы можете подключить его снова в любое время',
      });

      setStatus({ connected: false });
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
    } catch (error: any) {
      console.error('Disconnect failed:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отключить Whoop',
        variant: 'destructive',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  // Don't show for non-whitelisted users
  if (!isWhitelisted) {
    return null;
  }

  if (loading) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Zap className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Whoop Direct
                <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-500">
                  Beta
                </Badge>
              </CardTitle>
              <CardDescription>
                Прямое подключение без Terra (только для VIP)
              </CardDescription>
            </div>
          </div>
          {status?.connected && (
            <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Подключено
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected ? (
          <>
            {status.is_expired && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Токен истёк. Пожалуйста, переподключите Whoop.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              {status.last_sync_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Последняя синхронизация:{' '}
                    {formatDistanceToNow(new Date(status.last_sync_at), { 
                      addSuffix: true, 
                      locale: ru 
                    })}
                  </span>
                </div>
              )}
              {status.connected_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    Подключено:{' '}
                    {formatDistanceToNow(new Date(status.connected_at), { 
                      addSuffix: true, 
                      locale: ru 
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={sync} 
                disabled={syncing || status.is_expired}
                className="flex-1"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Синхронизация...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Синхронизировать
                  </>
                )}
              </Button>
              <Button 
                onClick={disconnect} 
                variant="outline" 
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Эта интеграция работает напрямую с Whoop API, минуя Terra. 
                Данные обновляются каждые 15 минут автоматически.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={connect} 
              disabled={connecting}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Подключение...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Подключить Whoop напрямую
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
