import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

 type SyncStatus = 'pending' | 'authenticating' | 'syncing' | 'success' | 'error';

 const WithingsCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<SyncStatus>('pending');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const calledOnce = useRef(false);

  useEffect(() => {
    document.title = 'Withings Callback | Elite10';
  }, []);

  useEffect(() => {
    if (calledOnce.current) return;
    calledOnce.current = true;

    const handleWithingsCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const oauthError = searchParams.get('error');

      if (oauthError) {
        setStatus('error');
        setErrorMessage(`Ошибка авторизации: ${oauthError}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('Отсутствует код авторизации');
        return;
      }

      try {
        setStatus('authenticating');
        setProgress(25);

        const { data: { session } } = await supabase.auth.getSession();

        setProgress(50);
        setStatus('syncing');

        const { data, error } = await supabase.functions.invoke('withings-integration', {
          body: {
            action: 'handle-callback',
            code,
            state,
          },
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });

        if (error) throw new Error(error.message);

        setProgress(100);
        setStatus('success');

        toast({
          title: 'Withings подключен!',
          description: 'Авторизация прошла успешно. Запускаем синхронизацию данных...',
        });

        // После успешного колбэка можно перенаправить в интеграции
        setTimeout(() => {
          navigate('/integrations');
        }, 1500);
      } catch (e: any) {
        setStatus('error');
        setErrorMessage(e.message || 'Произошла неизвестная ошибка');
      }
    };

    handleWithingsCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        return 'Авторизация в Withings...';
      case 'syncing':
        return 'Синхронизация данных...';
      case 'success':
        return 'Готово!';
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
          <CardTitle className="text-xl">Подключение Withings</CardTitle>
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

          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Перенаправление через 1.5 секунды...
              </p>
              <Button onClick={() => navigate('/integrations')} className="w-full">
                Перейти к интеграциям
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex gap-2">
              <Button onClick={() => navigate('/integrations')} variant="outline" className="flex-1">
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

export default WithingsCallback;
