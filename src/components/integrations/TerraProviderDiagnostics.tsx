import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, AlertCircle, CheckCircle, Clock, Copy, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { terraApi } from '@/lib/api';

interface TerraProviderDiagnosticsProps {
  provider: string;
  terraUserId?: string;
  lastSync?: string | null;
  onSyncRequest?: () => void;
}

export function TerraProviderDiagnostics({ 
  provider, 
  terraUserId, 
  lastSync,
  onSyncRequest 
}: TerraProviderDiagnosticsProps) {
  const { t } = useTranslation('terraDiagnostics');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [terraApiStatus, setTerraApiStatus] = useState<'ok' | 'timeout' | 'error'>('ok');
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const cancelRequest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setLoading(false);
    setLoadingStage('');
    setElapsedTime(0);
    toast({
      title: t('requestCancelled'),
      description: t('cancelledByUser'),
    });
  };

  const fetchDiagnostics = async () => {
    setLoading(true);
    setTerraApiStatus('ok');
    setElapsedTime(0);
    setLoadingStage(t('stages.requesting'));
    
    // Start timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
      
      // Update stage based on elapsed time
      if (elapsed < 10) {
        setLoadingStage(t('stages.requesting'));
      } else if (elapsed < 60) {
        setLoadingStage(t('stages.processing'));
      } else {
        setLoadingStage(t('stages.waiting'));
      }
    }, 1000);
    
    try {
      console.log('🔍 Fetching diagnostics for', provider);
      
      const { data, error } = await terraApi.diagnostics(provider);

      if (error) {
        if (error.message?.includes('timeout') || error.message?.includes('504')) {
          setTerraApiStatus('timeout');
          throw new Error(t('timeout.error'));
        }
        throw error;
      }

      setLoadingStage(t('stages.finishing'));
      console.log('✅ Diagnostics received:', data);
      setDiagnostics(data);
      
      toast({
        title: t('completed.title'),
        description: t('completed.description', { start: data.date_range?.start, end: data.date_range?.end }),
      });
    } catch (error: any) {
      console.error('❌ Diagnostics error:', error);
      
      if (terraApiStatus === 'timeout') {
        toast({
          title: t('timeout.title'),
          description: t('timeout.description'),
          variant: 'default',
        });
      } else {
        toast({
          title: t('error.title'),
          description: error.message || t('error.description'),
          variant: 'destructive',
        });
      }
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setLoading(false);
      setLoadingStage('');
      setElapsedTime(0);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const copyToClipboard = () => {
    if (!diagnostics) return;
    
    const text = `
📊 ${t('title')} - ${provider}
Terra User ID: ${diagnostics.terra_user_id}
Period: ${diagnostics.date_range?.start} - ${diagnostics.date_range?.end}
Last sync: ${lastSync || 'N/A'}

✅ ${t('availableInTerra')}:
• Daily: ${diagnostics.available_in_terra?.daily?.length || 0} ${t('records')}
• Sleep: ${diagnostics.available_in_terra?.sleep?.length || 0} ${t('records')}
• Activity: ${diagnostics.available_in_terra?.activity?.length || 0} ${t('records')}
• Body: ${diagnostics.available_in_terra?.body?.length || 0} ${t('records')}

💾 ${t('savedInDb')}:
• ${t('datesWithData')}: ${diagnostics.in_database?.dates_with_data?.length || 0}

⚠️ ${t('notSynced')}:
• Daily: ${diagnostics.missing_in_db?.daily?.length || 0} dates
• Sleep: ${diagnostics.missing_in_db?.sleep?.length || 0} dates
• Activity: ${diagnostics.missing_in_db?.activity?.length || 0} dates
• Body: ${diagnostics.missing_in_db?.body?.length || 0} dates
    `.trim();

    navigator.clipboard.writeText(text);
    toast({
      title: t('copied.title'),
      description: t('copied.description'),
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t('title')}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4 space-y-4 border-t pt-4">
        {!diagnostics && !loading && (
          <div className="text-center py-4">
            <Button onClick={fetchDiagnostics} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {t('checkButton')}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              {t('compareDescription')}
            </p>
          </div>
        )}

        {loading && (
          <div className="space-y-4 py-4">
            {/* Loading indicator with stage and timer */}
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="text-sm">
                <p className="font-medium">{loadingStage}</p>
                <p className="text-xs text-muted-foreground">
                  {t('elapsed')}: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
            
            {/* Progress bar after 10 seconds */}
            {elapsedTime > 10 && (
              <Progress 
                value={Math.min((elapsedTime / 90) * 100, 95)} 
                className="w-full"
              />
            )}
            
            {/* Warning after 30 seconds */}
            {elapsedTime > 30 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('terraApiSlowWarning')}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Cancel button after 20 seconds */}
            {elapsedTime > 20 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={cancelRequest}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                {t('cancelRequest')}
              </Button>
            )}
            
            {/* Skeleton loaders */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        )}

        {diagnostics && !loading && (
          <div className="space-y-4">
            {/* Terra API Status Warning */}
            {terraApiStatus === 'timeout' && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium mb-1">{t('terraApiTempUnavailable')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('webhookDataUpdateNote')}
                      {t('lastWebhook')}: {lastSync ? new Date(lastSync).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{t('results')}</h4>
                <p className="text-xs text-muted-foreground">
                  {diagnostics.date_range?.start} → {diagnostics.date_range?.end}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-3 w-3 mr-1" />
                {t('copy')}
              </Button>
            </div>

            {/* Available in Terra */}
            <div className="rounded-lg border p-4 bg-success/5 border-success/20">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-success" />
                <h5 className="font-medium">{t('availableInTerra')}</h5>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Daily:</span>
                  <span className="ml-2 font-semibold">{diagnostics.available_in_terra?.daily?.length || 0} {t('records')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Sleep:</span>
                  <span className="ml-2 font-semibold">{diagnostics.available_in_terra?.sleep?.length || 0} {t('records')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Activity:</span>
                  <span className="ml-2 font-semibold">{diagnostics.available_in_terra?.activity?.length || 0} {t('records')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Body:</span>
                  <span className="ml-2 font-semibold">{diagnostics.available_in_terra?.body?.length || 0} {t('records')}</span>
                </div>
              </div>

              {/* Recent Terra Data */}
              {diagnostics.available_in_terra?.daily?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-success/20">
                  <p className="text-xs font-medium mb-2">{t('recentData')}:</p>
                  <div className="space-y-1">
                    {diagnostics.available_in_terra.daily.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="text-xs flex items-center justify-between">
                        <span className="font-mono">{item.date}</span>
                        <span className="text-muted-foreground">{item.summary}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* In Database */}
            <div className="rounded-lg border p-4 bg-info/5 border-info/20">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-info" />
                <h5 className="font-medium">{t('savedInDb')}</h5>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">{t('datesWithData')}:</span>
                <span className="ml-2 font-semibold">{diagnostics.in_database?.dates_with_data?.length || 0}</span>
              </div>
              {diagnostics.in_database?.dates_with_data?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {diagnostics.in_database.dates_with_data.slice(0, 7).map((date: string) => (
                    <Badge key={date} variant="outline" className="text-xs font-mono">
                      {date}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Missing Data */}
            {(diagnostics.missing_in_db?.daily?.length > 0 || 
              diagnostics.missing_in_db?.sleep?.length > 0) && (
              <div className="rounded-lg border p-4 bg-warning/5 border-warning/20">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <h5 className="font-medium">{t('notSynced')}</h5>
                </div>
                
                {diagnostics.missing_in_db.daily?.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm text-muted-foreground">{t('dailyForDates')}:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {diagnostics.missing_in_db.daily.map((date: string) => (
                        <Badge key={date} variant="outline" className="text-xs font-mono bg-warning/10">
                          {date}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {diagnostics.missing_in_db.sleep?.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">{t('sleepForDates')}:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {diagnostics.missing_in_db.sleep.map((date: string) => (
                        <Badge key={date} variant="outline" className="text-xs font-mono bg-warning/10">
                          {date}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-warning/20">
                  <div className="text-xs space-y-2 mb-3">
                    <p className="font-medium">💡 {t('howDataWorks')}</p>
                    <div className="space-y-1 text-muted-foreground">
                      <p><strong>📊 {t('dataExplanations.daily')}</strong></p>
                      <p><strong>😴 {t('dataExplanations.sleep')}</strong></p>
                      <p><strong>🏃 {t('dataExplanations.activity')}</strong></p>
                    </div>
                  </div>
                  {onSyncRequest && terraApiStatus !== 'timeout' && (
                    <Button size="sm" variant="outline" onClick={onSyncRequest} className="mt-2">
                      {t('requestSync')}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Webhook History */}
            {diagnostics.webhook_logs?.length > 0 && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4" />
                  <h5 className="font-medium">{t('webhookHistory')}</h5>
                </div>
                <div className="space-y-2">
                  {diagnostics.webhook_logs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between text-xs border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <CheckCircle className="h-3 w-3 text-success" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-destructive" />
                        )}
                        <span className="font-mono">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <span className="text-muted-foreground">{log.event_type || 'unknown'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchDiagnostics}
              disabled={loading}
              className="w-full"
            >
              {t('refresh')}
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
