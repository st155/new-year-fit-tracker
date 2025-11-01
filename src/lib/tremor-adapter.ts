/**
 * Tremor Data Adapter
 * Converts existing data formats to Tremor-compatible structures
 */

// 1. Преобразование массива метрик для AreaChart/LineChart
export function adaptMetricsToTremor(data: { date: string; value: number }[]) {
  return data.map(item => ({
    date: item.date,
    value: item.value
  }));
}

// 2. Преобразование для BarChart (strain)
export function adaptStrainToTremor(data: { date: string; value: number }[]) {
  return data.map(item => ({
    date: item.date,
    Strain: item.value // Tremor requires named categories
  }));
}

// 3. Преобразование для Sleep Chart (stacked bar)
export function adaptSleepToTremor(data: { 
  date: string; 
  deep?: number; 
  light?: number; 
  rem?: number; 
  awake?: number;
  total?: number;
}[]) {
  return data.map(item => ({
    date: item.date,
    'Deep Sleep': Math.round(item.deep || 0),
    'Light Sleep': Math.round(item.light || 0),
    'REM Sleep': Math.round(item.rem || 0),
    'Awake': Math.round(item.awake || 0)
  }));
}

// 4. Цветовая палитра для Tremor (соответствует текущей теме)
export const tremorColorMap = {
  recovery: 'emerald',
  strain: 'orange',
  heartRate: 'rose',
  sleep: 'indigo',
  steps: 'cyan',
  calories: 'amber',
  // Status colors
  excellent: 'emerald',
  good: 'blue',
  needs_attention: 'yellow',
  inactive: 'red'
} as const;

// 5. Преобразование heart rate данных
export function adaptHeartRateToTremor(data: { date: string; value: number }[]) {
  return data.map(item => ({
    date: item.date,
    'Heart Rate': Math.round(item.value)
  }));
}

// 6. Value formatters для графиков
export const valueFormatters = {
  percentage: (value: number) => `${Math.round(value)}%`,
  bpm: (value: number) => `${Math.round(value)} bpm`,
  minutes: (value: number) => `${Math.round(value)} min`,
  hours: (value: number) => `${(value / 60).toFixed(1)} hrs`,
  calories: (value: number) => `${Math.round(value)} kcal`,
  steps: (value: number) => value.toLocaleString(),
  weight: (value: number) => `${value.toFixed(1)} kg`,
  decimal: (value: number) => value.toFixed(1)
};
