export type MetricKey = 
  | 'body_fat' 
  | 'weight' 
  | 'vo2max' 
  | 'row_2km' 
  | 'recovery' 
  | 'steps' 
  | 'max_hr' 
  | 'day_strain';

export type MetricColor = 
  | 'body-fat' 
  | 'weight' 
  | 'vo2max' 
  | 'row' 
  | 'recovery' 
  | 'steps';

export interface MetricConfig {
  key: MetricKey;
  title: string;
  unit: string;
  color: MetricColor;
  description: string;
  category: 'body' | 'performance' | 'health';
  route?: string;
}

// Centralized metric configuration
export const createMetricConfig = (t: any): Record<MetricKey, MetricConfig> => ({
  body_fat: { 
    key: "body_fat", 
    title: t('metrics.bodyFat'), 
    unit: t('metrics.units.percent'), 
    color: "body-fat", 
    description: "Body fat percentage", 
    category: "body",
    route: 'body_fat'
  },
  weight: { 
    key: "weight", 
    title: t('metrics.weight'), 
    unit: t('metrics.units.kg'), 
    color: "weight", 
    description: "Weight measurements", 
    category: "body",
    route: 'weight'
  },
  vo2max: { 
    key: "vo2max", 
    title: t('metrics.vo2max'), 
    unit: "ML/KG/MIN", 
    color: "vo2max", 
    description: "Cardiovascular fitness", 
    category: "performance",
    route: 'vo2max'
  },
  row_2km: { 
    key: "row_2km", 
    title: "2KM ROW", 
    unit: "MIN", 
    color: "row", 
    description: "Rowing performance", 
    category: "performance",
    route: 'row_2km'
  },
  recovery: { 
    key: "recovery", 
    title: t('metrics.recovery'), 
    unit: t('metrics.units.percent'), 
    color: "recovery", 
    description: "Daily recovery", 
    category: "health",
    route: 'recovery'
  },
  steps: { 
    key: "steps", 
    title: t('metrics.steps'), 
    unit: t('metrics.units.steps'), 
    color: "steps", 
    description: "Step count", 
    category: "health",
    route: 'steps'
  },
  max_hr: { 
    key: "max_hr", 
    title: "Max HR", 
    unit: "BPM", 
    color: "recovery", 
    description: "Maximum heart rate", 
    category: "health"
  },
  day_strain: { 
    key: "day_strain", 
    title: "Day Strain", 
    unit: "STRAIN", 
    color: "vo2max", 
    description: "Daily strain", 
    category: "health"
  }
});

// Mapping from unified metric names to local keys
export const UNIFIED_TO_LOCAL_MAPPING: Record<string, MetricKey> = {
  'Recovery Score': 'recovery',
  'Weight': 'weight',
  'Body Fat Percentage': 'body_fat',
  'VO2Max': 'vo2max',
  'Steps': 'steps',
  'Max Heart Rate': 'max_hr',
  'Day Strain': 'day_strain',
};

// Helper to get metric config by key
export const getMetricConfig = (key: string, config: Record<MetricKey, MetricConfig>): MetricConfig | null => {
  return config[key as MetricKey] || null;
};

// Helper to map unified metric name to local key
export const mapUnifiedToLocal = (unifiedName: string): MetricKey | null => {
  return UNIFIED_TO_LOCAL_MAPPING[unifiedName] || null;
};

// CSS variable mapping for metric colors
export const METRIC_COLOR_VARS: Record<MetricColor, string> = {
  'body-fat': '--metric-body-fat',
  'weight': '--metric-weight',
  'vo2max': '--metric-vo2max',
  'row': '--metric-row',
  'recovery': '--success',
  'steps': '--metric-steps',
};
