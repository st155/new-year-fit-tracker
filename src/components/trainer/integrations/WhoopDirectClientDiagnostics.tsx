import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWhoopAdminSync } from "@/hooks/useWhoopAdminSync";
import { formatDistanceToNow, format, differenceInDays, subDays } from "date-fns";
import { ru, enUS } from "date-fns/locale";

interface WhoopDirectClientDiagnosticsProps {
  clientId: string;
  clientName: string;
}

export function WhoopDirectClientDiagnostics({ clientId, clientName }: WhoopDirectClientDiagnosticsProps) {
  const { t, i18n } = useTranslation('trainer');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState(28);
  const { syncClientData, isLoading: isSyncing } = useWhoopAdminSync();

  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  // Fetch Whoop token status
  const { data: whoopToken, isLoading: isLoadingToken, refetch } = useQuery({
    queryKey: ['whoop-token', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whoop_tokens')
        .select('*')
        .eq('user_id', clientId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch data gaps for whoop source
  const { data: dataGaps, isLoading: isLoadingGaps } = useQuery({
    queryKey: ['whoop-data-gaps', clientId],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('unified_metrics')
        .select('measurement_date')
        .eq('user_id', clientId)
        .eq('source', 'whoop')
        .gte('measurement_date', thirtyDaysAgo)
        .order('measurement_date', { ascending: true });

      if (error) throw error;

      // Find gaps in dates
      const dates = new Set(data?.map(d => d.measurement_date) || []);
      const gaps: { start: string; end: string; days: number }[] = [];
      
      let gapStart: string | null = null;
      for (let i = 0; i < 30; i++) {
        const date = subDays(new Date(), 30 - i).toISOString().split('T')[0];
        if (!dates.has(date)) {
          if (!gapStart) gapStart = date;
        } else if (gapStart) {
          const prevDate = subDays(new Date(), 30 - i + 1).toISOString().split('T')[0];
          gaps.push({
            start: gapStart,
            end: prevDate,
            days: differenceInDays(new Date(prevDate), new Date(gapStart)) + 1,
          });
          gapStart = null;
        }
      }

      // Close last gap if still open
      if (gapStart) {
        const today = new Date().toISOString().split('T')[0];
        gaps.push({
          start: gapStart,
          end: today,
          days: differenceInDays(new Date(today), new Date(gapStart)) + 1,
        });
      }

      return {
        datesWithData: dates.size,
        gaps: gaps.filter(g => g.days >= 2), // Only show gaps of 2+ days
      };
    },
    enabled: isOpen && !!whoopToken,
  });

  const handleSync = async () => {
    await syncClientData(clientId, selectedDays);
    refetch();
  };

  const isConnected = !!whoopToken;
  const isLoading = isLoadingToken || isLoadingGaps;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Activity className="h-4 w-4 text-orange-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            {t('whoopDirect.title')} — {clientName}
          </DialogTitle>
          <DialogDescription>
            {t('whoopDirect.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection Status */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{t('whoopDirect.connectionStatus')}</span>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isConnected ? (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t('whoopDirect.connected')}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    {t('whoopDirect.notConnected')}
                  </Badge>
                )}
              </div>

              {whoopToken && (
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>{t('whoopDirect.lastSync')}</span>
                    <span>
                      {whoopToken.last_sync_at 
                        ? formatDistanceToNow(new Date(whoopToken.last_sync_at), { addSuffix: true, locale: dateLocale })
                        : t('whoopDirect.never')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('whoopDirect.tokenValidUntil')}</span>
                    <span>
                      {format(new Date(whoopToken.expires_at), 'dd.MM.yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Gaps */}
          {isConnected && dataGaps && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{t('whoopDirect.dataFor30Days')}</span>
                  <Badge variant="outline">
                    {dataGaps.datesWithData} / 30 {t('whoopDirect.days')}
                  </Badge>
                </div>

                {dataGaps.gaps.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{t('whoopDirect.dataGapsFound')}</span>
                    </div>
                    <div className="space-y-1">
                      {dataGaps.gaps.map((gap, idx) => (
                        <div 
                          key={idx} 
                          className="text-sm flex items-center gap-2 text-muted-foreground"
                        >
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(gap.start), 'dd.MM')} — {format(new Date(gap.end), 'dd.MM')}
                            <span className="ml-1 text-orange-600">({gap.days} {t('whoopDirect.daysShort')})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t('whoopDirect.noDataGaps')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sync Controls */}
          {isConnected && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <span className="font-medium">{t('whoopDirect.forcedSync')}</span>
                  
                  <div className="flex gap-2">
                    {[7, 14, 28, 60].map(days => (
                      <Button
                        key={days}
                        variant={selectedDays === days ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedDays(days)}
                      >
                        {days} {t('whoopDirect.daysShort')}
                      </Button>
                    ))}
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('whoopDirect.syncing')}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('whoopDirect.syncButton', { days: selectedDays })}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isConnected && !isLoading && (
            <div className="text-center py-4 text-muted-foreground">
              <XCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>{t('whoopDirect.noActiveConnection')}</p>
              <p className="text-sm">{t('whoopDirect.askClientToConnect')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
