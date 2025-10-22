// Система маппинга и конверсии метрик для унификации данных из разных источников

export interface MetricSourceConfig {
  metricName: string;
  fallbackMetrics?: string[];
  unit: string;
  displayAs: string;
  color: string;
  converter?: (value: number, sourceMetricName: string) => number;
}

export interface MetricGroupConfig {
  displayName: string;
  icon: string;
  category: string;
  sources: Record<string, MetricSourceConfig>;
}

// Конфигурация для отображения и конверсии метрик
export const METRIC_DISPLAY_CONFIG: Record<string, MetricGroupConfig> = {
  recovery: {
    displayName: 'Recovery',
    icon: 'Heart',
    category: 'recovery',
    sources: {
      whoop: {
        metricName: 'Recovery Score',
        unit: '%',
        displayAs: 'Recovery',
        color: '#10b981',
      },
      ultrahuman: {
        metricName: 'Recovery Score',
        fallbackMetrics: ['HRV RMSSD', 'Sleep HRV RMSSD'],
        unit: '%',
        displayAs: 'Recovery',
        color: '#10b981',
        converter: (value: number, metricName: string) => {
          // Если это HRV метрика, конвертируем в условный процент восстановления
          if (metricName.includes('HRV')) {
            // HRV RMSSD обычно 20-100ms
            // Простая линейная конверсия: 20ms = 40%, 100ms = 100%
            return Math.min(100, Math.max(0, 40 + (value - 20) * 0.75));
          }
          return value;
        },
      },
      garmin: {
        metricName: 'Training Readiness',
        fallbackMetrics: ['Body Battery', 'Sleep HRV RMSSD'],
        unit: '%',
        displayAs: 'Readiness',
        color: '#3b82f6',
        converter: (value: number, metricName: string) => {
          if (metricName === 'Body Battery') {
            return value; // уже в процентах
          }
          if (metricName.includes('HRV')) {
            // Конверсия HRV -> %
            return Math.min(100, Math.max(0, 40 + (value - 20) * 0.75));
          }
          return value;
        },
      },
    },
  },
  
  energy: {
    displayName: 'Energy',
    icon: 'Battery',
    category: 'energy',
    sources: {
      garmin: {
        metricName: 'Body Battery',
        unit: '%',
        displayAs: 'Body Battery',
        color: '#3b82f6',
      },
      whoop: {
        metricName: 'Day Strain',
        unit: '%',
        displayAs: 'Energy',
        color: '#f97316',
        converter: (value: number) => {
          // Strain 0-21 -> Energy 100-0% (инверсия)
          return Math.max(0, 100 - (value * 100 / 21));
        },
      },
    },
  },
  
  steps: {
    displayName: 'Steps',
    icon: 'Footprints',
    category: 'activity',
    sources: {
      whoop: { metricName: 'Steps', unit: 'steps', displayAs: 'Steps', color: '#3b82f6' },
      garmin: { metricName: 'Steps', unit: 'steps', displayAs: 'Steps', color: '#3b82f6' },
      ultrahuman: { metricName: 'Steps', unit: 'steps', displayAs: 'Steps', color: '#3b82f6' },
      withings: { metricName: 'Steps', unit: 'steps', displayAs: 'Steps', color: '#3b82f6' },
    },
  },
  
  weight: {
    displayName: 'Weight',
    icon: 'Scale',
    category: 'body',
    sources: {
      withings: { metricName: 'Weight', unit: 'kg', displayAs: 'Weight', color: '#8b5cf6' },
      whoop: { metricName: 'Weight', unit: 'kg', displayAs: 'Weight', color: '#8b5cf6' },
      ultrahuman: { metricName: 'Weight', unit: 'kg', displayAs: 'Weight', color: '#8b5cf6' },
      garmin: { metricName: 'Weight', unit: 'kg', displayAs: 'Weight', color: '#8b5cf6' },
    },
  },
  
  heart_rate: {
    displayName: 'Heart Rate',
    icon: 'Heart',
    category: 'recovery',
    sources: {
      whoop: { metricName: 'Resting Heart Rate', unit: 'bpm', displayAs: 'Resting HR', color: '#ef4444' },
      garmin: { metricName: 'Resting Heart Rate', unit: 'bpm', displayAs: 'Resting HR', color: '#ef4444' },
      ultrahuman: { metricName: 'Resting Heart Rate', unit: 'bpm', displayAs: 'Resting HR', color: '#ef4444' },
    },
  },
};

// Алиасы метрик для обратной совместимости
export const METRIC_ALIASES: Record<string, { unifiedName: string; source?: string }> = {
  'Resting HR': { unifiedName: 'Resting Heart Rate' },
  'Max HR': { unifiedName: 'Max Heart Rate' },
  'Day Strain': { unifiedName: 'Day Strain', source: 'whoop' },
  'Daily Strain': { unifiedName: 'Day Strain', source: 'whoop' },
  'Strain': { unifiedName: 'Day Strain', source: 'whoop' },
  'Recovery': { unifiedName: 'Recovery Score' },
  'Readiness': { unifiedName: 'Training Readiness', source: 'garmin' },
  'Body Battery': { unifiedName: 'Body Battery', source: 'garmin' },
  'Dynamic Recovery': { unifiedName: 'Recovery Score', source: 'ultrahuman' },
};

// Получить конфигурацию для конкретной метрики и источника
export const getMetricConfig = (
  metricName: string,
  source: string
): MetricSourceConfig | null => {
  // Проверяем прямое соответствие
  for (const group of Object.values(METRIC_DISPLAY_CONFIG)) {
    const sourceConfig = group.sources[source.toLowerCase()];
    if (sourceConfig && sourceConfig.metricName === metricName) {
      return sourceConfig;
    }
  }
  
  // Проверяем алиасы
  const alias = METRIC_ALIASES[metricName];
  if (alias) {
    for (const group of Object.values(METRIC_DISPLAY_CONFIG)) {
      const sourceConfig = group.sources[source.toLowerCase()];
      if (sourceConfig && sourceConfig.metricName === alias.unifiedName) {
        return sourceConfig;
      }
    }
  }
  
  return null;
};

// Получить список fallback метрик для данного источника и метрики
export const getFallbackMetrics = (
  metricName: string,
  source: string
): string[] => {
  const config = getMetricConfig(metricName, source);
  return config?.fallbackMetrics || [];
};

// Применить конверсию значения если необходимо
export const convertMetricValue = (
  value: number,
  sourceMetricName: string,
  targetMetricName: string,
  source: string
): number => {
  const config = getMetricConfig(targetMetricName, source);
  if (config?.converter && sourceMetricName !== config.metricName) {
    return config.converter(value, sourceMetricName);
  }
  return value;
};
