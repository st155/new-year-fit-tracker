import { HealthData } from "./types";
import { HealthMetricCard } from "./HealthMetricCard";

interface SleepMetricsProps {
  healthData: HealthData[];
}

export function SleepMetrics({ healthData }: SleepMetricsProps) {
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
        title="Длительность сна"
        icon="💤"
        value={getLatestValue('sleep_hours') || 0}
        unit="ч"
        source={getLatestSource('sleep_hours_source')}
        data={getChartData('sleep_hours')}
        trend={getTrend('sleep_hours')}
      />
      
      <HealthMetricCard
        title="Эффективность сна"
        icon="✨"
        value={getLatestValue('sleep_efficiency') || 0}
        unit="%"
        source={getLatestSource('sleep_efficiency_source')}
        data={getChartData('sleep_efficiency')}
        trend={getTrend('sleep_efficiency')}
      />
      
      <HealthMetricCard
        title="Качество сна"
        icon="⭐"
        value={getLatestValue('sleep_performance') || 0}
        unit="%"
        source={getLatestSource('sleep_performance_source')}
        data={getChartData('sleep_performance')}
        trend={getTrend('sleep_performance')}
      />
      
      <HealthMetricCard
        title="Глубокий сон"
        icon="🌙"
        value={getLatestValue('deep_sleep_duration') || 0}
        unit="ч"
        source={getLatestSource('deep_sleep_duration_source')}
        data={getChartData('deep_sleep_duration')}
        trend={getTrend('deep_sleep_duration')}
      />
      
      <HealthMetricCard
        title="Легкий сон"
        icon="☁️"
        value={getLatestValue('light_sleep_duration') || 0}
        unit="ч"
        source={getLatestSource('light_sleep_duration_source')}
        data={getChartData('light_sleep_duration')}
        trend={getTrend('light_sleep_duration')}
      />
      
      <HealthMetricCard
        title="REM сон"
        icon="🌟"
        value={getLatestValue('rem_sleep_duration') || 0}
        unit="ч"
        source={getLatestSource('rem_sleep_duration_source')}
        data={getChartData('rem_sleep_duration')}
        trend={getTrend('rem_sleep_duration')}
      />
      
      <HealthMetricCard
        title="Частота дыхания"
        icon="🫁"
        value={getLatestValue('respiratory_rate') || 0}
        unit="вдохов/мин"
        source={getLatestSource('respiratory_rate_source')}
        data={getChartData('respiratory_rate')}
        trend={getTrend('respiratory_rate')}
      />
    </div>
  );
}
