import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/page-loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function WhoopOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Обработка авторизации Whoop...');

  useEffect(() => {
    if (authLoading) return;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('❌ [WhoopOAuthCallback] OAuth error:', error, errorDescription);
      setStatus('error');
      setMessage(errorDescription || 'Авторизация отклонена или произошла ошибка');
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('Код авторизации не получен');
      return;
    }

    if (!user) {
      setStatus('error');
      setMessage('Пожалуйста, войдите в аккаунт');
      return;
    }

    exchangeToken(code, state);
  }, [searchParams, user, authLoading]);

  const getReturnUrl = (): string => {
    const savedUrl = sessionStorage.getItem('whoop_return_url');
    sessionStorage.removeItem('whoop_return_url');
    sessionStorage.removeItem('whoop_connecting');
    
    // Default to fitness-data with connections tab
    if (!savedUrl) {
      return '/fitness-data?tab=connections';
    }
    
    return savedUrl;
  };

  const exchangeToken = async (code: string, state: string | null) => {
    try {
      setMessage('Обмен кода авторизации...');
      console.log('🔄 [WhoopOAuthCallback] Exchanging code for tokens...');

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Нет активной сессии');
      }

      const currentOrigin = window.location.origin;
      const response = await supabase.functions.invoke('whoop-auth', {
        body: { 
          action: 'exchange-token', 
          code, 
          state,
          redirect_uri: `${currentOrigin}/auth/whoop/oauth2`
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Ошибка обмена токена');
      }

      console.log('✅ [WhoopOAuthCallback] Token exchange successful');
      setStatus('success');
      setMessage('Whoop подключен! Запуск синхронизации...');

      // Trigger initial sync
      try {
        await supabase.functions.invoke('whoop-sync', {
          body: { days_back: 14 },
        });
        console.log('✅ [WhoopOAuthCallback] Initial sync completed');
      } catch (syncError) {
        console.warn('⚠️ [WhoopOAuthCallback] Initial sync failed:', syncError);
      }

      // Redirect back to saved URL
      const returnUrl = getReturnUrl();
      setMessage('Whoop подключен! Перенаправление...');
      console.log('🔀 [WhoopOAuthCallback] Redirecting to:', returnUrl);
      
      setTimeout(() => {
        navigate(returnUrl, { replace: true });
      }, 1500);

    } catch (error: any) {
      console.error('❌ [WhoopOAuthCallback] Error:', error);
      setStatus('error');
      setMessage(error.message || 'Не удалось подключить Whoop');
    }
  };

  const handleBackClick = () => {
    const returnUrl = getReturnUrl();
    navigate(returnUrl, { replace: true });
  };

  if (authLoading) {
    return <PageLoader message="Загрузка..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-destructive" />}
            Подключение Whoop
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'error' && (
            <div className="space-y-2">
              <Button onClick={handleBackClick} variant="outline">
                Вернуться назад
              </Button>
            </div>
          )}

          {status === 'success' && (
            <p className="text-sm text-muted-foreground">
              Данные Whoop начнут синхронизироваться автоматически.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
