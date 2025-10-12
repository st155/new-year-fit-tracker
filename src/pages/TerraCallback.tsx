import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";

type CallbackStatus = 'processing' | 'success' | 'error';

export default function TerraCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    const provider = params.get('provider');

    // Симуляция прогресса
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        setStatus('error');
        setMessage(`Ошибка подключения: ${error}`);
      } else if (success) {
        setStatus('success');
        setMessage(provider 
          ? `${provider} успешно подключен через Terra API!` 
          : 'Устройство успешно подключено через Terra API!');
        
        // Получаем URL для возврата
        const returnUrl = sessionStorage.getItem('terra_return_url') || '/integrations';
        sessionStorage.removeItem('terra_return_url');
        
        // Автоматически перенаправить через 2 секунды
        setTimeout(() => {
          navigate(returnUrl);
        }, 2000);
      } else {
        setStatus('success');
        setMessage('Подключение завершено');
        
        // Получаем URL для возврата
        const returnUrl = sessionStorage.getItem('terra_return_url') || '/integrations';
        sessionStorage.removeItem('terra_return_url');
        
        setTimeout(() => {
          navigate(returnUrl);
        }, 2000);
      }
    }, 2000);

    return () => clearInterval(progressInterval);
  }, [navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-16 w-16 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-16 w-16 text-green-500" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-destructive" />;
    }
  };

  const getStatusTitle = () => {
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex flex-col items-center space-y-4">
            {getStatusIcon()}
            <CardTitle className="text-2xl text-center">
              {getStatusTitle()}
            </CardTitle>
            <CardDescription className="text-center">
              {message || 'Обрабатываем подключение через Terra API...'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="w-full" />
          
          {status === 'success' && (
            <div className="flex flex-col gap-2 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span>Данные начнут синхронизироваться автоматически</span>
              </div>
              <Button 
                onClick={() => navigate('/integrations')} 
                className="w-full mt-2"
              >
                Вернуться к интеграциям
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col gap-2 pt-4">
              <Button 
                onClick={() => navigate('/integrations')} 
                variant="outline"
                className="w-full"
              >
                Попробовать снова
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
