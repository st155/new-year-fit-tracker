import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useConfidenceRecalculation } from '@/hooks/useConfidenceRecalculation';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';

export function DataQualitySummary() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const { 
    averageConfidence, 
    metricsByQuality, 
    isLoading 
  } = useDataQuality();
  const { recalculate, isRecalculating } = useConfidenceRecalculation();

  if (!user || isLoading) return null;

  const handleRecalculateAll = () => {
    if (!user?.id) return;
    recalculate({ user_id: user.id });
  };

  const totalMetrics = Object.values(metricsByQuality).reduce(
    (sum, metrics) => sum + metrics.length, 
    0
  );

  if (totalMetrics === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('dataQuality.title')}</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculateAll}
            disabled={isRecalculating}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            {t('dataQuality.recalculate')}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Quality Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t('dataQuality.overallScore')}</span>
            <span className="text-lg font-bold text-primary">
              {averageConfidence.toFixed(0)}%
            </span>
          </div>
          <Progress value={averageConfidence} className="h-2" />
        </div>

        {/* Quality Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QualityStatCard
            label={t('dataQuality.excellent')}
            count={metricsByQuality.excellent.length}
            total={totalMetrics}
            variant="success"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <QualityStatCard
            label={t('dataQuality.good')}
            count={metricsByQuality.good.length}
            total={totalMetrics}
            variant="default"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <QualityStatCard
            label={t('dataQuality.fair')}
            count={metricsByQuality.fair.length}
            total={totalMetrics}
            variant="outline"
            icon={<TrendingDown className="h-4 w-4" />}
          />
          <QualityStatCard
            label={t('dataQuality.poor')}
            count={metricsByQuality.poor.length}
            total={totalMetrics}
            variant="destructive"
            icon={<AlertCircle className="h-4 w-4" />}
          />
        </div>

        {/* Low Quality Metrics Alert */}
        {metricsByQuality.poor.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-destructive">
                {t('dataQuality.lowQualityCount', { count: metricsByQuality.poor.length })}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {metricsByQuality.poor.slice(0, 3).map(m => m.metricName).join(', ')}
                {metricsByQuality.poor.length > 3 && ` +${metricsByQuality.poor.length - 3}`}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface QualityStatCardProps {
  label: string;
  count: number;
  total: number;
  variant: 'success' | 'default' | 'outline' | 'destructive';
  icon: React.ReactNode;
}

function QualityStatCard({ label, count, total, variant, icon }: QualityStatCardProps) {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
  
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-background">
      <Badge variant={variant} className="gap-1">
        {icon}
        {label}
      </Badge>
      <div className="text-center">
        <p className="text-2xl font-bold">{count}</p>
        <p className="text-xs text-muted-foreground">{percentage}%</p>
      </div>
    </div>
  );
}
