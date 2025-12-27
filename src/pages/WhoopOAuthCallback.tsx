import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type Status = 'loading' | 'success' | 'error';

interface ResultMessage {
  type: 'whoop-auth-result';
  success: boolean;
  whoopUserId?: string;
  error?: string;
}

export default function WhoopOAuthCallback() {
  const { t } = useTranslation('integrations');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const processedRef = useRef(false);
  
  // Detect if we're in a popup
  const isPopup = window.opener !== null;

  console.log('🪟 [WhoopCallback] Mounted, isPopup:', isPopup);

  useEffect(() => {
    // Set initial message
    setMessage(t('whoop.processing'));
  }, [t]);

  useEffect(() => {
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
    });

    if (error) {
      console.error('❌ [WhoopCallback] OAuth error:', error, errorDescription);
      handleError(errorDescription || error || t('whoop.authDenied'));
      return;
    }

    if (!code) {
      console.error('❌ [WhoopCallback] No code received');
      handleError(t('whoop.noCodeReceived'));
      return;
    }

    if (!state) {
      console.error('❌ [WhoopCallback] No state received');
      handleError(t('whoop.noStateReceived'));
      return;
    }

    processedRef.current = true;
    exchangeToken(code, state);
  }, [searchParams, t]);

  const sendResultToParent = (result: ResultMessage) => {
    if (isPopup && window.opener) {
      console.log('📨 [WhoopCallback] Sending result to parent:', result);
      try {
        // Send to any origin since we might be on a different domain
        window.opener.postMessage(result, '*');
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

  const getReturnUrl = (): string => {
    const savedUrl = sessionStorage.getItem('whoop_return_url');
    sessionStorage.removeItem('whoop_return_url');
    sessionStorage.removeItem('whoop_connecting');
    
    if (!savedUrl) {
      return '/fitness-data?tab=connections';
    }
    
    return savedUrl;
  };

  const handleSuccess = (whoopUserId?: string) => {
    console.log('✅ [WhoopCallback] Success! Whoop user ID:', whoopUserId);
    setStatus('success');
    setMessage(t('whoop.connectedSuccess'));

    sendResultToParent({
      type: 'whoop-auth-result',
      success: true,
      whoopUserId,
    });

    if (isPopup) {
      // Auto-close popup after 2 seconds
      startCountdown(2, () => {
        console.log('🪟 [WhoopCallback] Closing popup...');
        window.close();
      });
    } else {
      // Same-tab redirect: auto-redirect after 3 seconds
      startCountdown(3, () => {
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
    // For same-tab flow: DON'T auto-redirect on error, show buttons instead
  };

  const exchangeToken = async (code: string, state: string) => {
    try {
      setMessage(t('whoop.exchangingCode'));
      console.log('🔄 [WhoopCallback] Starting token exchange...');

      const currentOrigin = window.location.origin;
      const redirectUri = `${currentOrigin}/auth/whoop/oauth2`;
      
      console.log('📋 [WhoopCallback] Exchange params:', { 
        codePreview: code.substring(0, 10) + '...', 
        statePreview: state.substring(0, 20) + '...',
        redirectUri,
        currentUrl: window.location.href,
        isPopup,
        hasOpener: !!window.opener,
      });

      // Use supabase.functions.invoke - works reliably in Lovable
      const { data, error } = await supabase.functions.invoke('whoop-auth', {
        body: {
          action: 'exchange-token',
          code,
          state,
          redirect_uri: redirectUri,
        },
      });

      console.log('📋 [WhoopCallback] Exchange response:', { data, error });

      if (error) {
        throw new Error(error.message || t('whoop.tokenExchangeError'));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setMessage(t('whoop.startingSync'));
      console.log('✅ [WhoopCallback] Token exchange successful, starting sync...');

      // Trigger initial sync (non-blocking) - this still needs auth but popup may not have session
      // The sync will happen on the main page anyway
      handleSuccess(data?.whoop_user_id);

    } catch (error: any) {
      console.error('❌ [WhoopCallback] Exchange error:', error);
      handleError(error.message || t('whoop.connectionFailed'));
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

  const handleRetry = () => {
    // Go to integrations page to retry
    navigate('/fitness-data?tab=connections', { replace: true });
  };

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
            {status === 'loading' && t('whoop.connecting')}
            {status === 'success' && t('whoop.success')}
            {status === 'error' && t('whoop.error')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {countdown !== null && (
            <div className="space-y-2">
              <Progress value={(countdown / (status === 'success' ? 3 : 3)) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {isPopup ? t('whoop.windowWillClose') : t('whoop.redirecting')} {countdown} {t('whoop.seconds')}...
              </p>
            </div>
          )}

          {status === 'success' && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {t('whoop.syncWillStart')}
            </p>
          )}

          {/* Success: show return button */}
          {status === 'success' && (
            <Button 
              onClick={handleClose} 
              variant="default"
              className="w-full"
            >
              {isPopup ? t('whoop.closeWindow') : t('whoop.returnToIntegrations')}
            </Button>
          )}

          {/* Error: show retry and return buttons (especially important for mobile same-tab flow) */}
          {status === 'error' && (
            <div className="space-y-2">
              <Button 
                onClick={handleRetry} 
                variant="default"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('whoop.tryAgain')}
              </Button>
              <Button 
                onClick={handleClose} 
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {isPopup ? t('whoop.closeWindow') : t('whoop.returnToIntegrations')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
