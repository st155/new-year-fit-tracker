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

export function DataQualityMonitoring() {
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
      toast.success(`Retried ${result?.[0]?.retried_count || 0} failed jobs`);
    } catch (error) {
      toast.error('Failed to retry jobs');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleEnqueueCalculations = async () => {
    setIsEnqueuing(true);
    try {
      const result = await enqueueCalculations();
      toast.success(`Enqueued ${result?.[0]?.jobs_created || 0} confidence calculations`);
    } catch (error) {
      toast.error('Failed to enqueue calculations');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Quality Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time system health and data quality metrics
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
            Retry Failed Jobs
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleEnqueueCalculations}
            disabled={isEnqueuing}
          >
            <Zap className={`h-4 w-4 mr-2 ${isEnqueuing ? 'animate-spin' : ''}`} />
            Recalculate All
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Job Queue Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Job Queue</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
            <div className="flex gap-1 mt-2">
              {jobs.pending ? (
                <Badge variant="secondary" className="text-xs">
                  {jobs.pending} pending
                </Badge>
              ) : null}
              {jobs.processing ? (
                <Badge variant="default" className="text-xs">
                  {jobs.processing} active
                </Badge>
              ) : null}
              {jobs.failed ? (
                <Badge variant="destructive" className="text-xs">
                  {jobs.failed} failed
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Confidence Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {confidence.avg_confidence.toFixed(0)}%
            </div>
            <Progress value={confidence.avg_confidence} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {confidence.total_metrics} metrics tracked
            </p>
          </CardContent>
        </Card>

        {/* Webhook Processing */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhooks (24h)</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{webhooks.total_webhooks}</div>
            <Progress value={successRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {successRate.toFixed(1)}% success rate
            </p>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {jobs.failed || webhooks.failed > 0 ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-success" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.failed || webhooks.failed > 0 ? 'Degraded' : 'Healthy'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {jobs.failed || webhooks.failed > 0
                ? 'Some operations failed'
                : 'All systems operational'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Confidence Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Data Quality Distribution</CardTitle>
          <CardDescription>
            Breakdown of confidence scores across all metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Excellent (≥80%)</span>
                <Badge variant="default">{confidence.excellent}</Badge>
              </div>
              <Progress
                value={(confidence.excellent / confidence.total_metrics) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Good (60-79%)</span>
                <Badge variant="secondary">{confidence.good}</Badge>
              </div>
              <Progress
                value={(confidence.good / confidence.total_metrics) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Fair (40-59%)</span>
                <Badge variant="outline">{confidence.fair}</Badge>
              </div>
              <Progress
                value={(confidence.fair / confidence.total_metrics) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Poor (&lt;40%)</span>
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

      {/* Recent Job Processing Stats */}
      {jobStats && jobStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Job Processing Activity</CardTitle>
            <CardDescription>Last 7 days of background job execution</CardDescription>
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
                      {stat.count} jobs
                    </span>
                    {stat.avg_duration_seconds && (
                      <span className="text-xs text-muted-foreground">
                        ~{stat.avg_duration_seconds.toFixed(1)}s avg
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
