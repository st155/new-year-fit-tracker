import { HealthData } from "./types";
import { HealthMetricCard } from "./HealthMetricCard";
import { useTranslation } from 'react-i18next';

interface HealthOverviewProps {
  healthData: HealthData[];
}

export function HealthOverview({ healthData }: HealthOverviewProps) {
  const { t } = useTranslation('health');
  const last7Days = healthData.slice(0, 7);
  
  const calculateAvg = (key: keyof HealthData) => {
    const values = last7Days
      .map(d => d[key])
      .filter((v): v is number => typeof v === 'number' && v > 0);
    
    if (values.length === 0) return null;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  const getLatestSource = (sourceKey: string) => {
    const latestData = healthData[0];
    return latestData?.[sourceKey as keyof HealthData] as string | undefined;
  };

  const getChartData = (key: keyof HealthData) => {
    return healthData
      .filter(d => d[key])
      .slice(0, 30)
      .reverse()
      .map(d => ({
        date: d.date,
        value: d[key] as number
      }));
  };

  const getTrend = (key: keyof HealthData) => {
    const values = healthData
      .slice(0, 30)
      .map(d => d[key])
      .filter((v): v is number => typeof v === 'number' && v > 0);
    
    if (values.length === 0) return undefined;
    
    return {
      min: Math.round(Math.min(...values)),
      max: Math.round(Math.max(...values)),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('overview.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <HealthMetricCard
            title={t('overview.avgSteps')}
            icon="🏃"
            value={calculateAvg('steps') || 0}
            unit={t('units.steps')}
            source={getLatestSource('steps_source')}
            data={getChartData('steps')}
            trend={getTrend('steps')}
          />
          
          <HealthMetricCard
            title={t('overview.avgSleep')}
            icon="💤"
            value={calculateAvg('sleep_hours') || 0}
            unit={t('summary.hours')}
            source={getLatestSource('sleep_hours_source')}
            data={getChartData('sleep_hours')}
            trend={getTrend('sleep_hours')}
          />
          
          <HealthMetricCard
            title={t('overview.restingHr')}
            icon="❤️"
            value={calculateAvg('resting_heart_rate') || 0}
            unit={t('summary.bpm')}
            source={getLatestSource('resting_heart_rate_source')}
            data={getChartData('resting_heart_rate')}
            trend={getTrend('resting_heart_rate')}
          />
          
          <HealthMetricCard
            title={t('overview.recoveryScore')}
            icon="⚡"
            value={calculateAvg('recovery_score') || 0}
            unit="%"
            source={getLatestSource('recovery_score_source')}
            data={getChartData('recovery_score')}
            trend={getTrend('recovery_score')}
          />
          
          <HealthMetricCard
            title={t('overview.activeCalories')}
            icon="🔥"
            value={calculateAvg('active_calories') || 0}
            unit={t('units.kcal')}
            source={getLatestSource('active_calories_source')}
            data={getChartData('active_calories')}
            trend={getTrend('active_calories')}
          />
          
          <HealthMetricCard
            title={t('summary.hrv')}
            icon="💗"
            value={calculateAvg('hrv') || 0}
            unit={t('summary.ms')}
            source={getLatestSource('hrv_source')}
            data={getChartData('hrv')}
            trend={getTrend('hrv')}
          />
        </div>
      </div>
    </div>
  );
}
