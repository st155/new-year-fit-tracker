import type { MetricType, UnifiedMetric } from '@/types/metrics';

/**
 * Shared metric utilities
 * Extracted from hooks to reduce duplication
 */

/**
 * Format metric value with unit
 */
export function formatMetricValue(value: number, unit: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  return `${formatter.format(value)} ${unit}`;
}

/**
 * Get metric color for charts
 */
export function getMetricColor(metricType: string): string {
  const colors: Record<string, string> = {
    weight: 'hsl(var(--primary))',
    body_fat: 'hsl(var(--destructive))',
    body_fat_percentage: 'hsl(var(--destructive))',
    muscle_mass: 'hsl(var(--chart-2))',
    skeletal_muscle_mass: 'hsl(var(--chart-2))',
    bmr: 'hsl(var(--chart-3))',
    bmi: 'hsl(var(--chart-4))',
    visceral_fat: 'hsl(var(--chart-5))',
    body_water: 'hsl(var(--chart-1))',
    protein: 'hsl(var(--accent))',
    minerals: 'hsl(var(--muted))',
    steps: 'hsl(var(--chart-3))',
    calories: 'hsl(var(--chart-4))',
    active_energy: 'hsl(var(--chart-5))',
    heart_rate: 'hsl(var(--destructive))',
    hrv: 'hsl(var(--chart-2))',
    sleep_duration: 'hsl(var(--primary))',
    vo2_max: 'hsl(var(--chart-1))',
  };

  return colors[metricType] ?? 'hsl(var(--muted-foreground))';
}

/**
 * Get metric label
 */
export function getMetricLabel(metricType: string): string {
  const labels: Record<string, string> = {
    weight: 'Weight',
    body_fat: 'Body Fat',
    body_fat_percentage: 'Body Fat %',
    muscle_mass: 'Muscle Mass',
    skeletal_muscle_mass: 'Skeletal Muscle',
    bmr: 'BMR',
    bmi: 'BMI',
    visceral_fat: 'Visceral Fat',
    body_water: 'Body Water',
    protein: 'Protein',
    minerals: 'Minerals',
    steps: 'Steps',
    calories: 'Calories',
    active_energy: 'Active Energy',
    heart_rate: 'Heart Rate',
    hrv: 'HRV',
    sleep_duration: 'Sleep',
    vo2_max: 'VO2 Max',
  };

  return labels[metricType] ?? metricType.replace(/_/g, ' ');
}

/**
 * Get metric unit
 */
export function getMetricUnit(metricType: string): string {
  const units: Record<string, string> = {
    weight: 'kg',
    body_fat: '%',
    body_fat_percentage: '%',
    muscle_mass: 'kg',
    skeletal_muscle_mass: 'kg',
    bmr: 'kcal',
    bmi: '',
    visceral_fat: 'cm²',
    body_water: 'L',
    protein: 'kg',
    minerals: 'kg',
    steps: 'steps',
    calories: 'kcal',
    active_energy: 'kcal',
    heart_rate: 'bpm',
    hrv: 'ms',
    sleep_duration: 'h',
    vo2_max: 'ml/kg/min',
  };

  return units[metricType] ?? '';
}

/**
 * Calculate trend from history
 */
export function calculateTrend(
  history: Array<{ value: number; measurement_date: string }>
): 'up' | 'down' | 'stable' {
  if (history.length < 2) return 'stable';
  
  const latest = history[0].value;
  const previous = history[1].value;
  const change = ((latest - previous) / previous) * 100;
  
  if (Math.abs(change) < 2) return 'stable';
  return change > 0 ? 'up' : 'down';
}

/**
 * Calculate trend percentage
 */
export function calculateTrendPercent(
  history: Array<{ value: number }>
): number {
  if (history.length < 2) return 0;
  
  const latest = history[0].value;
  const previous = history[1].value;
  
  return ((latest - previous) / previous) * 100;
}

/**
 * Deduplicate metrics by priority (prefer higher priority sources)
 */
export function deduplicateByPriority<T extends { 
  metric_name: string; 
  priority: number; 
  measurement_date: string;
  created_at?: string;
}>(metrics: T[]): Record<string, T> {
  return metrics.reduce((acc, metric) => {
    const existing = acc[metric.metric_name];
    
    if (!existing) {
      acc[metric.metric_name] = metric;
      return acc;
    }

    const existingPriority = existing.priority || 999;
    const currentPriority = metric.priority || 999;
    
    if (currentPriority < existingPriority) {
      acc[metric.metric_name] = metric;
    } else if (currentPriority === existingPriority) {
      const existingDate = new Date(existing.measurement_date);
      const currentDate = new Date(metric.measurement_date);
      
      if (currentDate > existingDate) {
        acc[metric.metric_name] = metric;
      } else if (existingDate.getTime() === currentDate.getTime()) {
        if (new Date(metric.created_at || 0) > new Date(existing.created_at || 0)) {
          acc[metric.metric_name] = metric;
        }
      }
    }
    
    return acc;
  }, {} as Record<string, T>);
}

/**
 * Group metrics by date for charts
 */
export function groupMetricsByDate(
  metrics: UnifiedMetric[]
): Map<string, UnifiedMetric[]> {
  const grouped = new Map<string, UnifiedMetric[]>();
  
  metrics.forEach(metric => {
    const date = metric.measurement_date.split('T')[0];
    const existing = grouped.get(date) || [];
    grouped.set(date, [...existing, metric]);
  });
  
  return grouped;
}
