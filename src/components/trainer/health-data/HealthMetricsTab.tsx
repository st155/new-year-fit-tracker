import { HealthData } from "./types";
import { HealthMetricCard } from "./HealthMetricCard";
import { useTranslation } from 'react-i18next';

interface HealthMetricsTabProps {
  healthData: HealthData[];
}

export function HealthMetricsTab({ healthData }: HealthMetricsTabProps) {
  const { t } = useTranslation('health');

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
        title={t('metrics.vo2max')}
        icon="🫁"
        value={getLatestValue('vo2_max') || 0}
        unit={t('units.mlKgMin')}
        source={getLatestSource('vo2_max_source')}
        data={getChartData('vo2_max')}
        trend={getTrend('vo2_max')}
      />
      
      <HealthMetricCard
        title={t('metrics.bloodPressure')}
        icon="🩺"
        value={getLatestValue('blood_pressure') || 0}
        unit={t('units.mmHg')}
        source={getLatestSource('blood_pressure_source')}
        data={getChartData('blood_pressure')}
        trend={getTrend('blood_pressure')}
      />
    </div>
  );
}
