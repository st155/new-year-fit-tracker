import { 
  Activity, Footprints, Zap, Scale, Heart, Flame, 
  Moon, Droplet, type LucideIcon 
} from 'lucide-react';

export const getMetricIcon = (metricName: string): LucideIcon => {
  const name = metricName.toLowerCase();
  if (name.includes('step')) return Footprints;
  if (name.includes('strain')) return Flame;
  if (name.includes('recovery')) return Heart;
  if (name.includes('weight')) return Scale;
  if (name.includes('sleep')) return Moon;
  if (name.includes('hr') || name.includes('heart')) return Heart;
  if (name.includes('hrv')) return Heart;
  if (name.includes('calorie')) return Droplet;
  if (name.includes('vo2')) return Zap;
  return Activity;
};

export const getMetricColor = (metricName: string): string => {
  const name = metricName.toLowerCase();
  if (name.includes('step')) return 'hsl(var(--chart-blue))';
  if (name.includes('strain') || name.includes('workout')) return 'hsl(var(--chart-orange))';
  if (name.includes('recovery')) return 'hsl(var(--chart-green))';
  if (name.includes('weight')) return 'hsl(var(--chart-purple))';
  if (name.includes('sleep')) return 'hsl(var(--chart-indigo))';
  if (name.includes('hr') || name.includes('heart')) return 'hsl(var(--chart-red))';
  if (name.includes('hrv')) return 'hsl(var(--chart-cyan))';
  if (name.includes('calorie')) return 'hsl(var(--chart-amber))';
  if (name.includes('vo2')) return 'hsl(var(--chart-teal))';
  if (name.includes('fat')) return 'hsl(var(--chart-pink))';
  return 'hsl(var(--primary))';
};

export const isLowerBetter = (metricName: string): boolean => {
  const name = metricName.toLowerCase();
  return name.includes('fat') || 
         name.includes('weight') || 
         name.includes('resting hr') ||
         name.includes('stress');
};

export const getTrendColor = (trend: number, metricName: string): string => {
  const lowerIsBetter = isLowerBetter(metricName);
  const isImproving = lowerIsBetter ? trend < 0 : trend > 0;
  
  if (Math.abs(trend) < 0.5) return 'hsl(var(--muted-foreground))';
  return isImproving ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
};

