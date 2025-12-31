import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { terraApi } from '@/lib/api/client';

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
  const { t } = useTranslation('integrations');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('processing');
  const [message, setMessage] = useState(t('callback.processing'));
  
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

  // Helper to log connection attempt with ALL available data
  const logConnectionAttempt = async (
    userId: string, 
    provider: string, 
    status: 'callback_received' | 'success' | 'error' | 'waiting_webhook',
    errorMessage?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      // Capture ALL URL parameters
      const urlParams = Object.fromEntries(searchParams.entries());
      
      // Extract known Terra callback params
      const terraUserId = searchParams.get('user') || searchParams.get('user_id') || null;
      const referenceId = searchParams.get('reference') || searchParams.get('reference_id') || null;
      const resource = searchParams.get('resource') || searchParams.get('provider') || null;
      const sessionId = searchParams.get('session_id') || null;
      
      console.log('📝 Logging connection attempt:', {
        userId,
        provider,
        status,
        terraUserId,
        referenceId,
        resource,
        sessionId,
        urlParams,
      });
      
      await supabase.from('terra_connection_attempts').insert({
        user_id: userId,
        provider: provider.toUpperCase(),
        status,
        error_message: errorMessage,
        url_params: urlParams,
        session_id: sessionId,
        terra_user_id: terraUserId,
        metadata: { 
          ...metadata, 
          callback_url: window.location.href,
          reference_id: referenceId,
          resource,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
        }
      });
      console.log(`📝 Logged connection attempt: ${status} for ${provider}`);
    } catch (e) {
      console.error('Failed to log connection attempt:', e);
    }
  };

  useEffect(() => {
    const run = async () => {
      const success = searchParams.get('success');
      const statusParam = searchParams.get('status');
      const errorParam = searchParams.get('error') || searchParams.get('message');
      const reference = searchParams.get('reference') || searchParams.get('reference_id');
      const terraUserId = searchParams.get('user') || searchParams.get('user_id') || searchParams.get('terra_user_id');
      const timestamp = searchParams.get('ts'); // Cache-busting timestamp
      
      // Determine provider from URL params FIRST (primary), then sessionStorage (backup)
      let providerParam = searchParams.get('provider') || searchParams.get('source') || searchParams.get('resource');
      
      if (!providerParam) {
        // Fallback to sessionStorage (for legacy flows or popup mode)
        providerParam = sessionStorage.getItem('terra_last_provider');
        console.log('📝 Retrieved provider from sessionStorage (fallback):', providerParam);
      }
      
      console.log('🔍 Terra callback params:', { 
        success, statusParam, errorParam, reference, terraUserId, providerParam, timestamp,
        url: window.location.href 
      });
      
      // CRITICAL: Check if user is logged in FIRST
      const { data: userRes, error: authError } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      
      if (authError || !uid) {
        console.error('❌ User not logged in on callback page:', authError);
        setStatus('error');
        setMessage(t('callback.notAuthorized'));
        
        // Don't auto-redirect, let user see the message and act
        return;
      }
      
      console.log('✅ User authenticated:', uid);
      
      if (!providerParam) {
        console.error('❌ No provider detected in URL or sessionStorage');
        setStatus('error');
        setMessage(t('callback.noProvider'));
        setTimeout(() => navigate('/integrations'), 3000);
        return;
      }
      
      providerParam = providerParam.toUpperCase();
      console.log('✅ Provider detected:', providerParam);

      // Если Terra вернула terra_user_id прямо в редиректе, связываем пользователя без ожидания вебхука
      if (terraUserId) {
        // Log callback received
        await logConnectionAttempt(uid, providerParam, 'callback_received', undefined, { terraUserId, hasDirectBind: true });
        
        try {
          setStatus('processing');
          setMessage(t('callback.confirming'));

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

          // Log success
          await logConnectionAttempt(uid, providerParam, 'success', undefined, { terraUserId, syncStarted: true });
          
          // Запускаем синхронизацию
          setStatus('success');
          setMessage(t('callback.connectedSyncing'));
          try {
            const { error } = await terraApi.syncData();
            if (error) {
              console.error('Sync error:', error);
              setMessage(t('callback.connectedManualSync'));
            } else {
              setMessage(t('callback.connectedSynced'));
            }
          } catch (e) {
            console.error('Sync error:', e);
            setMessage(t('callback.connectedManualSync'));
          }

          // Clear sessionStorage
          sessionStorage.removeItem('terra_last_provider');
          sessionStorage.removeItem('terra_return_url');

          // If popup, notify parent and close
          if (notifyParentAndClose(true, providerParam)) {
            return;
          }
          
          setTimeout(() => navigate('/integrations'), 500);
          return;
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
        
        // Log error to database for debugging
        await logConnectionAttempt(uid, providerParam, 'error', decodedError, { isSessionExpired });
        
        setStatus('error');
        
        if (isSessionExpired) {
          setMessage(t('callback.sessionExpired'));
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
        // Log callback received BEFORE any processing
        await logConnectionAttempt(uid, providerParam, 'callback_received', undefined, { 
          widgetSuccess: true,
          successParam: success,
          statusParam
        });
        
        // Создаем запись в terra_tokens сразу же
        try {
          const { data: userRes } = await supabase.auth.getUser();
          const uid = userRes.user?.id;
          
            if (uid) {
              setStatus('processing');
              setMessage(t('callback.savingConnection', { provider: PROVIDER_NAMES[providerParam] || providerParam }));

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

              // Log that we're waiting for webhook
              await logConnectionAttempt(uid, providerParam, 'waiting_webhook', undefined, { 
                tokenCreated: true,
                waitingForTerraUserId: true
              });

              setStatus('success');
              setMessage(t('callback.waitingTerra', { provider: PROVIDER_NAMES[providerParam] || providerParam }));

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
        setMessage(t('callback.connectedSyncing'));
        
        // Автоматически запускаем синхронизацию данных после подключения
        try {
          setMessage(t('callback.syncingData'));
          
          const { error } = await terraApi.syncData();
          
          if (error) {
            console.error('Sync error:', error);
            setMessage(t('callback.connectedManualSync'));
          } else {
            setMessage(t('callback.connectedSynced'));
          }
        } catch (e) {
          console.error('Sync error:', e);
          setMessage(t('callback.connectedManualSync'));
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
        setMessage(t('callback.checkingConnection'));
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
            setMessage(t('callback.connectedSyncing'));

            // Автоматически запускаем синхронизацию
            try {
              setMessage(t('callback.syncingData'));
              const { error: syncError } = await terraApi.syncData();

              if (syncError) {
                console.error('Sync error:', syncError);
                setMessage(t('callback.connectedManualSync'));
              } else {
              setMessage(t('callback.connectedSynced'));
            }
          } catch (e) {
            console.error('Sync error:', e);
            setMessage(t('callback.connectedManualSync'));
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
        setMessage(t('callback.confirmFailed'));
        setTimeout(() => navigate('/integrations'), 5000);
      }
    };

    run();
  }, [searchParams, navigate, t]);

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
        return t('callback.processing');
      case 'success':
        return t('callback.success');
      case 'error':
        return t('callback.connectionError');
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
                {t('callback.autoSyncEnabled')}
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

          {status === 'error' && (message.includes('истекла') || message.includes('expired')) && (
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <AlertDescription className="text-sm space-y-3">
                <p className="font-semibold">{t('callback.howToFix')}</p>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                  <li>{t('callback.fixStep1')}</li>
                  <li>{t('callback.fixStep2')}</li>
                  <li>{t('callback.fixStep3')}</li>
                  <li dangerouslySetInnerHTML={{ __html: t('callback.fixStep4') }} />
                </ol>
                <p className="text-xs text-muted-foreground pt-1">
                  {t('callback.fixTip')}
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            {status === 'success' && (
              <Button onClick={() => navigate('/fitness-data?tab=integrations')} className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                {t('callback.goToIntegrations')}
              </Button>
            )}

            {status === 'error' && (
              <>
                <Button 
                  onClick={() => {
                    // Получаем провайдера из URL или sessionStorage и открываем виджет заново
                    const urlProvider = searchParams.get('provider');
                    const lastProvider = urlProvider || sessionStorage.getItem('terra_last_provider');
                    if (lastProvider) {
                      navigate(`/integrations`);
                    } else {
                      navigate('/integrations');
                    }
                  }} 
                  className="w-full"
                >
                  {t('callback.retry')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/integrations')}
                  className="w-full"
                >
                  {t('callback.backToSettings')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
