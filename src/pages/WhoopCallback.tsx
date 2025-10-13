import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/page-loader';

export default function WhoopCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (processedRef.current) return; // Guard against double-invoke

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        toast({ title: 'Ошибка авторизации', description: 'Не удалось подключить Whoop', variant: 'destructive' });
        navigate('/integrations');
        return;
      }

      if (!code || !state) {
        navigate('/integrations');
        return;
      }

      if (!user) {
        // Wait for user to load
        return;
      }

      if (state !== user.id) {
        toast({ title: 'Ошибка', description: 'Неверный state параметр', variant: 'destructive' });
        navigate('/integrations');
        return;
      }

      // Idempotency: prevent re-using the same code on refresh/strict mode
      const usedKey = `whoop_code_${code}`;
      if (sessionStorage.getItem(usedKey)) {
        navigate('/integrations');
        return;
      }
      sessionStorage.setItem(usedKey, '1');
      processedRef.current = true;

      try {
        const { error: exchangeError } = await supabase.functions.invoke('whoop-integration', {
          body: { action: 'exchange-code', code },
        });

        if (exchangeError) throw exchangeError;

        toast({ title: 'Whoop подключен', description: 'Устройство успешно подключено' });
        navigate('/integrations');
      } catch (error: any) {
        console.error('Whoop callback error:', error);
        const msg = typeof error?.message === 'string' && error.message.includes('already been used')
          ? 'Код уже использован — соединение почти наверняка установлено. Проверьте статус интеграции.'
          : (error?.message || 'Не удалось подключить Whoop');
        toast({ title: 'Ошибка', description: msg, variant: 'destructive' });
        navigate('/integrations');
      }
    };

    handleCallback();
  }, [searchParams, user, navigate, toast]);

  return <PageLoader message="Подключение Whoop..." />;
}
