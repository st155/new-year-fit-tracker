import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type CallbackStatus = 'processing' | 'success' | 'error';

export default function TerraCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [message, setMessage] = useState('Подключение устройства...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const reference = searchParams.get('reference');

    console.log('Terra callback params:', { success, error, reference });

    // Simulate connection progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    const processCallback = setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        setStatus('error');
        setMessage(`Ошибка подключения: ${error}`);
        toast.error('Не удалось подключить устройство');
      } else if (success === 'true') {
        setStatus('success');
        setMessage('Устройство успешно подключено! Terra API отправит данные через webhook.');
        toast.success('Устройство подключено');
      } else {
        setStatus('success');
        setMessage('Подключение завершено. Ожидайте поступления данных.');
      }
    }, 2000);

    // Redirect after delay
    const redirectTimeout = setTimeout(() => {
      const returnUrl = localStorage.getItem('terra_return_url') || '/integrations';
      localStorage.removeItem('terra_return_url');
      navigate(returnUrl);
    }, 4000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(processCallback);
      clearTimeout(redirectTimeout);
    };
  }, [searchParams, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-16 w-16 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-16 w-16 text-green-500" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-destructive" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'processing':
        return 'Подключение устройства';
      case 'success':
        return 'Успешно подключено';
      case 'error':
        return 'Ошибка подключения';
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl">{getStatusTitle()}</CardTitle>
          <CardDescription className="text-base mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {progress < 100 ? 'Обработка подключения...' : 'Готово'}
            </p>
          </div>

          {status === 'success' && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Что дальше?</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Terra API автоматически отправит ваши данные через webhook</li>
                <li>Данные появятся на дашборде в течение нескольких минут</li>
                <li>Вы можете синхронизировать данные вручную на странице интеграций</li>
              </ul>
            </div>
          )}

          <div className="flex justify-center gap-3 pt-4">
            {status === 'success' && (
              <Button
                onClick={() => navigate('/integrations')}
                variant="default"
              >
                Вернуться к интеграциям
              </Button>
            )}
            {status === 'error' && (
              <Button
                onClick={() => navigate('/integrations')}
                variant="outline"
              >
                Попробовать снова
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
