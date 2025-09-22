import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Scale, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Heart, 
  Activity, 
  Moon, 
  TrendingUp, 
  RefreshCw,
  Unlink,
  ExternalLink
} from 'lucide-react';

interface WithingsStatus {
  connected: boolean;
  connectedAt?: string;
  scope?: string;
}

export const WithingsIntegration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<WithingsStatus>({ connected: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkConnectionStatus();
    }
  }, [user]);

  const checkConnectionStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('withings-integration', {
        body: { action: 'check-status' },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;
      setStatus(data);
    } catch (error: any) {
      console.error('Failed to check Withings status:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectWithings = async () => {
    console.log('Withings connect button clicked', { user });
    if (!user) {
      console.error('No user found');
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Get authorization URL
      const { data, error } = await supabase.functions.invoke('withings-integration', {
        body: { 
          action: 'get-auth-url',
          userId: user.id 
        }
      });

      if (error) throw error;

      // Open authorization window
      const authWindow = window.open(
        data.authUrl,
        'withings-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for auth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'withings-auth-success') {
          authWindow?.close();
          window.removeEventListener('message', handleMessage);
          
          toast({
            title: 'Подключено!',
            description: 'Withings успешно подключен к вашему аккаунту',
          });
          
          checkConnectionStatus();
          setIsConnecting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if window was closed manually
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }
      }, 1000);

    } catch (error: any) {
      console.error('Failed to connect Withings:', error);
      toast({
        title: 'Ошибка подключения',
        description: error.message || 'Не удалось подключить Withings',
        variant: 'destructive'
      });
      setIsConnecting(false);
    }
  };

  const syncData = async () => {
    if (!user) return;
    
    setIsSyncing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Не удалось получить токен авторизации');
      }

      const { data, error } = await supabase.functions.invoke('withings-integration', {
        body: { action: 'sync-data' },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: 'Синхронизация завершена!',
        description: `Импортировано: ${data.measurements} измерений, ${data.activities} активностей, ${data.sleep} записей сна, ${data.workouts} тренировок`,
      });

    } catch (error: any) {
      console.error('Failed to sync Withings data:', error);
      toast({
        title: 'Ошибка синхронизации',
        description: error.message || 'Не удалось синхронизировать данные',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnectWithings = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('withings_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setStatus({ connected: false });
      
      toast({
        title: 'Отключено',
        description: 'Withings отключен от вашего аккаунта',
      });

    } catch (error: any) {
      console.error('Failed to disconnect Withings:', error);
      toast({
        title: 'Ошибка отключения',
        description: error.message || 'Не удалось отключить Withings',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>Withings</CardTitle>
              <CardDescription>Умные весы и устройства здоровья</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Withings
                {status.connected && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Подключено
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Умные весы и устройства здоровья
              </CardDescription>
            </div>
          </div>
          
          {status.connected && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={syncData}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isSyncing ? 'Синхронизация...' : 'Синхронизировать'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectWithings}
              >
                <Unlink className="h-4 w-4 mr-2" />
                Отключить
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!status.connected ? (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Что синхронизируется:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Состав тела:</strong> вес, процент жира, мышечная масса, костная масса</li>
                  <li><strong>Активность:</strong> шаги, дистанция, калории</li>
                  <li><strong>Сон:</strong> длительность, фазы сна, качество</li>
                  <li><strong>Тренировки:</strong> автоматически распознанные активности</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-500 mb-2" />
                <span className="text-sm font-medium">Вес и состав</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                <Activity className="h-6 w-6 text-green-500 mb-2" />
                <span className="text-sm font-medium">Активность</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                <Moon className="h-6 w-6 text-purple-500 mb-2" />
                <span className="text-sm font-medium">Сон</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                <Heart className="h-6 w-6 text-red-500 mb-2" />
                <span className="text-sm font-medium">Пульс</span>
              </div>
            </div>

            <Button 
              onClick={connectWithings} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Подключение...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Подключить Withings
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Withings подключен!</strong>
                <br />
                Подключено: {new Date(status.connectedAt!).toLocaleDateString('ru-RU')}
                {status.scope && (
                  <>
                    <br />
                    Права доступа: {status.scope.split(',').join(', ')}
                  </>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">Доступные данные:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Измерения тела</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Активность</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Moon className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Данные сна</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Тренировки</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Автоматическая синхронизация:</strong> данные синхронизируются автоматически при подключении. 
                Используйте кнопку "Синхронизировать" для получения последних данных.
              </p>
              
              <div className="flex gap-2">
                <Button onClick={syncData} disabled={isSyncing} className="flex-1">
                  {isSyncing ? (
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
              </div>
            </div>
          </>
        )}

        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Поддерживаемые устройства:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Умные весы Body+ / Body Cardio / Body Comp</li>
              <li>Фитнес-трекеры Steel HR / ScanWatch</li>
              <li>Термометры Thermo</li>
              <li>Тонометры BPM Connect / BPM Core</li>
            </ul>
            <p className="text-xs pt-2">
              Для получения данных необходимо иметь аккаунт Withings и подключенные устройства.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};