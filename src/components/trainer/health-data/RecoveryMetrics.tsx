import { HealthData } from "./types";
import { HealthMetricCard } from "./HealthMetricCard";

interface RecoveryMetricsProps {
  healthData: HealthData[];
}

export function RecoveryMetrics({ healthData }: RecoveryMetricsProps) {
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
        title="Recovery Score"
        icon="⚡"
        value={getLatestValue('recovery_score') || 0}
        unit="%"
        source={getLatestSource('recovery_score_source')}
        data={getChartData('recovery_score')}
        trend={getTrend('recovery_score')}
      />
      
      <HealthMetricCard
        title="Day Strain"
        icon="💥"
        value={getLatestValue('day_strain') || 0}
        unit=""
        source={getLatestSource('day_strain_source')}
        data={getChartData('day_strain')}
        trend={getTrend('day_strain')}
      />
      
      <HealthMetricCard
        title="Workout Strain"
        icon="🏋️"
        value={getLatestValue('workout_strain') || 0}
        unit=""
        source={getLatestSource('workout_strain_source')}
        data={getChartData('workout_strain')}
        trend={getTrend('workout_strain')}
      />
      
      <HealthMetricCard
        title="Body Battery"
        icon="🔋"
        value={getLatestValue('body_battery') || 0}
        unit=""
        source={getLatestSource('body_battery_source')}
        data={getChartData('body_battery')}
        trend={getTrend('body_battery')}
      />
      
      <HealthMetricCard
        title="Stress Level"
        icon="😰"
        value={getLatestValue('stress_level') || 0}
        unit=""
        source={getLatestSource('stress_level_source')}
        data={getChartData('stress_level')}
        trend={getTrend('stress_level')}
      />
    </div>
  );
}
