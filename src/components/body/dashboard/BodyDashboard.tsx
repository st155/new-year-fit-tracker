import { useTranslation } from 'react-i18next';
import { MultiSourceMetricCard } from './MultiSourceMetricCard';
import { LatestBodyReportCard } from './LatestBodyReportCard';
import { SourceStatsGrid } from './SourceStatsGrid';
import { Button } from '@/components/ui/button';
import { Plus, Upload, TrendingUp } from 'lucide-react';
import { BodyDataCurrent, BodyReport, SourceStats, TimelineEntry } from '@/hooks/composite/data/useMultiSourceBodyData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface BodyDashboardProps {
  current: BodyDataCurrent;
  latestReport?: BodyReport;
  sourceStats: Record<string, SourceStats>;
  timeline: TimelineEntry[];
  sparklines?: Record<string, Array<{date: string; value: number}>>;
  isLoading?: boolean;
  onUploadReport?: () => void;
  onManualEntry?: () => void;
  onViewReport?: (report: BodyReport) => void;
}

export function BodyDashboard({
  current,
  latestReport,
  sourceStats,
  timeline,
  sparklines = {},
  isLoading,
  onUploadReport,
  onManualEntry,
  onViewReport,
}: BodyDashboardProps) {
  const { t } = useTranslation('body');
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const hasData = Object.keys(current).length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{t('dashboard.noData')}</h3>
            <p className="text-muted-foreground">
              {t('dashboard.noDataDesc')}
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-4">
            <Button onClick={onUploadReport}>
              <Upload className="h-4 w-4 mr-2" />
              {t('dashboard.uploadReport')}
            </Button>
            <Button variant="outline" onClick={onManualEntry}>
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.manualEntry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Metrics Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('dashboard.currentMetrics')}</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <MultiSourceMetricCard
            title={t('metrics.weight')}
            icon={<span className="text-lg">⚖️</span>}
            data={current.weight}
            unit="kg"
            sparklineData={sparklines.weight}
          />
          <MultiSourceMetricCard
            title={t('metrics.bodyFat')}
            icon={<span className="text-lg">📊</span>}
            data={current.bodyFat}
            unit="%"
            sparklineData={sparklines.bodyFat}
          />
          <MultiSourceMetricCard
            title={t('metrics.muscleMass')}
            icon={<span className="text-lg">💪</span>}
            data={current.muscleMass}
            unit="kg"
            sparklineData={sparklines.muscleMass}
          />
          <MultiSourceMetricCard
            title={t('metrics.bmi')}
            icon={<span className="text-lg">📏</span>}
            data={current.bmi}
            unit=""
            sparklineData={sparklines.bmi}
          />
        </div>
      </div>

      {/* Additional Metrics (InBody-specific) */}
      {(current.bmr || current.visceralFat || current.bodyWater || current.protein) && (
        <div>
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.detailedMetrics')}</h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {current.bmr && (
              <MultiSourceMetricCard
                title={t('metrics.bmr')}
                icon={<span className="text-lg">🔥</span>}
                data={current.bmr}
                unit="kcal"
                sparklineData={sparklines.bmr}
              />
            )}
            {current.visceralFat && (
              <MultiSourceMetricCard
                title={t('metrics.visceralFat')}
                icon={<span className="text-lg">⚠️</span>}
                data={current.visceralFat}
                unit=""
                sparklineData={sparklines.visceralFat}
              />
            )}
            {current.bodyWater && (
              <MultiSourceMetricCard
                title={t('metrics.bodyWater')}
                icon={<span className="text-lg">💧</span>}
                data={current.bodyWater}
                unit="L"
                sparklineData={sparklines.bodyWater}
              />
            )}
            {current.protein && (
              <MultiSourceMetricCard
                title={t('metrics.protein')}
                icon={<span className="text-lg">🥩</span>}
                data={current.protein}
                unit="kg"
                sparklineData={sparklines.protein}
              />
            )}
          </div>
        </div>
      )}

      {/* Latest Body Report */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('dashboard.latestReport')}</h2>
        <LatestBodyReportCard 
          report={latestReport} 
          onViewReport={onViewReport}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={onUploadReport}>
              <Upload className="h-4 w-4 mr-2" />
              {t('dashboard.uploadBodyReport')}
            </Button>
            <Button variant="outline" onClick={onManualEntry}>
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.addManualMeasurement')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('dashboard.dataSources')}</h2>
        <SourceStatsGrid stats={sourceStats} />
      </div>
    </div>
  );
}
