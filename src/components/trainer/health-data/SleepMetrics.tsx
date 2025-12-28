import { HealthData } from "./types";
import { HealthMetricCard } from "./HealthMetricCard";
import { useTranslation } from 'react-i18next';

interface SleepMetricsProps {
  healthData: HealthData[];
}

export function SleepMetrics({ healthData }: SleepMetricsProps) {
  const { t } = useTranslation('trainerDashboard');
  const getLatestValue = (key: keyof HealthData) => {
    const latestData = healthData.find(d => d[key] !== undefined && d[key] !== null);
    return latestData?.[key] as number | undefined;
  };

  const getLatestSource = (sourceKey: string) => {
    const latestData = healthData.find(d => d[sourceKey as keyof HealthData]);
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
      min: Math.round(Math.min(...values) * 100) / 100,
      max: Math.round(Math.max(...values) * 100) / 100,
      avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <HealthMetricCard
        title={t('sleepMetrics.duration')}
        icon="💤"
        value={getLatestValue('sleep_hours') || 0}
        unit={t('units.hours')}
        source={getLatestSource('sleep_hours_source')}
        data={getChartData('sleep_hours')}
        trend={getTrend('sleep_hours')}
      />
      
      <HealthMetricCard
        title={t('sleepMetrics.efficiency')}
        icon="✨"
        value={getLatestValue('sleep_efficiency') || 0}
        unit="%"
        source={getLatestSource('sleep_efficiency_source')}
        data={getChartData('sleep_efficiency')}
        trend={getTrend('sleep_efficiency')}
      />
      
      <HealthMetricCard
        title={t('sleepMetrics.quality')}
        icon="⭐"
        value={getLatestValue('sleep_performance') || 0}
        unit="%"
        source={getLatestSource('sleep_performance_source')}
        data={getChartData('sleep_performance')}
        trend={getTrend('sleep_performance')}
      />
      
      <HealthMetricCard
        title={t('sleepMetrics.deepSleep')}
        icon="🌙"
        value={getLatestValue('deep_sleep_duration') || 0}
        unit={t('units.hours')}
        source={getLatestSource('deep_sleep_duration_source')}
        data={getChartData('deep_sleep_duration')}
        trend={getTrend('deep_sleep_duration')}
      />
      
      <HealthMetricCard
        title={t('sleepMetrics.lightSleep')}
        icon="☁️"
        value={getLatestValue('light_sleep_duration') || 0}
        unit={t('units.hours')}
        source={getLatestSource('light_sleep_duration_source')}
        data={getChartData('light_sleep_duration')}
        trend={getTrend('light_sleep_duration')}
      />
      
      <HealthMetricCard
        title={t('sleepMetrics.remSleep')}
        icon="🌟"
        value={getLatestValue('rem_sleep_duration') || 0}
        unit={t('units.hours')}
        source={getLatestSource('rem_sleep_duration_source')}
        data={getChartData('rem_sleep_duration')}
        trend={getTrend('rem_sleep_duration')}
      />
      
      <HealthMetricCard
        title={t('sleepMetrics.respiratoryRate')}
        icon="🫁"
        value={getLatestValue('respiratory_rate') || 0}
        unit={t('units.breathsPerMin')}
        source={getLatestSource('respiratory_rate_source')}
        data={getChartData('respiratory_rate')}
        trend={getTrend('respiratory_rate')}
      />
    </div>
  );
}
