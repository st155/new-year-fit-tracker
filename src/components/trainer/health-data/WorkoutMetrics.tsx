import { HealthData } from "./types";
import { HealthMetricCard } from "./HealthMetricCard";

interface WorkoutMetricsProps {
  healthData: HealthData[];
}

export function WorkoutMetrics({ healthData }: WorkoutMetricsProps) {
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
        title="Калории за тренировку"
        icon="🔥"
        value={getLatestValue('workout_calories') || 0}
        unit="ккал"
        source={getLatestSource('workout_calories_source')}
        data={getChartData('workout_calories')}
        trend={getTrend('workout_calories')}
      />
      
      <HealthMetricCard
        title="Workout Strain"
        icon="💪"
        value={getLatestValue('workout_strain') || 0}
        unit=""
        source={getLatestSource('workout_strain_source')}
        data={getChartData('workout_strain')}
        trend={getTrend('workout_strain')}
      />
      
      <HealthMetricCard
        title="Время тренировки"
        icon="⏱️"
        value={getLatestValue('workout_time') || 0}
        unit="мин"
        source={getLatestSource('workout_time_source')}
        data={getChartData('workout_time')}
        trend={getTrend('workout_time')}
      />
    </div>
  );
}
