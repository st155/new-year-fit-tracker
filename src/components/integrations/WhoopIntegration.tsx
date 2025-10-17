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
  RefreshCw,
  Unlink,
  Zap,
  Activity,
  Moon,
  Heart
} from 'lucide-react';

interface WhoopConnection {
  connected: boolean;
  connectedAt?: string;
  lastSync?: string;
  whoopUserId?: string;
}

export function WhoopIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connection, setConnection] = useState<WhoopConnection>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (user) {
      checkConnection();
    }
  }, [user]);

  const checkConnection = async () => {
    if (!user) return;
    
    try {
      const { data: token } = await supabase
        .from('whoop_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (token) {
        setConnection({
          connected: true,
          connectedAt: token.created_at,
          lastSync: token.last_sync_date || token.updated_at,
          whoopUserId: token.whoop_user_id,
        });
      } else {
        setConnection({ connected: false });
      }
    } catch (error: any) {
      console.error('Connection check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectWhoop = async () => {
    if (!user) return;

    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('whoop-integration', {
        body: { action: 'get-auth-url' },
      });

      if (error) throw error;
      if (!data?.authUrl) throw new Error('Не удалось получить URL авторизации');

      // Открываем окно авторизации Whoop
      window.location.href = data.authUrl;
    } catch (error: any) {
      console.error('Connect error:', error);
      toast({
        title: 'Ошибка подключения',
        description: error.message || 'Не удалось подключить Whoop',
        variant: 'destructive',
      });
      setConnecting(false);
    }
  };

  const syncData = async () => {
    if (!user) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('whoop-integration', {
        body: { action: 'sync-data' },
      });

      if (error) {
        const errorMsg = (error as any)?.message || error;
        const statusCode = (error as any)?.status;
        
        // Если 401 или ошибка токена - переподключение
        if (statusCode === 401 || 
            errorMsg?.includes('reconnect') || 
            errorMsg?.includes('credentials have changed') ||
            errorMsg?.includes('No active Whoop connection')) {
          
          // Немедленно перепроверяем статус
          await checkConnection();
          
          toast({
            title: 'Требуется переподключение',
            description: 'Токен Whoop истёк или был отозван. Пожалуйста, подключите аккаунт заново.',
            variant: 'destructive',
          });
          return;
        }
        
        throw new Error(errorMsg || 'Ошибка синхронизации');
      }

      // Успешная синхронизация
      toast({
        title: 'Данные синхронизированы',
        description: 'Whoop данные успешно обновлены',
      });

      // Обновляем статус подключения
      await checkConnection();
      
      // Инвалидируем все React Query кэши
      queryClient.invalidateQueries();
      
      // Очищаем localStorage кеши
      localStorage.removeItem('fitness_metrics_cache');
      localStorage.removeItem('fitness_data_cache_whoop');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('progress_cache_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Уведомляем другие компоненты об обновлении
      window.dispatchEvent(new CustomEvent('whoop-data-updated'));
      
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Ошибка синхронизации',
        description: error.message,
        variant: 'destructive',
      });
      
      // Перепроверяем подключение при любой ошибке
      await checkConnection();
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    if (!user) return;

    try {
      await supabase
        .from('whoop_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id);

      toast({
        title: 'Whoop отключен',
        description: 'Устройство успешно отключено',
      });

      await checkConnection();
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
      {/* Connected Status */}
      {connection.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Whoop подключен
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Автоматическая синхронизация происходит каждые 6 часов. Вы также можете запустить синхронизацию вручную.
              </AlertDescription>
            </Alert>

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

            <div className="p-3 border rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5" />
                <div>
                  <p className="font-medium">Whoop</p>
                  <p className="text-xs text-muted-foreground">
                    Подключен {new Date(connection.connectedAt!).toLocaleDateString('ru-RU')}
                  </p>
                  {connection.lastSync && (
                    <p className="text-xs text-muted-foreground">
                      Последняя синхронизация: {new Date(connection.lastSync).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={disconnect}>
                <Unlink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connect Whoop */}
      {!connection.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Подключить Whoop</CardTitle>
            <CardDescription>
              Синхронизируйте данные с вашего Whoop устройства
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full h-auto p-4 justify-start"
              onClick={connectWhoop}
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  <span className="flex-1 text-left">Подключение...</span>
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-3" />
                  <span className="flex-1 text-left">Подключить Whoop</span>
                </>
              )}
            </Button>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Какие данные синхронизирует Whoop:</strong>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Recovery Score</strong> (% восстановления) - ежедневная оценка готовности организма</li>
                  <li><strong>Day Strain</strong> - общая нагрузка за день</li>
                  <li><strong>Workout Strain</strong> - нагрузка каждой тренировки</li>
                  <li><strong>Sleep Performance</strong> (%) - качество сна</li>
                  <li><strong>Sleep Efficiency</strong> (%) - эффективность сна</li>
                  <li><strong>Sleep Duration</strong> (часы) - продолжительность сна</li>
                  <li><strong>Calories</strong> - калории тренировок</li>
                  <li><strong>Heart Rate</strong> - пульс во время активностей</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

{/* Terra widget is now shown on the page itself */}
    </div>
  );
}
