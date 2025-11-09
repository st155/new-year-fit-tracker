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
  isLoading,
  onUploadReport,
  onManualEntry,
  onViewReport,
}: BodyDashboardProps) {
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
            <h3 className="text-xl font-semibold">No body composition data yet</h3>
            <p className="text-muted-foreground">
              Start tracking by uploading a body scan or adding manual measurements
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-4">
            <Button onClick={onUploadReport}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Report
            </Button>
            <Button variant="outline" onClick={onManualEntry}>
              <Plus className="h-4 w-4 mr-2" />
              Manual Entry
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
        <h2 className="text-xl font-semibold mb-4">Current Metrics</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <MultiSourceMetricCard
            title="Weight"
            icon={<span className="text-lg">⚖️</span>}
            data={current.weight}
            unit="kg"
            timeline={timeline}
            metricKey="weight"
          />
          <MultiSourceMetricCard
            title="Body Fat"
            icon={<span className="text-lg">📊</span>}
            data={current.bodyFat}
            unit="%"
            timeline={timeline}
            metricKey="bodyFat"
          />
          <MultiSourceMetricCard
            title="Muscle Mass"
            icon={<span className="text-lg">💪</span>}
            data={current.muscleMass}
            unit="kg"
            timeline={timeline}
            metricKey="muscleMass"
          />
          <MultiSourceMetricCard
            title="BMI"
            icon={<span className="text-lg">📏</span>}
            data={current.bmi}
            unit=""
            timeline={timeline}
            metricKey="bmi"
          />
        </div>
      </div>

      {/* Additional Metrics (InBody-specific) */}
      {(current.bmr || current.visceralFat || current.bodyWater || current.protein) && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Detailed Metrics</h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {current.bmr && (
              <MultiSourceMetricCard
                title="BMR"
                icon={<span className="text-lg">🔥</span>}
                data={current.bmr}
                unit="kcal"
                timeline={timeline}
                metricKey="bmr"
              />
            )}
            {current.visceralFat && (
              <MultiSourceMetricCard
                title="Visceral Fat"
                icon={<span className="text-lg">⚠️</span>}
                data={current.visceralFat}
                unit=""
                timeline={timeline}
                metricKey="visceralFat"
              />
            )}
            {current.bodyWater && (
              <MultiSourceMetricCard
                title="Body Water"
                icon={<span className="text-lg">💧</span>}
                data={current.bodyWater}
                unit="L"
                timeline={timeline}
                metricKey="bodyWater"
              />
            )}
            {current.protein && (
              <MultiSourceMetricCard
                title="Protein"
                icon={<span className="text-lg">🥩</span>}
                data={current.protein}
                unit="kg"
                timeline={timeline}
                metricKey="protein"
              />
            )}
          </div>
        </div>
      )}

      {/* Latest Body Report */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Latest Body Report</h2>
        <LatestBodyReportCard 
          report={latestReport} 
          onViewReport={onViewReport}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={onUploadReport}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Body Report
            </Button>
            <Button variant="outline" onClick={onManualEntry}>
              <Plus className="h-4 w-4 mr-2" />
              Add Manual Measurement
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Data Sources</h2>
        <SourceStatsGrid stats={sourceStats} />
      </div>
    </div>
  );
}
