export interface MetricChange {
  value: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export function calculateMetricChange(current: number | null, previous: number | null): MetricChange | null {
  if (current === null) return null;
  
  const change = previous !== null ? current - previous : 0;
  const changePercent = previous && previous !== 0 ? (change / previous) * 100 : 0;
  
  return {
    value: current,
    change,
    changePercent,
    trend: Math.abs(change) < 0.01 ? 'stable' : change > 0 ? 'up' : 'down'
  };
}

export type BMIStatus = 'underweight' | 'normal' | 'overweight' | 'obese';

export function getBMIStatus(bmi: number | null): { status: BMIStatus; label: string; color: string } {
  if (bmi === null) return { status: 'normal', label: 'Unknown', color: 'text-muted-foreground' };
  
  if (bmi < 18.5) return { status: 'underweight', label: 'UNDERWEIGHT', color: 'text-yellow-400' };
  if (bmi < 25) return { status: 'normal', label: 'NORMAL', color: 'text-green-400' };
  if (bmi < 30) return { status: 'overweight', label: 'OVERWEIGHT', color: 'text-orange-400' };
  return { status: 'obese', label: 'OBESE', color: 'text-red-400' };
}

export function getBodyFatStatus(percent: number | null, gender: 'male' | 'female' = 'male'): { label: string; color: string } {
  if (percent === null) return { label: 'Unknown', color: 'text-muted-foreground' };
  
  const ranges = gender === 'male' 
    ? { essential: 5, athletes: 13, fitness: 17, average: 24 }
    : { essential: 13, athletes: 20, fitness: 24, average: 31 };
  
  if (percent <= ranges.essential) return { label: 'ESSENTIAL', color: 'text-yellow-400' };
  if (percent <= ranges.athletes) return { label: 'ATHLETE', color: 'text-green-400' };
  if (percent <= ranges.fitness) return { label: 'OPTIMAL', color: 'text-green-400' };
  if (percent <= ranges.average) return { label: 'AVERAGE', color: 'text-blue-400' };
  return { label: 'HIGH', color: 'text-orange-400' };
}

export function getVisceralFatStatus(area: number | null): { label: string; color: string } {
  if (area === null) return { label: 'Unknown', color: 'text-muted-foreground' };
  
  if (area < 100) return { label: 'HEALTHY RANGE', color: 'text-green-400' };
  if (area < 150) return { label: 'ELEVATED', color: 'text-yellow-400' };
  return { label: 'HIGH RISK', color: 'text-red-400' };
}

export function getSegmentStatus(percent: number | null): { label: string; color: string } {
  if (percent === null) return { label: 'N/A', color: 'text-muted-foreground' };
  
  if (percent < 90) return { label: 'LOW', color: 'text-orange-400' };
  if (percent <= 110) return { label: 'NORMAL', color: 'text-green-400' };
  return { label: 'HIGH', color: 'text-purple-400' };
}

export function formatMetricWithTrend(value: number, unit: string, change: number | null): string {
  const formattedValue = `${value.toFixed(1)}${unit}`;
  if (change === null || Math.abs(change) < 0.01) return formattedValue;
  
  const sign = change > 0 ? '+' : '';
  return `${formattedValue} (${sign}${change.toFixed(2)}${unit})`;
}

export function getSegmentColor(percent: number | null): string {
  if (percent === null) return '#64748b';
  if (percent < 90) return '#60a5fa'; // blue
  if (percent <= 110) return '#00D9FF'; // cyan
  return '#9333EA'; // purple
}
