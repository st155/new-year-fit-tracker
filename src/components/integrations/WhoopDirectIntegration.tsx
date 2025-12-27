import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/primitive';
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
import { ru, enUS } from 'date-fns/locale';

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

const getSyncPeriods = (t: (key: string) => string) => [
  { value: '7', label: t('whoopDirect.syncPeriods.7days'), description: t('whoopDirect.syncPeriods.week') },
  { value: '14', label: t('whoopDirect.syncPeriods.14days'), description: t('whoopDirect.syncPeriods.2weeks') },
  { value: '28', label: t('whoopDirect.syncPeriods.28days'), description: t('whoopDirect.syncPeriods.4weeks') },
  { value: '90', label: t('whoopDirect.syncPeriods.90days'), description: t('whoopDirect.syncPeriods.3months') },
];

export function WhoopDirectIntegration() {
  const { t, i18n } = useTranslation('integrations');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  const SYNC_PERIODS = getSyncPeriods(t);
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
        title: t('whoopDirect.connectionSuccess'),
        description: t('whoopDirect.autoSync'),
      });
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
    }
  }, [status?.connected, toast, queryClient]);

  const checkStatus = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      // Direct database query instead of edge function (fixes session issues)
      const { data: tokenData, error } = await supabase
        .from('whoop_tokens')
        .select('is_active, expires_at, whoop_user_id, last_sync_at, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      const isExpired = tokenData?.expires_at && new Date(tokenData.expires_at) < new Date();

      setStatus({
        connected: !!(tokenData?.is_active && !isExpired),
        whoop_user_id: tokenData?.whoop_user_id,
        expires_at: tokenData?.expires_at,
        is_expired: isExpired ?? false,
        last_sync_at: tokenData?.last_sync_at,
        connected_at: tokenData?.created_at,
      });
    } catch (error: any) {
      console.error('Failed to check Whoop status:', error);
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  // Track if popup is already open to prevent duplicates
  const [popupRef, setPopupRef] = useState<Window | null>(null);

  const connect = async () => {
    // Prevent duplicate connection attempts
    if (connecting) {
      console.log('⚠️ [WhoopConnect] Already connecting, ignoring duplicate call');
      return;
    }
    
    // Check if there's already an open popup
    if (popupRef && !popupRef.closed) {
      console.log('⚠️ [WhoopConnect] Popup already open, focusing it');
      popupRef.focus();
      return;
    }

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

      console.log('✅ [WhoopConnect] Got auth URL, isMobile:', isMobile);
      console.log('📋 [WhoopConnect] Debug info:', data._debug);

      // Store return URL for when OAuth completes
      sessionStorage.setItem('whoop_return_url', window.location.pathname + window.location.search + window.location.hash);
      sessionStorage.setItem('whoop_connecting', 'true');

      // Mobile: use redirect in same window (popups are blocked)
      if (isMobile) {
        console.log('📱 [WhoopConnect] Mobile detected, using redirect flow...');
        toast({
          title: t('whoopDirect.redirectingToAuth'),
          description: t('whoopDirect.completeAuth'),
        });
        
        // Small delay to show toast
        setTimeout(() => {
          window.location.assign(data.url);
        }, 500);
        return;
      }

      // Desktop: Open popup window
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
          title: t('whoopDirect.popupBlocked'),
          description: t('whoopDirect.allowPopups'),
          variant: 'destructive',
        });
        setConnecting(false);
        return;
      }

      // Store popup reference to prevent duplicates
      setPopupRef(popup);
      console.log('🪟 [WhoopConnect] Popup opened, waiting for result...');

      // Allowed origins for postMessage
      const allowedOrigins = [
        window.location.origin,
        'https://elite10.club',
        'https://1eef6188-774b-4d2c-ab12-3f76f54542b1.lovableproject.com',
      ];

      // Listen for message from popup
      let messageReceived = false;
      const handleMessage = async (event: MessageEvent) => {
        // Verify origin from allowlist
        if (!allowedOrigins.includes(event.origin)) {
          console.log('🚫 [WhoopConnect] Ignoring message from unknown origin:', event.origin);
          return;
        }
        
        if (event.data?.type === 'whoop-auth-result') {
          messageReceived = true;
          console.log('📨 [WhoopConnect] Received result from popup:', event.data);
          window.removeEventListener('message', handleMessage);
          
          if (event.data.success) {
            console.log('✅ [WhoopConnect] Connection successful!');
            toast({
              title: t('whoopDirect.connectionSuccess'),
              description: t('whoopDirect.autoSync'),
            });
            
            // Refresh status and queries
            await checkStatus();
            queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['device-metrics'] });
          } else {
            console.error('❌ [WhoopConnect] Connection failed:', event.data.error);
            toast({
              title: t('whoopDirect.connectionError'),
              description: event.data.error || t('whoopDirect.couldNotConnect'),
              variant: 'destructive',
            });
          }
          
          sessionStorage.removeItem('whoop_connecting');
          setConnecting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Fallback: check status after popup closes if no message received
      const checkStatusFallback = async (attempts: number = 0) => {
        if (messageReceived) return; // Message was received, no fallback needed
        
        console.log(`🔍 [WhoopConnect] Fallback status check #${attempts + 1}`);
        try {
          const { data } = await supabase.functions.invoke('whoop-auth', {
            body: { action: 'status' },
          });
          
          if (data?.connected) {
            console.log('✅ [WhoopConnect] Fallback: Connected!');
            setStatus(data);
            toast({
              title: t('whoopDirect.connectionSuccess'),
              description: t('whoopDirect.autoSync'),
            });
            queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['device-metrics'] });
            return true;
          }
        } catch (e) {
          console.warn('⚠️ [WhoopConnect] Fallback check failed:', e);
        }
        
        // Retry up to 3 times with increasing delays
        if (attempts < 2) {
          setTimeout(() => checkStatusFallback(attempts + 1), (attempts + 1) * 1500);
        } else {
          console.log('⚠️ [WhoopConnect] Fallback checks exhausted, connection status unknown');
          toast({
            title: t('whoopDirect.checkConnection'),
            description: t('whoopDirect.reopenPage'),
          });
        }
        return false;
      };

      // Check if popup was closed and run fallback
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          console.log('🪟 [WhoopConnect] Popup was closed, messageReceived:', messageReceived);
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handleMessage);
          setPopupRef(null); // Clear popup reference
          
          // Run fallback status check after popup closes
          setTimeout(() => {
            checkStatusFallback();
          }, 500);
          
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
        title: t('whoopDirect.error'),
        description: error.message || t('whoopDirect.couldNotStartAuth'),
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
        title: t('whoopDirect.syncComplete'),
        description: t('whoopDirect.syncResult', { metrics: result.metrics_count, workouts: result.workouts_count, days: daysBack }),
      });

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['device-metrics'] });
      
      await checkStatus();
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast({
        title: t('whoopDirect.syncError'),
        description: error.message || t('whoopDirect.couldNotSync'),
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
      setSyncingHistory(false);
    }
  };

  const disconnect = async () => {
    const confirmed = window.confirm(t('whoopDirect.confirmDisconnect'));
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke('whoop-auth', {
        body: { action: 'disconnect' },
      });

      if (error) throw error;

      toast({
        title: t('whoopDirect.disconnected'),
        description: t('whoopDirect.canReconnect'),
      });

      setStatus({ connected: false });
      setLastSyncResult(null);
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
    } catch (error: any) {
      console.error('Disconnect failed:', error);
      toast({
        title: t('whoopDirect.error'),
        description: error.message || t('whoopDirect.couldNotDisconnect'),
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
                {t('whoopDirect.title')}
                <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-500">
                  Beta
                </Badge>
              </CardTitle>
              <CardDescription>
                {t('whoopDirect.description')}
              </CardDescription>
            </div>
          </div>
          {status?.connected && (
            <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              {t('whoopDirect.connected')}
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
                  {t('whoopDirect.tokenExpired')}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              {status.last_sync_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {t('whoopDirect.lastSync')}{' '}
                    {formatDistanceToNow(new Date(status.last_sync_at), { 
                      addSuffix: true, 
                      locale: dateLocale 
                    })}
                  </span>
                </div>
              )}
              {status.connected_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    {t('whoopDirect.connectedAt')}{' '}
                    {formatDistanceToNow(new Date(status.connected_at), { 
                      addSuffix: true, 
                      locale: dateLocale 
                    })}
                  </span>
                </div>
              )}
            </div>

            {lastSyncResult && (
              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-600 dark:text-green-400">
                  {t('whoopDirect.loaded', { metrics: lastSyncResult.metrics_count, workouts: lastSyncResult.workouts_count, days: lastSyncResult.days_synced })}
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
                    {t('whoopDirect.syncing')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('whoopDirect.sync7days')}
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
                {t('whoopDirect.loadHistory')}
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
                      {t('whoopDirect.loadingData')}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      {t('whoopDirect.loadData')}
                    </>
                  )}
                </Button>
              </div>

              {parseInt(selectedPeriod) >= 90 && (
                <p className="text-xs text-muted-foreground">
                  {t('whoopDirect.longLoadWarning')}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('whoopDirect.integrationInfo')}
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
                  {t('whoopDirect.connecting')}
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('whoopDirect.connectDirect')}
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}