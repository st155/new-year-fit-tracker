import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Scale, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Heart, 
  Activity, 
  Moon, 
  TrendingUp, 
  RefreshCw,
  Unlink,
  ExternalLink,
  Database
} from 'lucide-react';

interface WithingsStatus {
  connected: boolean;
  connectedAt?: string;
  scope?: string;
}

export const WithingsIntegration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [status, setStatus] = useState<WithingsStatus>({ connected: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkConnectionStatus();
    }
  }, [user]);

  const checkConnectionStatus = async () => {
    try {
      console.log('Checking Withings connection status for user:', user?.id);
      const { data, error } = await supabase.functions.invoke('withings-integration', {
        body: { action: 'check-status' },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      console.log('Withings status check result:', { data, error });
      if (error) throw error;
      setStatus(data);
    } catch (error: any) {
      console.error('Failed to check Withings status:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectWithings = async () => {
    console.log('Withings connect button clicked', { user });
    if (!user) {
      console.error('No user found');
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Get authorization URL
      const { data, error } = await supabase.functions.invoke('withings-integration', {
        body: { 
          action: 'get-auth-url',
          userId: user.id 
        }
      });

      if (error) throw error;

      // Open authorization window
      const authWindow = window.open(
        data.authUrl,
        'withings-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for auth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'withings-auth-success') {
          authWindow?.close();
          window.removeEventListener('message', handleMessage);
          
          toast({
            title: t('withings.connectedSuccess'),
            description: t('withings.connectedDescription'),
          });
          
          checkConnectionStatus();
          setIsConnecting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if window was closed manually
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }
      }, 1000);

    } catch (error: any) {
      console.error('Failed to connect Withings:', error);
      toast({
        title: t('withings.connectionError'),
        description: error.message || t('withings.connectionErrorDescription'),
        variant: 'destructive'
      });
      setIsConnecting(false);
    }
  };

  const syncData = async () => {
    if (!user) return;
    
    setIsSyncing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Не удалось получить токен авторизации');
      }

      const { data, error } = await supabase.functions.invoke('withings-integration', {
        body: { action: 'sync-data' },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      
      // Check for errors in response data
      if (data?.error) {
        throw new Error(data.error);
      }

      // Clear all caches
      localStorage.removeItem('fitness_metrics_cache');
      localStorage.removeItem('weight_data_cache');
      localStorage.removeItem('body_fat_cache');
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('withings-data-updated'));

      toast({
        title: t('withings.syncComplete'),
        description: t('withings.syncCompleteDescription', {
          measurements: data.measurements,
          activities: data.activities,
          sleep: data.sleep,
          workouts: data.workouts
        }),
      });

      // Optional: auto-reload after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('Failed to sync Withings data:', error);
      toast({
        title: t('withings.syncError'),
        description: error.message || t('withings.syncErrorDescription'),
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const refreshData = async () => {
    try {
      setIsRefreshing(true);
      
      // Очистить все кэши
      localStorage.removeItem('fitness_metrics_cache');
      localStorage.removeItem('weight_data_cache');
      localStorage.removeItem('body_fat_cache');
      
      // Перезагрузить страницу для получения свежих данных
      window.location.reload();
      
    } catch (error: any) {
      console.error('Refresh error:', error);
      toast({
        title: '❌ Ошибка обновления',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const disconnectWithings = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('withings_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setStatus({ connected: false });
      
      toast({
        title: t('withings.disconnected'),
        description: t('withings.disconnectedDescription'),
      });

    } catch (error: any) {
      console.error('Failed to disconnect Withings:', error);
      toast({
        title: t('withings.disconnectError'),
        description: error.message || t('withings.disconnectErrorDescription'),
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>{t('withings.title')}</CardTitle>
              <CardDescription>{t('withings.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center shrink-0">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                {t('withings.title')}
                {status.connected && (
                  <Badge variant="outline" className="text-green-600 border-green-600 shrink-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t('withings.connected')}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="truncate">
                {t('withings.description')}
              </CardDescription>
            </div>
          </div>
        </div>
        
        {status.connected && (
          <div className="flex gap-2 mt-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={syncData}
              disabled={isSyncing}
              className="flex-1 sm:flex-none"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('withings.syncing')}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('withings.sync')}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
              title="Обновить данные"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={disconnectWithings}
            >
              <Unlink className="h-4 w-4 mr-2" />
              {t('withings.disconnect')}
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {!status.connected ? (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('withings.whatSyncs')}</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>{t('withings.bodyComposition')}</strong></li>
                  <li><strong>{t('withings.activity')}</strong></li>
                  <li><strong>{t('withings.sleep')}</strong></li>
                  <li><strong>{t('withings.workouts')}</strong></li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-500 mb-2" />
                <span className="text-sm font-medium">{t('withings.weightAndComposition')}</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                <Activity className="h-6 w-6 text-green-500 mb-2" />
                <span className="text-sm font-medium">{t('withings.activityData')}</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                <Moon className="h-6 w-6 text-purple-500 mb-2" />
                <span className="text-sm font-medium">{t('withings.sleepData')}</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                <Heart className="h-6 w-6 text-red-500 mb-2" />
                <span className="text-sm font-medium">{t('withings.heartRate')}</span>
              </div>
            </div>

            <Button 
              onClick={connectWithings} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('withings.connecting')}
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('withings.connect')}
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>{t('withings.connectedSuccess')}</strong>
                <br />
                {t('withings.connectedAt')}: {new Date(status.connectedAt!).toLocaleDateString('ru-RU')}
                {status.scope && (
                  <>
                    <br />
                    Scope: {status.scope.split(',').join(', ')}
                  </>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">{t('withings.availableData')}</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">{t('withings.bodyMeasurements')}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{t('withings.activityData')}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Moon className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">{t('withings.sleepData')}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span className="text-sm">{t('withings.workoutsData')}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                <strong>{t('withings.autoSync')}</strong>
              </p>
              
              <div className="flex gap-2">
                <Button onClick={syncData} disabled={isSyncing} className="flex-1">
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('withings.syncing')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('withings.syncData')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">{t('withings.supportedDevices')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('withings.smartScales')}</li>
              <li>{t('withings.fitnessTrackers')}</li>
              <li>{t('withings.thermometers')}</li>
              <li>{t('withings.bloodPressure')}</li>
            </ul>
            <p className="text-xs pt-2">
              {t('withings.requiresAccount')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};