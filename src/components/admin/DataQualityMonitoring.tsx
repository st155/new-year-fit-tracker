import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  useMonitoringData, 
  useJobProcessingStats, 
  useDataQualityTrends,
  useRetryFailedJobs,
  useEnqueueInitialCalculations 
} from '@/hooks/useMonitoringData';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Database, 
  RefreshCw,
  TrendingUp,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function DataQualityMonitoring() {
  const { t } = useTranslation('admin');
  const { data: monitoring, isLoading } = useMonitoringData();
  const { data: jobStats } = useJobProcessingStats();
  const { data: qualityTrends } = useDataQualityTrends();
  const retryJobs = useRetryFailedJobs();
  const enqueueCalculations = useEnqueueInitialCalculations();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isEnqueuing, setIsEnqueuing] = useState(false);

  const handleRetryJobs = async () => {
    setIsRetrying(true);
    try {
      const result = await retryJobs();
      toast.success(t('dataQuality.toasts.retriedJobs', { count: result?.[0]?.retried_count || 0 }));
    } catch (error) {
      toast.error(t('dataQuality.toasts.retryError'));
    } finally {
      setIsRetrying(false);
    }
  };

  const handleEnqueueCalculations = async () => {
    setIsEnqueuing(true);
    try {
      const result = await enqueueCalculations();
      toast.success(t('dataQuality.toasts.enqueuedJobs', { count: result?.[0]?.jobs_created || 0 }));
    } catch (error) {
      toast.error(t('dataQuality.toasts.enqueueError'));
    } finally {
      setIsEnqueuing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const jobs = monitoring?.jobs || {};
  const confidence = monitoring?.confidence || {
    total_metrics: 0,
    avg_confidence: 0,
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
  };
  const webhooks = monitoring?.webhooks || {
    total_webhooks: 0,
    completed: 0,
    failed: 0,
  };

  const totalJobs = Object.values(jobs).reduce((sum, count) => sum + (count || 0), 0);
  const successRate = webhooks.total_webhooks > 0
    ? (webhooks.completed / webhooks.total_webhooks) * 100
    : 100;

  // Check if confidence cache is empty (critical issue)
  const cacheIsEmpty = confidence.total_metrics === 0;
  const needsInitialization = cacheIsEmpty && !isEnqueuing;

  return (
    <div className="space-y-6">
      {/* Critical Alert: Empty Confidence Cache */}
      {needsInitialization && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <CardTitle className="text-destructive">{t('dataQuality.initRequired.title')}</CardTitle>
                <CardDescription className="mt-2">
                  {t('dataQuality.initRequired.description')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleEnqueueCalculations}
              disabled={isEnqueuing}
              size="lg"
              className="w-full"
            >
              {isEnqueuing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('dataQuality.initRequired.initializing')}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {t('dataQuality.initRequired.button')}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {t('dataQuality.initRequired.hint')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('dataQuality.title')}</h2>
          <p className="text-muted-foreground">
            {t('dataQuality.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetryJobs}
            disabled={isRetrying || !jobs.failed}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            {t('dataQuality.retryFailed')}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleEnqueueCalculations}
            disabled={isEnqueuing}
          >
            <Zap className={`h-4 w-4 mr-2 ${isEnqueuing ? 'animate-spin' : ''}`} />
            {t('dataQuality.recalculateAll')}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Job Queue Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dataQuality.jobQueue')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
            <div className="flex gap-1 mt-2">
              {jobs.pending ? (
                <Badge variant="secondary" className="text-xs">
                  {t('dataQuality.pending', { count: jobs.pending })}
                </Badge>
              ) : null}
              {jobs.processing ? (
                <Badge variant="default" className="text-xs">
                  {t('dataQuality.active', { count: jobs.processing })}
                </Badge>
              ) : null}
              {jobs.failed ? (
                <Badge variant="destructive" className="text-xs">
                  {t('dataQuality.failed', { count: jobs.failed })}
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Confidence Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dataQuality.avgConfidence')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {confidence.avg_confidence.toFixed(0)}%
            </div>
            <Progress value={confidence.avg_confidence} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {t('dataQuality.metricsTracked', { count: confidence.total_metrics })}
            </p>
          </CardContent>
        </Card>

        {/* Webhook Processing */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dataQuality.webhooks24h')}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{webhooks.total_webhooks}</div>
            <Progress value={successRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {t('dataQuality.successRate', { rate: successRate.toFixed(1) })}
            </p>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dataQuality.systemHealth')}</CardTitle>
            {jobs.failed || webhooks.failed > 0 ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-success" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.failed || webhooks.failed > 0 ? t('dataQuality.degraded') : t('dataQuality.healthy')}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {jobs.failed || webhooks.failed > 0
                ? t('dataQuality.operationsFailed')
                : t('dataQuality.allOperational')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Confidence Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dataQuality.distribution.title')}</CardTitle>
          <CardDescription>
            {t('dataQuality.distribution.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t('dataQuality.distribution.excellent')}</span>
                <Badge variant="default">{confidence.excellent}</Badge>
              </div>
              <Progress
                value={(confidence.excellent / confidence.total_metrics) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t('dataQuality.distribution.good')}</span>
                <Badge variant="secondary">{confidence.good}</Badge>
              </div>
              <Progress
                value={(confidence.good / confidence.total_metrics) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t('dataQuality.distribution.fair')}</span>
                <Badge variant="outline">{confidence.fair}</Badge>
              </div>
              <Progress
                value={(confidence.fair / confidence.total_metrics) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t('dataQuality.distribution.poor')}</span>
                <Badge variant="destructive">{confidence.poor}</Badge>
              </div>
              <Progress
                value={(confidence.poor / confidence.total_metrics) * 100}
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cache Hit Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('dataQuality.cachePerformance')}</CardTitle>
            <CardDescription>{t('dataQuality.cacheEfficiency')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('dataQuality.hitRate')}</span>
                <span className="text-lg font-bold">
                  {confidence.total_metrics > 0 
                    ? ((confidence.excellent + confidence.good) / confidence.total_metrics * 100).toFixed(1) 
                    : 0}%
                </span>
              </div>
              <Progress 
                value={confidence.total_metrics > 0 
                  ? ((confidence.excellent + confidence.good) / confidence.total_metrics * 100) 
                  : 0} 
              />
              <p className="text-xs text-muted-foreground mt-2">
                {t('dataQuality.cached', { cached: confidence.excellent + confidence.good, total: confidence.total_metrics })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Low Quality Metrics Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('dataQuality.alerts.title')}</CardTitle>
            <CardDescription>{t('dataQuality.alerts.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {confidence.poor > 0 && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('dataQuality.alerts.lowConfidence')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('dataQuality.alerts.metricsBelow', { count: confidence.poor })}
                    </p>
                  </div>
                </div>
              )}
              {confidence.fair > 0 && (
                <div className="flex items-center gap-2 p-2 bg-warning/10 rounded-md">
                  <Clock className="h-4 w-4 text-warning" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('dataQuality.alerts.moderateQuality')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('dataQuality.alerts.metricsAt', { count: confidence.fair })}
                    </p>
                  </div>
                </div>
              )}
              {confidence.poor === 0 && confidence.fair === 0 && (
                <div className="flex items-center gap-2 p-2 bg-success/10 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('dataQuality.alerts.allClear')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('dataQuality.alerts.noIssues')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Job Processing Stats */}
      {jobStats && jobStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dataQuality.jobActivity.title')}</CardTitle>
            <CardDescription>{t('dataQuality.jobActivity.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobStats.slice(0, 10).map((stat: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{stat.date}</span>
                    <Badge variant="outline" className="text-xs">
                      {stat.job_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {stat.count} {t('dataQuality.jobs')}
                    </span>
                    {stat.avg_duration_seconds && (
                      <span className="text-xs text-muted-foreground">
                        {t('dataQuality.avg', { seconds: stat.avg_duration_seconds.toFixed(1) })}
                      </span>
                    )}
                    <Badge
                      variant={
                        stat.status === 'completed'
                          ? 'default'
                          : stat.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {stat.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
