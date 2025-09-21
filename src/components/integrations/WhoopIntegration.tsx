import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ErrorLogger } from '@/lib/error-logger';
import { 
  Heart, 
  Zap, 
  Moon, 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Unlink,
  Loader2
} from 'lucide-react';

interface WhoopIntegrationProps {
  userId: string;
}

interface WhoopStatus {
  isConnected: boolean;
  lastSync?: string;
}

interface RecentData {
  recoveryScore?: number;
  sleepEfficiency?: number;
  strain?: number;
  heartRate?: number;
  date: string;
}

export function WhoopIntegration({ userId }: WhoopIntegrationProps) {
  const [status, setStatus] = useState<WhoopStatus>({ isConnected: false });
  const [recentData, setRecentData] = useState<RecentData[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadWhoopStatus();
    if (status.isConnected) {
      loadRecentData();
    }
  }, [userId]);

  const loadWhoopStatus = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('whoop-integration', {
        body: { action: 'check-status' }
      });

      if (error) throw error;

      setStatus(data);
      
      if (data.isConnected) {
        await loadRecentData();
      }
    } catch (error: any) {
      console.error('Error loading Whoop status:', error);
      await ErrorLogger.logWhoopError(
        'Failed to load Whoop status',
        { error: error.message },
        userId
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentData = async () => {
    try {
      // Загружаем последние данные из metric_values
      const { data: metrics, error } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner(metric_name, source)
        `)
        .eq('user_id', userId)
        .eq('user_metrics.source', 'whoop')
        .order('measurement_date', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Группируем данные по дате
      const dataByDate: Record<string, RecentData> = {};
      
      metrics?.forEach((metric: any) => {
        const date = metric.measurement_date;
        if (!dataByDate[date]) {
          dataByDate[date] = { date };
        }

        const metricName = metric.user_metrics.metric_name;
        switch (metricName) {
          case 'Recovery Score':
            dataByDate[date].recoveryScore = metric.value;
            break;
          case 'Sleep Efficiency':
            dataByDate[date].sleepEfficiency = metric.value;
            break;
          case 'Workout Strain':
            dataByDate[date].strain = metric.value;
            break;
          case 'Average Heart Rate':
            dataByDate[date].heartRate = metric.value;
            break;
        }
      });

      const recentDataArray = Object.values(dataByDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setRecentData(recentDataArray);
    } catch (error: any) {
      console.error('Error loading recent data:', error);
      await ErrorLogger.logWhoopError(
        'Failed to load recent Whoop data',
        { error: error.message },
        userId
      );
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Получаем URL для авторизации
      const { data, error } = await supabase.functions.invoke('whoop-integration', {
        body: { action: 'auth' }
      });

      if (error) throw error;

      // Открываем окно авторизации
      const authWindow = window.open(
        data.authUrl,
        'whoop-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!authWindow) {
        throw new Error('Не удалось открыть окно авторизации. Проверьте настройки блокировщика всплывающих окон.');
      }

      // Слушаем сообщения от окна авторизации
      const handleMessage = async (event: MessageEvent) => {
        // Принимаем сообщения от Supabase функции или нашего origin
        if (event.origin !== window.location.origin && 
            !event.origin.includes('supabase.co')) return;

        if (event.data.type === 'whoop-auth-success') {
          authWindow?.close();
          window.removeEventListener('message', handleMessage);
          
          // Получаем временные токены из localStorage
          const tempTokens = JSON.parse(localStorage.getItem('whoop_temp_tokens') || '{}');
          localStorage.removeItem('whoop_temp_tokens');
          
          toast({
            title: 'Whoop подключен!',
            description: 'Ваш аккаунт Whoop успешно подключен.',
          });

          // Синхронизируем данные с токенами
          await syncDataWithTokens(tempTokens);
          await loadWhoopStatus();
          
        } else if (event.data.type === 'whoop-auth-error') {
          authWindow?.close();
          window.removeEventListener('message', handleMessage);
          throw new Error(event.data.error || 'Ошибка авторизации');
        }
      };

      window.addEventListener('message', handleMessage);

      // Проверяем, не закрыто ли окно
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }
      }, 1000);

    } catch (error: any) {
      console.error('Whoop connection error:', error);
      
      await ErrorLogger.logWhoopError(
        'Whoop connection failed',
        { error: error.message },
        userId
      );

      toast({
        title: 'Ошибка подключения',
        description: error.message || 'Не удалось подключить Whoop.',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const syncData = async () => {
    try {
      setIsSyncing(true);
      
      const { data, error } = await supabase.functions.invoke('whoop-integration', {
        body: { action: 'sync' }
      });

      if (error) throw error;

      toast({
        title: 'Синхронизация завершена',
        description: `Загружено ${data.syncResult?.totalSaved || 0} новых записей.`,
      });

      await loadRecentData();
      await loadWhoopStatus();

    } catch (error: any) {
      console.error('Sync error:', error);
      
      await ErrorLogger.logWhoopError(
        'Whoop sync failed',
        { error: error.message },
        userId
      );

      toast({
        title: 'Ошибка синхронизации',
        description: error.message || 'Не удалось синхронизировать данные.',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const syncDataWithTokens = async (tempTokens: any) => {
    try {
      setIsSyncing(true);
      
      const { data, error } = await supabase.functions.invoke('whoop-integration', {
        body: { 
          action: 'sync',
          tempTokens
        }
      });

      if (error) throw error;

      toast({
        title: 'Первая синхронизация завершена',
        description: `Загружено ${data.syncResult?.totalSaved || 0} записей из Whoop.`,
      });

      await loadRecentData();

    } catch (error: any) {
      console.error('Initial sync error:', error);
      
      await ErrorLogger.logWhoopError(
        'Initial Whoop sync failed',
        { error: error.message },
        userId
      );

      toast({
        title: 'Ошибка синхронизации',
        description: error.message || 'Не удалось синхронизировать данные.',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      
      const { data, error } = await supabase.functions.invoke('whoop-integration', {
        body: { action: 'disconnect' }
      });

      if (error) throw error;

      toast({
        title: 'Whoop отключен',
        description: 'Ваш аккаунт Whoop был отключен.',
      });

      setStatus({ isConnected: false });
      setRecentData([]);

    } catch (error: any) {
      console.error('Disconnect error:', error);
      
      await ErrorLogger.logWhoopError(
        'Whoop disconnect failed',
        { error: error.message },
        userId
      );

      toast({
        title: 'Ошибка отключения',
        description: error.message || 'Не удалось отключить Whoop.',
        variant: 'destructive'
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'recovery': return <Heart className="h-4 w-4" />;
      case 'sleep': return <Moon className="h-4 w-4" />;
      case 'strain': return <Zap className="h-4 w-4" />;
      case 'heartRate': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getMetricColor = (type: string, value?: number) => {
    if (!value) return 'text-muted-foreground';
    
    switch (type) {
      case 'recovery':
        if (value >= 67) return 'text-green-600';
        if (value >= 34) return 'text-yellow-600';
        return 'text-red-600';
      case 'sleep':
        if (value >= 85) return 'text-green-600';
        if (value >= 70) return 'text-yellow-600';
        return 'text-red-600';
      case 'strain':
        if (value >= 15) return 'text-red-600';
        if (value >= 10) return 'text-yellow-600';
        return 'text-green-600';
      default:
        return 'text-blue-600';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Загрузка статуса Whoop...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Whoop Integration
                {status.isConnected && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Подключено
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {status.isConnected 
                  ? `Последняя синхронизация: ${status.lastSync ? new Date(status.lastSync).toLocaleString('ru-RU') : 'Никогда'}`
                  : 'Подключите ваш аккаунт Whoop для автоматической синхронизации данных о восстановлении, сне и тренировках'
                }
              </CardDescription>
            </div>
          </div>
          
          {status.isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-red-600 hover:text-red-700"
            >
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unlink className="h-4 w-4 mr-2" />
              )}
              Отключить
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!status.isConnected ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Что такое Whoop?</strong>
                <br />
                Whoop - это носимое устройство для отслеживания восстановления, сна, нагрузки и частоты сердечных сокращений. 
                Подключив ваш аккаунт, вы сможете автоматически импортировать все ваши показатели.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Подключение...
                  </>
                ) : (
                  <>
                    <Heart className="h-4 w-4 mr-2" />
                    Подключить Whoop
                  </>
                )}
              </Button>
              
              <p className="text-sm text-muted-foreground text-center">
                Вы будете перенаправлены на сайт Whoop для авторизации
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button 
                onClick={syncData}
                disabled={isSyncing}
                variant="outline"
                className="flex-1"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Синхронизация...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Синхронизировать
                  </>
                )}
              </Button>
            </div>

            {recentData.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Последние данные</h4>
                <div className="space-y-2">
                  {recentData.map((data, index) => (
                    <div key={index} className="p-3 rounded-lg border bg-muted/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{formatDate(data.date)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {data.recoveryScore && (
                          <div className="flex items-center gap-2">
                            {getMetricIcon('recovery')}
                            <span className="text-muted-foreground">Восстановление:</span>
                            <span className={`font-medium ${getMetricColor('recovery', data.recoveryScore)}`}>
                              {data.recoveryScore}%
                            </span>
                          </div>
                        )}
                        
                        {data.sleepEfficiency && (
                          <div className="flex items-center gap-2">
                            {getMetricIcon('sleep')}
                            <span className="text-muted-foreground">Сон:</span>
                            <span className={`font-medium ${getMetricColor('sleep', data.sleepEfficiency)}`}>
                              {data.sleepEfficiency}%
                            </span>
                          </div>
                        )}
                        
                        {data.strain && (
                          <div className="flex items-center gap-2">
                            {getMetricIcon('strain')}
                            <span className="text-muted-foreground">Нагрузка:</span>
                            <span className={`font-medium ${getMetricColor('strain', data.strain)}`}>
                              {data.strain}
                            </span>
                          </div>
                        )}
                        
                        {data.heartRate && (
                          <div className="flex items-center gap-2">
                            {getMetricIcon('heartRate')}
                            <span className="text-muted-foreground">ЧСС:</span>
                            <span className={`font-medium ${getMetricColor('heartRate', data.heartRate)}`}>
                              {data.heartRate} bpm
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentData.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Нет данных для отображения. Нажмите "Синхронизировать" для загрузки последних данных с Whoop.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}