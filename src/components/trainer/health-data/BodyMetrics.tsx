import { HealthData } from "./types";
import { HealthMetricCard } from "./HealthMetricCard";
import { useTranslation } from "react-i18next";

interface BodyMetricsProps {
  healthData: HealthData[];
}

export function BodyMetrics({ healthData }: BodyMetricsProps) {
  const { t } = useTranslation('trainerHealth');
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
        title={t('metrics.weight')}
        icon="⚖️"
        value={getLatestValue('weight') || 0}
        unit="кг"
        source={getLatestSource('weight_source')}
        data={getChartData('weight')}
        trend={getTrend('weight')}
      />
      
      <HealthMetricCard
        title={t('metrics.bodyFat')}
        icon="📊"
        value={getLatestValue('body_fat') || 0}
        unit="%"
        source={getLatestSource('body_fat_source')}
        data={getChartData('body_fat')}
        trend={getTrend('body_fat')}
      />
      
      <HealthMetricCard
        title={t('metrics.muscleMass')}
        icon="💪"
        value={getLatestValue('muscle_mass') || 0}
        unit="кг"
        source={getLatestSource('muscle_mass_source')}
        data={getChartData('muscle_mass')}
        trend={getTrend('muscle_mass')}
      />
      
      <HealthMetricCard
        title={t('metrics.musclePercent')}
        icon="📈"
        value={getLatestValue('muscle_percent') || 0}
        unit="%"
        source={getLatestSource('muscle_percent_source')}
        data={getChartData('muscle_percent')}
        trend={getTrend('muscle_percent')}
      />
    </div>
  );
}
