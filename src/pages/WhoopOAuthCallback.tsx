import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type Status = 'loading' | 'success' | 'error';

interface ResultMessage {
  type: 'whoop-auth-result';
  success: boolean;
  whoopUserId?: string;
  error?: string;
}

export default function WhoopOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Обработка авторизации Whoop...');
  const [countdown, setCountdown] = useState<number | null>(null);
  const processedRef = useRef(false);
  
  // Detect if we're in a popup
  const isPopup = window.opener !== null;

  console.log('🪟 [WhoopCallback] Mounted, isPopup:', isPopup);

  useEffect(() => {
    if (authLoading) {
      console.log('⏳ [WhoopCallback] Waiting for auth...');
      return;
    }

    if (processedRef.current) {
      console.log('⏭️ [WhoopCallback] Already processed, skipping');
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('📋 [WhoopCallback] Params:', { 
      hasCode: !!code, 
      hasState: !!state, 
      error, 
      errorDescription,
      userId: user?.id 
    });

    if (error) {
      console.error('❌ [WhoopCallback] OAuth error:', error, errorDescription);
      handleError(errorDescription || error || 'Авторизация отклонена');
      return;
    }

    if (!code) {
      console.error('❌ [WhoopCallback] No code received');
      handleError('Код авторизации не получен');
      return;
    }

    if (!user) {
      console.error('❌ [WhoopCallback] No user session');
      handleError('Пожалуйста, войдите в аккаунт');
      return;
    }

    processedRef.current = true;
    exchangeToken(code, state);
  }, [searchParams, user, authLoading]);

  const sendResultToParent = (result: ResultMessage) => {
    if (isPopup && window.opener) {
      console.log('📨 [WhoopCallback] Sending result to parent:', result);
      try {
        window.opener.postMessage(result, window.location.origin);
      } catch (e) {
        console.error('❌ [WhoopCallback] Failed to send message to parent:', e);
      }
    }
  };

  const startCountdown = (seconds: number, onComplete: () => void) => {
    setCountdown(seconds);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          onComplete();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSuccess = (whoopUserId?: string) => {
    console.log('✅ [WhoopCallback] Success! Whoop user ID:', whoopUserId);
    setStatus('success');
    setMessage('Whoop успешно подключен!');

    sendResultToParent({
      type: 'whoop-auth-result',
      success: true,
      whoopUserId,
    });

    if (isPopup) {
      // Auto-close popup after 1.5 seconds
      startCountdown(2, () => {
        console.log('🪟 [WhoopCallback] Closing popup...');
        window.close();
      });
    } else {
      // Redirect after delay
      startCountdown(2, () => {
        const returnUrl = getReturnUrl();
        console.log('🔀 [WhoopCallback] Redirecting to:', returnUrl);
        navigate(returnUrl, { replace: true });
      });
    }
  };

  const handleError = (errorMessage: string) => {
    console.error('❌ [WhoopCallback] Error:', errorMessage);
    setStatus('error');
    setMessage(errorMessage);

    sendResultToParent({
      type: 'whoop-auth-result',
      success: false,
      error: errorMessage,
    });

    if (isPopup) {
      // Auto-close popup after 3 seconds
      startCountdown(3, () => {
        console.log('🪟 [WhoopCallback] Closing popup after error...');
        window.close();
      });
    }
  };

  const getReturnUrl = (): string => {
    const savedUrl = sessionStorage.getItem('whoop_return_url');
    sessionStorage.removeItem('whoop_return_url');
    sessionStorage.removeItem('whoop_connecting');
    
    if (!savedUrl) {
      return '/fitness-data?tab=connections';
    }
    
    return savedUrl;
  };

  const exchangeToken = async (code: string, state: string | null) => {
    try {
      setMessage('Обмен кода авторизации...');
      console.log('🔄 [WhoopCallback] Starting token exchange...');

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Нет активной сессии');
      }

      const currentOrigin = window.location.origin;
      const redirectUri = `${currentOrigin}/auth/whoop/oauth2`;
      
      console.log('📋 [WhoopCallback] Exchange params:', { 
        codePreview: code.substring(0, 10) + '...', 
        hasState: !!state,
        redirectUri 
      });

      const response = await supabase.functions.invoke('whoop-auth', {
        body: { 
          action: 'exchange-token', 
          code, 
          state,
          redirect_uri: redirectUri
        },
      });

      console.log('📋 [WhoopCallback] Exchange response:', response);

      if (response.error) {
        throw new Error(response.error.message || 'Ошибка обмена токена');
      }

      setMessage('Запуск начальной синхронизации...');
      console.log('✅ [WhoopCallback] Token exchange successful, starting sync...');

      // Trigger initial sync (non-blocking)
      try {
        await supabase.functions.invoke('whoop-sync', {
          body: { days_back: 14 },
        });
        console.log('✅ [WhoopCallback] Initial sync completed');
      } catch (syncError) {
        console.warn('⚠️ [WhoopCallback] Initial sync failed (non-critical):', syncError);
      }

      handleSuccess(response.data?.whoop_user_id);

    } catch (error: any) {
      console.error('❌ [WhoopCallback] Exchange error:', error);
      handleError(error.message || 'Не удалось подключить Whoop');
    }
  };

  const handleClose = () => {
    if (isPopup) {
      window.close();
    } else {
      const returnUrl = getReturnUrl();
      navigate(returnUrl, { replace: true });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Загрузка...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            {status === 'loading' && (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            )}
          </div>
          <CardTitle className="text-xl">
            {status === 'loading' && 'Подключение Whoop'}
            {status === 'success' && 'Успешно!'}
            {status === 'error' && 'Ошибка'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {countdown !== null && (
            <div className="space-y-2">
              <Progress value={(countdown / (status === 'success' ? 2 : 3)) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {isPopup ? 'Окно закроется' : 'Перенаправление'} через {countdown} сек...
              </p>
            </div>
          )}

          {status === 'success' && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Данные Whoop начнут синхронизироваться автоматически.
            </p>
          )}

          {(status === 'error' || status === 'success') && (
            <Button 
              onClick={handleClose} 
              variant={status === 'error' ? 'outline' : 'default'}
              className="w-full"
            >
              {isPopup ? 'Закрыть окно' : 'Вернуться назад'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
