import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Unlink,
  Zap,
  ExternalLink,
  Clock,
  Download,
  History
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface WhoopStatus {
  connected: boolean;
  whoop_user_id?: string;
  expires_at?: string;
  is_expired?: boolean;
  last_sync_at?: string;
  connected_at?: string;
}

interface SyncResult {
  metrics_count: number;
  workouts_count: number;
  days_synced: number;
}

const SYNC_PERIODS = [
  { value: '7', label: '7 дней', description: 'Неделя' },
  { value: '14', label: '14 дней', description: '2 недели' },
  { value: '28', label: '28 дней', description: '4 недели' },
  { value: '90', label: '90 дней', description: '3 месяца' },
];

export function WhoopDirectIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<WhoopStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingHistory, setSyncingHistory] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('28');
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);

  // Check if user is eligible (participant of any active challenge)
  useEffect(() => {
    const checkEligibility = async () => {
      if (!user) {
        setIsEligible(false);
        setLoading(false);
        return;
      }

      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('challenge_participants')
          .select(`
            challenge_id,
            challenges!inner(id, is_active, end_date)
          `)
          .eq('user_id', user.id)
          .eq('challenges.is_active', true)
          .gte('challenges.end_date', today)
          .limit(1);

        if (error) {
          console.error('Error checking Whoop eligibility:', error);
          setIsEligible(false);
        } else {
          setIsEligible((data?.length || 0) > 0);
        }
      } catch (err) {
        console.error('Failed to check Whoop eligibility:', err);
        setIsEligible(false);
      }
    };

    checkEligibility();
  }, [user]);

  // Check Whoop status when eligible
  useEffect(() => {
    if (isEligible === true && user) {
      checkStatus();
    } else if (isEligible === false) {
      setLoading(false);
    }
  }, [user, isEligible]);

  // Check if returning from OAuth redirect
  useEffect(() => {
    const wasConnecting = sessionStorage.getItem('whoop_connecting') === 'true';
    if (wasConnecting && status?.connected) {
      sessionStorage.removeItem('whoop_connecting');
      toast({
        title: 'Whoop подключен!',
        description: 'Данные начнут синхронизироваться автоматически',
      });
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
    }
  }, [status?.connected, toast, queryClient]);

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whoop-auth', {
        body: { action: 'status' },
      });

      if (error) throw error;
      setStatus(data);
    } catch (error: any) {
      console.error('Failed to check Whoop status:', error);
    } finally {
      setLoading(false);
    }
  };

  const connect = async () => {
    setConnecting(true);
    console.log('🔐 [WhoopConnect] Starting connection flow...');
    
    try {
      const currentOrigin = window.location.origin;
      const redirectUri = `${currentOrigin}/auth/whoop/oauth2`;
      
      console.log('📋 [WhoopConnect] Request params:', { currentOrigin, redirectUri });
      
      const { data, error } = await supabase.functions.invoke('whoop-auth', {
        body: { 
          action: 'get-auth-url',
          redirect_uri: redirectUri
        },
      });

      if (error) {
        console.error('❌ [WhoopConnect] Edge function error:', error);
        throw error;
      }
      
      if (!data?.url) {
        console.error('❌ [WhoopConnect] No auth URL in response:', data);
        throw new Error('No auth URL received');
      }

      console.log('✅ [WhoopConnect] Got auth URL, opening popup...');
      console.log('📋 [WhoopConnect] Debug info:', data._debug);

      // Store return URL for when popup completes
      sessionStorage.setItem('whoop_return_url', window.location.pathname + window.location.search + window.location.hash);
      sessionStorage.setItem('whoop_connecting', 'true');

      // Open popup window
      const popupWidth = 600;
      const popupHeight = 700;
      const left = window.screenX + (window.outerWidth - popupWidth) / 2;
      const top = window.screenY + (window.outerHeight - popupHeight) / 2;
      
      const popup = window.open(
        data.url,
        'whoop-auth',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        console.error('❌ [WhoopConnect] Popup blocked');
        toast({
          title: 'Popup заблокирован',
          description: 'Пожалуйста, разрешите всплывающие окна для этого сайта',
          variant: 'destructive',
        });
        setConnecting(false);
        return;
      }

      console.log('🪟 [WhoopConnect] Popup opened, waiting for result...');

      // Listen for message from popup
      const handleMessage = async (event: MessageEvent) => {
        // Verify origin
        if (event.origin !== window.location.origin) return;
        
        if (event.data?.type === 'whoop-auth-result') {
          console.log('📨 [WhoopConnect] Received result from popup:', event.data);
          window.removeEventListener('message', handleMessage);
          
          if (event.data.success) {
            console.log('✅ [WhoopConnect] Connection successful!');
            toast({
              title: 'Whoop подключен!',
              description: 'Данные начнут синхронизироваться автоматически',
            });
            
            // Refresh status and queries
            await checkStatus();
            queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['device-metrics'] });
          } else {
            console.error('❌ [WhoopConnect] Connection failed:', event.data.error);
            toast({
              title: 'Ошибка подключения',
              description: event.data.error || 'Не удалось подключить Whoop',
              variant: 'destructive',
            });
          }
          
          sessionStorage.removeItem('whoop_connecting');
          setConnecting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Also check if popup was closed manually
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          console.log('🪟 [WhoopConnect] Popup was closed');
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handleMessage);
          
          // Only set connecting to false if we didn't get a result
          setTimeout(() => {
            setConnecting(false);
            sessionStorage.removeItem('whoop_connecting');
          }, 500);
        }
      }, 500);

      // Clean up after 5 minutes (safety timeout)
      setTimeout(() => {
        clearInterval(checkPopupClosed);
        window.removeEventListener('message', handleMessage);
        setConnecting(false);
      }, 5 * 60 * 1000);

    } catch (error: any) {
      console.error('❌ [WhoopConnect] Error:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось начать авторизацию',
        variant: 'destructive',
      });
      setConnecting(false);
    }
  };

  const sync = async (daysBack: number = 7, isHistorySync: boolean = false) => {
    if (isHistorySync) {
      setSyncingHistory(true);
    } else {
      setSyncing(true);
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('whoop-sync', {
        body: { days_back: daysBack },
      });

      if (error) throw error;

      const result: SyncResult = {
        metrics_count: data.metrics_count || 0,
        workouts_count: data.workouts_count || 0,
        days_synced: daysBack,
      };
      setLastSyncResult(result);

      toast({
        title: 'Синхронизация завершена',
        description: `${result.metrics_count} метрик, ${result.workouts_count} тренировок за ${daysBack} дней`,
      });

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['device-metrics'] });
      
      await checkStatus();
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast({
        title: 'Ошибка синхронизации',
        description: error.message || 'Не удалось синхронизировать данные',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
      setSyncingHistory(false);
    }
  };

  const disconnect = async () => {
    const confirmed = window.confirm('Вы уверены, что хотите отключить Whoop?');
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke('whoop-auth', {
        body: { action: 'disconnect' },
      });

      if (error) throw error;

      toast({
        title: 'Whoop отключен',
        description: 'Вы можете подключить его снова в любое время',
      });

      setStatus({ connected: false });
      setLastSyncResult(null);
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
    } catch (error: any) {
      console.error('Disconnect failed:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отключить Whoop',
        variant: 'destructive',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  // Don't show for ineligible users or while checking eligibility
  if (isEligible === null || isEligible === false) {
    return null;
  }

  if (loading) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Zap className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Whoop Direct
                <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-500">
                  Beta
                </Badge>
              </CardTitle>
              <CardDescription>
                Прямое подключение без Terra (только для VIP)
              </CardDescription>
            </div>
          </div>
          {status?.connected && (
            <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Подключено
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected ? (
          <>
            {status.is_expired && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Токен истёк. Пожалуйста, переподключите Whoop.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              {status.last_sync_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Последняя синхронизация:{' '}
                    {formatDistanceToNow(new Date(status.last_sync_at), { 
                      addSuffix: true, 
                      locale: ru 
                    })}
                  </span>
                </div>
              )}
              {status.connected_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    Подключено:{' '}
                    {formatDistanceToNow(new Date(status.connected_at), { 
                      addSuffix: true, 
                      locale: ru 
                    })}
                  </span>
                </div>
              )}
            </div>

            {lastSyncResult && (
              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-600 dark:text-green-400">
                  Загружено: {lastSyncResult.metrics_count} метрик, {lastSyncResult.workouts_count} тренировок за {lastSyncResult.days_synced} дней
                </AlertDescription>
              </Alert>
            )}

            {/* Quick sync buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={() => sync(7)} 
                disabled={syncing || syncingHistory || status.is_expired}
                className="flex-1"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Синхронизация...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Синхронизировать (7 дней)
                  </>
                )}
              </Button>
              <Button 
                onClick={disconnect} 
                variant="outline" 
                disabled={disconnecting || syncing || syncingHistory}
              >
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* History load section */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <History className="h-4 w-4" />
                Загрузить историю
              </div>
              
              <div className="flex gap-2">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SYNC_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label} ({period.description})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  onClick={() => sync(parseInt(selectedPeriod), true)} 
                  variant="secondary"
                  disabled={syncing || syncingHistory || status.is_expired}
                  className="flex-1"
                >
                  {syncingHistory ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Загрузка данных...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Загрузить данные
                    </>
                  )}
                </Button>
              </div>

              {parseInt(selectedPeriod) >= 90 && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ Загрузка за 3 месяца может занять несколько минут
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Эта интеграция работает напрямую с Whoop API, минуя Terra. 
                Данные обновляются каждые 15 минут автоматически.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={connect} 
              disabled={connecting}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Подключение...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Подключить Whoop напрямую
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}