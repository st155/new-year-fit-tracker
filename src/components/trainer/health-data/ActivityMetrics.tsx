import { HealthData } from "./types";
import { HealthMetricCard } from "./HealthMetricCard";
import { useTranslation } from 'react-i18next';

interface ActivityMetricsProps {
  healthData: HealthData[];
}

export function ActivityMetrics({ healthData }: ActivityMetricsProps) {
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
        title={t('activity.steps')}
        icon="🏃"
        value={getLatestValue('steps') || 0}
        unit={t('units.steps')}
        source={getLatestSource('steps_source')}
        data={getChartData('steps')}
        trend={getTrend('steps')}
      />
      
      <HealthMetricCard
        title={t('activity.activeCalories')}
        icon="🔥"
        value={getLatestValue('active_calories') || 0}
        unit={t('units.kcal')}
        source={getLatestSource('active_calories_source')}
        data={getChartData('active_calories')}
        trend={getTrend('active_calories')}
      />
      
      <HealthMetricCard
        title={t('activity.distance')}
        icon="📍"
        value={getLatestValue('distance') || 0}
        unit={t('units.km')}
        source={getLatestSource('distance_source')}
        data={getChartData('distance')}
        trend={getTrend('distance')}
      />
      
      <HealthMetricCard
        title={t('activity.avgSpeed')}
        icon="⚡"
        value={getLatestValue('avg_speed') || 0}
        unit={t('units.kmh')}
        source={getLatestSource('avg_speed_source')}
        data={getChartData('avg_speed')}
        trend={getTrend('avg_speed')}
      />
      
      <HealthMetricCard
        title={t('activity.maxSpeed')}
        icon="🚀"
        value={getLatestValue('max_speed') || 0}
        unit={t('units.kmh')}
        source={getLatestSource('max_speed_source')}
        data={getChartData('max_speed')}
        trend={getTrend('max_speed')}
      />
      
      <HealthMetricCard
        title={t('activity.elevation')}
        icon="⛰️"
        value={getLatestValue('elevation_gain') || 0}
        unit={t('units.m')}
        source={getLatestSource('elevation_gain_source')}
        data={getChartData('elevation_gain')}
        trend={getTrend('elevation_gain')}
      />
      
      <HealthMetricCard
        title={t('activity.workoutTime')}
        icon="⏱️"
        value={getLatestValue('workout_time') || 0}
        unit={t('units.min')}
        source={getLatestSource('workout_time_source')}
        data={getChartData('workout_time')}
        trend={getTrend('workout_time')}
      />
    </div>
  );
}
