import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function WhoopCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      try {
        if (error) {
          throw new Error(error);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state');
        }

        // Отправляем код обратно в Edge Function для обмена на токен
        const { data, error: callbackError } = await supabase.functions.invoke('whoop-integration?action=callback', {
          body: {
            code,
            state
          }
        });

        if (callbackError) throw callbackError;

        // Уведомляем родительское окно об успехе
        window.opener?.postMessage({
          type: 'whoop-auth-success',
          data
        }, window.location.origin);

      } catch (error) {
        console.error('Callback error:', error);
        
        // Уведомляем родительское окно об ошибке
        window.opener?.postMessage({
          type: 'whoop-auth-error',
          error: error.message
        }, window.location.origin);
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <h2 className="text-lg font-semibold">Завершение подключения Whoop...</h2>
        <p className="text-muted-foreground">
          Пожалуйста, подождите. Это окно закроется автоматически.
        </p>
      </div>
    </div>
  );
}