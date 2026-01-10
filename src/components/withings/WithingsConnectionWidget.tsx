import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useWithingsDataFreshness } from '@/hooks/useWithingsDataFreshness';
import { useWithingsBackfill } from '@/hooks/useWithingsBackfill';
import { useForceTerraSync } from '@/hooks/useForceTerraSync';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import i18n from '@/i18n';

const getDateLocale = () => i18n.language === 'ru' ? ru : enUS;

export function WithingsConnectionWidget() {
  const { t } = useTranslation('integrations');
  const { data: freshness, isLoading } = useWithingsDataFreshness();
  const backfillMutation = useWithingsBackfill();
  const syncMutation = useForceTerraSync();

  const handleQuickSync = () => {
    syncMutation.mutate({ provider: 'WITHINGS', dataType: 'body' });
  };

  const handleFullBackfill = () => {
    backfillMutation.mutate({ daysBack: 30 });
  };

  if (isLoading) {
    return null;
  }

  const isConnected = freshness?.hasData ?? false;
  const isStale = freshness?.isStale ?? true;
  const isPending = backfillMutation.isPending || syncMutation.isPending;

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-primary" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            )}
            <CardTitle className="text-lg">Withings</CardTitle>
          </div>
          <Badge variant={isConnected && !isStale ? "default" : "secondary"}>
            {isConnected ? (
              isStale ? (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t('withings.staleData')}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t('withings.active')}
                </span>
              )
            ) : (
              t('withings.noData')
            )}
          </Badge>
        </div>
        <CardDescription>
          {isConnected ? (
            <span>
              {t('withings.lastData')}{' '}
              {freshness?.lastSyncDate ? (
                <strong>
                  {formatDistanceToNow(freshness.lastSyncDate, {
                    addSuffix: true,
                    locale: getDateLocale(),
                  })}
                </strong>
              ) : (
                t('withings.unknown')
              )}
            </span>
          ) : (
            t('withings.connectDevice')
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isConnected && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('withings.metricsLast7Days')}</span>
            <strong className="text-foreground">{freshness?.metricsCount7Days ?? 0}</strong>
          </div>
        )}

        {isStale && isConnected && (
          <div className="flex items-start gap-2 rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{t('withings.dataStale')}</p>
              <p className="text-muted-foreground mt-0.5">
                {t('withings.daysSinceSync', { days: freshness?.daysSinceSync })}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleQuickSync}
            disabled={isPending}
            variant="secondary"
            size="sm"
            className="flex-1"
          >
            {isPending && <RefreshCw className="mr-2 h-3 w-3 animate-spin" />}
            {t('withings.quickSync')}
          </Button>
          <Button
            onClick={handleFullBackfill}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            {isPending && <RefreshCw className="mr-2 h-3 w-3 animate-spin" />}
            {t('withings.load30Days')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