export const formatValue = (value: number | string, metricName: string, unit: string): string => {
  if (typeof value === 'string') return value;
  
  if (metricName.toLowerCase().includes('sleep') && metricName.toLowerCase().includes('duration')) {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
  
  if (metricName === 'Steps') {
    return Math.round(value).toLocaleString();
  }
  
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
};

export const getSourceDisplayName = (source: string): string => {
  const nameMap: Record<string, string> = {
    whoop: 'Whoop',
    ultrahuman: 'Ultrahuman',
    garmin: 'Garmin',
    withings: 'Withings',
  };
  return nameMap[source.toLowerCase()] || source;
};

export const getMetricQualityColor = (metricName: string, value: number): string | null => {
  const name = metricName.toLowerCase();
  
  if (name.includes('recovery')) {
    if (value < 33) return 'hsl(var(--destructive))';
    if (value < 67) return 'hsl(var(--warning))';
    return 'hsl(var(--success))';
  }
  
  if (name.includes('sleep') && name.includes('efficiency')) {
    if (value < 70) return 'hsl(var(--destructive))';
    if (value < 80) return 'hsl(var(--warning))';
    return 'hsl(var(--success))';
  }
  
  if (name.includes('sleep') && name.includes('duration')) {
    if (value < 5.5) return 'hsl(var(--destructive))';
    if (value < 6.5) return 'hsl(var(--warning))';
    return 'hsl(var(--success))';
  }
  
  // Resting HR: широкий диапазон нормы 35-90 bpm
  if ((name.includes('resting') && name.includes('heart')) || name.includes('resting hr')) {
    if (value < 30 || value > 100) return 'hsl(var(--destructive))';
    return 'hsl(var(--success))';
  }
  
  if (name.includes('step')) {
    if (value < 3000) return 'hsl(var(--destructive))';
    if (value < 5000) return 'hsl(var(--warning))';
    if (value >= 8000) return 'hsl(var(--success))';
    return null;
  }
  
  // HRV: мягкие пороги, т.к. сильно зависит от индивидуальных особенностей
  if (name.includes('hrv')) {
    if (value < 15) return 'hsl(var(--destructive))';
    if (value < 25) return 'hsl(var(--warning))';
    return 'hsl(var(--success))';
  }
  
  return null;
};

export interface QualityLabelTexts {
  recovery: {
    low: string;
    medium: string;
    high: string;
  };
  sleep: {
    poor: string;
    normal: string;
    good: string;
  };
  steps: {
    veryLow: string;
    low: string;
    good: string;
    excellent: string;
  };
}

export interface MetricTooltipTexts {
  recovery: string;
  sleepEfficiency: string;
  hrv: string;
  steps: string;
}

// Default Russian texts for quality labels
function getDefaultQualityTexts(): QualityLabelTexts {
  return {
    recovery: {
      low: 'Низкое восстановление',
      medium: 'Среднее',
      high: 'Отличное',
    },
    sleep: {
      poor: 'Плохой сон',
      normal: 'Норма',
      good: 'Хороший сон',
    },
    steps: {
      veryLow: 'Очень мало',
      low: 'Маловато',
      good: 'Хорошо',
      excellent: 'Отлично',
    },
  };
}

// Default Russian texts for tooltips
function getDefaultTooltipTexts(): MetricTooltipTexts {
  return {
    recovery: 'Оценка готовности организма к нагрузкам. >66 = отличное, 33-66 = среднее, <33 = низкое восстановление',
    sleepEfficiency: 'Процент времени, проведенного во сне от времени в постели. >85% = отлично, 75-85% = норма, <75% = плохо',
    hrv: 'Вариабельность сердечного ритма. Индикатор восстановления и адаптации к стрессу. Чем выше - тем лучше',
    steps: 'Количество шагов за день. Рекомендуется: >10000 шагов. Минимум: 8000',
  };
}

export const getQualityLabel = (
  metricName: string, 
  value: number,
  texts?: QualityLabelTexts
): { icon: string; text: string; color: string } | null => {
  const name = metricName.toLowerCase();
  const t = texts || getDefaultQualityTexts();
  
  if (name.includes('recovery')) {
    if (value < 33) return { icon: '🔴', text: t.recovery.low, color: 'hsl(var(--destructive))' };
    if (value < 67) return { icon: '⚠️', text: t.recovery.medium, color: 'hsl(var(--warning))' };
    return { icon: '✅', text: t.recovery.high, color: 'hsl(var(--success))' };
  }
  
  if (name.includes('sleep') && name.includes('efficiency')) {
    if (value < 70) return { icon: '😴', text: t.sleep.poor, color: 'hsl(var(--destructive))' };
    if (value < 80) return { icon: '😐', text: t.sleep.normal, color: 'hsl(var(--warning))' };
    return { icon: '😊', text: t.sleep.good, color: 'hsl(var(--success))' };
  }
  
  if (name.includes('step')) {
    if (value < 3000) return { icon: '🔴', text: t.steps.veryLow, color: 'hsl(var(--destructive))' };
    if (value < 5000) return { icon: '⚠️', text: t.steps.low, color: 'hsl(var(--warning))' };
    if (value >= 10000) return { icon: '✅', text: t.steps.excellent, color: 'hsl(var(--success))' };
    if (value >= 8000) return { icon: '😊', text: t.steps.good, color: 'hsl(var(--success))' };
    return null;
  }
  
  return null;
};

export const getMetricTooltip = (
  metricName: string,
  texts?: MetricTooltipTexts
): string | null => {
  const name = metricName.toLowerCase();
  const t = texts || getDefaultTooltipTexts();
  
  if (name.includes('recovery')) {
    return t.recovery;
  }
  
  if (name.includes('sleep') && name.includes('efficiency')) {
    return t.sleepEfficiency;
  }
  
  if (name.includes('hrv')) {
    return t.hrv;
  }
  
  if (name.includes('step')) {
    return t.steps;
  }
  
  return null;
};
