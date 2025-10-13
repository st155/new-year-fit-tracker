import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function WhoopCallback() {
  const [status, setStatus] = useState<'processing'|'success'|'error'>('processing');
  const [message, setMessage] = useState<string>('Обмениваем код на токен...');
  const [progress, setProgress] = useState<number>(15);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      setStatus('error');
      setMessage('Отсутствует параметр code');
      return;
    }

    const run = async () => {
      try {
        setProgress(30);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Не авторизован');

        const redirectUri = `${window.location.origin}/whoop-callback`;
        const resp = await supabase.functions.invoke('whoop-integration', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { action: 'exchange-token', code, redirectUri }
        });

        if (resp.error) throw resp.error;
        setMessage('Токен получен. Загружаем данные Whoop...');
        setProgress(60);

        await supabase.functions.invoke('whoop-integration', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { action: 'sync-data' }
        });

        setProgress(100);
        setStatus('success');
        setMessage('Подключение Whoop успешно! Данные синхронизированы.');
        toast({ title: 'Whoop подключен', description: 'Данные будут доступны в дашборде через минуту.' });

        setTimeout(() => navigate('/integrations'), 1500);
      } catch (e: any) {
        console.error('WhoopCallback error', e);
        setStatus('error');
        setMessage(e?.message || 'Не удалось завершить подключение Whoop');
      }
    };

    run();
  }, []);

  const Icon = status === 'success' ? CheckCircle2 : status === 'error' ? AlertCircle : Loader2;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Подключение Whoop</CardTitle>
          <CardDescription>
            {status === 'processing' && 'Идёт настройка доступа и первичная синхронизация данных...'}
            {status === 'success' && 'Готово! Можно вернуться к интеграциям.'}
            {status === 'error' && 'Произошла ошибка при подключении.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Icon className={`h-6 w-6 ${status === 'processing' ? 'animate-spin' : ''}`} />
            <span>{message}</span>
          </div>
          <Progress value={progress} />
          <div className="mt-6 flex gap-3">
            {status === 'success' && (
              <Button onClick={() => navigate('/integrations')}>Вернуться к интеграциям</Button>
            )}
            {status === 'error' && (
              <Button variant="outline" onClick={() => navigate('/integrations')}>Попробовать снова</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}