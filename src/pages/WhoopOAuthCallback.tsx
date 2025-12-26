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
  const [message, setMessage] = useState('Processing Whoop authorization...');

  useEffect(() => {
    if (authLoading) return;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('❌ [WhoopOAuthCallback] OAuth error:', error, errorDescription);
      setStatus('error');
      setMessage(errorDescription || 'Authorization was denied or failed');
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('No authorization code received');
      return;
    }

    if (!user) {
      setStatus('error');
      setMessage('Please log in first');
      return;
    }

    exchangeToken(code, state);
  }, [searchParams, user, authLoading]);

  const exchangeToken = async (code: string, state: string | null) => {
    try {
      setMessage('Exchanging authorization code...');
      console.log('🔄 [WhoopOAuthCallback] Exchanging code for tokens...');

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('whoop-auth', {
        body: { action: 'exchange-token', code, state },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Token exchange failed');
      }

      console.log('✅ [WhoopOAuthCallback] Token exchange successful');
      setStatus('success');
      setMessage('Whoop connected successfully! Redirecting...');

      // Trigger initial sync
      setMessage('Starting initial data sync...');
      try {
        await supabase.functions.invoke('whoop-sync', {
          body: { days_back: 14 },
        });
        console.log('✅ [WhoopOAuthCallback] Initial sync completed');
      } catch (syncError) {
        console.warn('⚠️ [WhoopOAuthCallback] Initial sync failed:', syncError);
      }

      // Redirect after short delay
      setTimeout(() => {
        navigate('/fitness-data', { replace: true });
      }, 2000);

    } catch (error: any) {
      console.error('❌ [WhoopOAuthCallback] Error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to connect Whoop');
    }
  };

  if (authLoading) {
    return <PageLoader message="Loading..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-destructive" />}
            Whoop Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'error' && (
            <div className="space-y-2">
              <Button onClick={() => navigate('/fitness-data')} variant="outline">
                Back to Fitness Data
              </Button>
            </div>
          )}

          {status === 'success' && (
            <p className="text-sm text-muted-foreground">
              Your Whoop data will start syncing automatically.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
