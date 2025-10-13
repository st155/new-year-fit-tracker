import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

type Status = 'processing' | 'success' | 'error';

export default function TerraCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('processing');
  const [message, setMessage] = useState('Обработка подключения...');

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const reference = searchParams.get('reference');

    console.log('Terra callback:', { success, error, reference });

    // Проверяем ошибки от Terra
    if (error) {
      setStatus('error');
      setMessage(decodeURIComponent(error));
      setTimeout(() => navigate('/integrations'), 5000);
      return;
    }

    // Если success=true, Terra успешно подключил устройство
    // Webhook auth уже должен был создать запись в terra_tokens
    if (success === 'true') {
      // Даем время webhook'у обработаться (обычно он срабатывает мгновенно)
      setTimeout(() => {
        setStatus('success');
        setMessage('Устройство успешно подключено!');
        
        // Перенаправляем на страницу интеграций через 2 секунды
        setTimeout(() => navigate('/integrations'), 2000);
      }, 1500);
    } else {
      // Нет явной ошибки, но и не success
      setStatus('error');
      setMessage('Не удалось подтвердить подключение');
      setTimeout(() => navigate('/integrations'), 5000);
    }
  }, [searchParams, navigate]);

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-12 w-12 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      case 'error':
        return <XCircle className="h-12 w-12 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'processing':
        return 'Подключение устройства...';
      case 'success':
        return 'Успешно подключено!';
      case 'error':
        return 'Ошибка подключения';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex flex-col items-center space-y-4">
            {getIcon()}
            <CardTitle className="text-center">{getTitle()}</CardTitle>
            <CardDescription className="text-center">{message}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'success' && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Ваше устройство подключено. Данные будут автоматически синхронизироваться каждые 6 часов.
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            {status === 'success' && (
              <Button onClick={() => navigate('/integrations')} className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                Перейти к интеграциям
              </Button>
            )}

            {status === 'error' && (
              <>
                <Button onClick={() => navigate('/integrations')} className="w-full">
                  Попробовать снова
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="w-full"
                >
                  Вернуться в дашборд
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
