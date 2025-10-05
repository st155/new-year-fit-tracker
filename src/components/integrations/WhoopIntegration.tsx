import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ErrorLogger } from '@/lib/error-logger';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Heart, 
  Zap, 
  Moon, 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Unlink,
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';

interface WhoopIntegrationProps {
  userId: string;
}

interface WhoopStatus {
  isConnected: boolean;
  lastSync?: string;
}

interface RecentData {
  recoveryScore?: number;
  sleepEfficiency?: number;
  strain?: number;
  heartRate?: number;
  vo2Max?: number;
  weight?: number;
  date: string;
}

export function WhoopIntegration({ userId }: WhoopIntegrationProps) {
  const [status, setStatus] = useState<WhoopStatus>({ isConnected: false });
  const [recentData, setRecentData] = useState<RecentData[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authUrl, setAuthUrl] = useState<string>('');
  const [showManualAuth, setShowManualAuth] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    loadWhoopStatus();
    if (status.isConnected) {
      loadRecentData();
    }
  }, [userId]);

  const loadWhoopStatus = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-integration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ action: 'check-status' })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStatus(data);
      
      if (data.isConnected) {
        await loadRecentData();
      }
    } catch (error: any) {
      console.error('Error loading Whoop status:', error);
      await ErrorLogger.logWhoopError(
        'Failed to load Whoop status',
        { error: error.message },
        userId
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentData = async () => {
    try {
      // Загружаем последние данные из metric_values
      const { data: metrics, error } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner(metric_name, source, unit)
        `)
        .eq('user_id', userId)
        .eq('user_metrics.source', 'whoop')
        .order('measurement_date', { ascending: false })
        .limit(20);

      console.log('Loaded Whoop metrics from database:', metrics);

      if (error) throw error;

      // Группируем данные по дате
      const dataByDate: Record<string, RecentData> = {};
      
      metrics?.forEach((metric: any) => {
        const date = metric.measurement_date;
        if (!dataByDate[date]) {
          dataByDate[date] = { date };
        }

        const metricName = metric.user_metrics.metric_name;
        switch (metricName) {
          case 'Recovery Score':
            dataByDate[date].recoveryScore = metric.value;
            break;
          case 'Sleep Efficiency':
            dataByDate[date].sleepEfficiency = metric.value;
            break;
          case 'Workout Strain':
            dataByDate[date].strain = metric.value;
            break;
          case 'Average Heart Rate':
            dataByDate[date].heartRate = metric.value;
            break;
          case 'VO2Max':
            dataByDate[date].vo2Max = metric.value;
            break;
          case 'Вес':
          case 'Weight':
            dataByDate[date].weight = metric.value;
            break;
        }
      });

      const recentDataArray = Object.values(dataByDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      console.log('Processed recent data:', recentDataArray);
      setRecentData(recentDataArray);
    } catch (error: any) {
      console.error('Error loading recent data:', error);
      await ErrorLogger.logWhoopError(
        'Failed to load recent Whoop data',
        { error: error.message },
        userId
      );
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Получаем URL для авторизации
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-integration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ action: 'auth' })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAuthUrl(data.authUrl);

      // Заменяем popup на прямой редирект - более надежно
      window.location.href = data.authUrl;

    } catch (error: any) {
      console.error('Whoop connection error:', error);
      
      await ErrorLogger.logWhoopError(
        'Whoop connection failed',
        { error: error.message },
        userId
      );

      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to connect Whoop.',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const copyAuthUrl = async () => {
    try {
      await navigator.clipboard.writeText(authUrl);
      toast({
        title: 'Link Copied',
        description: 'Authorization link copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Copy Error',
        description: 'Failed to copy link. Try selecting and copying manually.',
        variant: 'destructive'
      });
    }
  };

  const openAuthUrl = () => {
    window.open(authUrl, '_blank');
  };

  const setupWebhooks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-integration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ action: 'setup-webhooks' })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Webhook setup result:', data);

      const successCount = data.results?.filter((r: any) => r.status === 'success').length || 0;
      
      toast({
        title: 'Webhooks Setup',
        description: `Successfully registered ${successCount} webhooks for automatic updates.`,
      });

    } catch (error: any) {
      console.error('Webhook setup error:', error);
      toast({
        title: 'Webhook Setup Error',
        description: error.message || 'Failed to setup webhooks.',
        variant: 'destructive'
      });
    }
  };

  const syncData = async () => {
    try {
      setIsSyncing(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-integration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ action: 'sync' })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      toast({
        title: 'Sync Complete',
        description: `Loaded ${data.syncResult?.totalSaved || 0} new records.`,
      });

      await loadRecentData();
      await loadWhoopStatus();

    } catch (error: any) {
      console.error('Sync error:', error);
      
      await ErrorLogger.logWhoopError(
        'Whoop sync failed',
        { error: error.message },
        userId
      );

      // Если ошибка связана с авторизацией, предлагаем переподключиться
      if (error.message?.includes('401') || error.message?.includes('Authorization') || error.message?.includes('expired') || error.message?.includes('non-2xx')) {
        setStatus({ isConnected: false });
        toast({
          title: 'Reconnection Required',
          description: 'Access token expired. Please reconnect Whoop.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Sync Error',
          description: error.message || 'Failed to synchronize data.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const syncDataWithTokens = async (tempTokens: any) => {
    try {
      setIsSyncing(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-integration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ 
            action: 'sync',
            tempTokens
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      toast({
        title: 'Initial Sync Complete',
        description: `Loaded ${data.syncResult?.totalSaved || 0} records from Whoop.`,
      });

      await loadRecentData();

    } catch (error: any) {
      console.error('Initial sync error:', error);
      
      await ErrorLogger.logWhoopError(
        'Initial Whoop sync failed',
        { error: error.message },
        userId
      );

      toast({
        title: 'Sync Error',
        description: error.message || 'Failed to synchronize data.',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Новый вариант: завершаем OAuth в popup, получаем code через postMessage и сразу синхронизируем
  const syncDataWithCode = async (code: string) => {
    try {
      setIsSyncing(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-integration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ action: 'sync', code })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      toast({
        title: 'Whoop Connected',
        description: `Synced ${data.syncResult?.totalSaved || 0} records.`,
      });

      await loadWhoopStatus();
      await loadRecentData();
    } catch (error: any) {
      console.error('Sync with code error:', error);
      await ErrorLogger.logWhoopError(
        'Whoop sync with code failed',
        { error: error.message },
        userId
      );
      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to complete Whoop connection.',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };
  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-integration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ action: 'disconnect' })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: 'Whoop Disconnected',
        description: 'Your Whoop account has been disconnected.',
      });

      setStatus({ isConnected: false });
      setRecentData([]);

    } catch (error: any) {
      console.error('Disconnect error:', error);
      
      await ErrorLogger.logWhoopError(
        'Whoop disconnect failed',
        { error: error.message },
        userId
      );

      toast({
        title: 'Disconnect Error',
        description: error.message || 'Failed to disconnect Whoop.',
        variant: 'destructive'
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'recovery': return <Heart className="h-4 w-4" />;
      case 'sleep': return <Moon className="h-4 w-4" />;
      case 'strain': return <Zap className="h-4 w-4" />;
      case 'heartRate': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getMetricColor = (type: string, value?: number) => {
    if (!value) return 'text-muted-foreground';
    
    switch (type) {
      case 'recovery':
        if (value >= 67) return 'text-green-600';
        if (value >= 34) return 'text-yellow-600';
        return 'text-red-600';
      case 'sleep':
        if (value >= 85) return 'text-green-600';
        if (value >= 70) return 'text-yellow-600';
        return 'text-red-600';
      case 'strain':
        if (value >= 15) return 'text-red-600';
        if (value >= 10) return 'text-yellow-600';
        return 'text-green-600';
      default:
        return 'text-blue-600';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading Whoop status...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Whoop Integration
                {status.isConnected && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {status.isConnected 
                  ? `Last sync: ${status.lastSync ? new Date(status.lastSync).toLocaleString('en-US') : 'Never'}`
                  : 'Connect your Whoop account to automatically sync recovery, sleep, and workout data'
                }
              </CardDescription>
            </div>
          </div>
          
          {status.isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-red-600 hover:text-red-700"
            >
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unlink className="h-4 w-4 mr-2" />
              )}
              Disconnect
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!status.isConnected ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What is Whoop?</strong>
                <br />
                Whoop is a wearable device for tracking recovery, sleep, strain, and heart rate. 
                By connecting your account, you can automatically import all your metrics.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Heart className="h-4 w-4 mr-2" />
                    Connect Whoop
                  </>
                )}
              </Button>

              {showManualAuth && authUrl && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Manual Link Opening
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Copy the link below and open it in your browser to authorize:
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyAuthUrl}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openAuthUrl}
                      className="flex-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Link
                    </Button>
                  </div>
                  
                  <div className="text-xs bg-background p-2 rounded border font-mono break-all">
                    {authUrl}
                  </div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground text-center">
                {isMobile 
                  ? "If the button doesn't work, use manual link opening above"
                  : "You will be redirected to Whoop's website for authorization"
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button 
                onClick={syncData}
                disabled={isSyncing}
                variant="outline"
                className="flex-1"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync
                  </>
                )}
              </Button>
              <Button 
                onClick={setupWebhooks}
                variant="outline"
                size="icon"
                title="Setup Webhooks for automatic updates"
              >
                <Zap className="h-4 w-4" />
              </Button>
            </div>

            {recentData.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Recent Data</h4>
                <div className="space-y-2">
                  {recentData.map((data, index) => (
                    <div key={index} className="p-3 rounded-lg border bg-muted/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{formatDate(data.date)}</span>
                      </div>
                      
                       <div className="grid grid-cols-2 gap-3 text-sm">
                         {data.recoveryScore && (
                           <div className="flex items-center gap-2">
                             {getMetricIcon('recovery')}
                             <span className="text-muted-foreground">Recovery:</span>
                             <span className={`font-medium ${getMetricColor('recovery', data.recoveryScore)}`}>
                               {data.recoveryScore}%
                             </span>
                           </div>
                         )}
                         
                         {data.sleepEfficiency && (
                           <div className="flex items-center gap-2">
                             {getMetricIcon('sleep')}
                             <span className="text-muted-foreground">Sleep:</span>
                             <span className={`font-medium ${getMetricColor('sleep', data.sleepEfficiency)}`}>
                               {data.sleepEfficiency}%
                             </span>
                           </div>
                         )}
                         
                         {data.strain && (
                           <div className="flex items-center gap-2">
                             {getMetricIcon('strain')}
                             <span className="text-muted-foreground">Strain:</span>
                             <span className={`font-medium ${getMetricColor('strain', data.strain)}`}>
                               {data.strain}
                             </span>
                           </div>
                         )}
                         
                         {data.heartRate && (
                           <div className="flex items-center gap-2">
                             {getMetricIcon('heartRate')}
                             <span className="text-muted-foreground">HR:</span>
                             <span className={`font-medium ${getMetricColor('heartRate', data.heartRate)}`}>
                               {data.heartRate} bpm
                             </span>
                           </div>
                         )}

                         {data.vo2Max && (
                           <div className="flex items-center gap-2">
                             <Activity className="h-4 w-4" />
                             <span className="text-muted-foreground">VO2Max:</span>
                             <span className="font-medium text-blue-600">
                               {data.vo2Max} ml/kg/min
                             </span>
                           </div>
                         )}

                         {data.weight && (
                           <div className="flex items-center gap-2">
                             <Activity className="h-4 w-4" />
                             <span className="text-muted-foreground">Weight:</span>
                             <span className="font-medium text-green-600">
                               {data.weight} kg
                             </span>
                           </div>
                         )}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentData.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No data to display. Click "Sync" to load the latest data from Whoop.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}