import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useMetricDetail } from '@/hooks/useMetricDetail';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Activity } from 'lucide-react';
import { MetricChart } from '@/components/metrics/MetricChart';
import { MetricStats } from '@/components/metrics/MetricStats';
import { MetricSources } from '@/components/metrics/MetricSources';
import { MetricHistory } from '@/components/metrics/MetricHistory';

// Utility functions
const getMetricColor = (metricName: string) => {
  const name = metricName.toLowerCase();
  if (name.includes('step')) return '#3b82f6';
  if (name.includes('strain') || name.includes('workout')) return '#f97316';
  if (name.includes('recovery')) return '#10b981';
  if (name.includes('weight')) return '#8b5cf6';
  if (name.includes('sleep')) return '#6366f1';
  if (name.includes('hr') || name.includes('heart')) return '#ef4444';
  if (name.includes('hrv')) return '#06b6d4';
  if (name.includes('calorie')) return '#f59e0b';
  if (name.includes('vo2')) return '#14b8a6';
  if (name.includes('fat')) return '#ec4899';
  return '#3b82f6';
};

const formatValue = (value: number, metricName: string): string => {
  if (metricName.toLowerCase().includes('sleep') && metricName.toLowerCase().includes('duration')) {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return i18n.t('units:duration.hoursMinutes', { hours, minutes });
  }
  
  if (metricName === 'Steps') {
    return Math.round(value).toLocaleString();
  }
  
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
};

const MetricDetail = () => {
  const { metricName } = useParams<{ metricName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation('metricDetail');
  
  const { data, isLoading, error } = useMetricDetail(metricName, user?.id);

  if (isLoading) {
    return (
      <AnimatedPage>
        <div className="min-h-screen bg-background p-4 md:p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AnimatedPage>
    );
  }

  if (error || !data) {
    return (
      <AnimatedPage>
        <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-destructive">{t('loadError')}</p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backHome')}
            </Button>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  const color = getMetricColor(metricName || '');
  const unit = data.records[0]?.unit || '';

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-background p-4 md:p-6 pb-24 md:pb-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Activity className="h-8 w-8" style={{ color }} />
                {metricName}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('detailedInfo')}
              </p>
            </div>
          </div>

          {/* Current Value Card */}
          <div 
            className="rounded-lg border-2 p-6 md:p-8"
            style={{
              background: `linear-gradient(135deg, ${color}08, transparent)`,
              borderColor: `${color}30`,
            }}
          >
            <p className="text-sm text-muted-foreground mb-2">{t('currentValue')}</p>
            <p className="text-5xl font-bold">
              {formatValue(data.currentValue, metricName || '')} 
              <span className="text-2xl font-normal text-muted-foreground ml-2">{unit}</span>
            </p>
          </div>

          {/* Chart */}
          <MetricChart 
            records={data.records} 
            metricName={metricName || ''} 
            color={color}
          />

          {/* Stats and Sources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricStats 
              stats={data.stats} 
              unit={unit} 
              metricName={metricName || ''}
            />
            <MetricSources sources={data.sources} />
          </div>

          {/* History Table */}
          <MetricHistory 
            records={data.records} 
            metricName={metricName || ''}
          />
        </div>
      </div>
    </AnimatedPage>
  );
};

export default MetricDetail;