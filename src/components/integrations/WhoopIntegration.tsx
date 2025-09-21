import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Activity, Heart, Moon, Dumbbell } from 'lucide-react';

interface WhoopIntegrationProps {
  userId: string;
}

interface WhoopData {
  lastSync?: string;
  isConnected: boolean;
  recentData?: any[];
}

export function WhoopIntegration({ userId }: WhoopIntegrationProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [whoopData, setWhoopData] = useState<WhoopData>({ isConnected: false });
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      // Инициируем OAuth процесс с Whoop
      const { data, error } = await supabase.functions.invoke('whoop-integration', {
        body: {
          userId,
          redirectUri: `${window.location.origin}/whoop-callback`,
          action: 'auth'
        }
      });

      if (error) throw error;

      if (data.authUrl) {
        // Открываем окно авторизации Whoop
        const authWindow = window.open(
          data.authUrl,
          'whoop-auth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Слушаем сообщения от окна авторизации
        const messageListener = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'whoop-auth-success') {
            authWindow?.close();
            window.removeEventListener('message', messageListener);
            
            toast({
              title: 'Успешно подключено!',
              description: 'Ваш аккаунт Whoop успешно подключен.',
            });
            
            setWhoopData(prev => ({ ...prev, isConnected: true }));
            syncData();
          } else if (event.data.type === 'whoop-auth-error') {
            authWindow?.close();
            window.removeEventListener('message', messageListener);
            
            toast({
              title: 'Ошибка подключения',
              description: event.data.error || 'Не удалось подключить аккаунт Whoop.',
              variant: 'destructive'
            });
          }
        };

        window.addEventListener('message', messageListener);
        
        // Проверяем, если окно было закрыто вручную
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            setIsConnecting(false);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось инициировать подключение к Whoop.',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const syncData = async () => {
    setIsSyncing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('whoop-integration', {
        body: {
          userId,
          action: 'sync'
        }
      });

      if (error) throw error;

      toast({
        title: 'Данные синхронизированы',
        description: `Обновлено: Recovery(${data.syncResults.recovery}), Sleep(${data.syncResults.sleep}), Workouts(${data.syncResults.workouts})`,
      });

      // Получаем обновленные данные
      await loadWhoopData();
      
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: 'Ошибка синхронизации',
        description: 'Не удалось синхронизировать данные с Whoop.',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const loadWhoopData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whoop-integration', {
        body: {
          userId,
          action: 'get-data'
        }
      });

      if (error) throw error;

      setWhoopData(prev => ({
        ...prev,
        recentData: data.data,
        lastSync: new Date().toISOString()
      }));
      
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const getMetricIcon = (notes: string) => {
    if (notes.includes('Recovery')) return <Heart className="h-4 w-4" />;
    if (notes.includes('Sleep')) return <Moon className="h-4 w-4" />;
    if (notes.includes('Workout')) return <Dumbbell className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getMetricColor = (notes: string) => {
    if (notes.includes('Recovery')) return 'bg-green-500/10 text-green-700';
    if (notes.includes('Sleep')) return 'bg-blue-500/10 text-blue-700';
    if (notes.includes('Workout')) return 'bg-orange-500/10 text-orange-700';
    return 'bg-gray-500/10 text-gray-700';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            W
          </div>
          Whoop Integration
        </CardTitle>
        <CardDescription>
          Подключите ваш Whoop для автоматической синхронизации данных о восстановлении, сне и тренировках.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!whoopData.isConnected ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Подключите ваш аккаунт Whoop для получения детальных данных о здоровье и фитнесе.
            </p>
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Подключение...
                </>
              ) : (
                'Подключить Whoop'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                  ✓ Подключено
                </Badge>
                {whoopData.lastSync && (
                  <span className="text-sm text-muted-foreground">
                    Последняя синхронизация: {new Date(whoopData.lastSync).toLocaleString()}
                  </span>
                )}
              </div>
              <Button 
                onClick={syncData} 
                disabled={isSyncing}
                variant="outline"
                size="sm"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Синхронизация...
                  </>
                ) : (
                  'Синхронизировать'
                )}
              </Button>
            </div>

            {whoopData.recentData && whoopData.recentData.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Последние данные:</h4>
                <div className="grid gap-2 max-h-40 overflow-y-auto">
                  {whoopData.recentData.slice(0, 10).map((measurement) => (
                    <div 
                      key={measurement.id} 
                      className="flex items-center gap-3 p-2 rounded-lg border bg-card/50"
                    >
                      <div className={`p-1 rounded ${getMetricColor(measurement.notes)}`}>
                        {getMetricIcon(measurement.notes)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {measurement.value} {measurement.unit}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(measurement.measurement_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {measurement.notes}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <p>• Recovery Score: Показатель восстановления организма</p>
              <p>• Sleep: Качество и продолжительность сна</p>
              <p>• Strain: Нагрузка от тренировок и активности</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}