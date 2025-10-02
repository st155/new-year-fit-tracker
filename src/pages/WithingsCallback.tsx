import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

 type SyncStatus = 'pending' | 'authenticating' | 'syncing' | 'success' | 'error';

 const WithingsCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<SyncStatus>('pending');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const calledOnce = useRef(false);

  useEffect(() => {
    document.title = 'Withings Callback | Elite10';
  }, []);

  useEffect(() => {
    if (calledOnce.current) return;
    calledOnce.current = true;

    const handleWithingsCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const oauthError = searchParams.get('error');

      if (oauthError) {
        setStatus('error');
        setErrorMessage(`Authorization error: ${oauthError}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('Missing authorization code');
        return;
      }

      try {
        setStatus('authenticating');
        setProgress(25);

        const { data: { session } } = await supabase.auth.getSession();

        setProgress(50);
        setStatus('syncing');

        // Отправляем запрос напрямую на Edge Function как GET с параметрами в URL
        const response = await fetch(`https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/withings-integration?action=handle-callback&code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
          method: 'GET',
          headers: session?.access_token ? { 
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          } : {
            'Content-Type': 'application/json'
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        if (data.error) throw new Error(data.error);

        setProgress(100);
        setStatus('success');

        toast({
          title: 'Withings Connected!',
          description: 'Authorization successful. Starting data synchronization...',
        });

        // После успешного колбэка можно перенаправить в интеграции
        setTimeout(() => {
          navigate('/integrations');
        }, 1500);
      } catch (e: any) {
        setStatus('error');
        setErrorMessage(e.message || 'Произошла неизвестная ошибка');
      }
    };

    handleWithingsCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, toast, searchParams]);

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
      case 'authenticating':
      case 'syncing':
        return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Clock className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Preparing to connect...';
      case 'authenticating':
        return 'Authenticating with Withings...';
      case 'syncing':
        return 'Syncing data...';
      case 'success':
        return 'Done!';
      case 'error':
        return 'An error occurred';
      default:
        return 'Waiting...';
    }
  };

  const getProgressValue = () => {
    switch (status) {
      case 'pending': return 0;
      case 'authenticating': return 25;
      case 'syncing': return 75;
      case 'success': return 100;
      case 'error': return progress;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-xl">Connecting Withings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">{getStatusText()}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{getProgressValue()}%</span>
            </div>
            <Progress value={getProgressValue()} className="w-full" />
          </div>

          {status === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{errorMessage}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Redirecting in 1.5 seconds...
              </p>
              <Button onClick={() => navigate('/integrations')} className="w-full">
                Go to Integrations
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex gap-2">
              <Button onClick={() => navigate('/integrations')} variant="outline" className="flex-1">
                Back
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1">
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WithingsCallback;
