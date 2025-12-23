import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Status = 'processing' | 'success' | 'error';

const PROVIDER_NAMES: Record<string, string> = {
  WHOOP: 'Whoop',
  GARMIN: 'Garmin',
  FITBIT: 'Fitbit',
  OURA: 'Oura Ring',
  WITHINGS: 'Withings',
  POLAR: 'Polar',
  SUUNTO: 'Suunto',
  PELOTON: 'Peloton',
  ULTRAHUMAN: 'Ultrahuman',
};

export default function TerraCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('processing');
  const [message, setMessage] = useState('Обработка подключения...');
  
  // Detect if we're running in a popup window
  const isPopup = window.opener !== null && window.opener !== window;
  
  // Helper to notify parent and close popup
  const notifyParentAndClose = (success: boolean, provider: string, error?: string) => {
    if (isPopup && window.opener) {
      try {
        window.opener.postMessage({
          type: 'terra-connection-result',
          success,
          provider,
          error,
        }, '*');
      } catch (e) {
        console.error('Failed to notify parent:', e);
      }
      
      // Close popup after a short delay
      setTimeout(() => {
        window.close();
      }, 500);
      return true;
    }
    return false;
  };

  useEffect(() => {
    const run = async () => {
      const success = searchParams.get('success');
      const statusParam = searchParams.get('status');
      const errorParam = searchParams.get('error') || searchParams.get('message');
      const reference = searchParams.get('reference') || searchParams.get('reference_id');
      const terraUserId = searchParams.get('user') || searchParams.get('user_id') || searchParams.get('terra_user_id');
      
      // Determine provider from URL params or sessionStorage
      let providerParam = searchParams.get('provider') || searchParams.get('source') || searchParams.get('resource');
      
      if (!providerParam) {
        // Try to get from sessionStorage
        providerParam = sessionStorage.getItem('terra_last_provider');
        console.log('📝 Retrieved provider from sessionStorage:', providerParam);
      }
      
      if (!providerParam) {
        console.error('❌ No provider detected in URL or sessionStorage');
        setStatus('error');
        setMessage('Не удалось определить устройство. Попробуйте подключить еще раз.');
        setTimeout(() => navigate('/integrations'), 3000);
        return;
      }
      
      providerParam = providerParam.toUpperCase();
      console.log('✅ Provider detected:', providerParam);

      console.log('Terra callback:', { success, statusParam, errorParam, reference, terraUserId, providerParam });

      // Если Terra вернула terra_user_id прямо в редиректе, связываем пользователя без ожидания вебхука
      if (terraUserId) {
        try {
          const { data: userRes } = await supabase.auth.getUser();
          const uid = userRes.user?.id;
          if (uid) {
            setStatus('processing');
            setMessage('Подтверждаем подключение...');

            const { data: existing } = await supabase
              .from('terra_tokens')
              .select('id')
              .eq('user_id', uid)
              .eq('provider', providerParam)
              .maybeSingle();

            if (existing?.id) {
              await supabase.from('terra_tokens').update({
                terra_user_id: terraUserId,
                is_active: true,
                updated_at: new Date().toISOString(),
              }).eq('id', existing.id);
            } else {
              await supabase.from('terra_tokens').insert({
                user_id: uid,
                terra_user_id: terraUserId,
                provider: providerParam,
                is_active: true,
              });
            }

            // Запускаем синхронизацию
            setStatus('success');
            setMessage('Устройство подключено! Запускаем синхронизацию данных...');
            try {
              const { data, error } = await supabase.functions.invoke('terra-integration', {
                body: { action: 'sync-data' }
              });
              if (error) {
                console.error('Sync error:', error);
                setMessage('Устройство подключено! Данные можно синхронизировать вручную.');
              } else {
                console.log('Sync initiated:', data);
                setMessage('Устройство подключено и данные синхронизированы!');
              }
            } catch (e) {
              console.error('Sync error:', e);
              setMessage('Устройство подключено! Данные можно синхронизировать вручную.');
            }

            // If popup, notify parent and close
            if (notifyParentAndClose(true, providerParam)) {
              return;
            }
            
            setTimeout(() => navigate('/integrations'), 500);
            return;
          }
        } catch (e) {
          console.error('Direct bind error:', e);
        }
      }

      // Явная ошибка от Terra/провайдера
      if (errorParam) {
        const decodedError = decodeURIComponent(errorParam);
        const isSessionExpired = decodedError.toLowerCase().includes('session') || 
                                  decodedError.toLowerCase().includes('expired') ||
                                  decodedError.toLowerCase().includes('timeout');
        
        setStatus('error');
        
        if (isSessionExpired) {
          setMessage('Сессия авторизации истекла. Это может произойти, если авторизация заняла больше 5 минут. Нажмите "Попробовать снова" для повторной попытки.');
        } else {
          setMessage(decodedError);
        }
        
        // If popup, notify parent and close (even on error)
        if (notifyParentAndClose(false, providerParam, isSessionExpired ? 'Session expired' : decodedError)) {
          return;
        }
        
        // Не делаем автоматический редирект при session expired — даём пользователю время нажать retry
        if (!isSessionExpired) {
          setTimeout(() => navigate('/fitness-data?tab=integrations'), 5000);
        }
        return;
      }

      // Частые варианты успешного ответа Terra Widget
      const widgetSuccess =
        success === 'true' ||
        statusParam === 'success' ||
        searchParams.get('connected') === 'true' ||
        searchParams.get('widget_success') === 'true';

      if (widgetSuccess) {
        // Создаем запись в terra_tokens сразу же
        try {
          const { data: userRes } = await supabase.auth.getUser();
          const uid = userRes.user?.id;
          
            if (uid) {
              setStatus('processing');
              setMessage(`Сохраняем подключение ${PROVIDER_NAMES[providerParam] || providerParam}...`);

              const { data: existing } = await supabase
                .from('terra_tokens')
                .select('id')
                .eq('user_id', uid)
                .eq('provider', providerParam)
                .maybeSingle();

              if (existing?.id) {
                await supabase.from('terra_tokens').update({
                  is_active: true,
                  updated_at: new Date().toISOString(),
                }).eq('id', existing.id);
              } else {
                // Создаем новую запись без terra_user_id (он придет позже через webhook)
                await supabase.from('terra_tokens').insert({
                  user_id: uid,
                  provider: providerParam,
                  terra_user_id: null, // Will be filled by webhook
                  is_active: true,
                  last_sync_date: null, // Will be filled after first sync
                });
              }

              setStatus('success');
              setMessage(`${PROVIDER_NAMES[providerParam] || providerParam} подключён! Ожидаем данные от Terra...`);

              // Poll for active token for 15 seconds
              let pollAttempts = 0;
              const maxPollAttempts = 15;
              const pollInterval = setInterval(async () => {
                pollAttempts++;
                
                const { data: tokenCheck } = await supabase
                  .from('terra_tokens')
                  .select('terra_user_id')
                  .eq('user_id', uid)
                  .eq('provider', providerParam)
                  .eq('is_active', true)
                  .single();
                
                if (tokenCheck?.terra_user_id || pollAttempts >= maxPollAttempts) {
                  clearInterval(pollInterval);
                  
                  // Clear sessionStorage
                  sessionStorage.removeItem('terra_last_provider');
                  sessionStorage.removeItem('terra_return_url');
                  
                  // If popup, notify parent and close
                  if (notifyParentAndClose(true, providerParam)) {
                    return;
                  }
                  
                  // Redirect to saved URL or integrations
                  const returnUrl = sessionStorage.getItem('terra_return_url') || '/integrations';
                  navigate(returnUrl);
                }
              }, 1000);

              return;
            }
          } catch (e) {
            console.error('Error creating terra token:', e);
          }
        
        setStatus('success');
        setMessage('Устройство успешно подключено! Запускаем синхронизацию данных...');
        
        // Автоматически запускаем синхронизацию данных после подключения
        try {
          setMessage('Синхронизируем данные...');
          
          const { data, error } = await supabase.functions.invoke('terra-integration', {
            body: { action: 'sync-data' }
          });
          
          if (error) {
            console.error('Sync error:', error);
            setMessage('Устройство подключено! Данные можно синхронизировать вручную.');
          } else {
            console.log('Sync initiated:', data);
            setMessage('Устройство подключено и данные синхронизированы!');
          }
        } catch (e) {
          console.error('Sync error:', e);
          setMessage('Устройство подключено! Данные можно синхронизировать вручную.');
        }
        
        // If popup, notify parent and close
        if (notifyParentAndClose(true, providerParam)) {
          return;
        }
        
        setTimeout(() => navigate('/integrations'), 500);
        return;
      }

      // Фоллбек: проверяем, появился ли активный terra_token для пользователя с коротким поллингом (до 12с)
      try {
        setStatus('processing');
        setMessage('Проверяем подключение...');
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes.user?.id;

        if (userId) {
          const pollForToken = async () => {
            for (let i = 0; i < 12; i++) {
              const { data: tokens, error } = await supabase
                .from('terra_tokens')
                .select('id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .limit(1);

              if (!error && tokens && tokens.length > 0) return true;
              await new Promise((r) => setTimeout(r, 1000));
            }
            return false;
          };

          const tokensReady = await pollForToken();

          if (tokensReady) {
            setStatus('success');
            setMessage('Устройство успешно подключено! Запускаем синхронизацию...');

            // Автоматически запускаем синхронизацию
            try {
              setMessage('Синхронизируем данные...');
              const { data, error: syncError } = await supabase.functions.invoke('terra-integration', {
                body: { action: 'sync-data' }
              });

              if (syncError) {
                console.error('Sync error:', syncError);
                setMessage('Устройство подключено! Данные можно синхронизировать вручную.');
              } else {
              console.log('Sync initiated:', data);
              setMessage('Устройство подключено и данные синхронизированы!');
            }
          } catch (e) {
            console.error('Sync error:', e);
            setMessage('Устройство подключено! Данные можно синхронизировать вручную.');
          }
          
          // If popup, notify parent and close
          if (notifyParentAndClose(true, providerParam)) {
            return;
          }

            setTimeout(() => navigate('/integrations'), 500);
            return;
          }
        }

        setStatus('error');
        setMessage('Не удалось подтвердить подключение');
        setTimeout(() => navigate('/integrations'), 5000);
      } catch (e) {
        console.error('Terra callback check error', e);
        setStatus('error');
        setMessage('Не удалось подтвердить подключение');
        setTimeout(() => navigate('/integrations'), 5000);
      }
    };

    run();
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

          {status === 'error' && message.includes('истекла') && (
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <AlertDescription className="text-sm space-y-3">
                <p className="font-semibold">Как исправить:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                  <li>Откройте приложение WHOOP/Oura/Garmin на телефоне</li>
                  <li>Выйдите из аккаунта и войдите заново</li>
                  <li>Вернитесь сюда и нажмите "Попробовать снова"</li>
                  <li>Завершите авторизацию <strong>в течение 5 минут</strong></li>
                </ol>
                <p className="text-xs text-muted-foreground pt-1">
                  Если проблема повторяется, попробуйте подключиться с другого браузера или устройства.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            {status === 'success' && (
              <Button onClick={() => navigate('/fitness-data?tab=integrations')} className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                Перейти к интеграциям
              </Button>
            )}

            {status === 'error' && (
              <>
                <Button 
                  onClick={() => {
                    // Получаем провайдера из sessionStorage и открываем виджет заново
                    const lastProvider = sessionStorage.getItem('terra_last_provider');
                    if (lastProvider) {
                      navigate(`/terra-widget-loader?provider=${encodeURIComponent(lastProvider)}`);
                    } else {
                      navigate('/fitness-data?tab=integrations');
                    }
                  }} 
                  className="w-full"
                >
                  Попробовать снова
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/fitness-data?tab=integrations')}
                  className="w-full"
                >
                  Вернуться к интеграциям
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
