import { useTranslation } from 'react-i18next';
import { HealthData } from "./types";
import { HealthMetricCard } from "./HealthMetricCard";

interface HeartMetricsProps {
  healthData: HealthData[];
}

export function HeartMetrics({ healthData }: HeartMetricsProps) {
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
      min: Math.round(Math.min(...values)),
      max: Math.round(Math.max(...values)),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <HealthMetricCard
        title={t('heartMetrics.avgHr')}
        icon="❤️"
        value={getLatestValue('heart_rate_avg') || 0}
        unit="bpm"
        source={getLatestSource('heart_rate_avg_source')}
        data={getChartData('heart_rate_avg')}
        trend={getTrend('heart_rate_avg')}
      />
      
      <HealthMetricCard
        title={t('heartMetrics.restingHr')}
        icon="💓"
        value={getLatestValue('resting_heart_rate') || 0}
        unit="bpm"
        source={getLatestSource('resting_heart_rate_source')}
        data={getChartData('resting_heart_rate')}
        trend={getTrend('resting_heart_rate')}
      />
      
      <HealthMetricCard
        title={t('heartMetrics.maxHr')}
        icon="💗"
        value={getLatestValue('max_heart_rate') || 0}
        unit="bpm"
        source={getLatestSource('max_heart_rate_source')}
        data={getChartData('max_heart_rate')}
        trend={getTrend('max_heart_rate')}
      />
      
      <HealthMetricCard
        title="HRV"
        icon="💝"
        value={getLatestValue('hrv') || 0}
        unit="ms"
        source={getLatestSource('hrv_source')}
        data={getChartData('hrv')}
        trend={getTrend('hrv')}
      />
      
      <HealthMetricCard
        title={t('heartMetrics.sleepHrv')}
        icon="😴"
        value={getLatestValue('sleep_hrv') || 0}
        unit="ms"
        source={getLatestSource('sleep_hrv_source')}
        data={getChartData('sleep_hrv')}
        trend={getTrend('sleep_hrv')}
      />
      
      <HealthMetricCard
        title={t('heartMetrics.hrZonesLow')}
        icon="📊"
        value={getLatestValue('hr_zones_low') || 0}
        unit={t('units.min')}
        source={getLatestSource('hr_zones_low_source')}
        data={getChartData('hr_zones_low')}
        trend={getTrend('hr_zones_low')}
      />
      
      <HealthMetricCard
        title={t('heartMetrics.hrZonesHigh')}
        icon="📈"
        value={getLatestValue('hr_zones_high') || 0}
        unit={t('units.min')}
        source={getLatestSource('hr_zones_high_source')}
        data={getChartData('hr_zones_high')}
        trend={getTrend('hr_zones_high')}
      />
    </div>
  );
}