import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type SyncStatus = 'pending' | 'authenticating' | 'syncing' | 'success' | 'error';

const WhoopCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<SyncStatus>('pending');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    const handleWhoopCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');

      if (error) {
        setStatus('error');
        setErrorMessage(`Ошибка авторизации: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setErrorMessage('Отсутствует код авторизации или состояние');
        return;
      }

      try {
        setStatus('authenticating');
        setProgress(25);

        // Получаем токены через edge функцию
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Необходима аутентификация');
        }

        setProgress(50);
        setStatus('syncing');

        // Синхронизируем данные
        const { data, error: syncError } = await supabase.functions.invoke('whoop-integration', {
          body: { 
            action: 'sync',
            tempTokens: JSON.parse(localStorage.getItem('whoop_temp_tokens') || '{}')
          }
        });

        localStorage.removeItem('whoop_temp_tokens');

        if (syncError) {
          throw new Error(syncError.message);
        }

        setProgress(100);
        setStatus('success');
        setSyncResult(data.syncResult);

        toast({
          title: 'Whoop подключен!',
          description: 'Ваши данные Whoop успешно синхронизированы.',
        });

        // Автоматически перенаправляем через 3 секунды
        setTimeout(() => {
          navigate('/progress');
        }, 3000);

      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error.message || 'Произошла неизвестная ошибка');
      }
    };

    handleWhoopCallback();
  }, [navigate, toast, searchParams]);

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
      case 'authenticating':
      case 'syncing':
        return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Clock className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Подготовка к подключению...';
      case 'authenticating':
        return 'Авторизация в Whoop...';
      case 'syncing':
        return 'Синхронизация данных...';
      case 'success':
        return 'Данные успешно синхронизированы!';
      case 'error':
        return 'Произошла ошибка';
      default:
        return 'Ожидание...';
    }
  };

  const getProgressValue = () => {
    switch (status) {
      case 'pending': return 0;
      case 'authenticating': return 25;
      case 'syncing': return 75;
      case 'success': return 100;
      case 'error': return progress;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-xl">Подключение Whoop</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">{getStatusText()}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Прогресс</span>
              <span>{getProgressValue()}%</span>
            </div>
            <Progress value={getProgressValue()} className="w-full" />
          </div>

          {status === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{errorMessage}</p>
            </div>
          )}

          {status === 'success' && syncResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
              <p className="text-green-800 font-medium">Синхронизировано:</p>
              <ul className="text-green-700 text-sm space-y-1">
                {syncResult.recoveryRecords > 0 && (
                  <li>• Восстановление: {syncResult.recoveryRecords} записей</li>
                )}
                {syncResult.sleepRecords > 0 && (
                  <li>• Сон: {syncResult.sleepRecords} записей</li>
                )}
                {syncResult.workoutRecords > 0 && (
                  <li>• Тренировки: {syncResult.workoutRecords} записей</li>
                )}
                <li className="font-medium">Всего сохранено: {syncResult.totalSaved} метрик</li>
              </ul>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Перенаправление на страницу прогресса через 3 секунды...
              </p>
              <Button onClick={() => navigate('/progress')} className="w-full">
                Перейти к прогрессу
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex gap-2">
              <Button onClick={() => navigate('/progress')} variant="outline" className="flex-1">
                Назад
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1">
                Повторить
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhoopCallback;