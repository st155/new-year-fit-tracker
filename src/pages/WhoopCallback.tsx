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
    // Timeout safety net: redirect after 10 seconds if still waiting for user
    const timeoutId = setTimeout(() => {
      if (!user && !processedRef.current) {
        console.error('❌ Timeout: user not loaded after 10 seconds');
        toast({ 
          title: 'Ошибка подключения', 
          description: 'Не удалось загрузить данные пользователя. Попробуйте снова.', 
          variant: 'destructive' 
        });
        navigate('/integrations');
      }
    }, 10000);

    const handleCallback = async () => {
      console.log('🔄 WhoopCallback: useEffect triggered', { 
        hasUser: !!user, 
        userId: user?.id,
        hasCode: !!searchParams.get('code'),
        hasState: !!searchParams.get('state')
      });

      // Очистка старых кодов
      cleanupOldCodes();
      
      if (processedRef.current) {
        console.log('✅ Already processed, skipping');
        return;
      }

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      console.log('📋 Callback params:', { 
        hasCode: !!code, 
        hasState: !!state, 
        hasError: !!error 
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        toast({ title: 'Ошибка авторизации', description: 'Не удалось подключить Whoop', variant: 'destructive' });
        navigate('/integrations');
        return;
      }

      if (!code || !state) {
        console.warn('⚠️ Missing code or state');
        navigate('/integrations');
        return;
      }

      if (!user) {
        console.log('⏳ Waiting for user to load...');
        return; // Exit early, useEffect will re-run when user changes
      }
      
      console.log('✅ User loaded:', user.id);

      if (state !== user.id) {
        console.error('❌ State mismatch:', { state, userId: user.id });
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
        
        console.log(`🔍 Code already used ${minutesAgo.toFixed(1)} minutes ago`);
        
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

      console.log('🚀 Exchanging authorization code...');

      try {
        const { error: exchangeError } = await supabase.functions.invoke('whoop-integration', {
          body: { action: 'exchange-code', code },
        });

        if (exchangeError) {
          console.error('❌ Exchange error:', exchangeError);
          throw exchangeError;
        }

        console.log('✅ Whoop connected successfully');
        toast({ title: 'Whoop подключен', description: 'Устройство успешно подключено' });
        navigate('/integrations');
      } catch (error: any) {
        console.error('❌ Whoop callback error:', error);
        const msg = typeof error?.message === 'string' && error.message.includes('already been used')
          ? 'Код уже использован — соединение почти наверняка установлено. Проверьте статус интеграции.'
          : (error?.message || 'Не удалось подключить Whoop');
        toast({ title: 'Ошибка', description: msg, variant: 'destructive' });
        navigate('/integrations');
      }
    };

    handleCallback();

    return () => clearTimeout(timeoutId);
  }, [searchParams, user, navigate, toast]);

  return <PageLoader message="Подключение Whoop..." />;
}
