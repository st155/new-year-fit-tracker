import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/page-loader';

// Очистка истёкших whoop_code записей из sessionStorage
const cleanupOldCodes = () => {
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('whoop_code_')) {
      const timestamp = parseInt(sessionStorage.getItem(key) || '0');
      const hoursAgo = (Date.now() - timestamp) / (1000 * 60 * 60);
      
      // Удалить коды старше 1 часа
      if (hoursAgo > 1) {
        sessionStorage.removeItem(key);
        console.log(`🧹 Removed old whoop_code: ${key}`);
      }
    }
  });
};

export default function WhoopCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Очистка старых кодов
      cleanupOldCodes();
      
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
      const existingUse = sessionStorage.getItem(usedKey);

      if (existingUse) {
        const timestamp = parseInt(existingUse);
        const minutesAgo = (Date.now() - timestamp) / (1000 * 60);
        
        // Если код был использован менее 5 минут назад - пропускаем
        if (minutesAgo < 5) {
          console.log('⚠️ Code already used recently, skipping');
          navigate('/integrations');
          return;
        }
        
        // Если прошло больше 5 минут - очищаем старую запись
        sessionStorage.removeItem(usedKey);
      }

      sessionStorage.setItem(usedKey, Date.now().toString());
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
