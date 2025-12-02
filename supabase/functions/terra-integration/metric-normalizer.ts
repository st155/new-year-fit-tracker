// Utility to normalize Terra metric names to unified format across all providers

export interface MetricMapping {
  terraField: string | string[];
  unifiedName: string;
  unit: string;
  category: string;
  transformer?: (value: any) => number | null;
}

// Unified metric mappings for all providers
export const UNIFIED_METRICS: Record<string, MetricMapping> = {
  // Recovery metrics
  recovery_score: {
    terraField: ['recovery_score', 'recovery.score', 'recovery_score_percentage', 'recovery_percentage'],
    unifiedName: 'Recovery Score',
    unit: '%',
    category: 'recovery'
  },
  training_readiness: {
    terraField: ['training_readiness', 'readiness_score', 'training_readiness_score', 'body_battery.score', 'body_battery'],
    unifiedName: 'Training Readiness',
    unit: '%',
    category: 'recovery'
  },
  body_battery: {
    terraField: ['body_battery', 'body_battery.score'],
    unifiedName: 'Body Battery',
    unit: '%',
    category: 'recovery'
  },
  
  // Strain/Energy
  day_strain: {
    terraField: ['day_strain', 'strain', 'score.strain', 'strain_score'],
    unifiedName: 'Day Strain',
    unit: '',
    category: 'workout'
  },
  
  // Heart Rate
  resting_hr: {
    terraField: ['resting_hr_bpm', 'resting_heart_rate_bpm', 'resting_hr', 'resting_heart_rate'],
    unifiedName: 'Resting Heart Rate',
    unit: 'bpm',
    category: 'cardio'
  },
  avg_hr: {
    terraField: ['heart_rate_data.avg_hr_bpm', 'avg_hr_bpm'],
    unifiedName: 'Average Heart Rate',
    unit: 'bpm',
    category: 'cardio'
  },
  max_hr: {
    terraField: ['heart_rate_data.max_hr_bpm', 'max_hr_bpm'],
    unifiedName: 'Max Heart Rate',
    unit: 'bpm',
    category: 'cardio'
  },
  
  // Sleep
  sleep_duration: {
    terraField: ['duration_seconds', 'duration_sec', 'duration', 'sleep_duration_seconds'],
    unifiedName: 'Sleep Duration',
    unit: 'h',
    category: 'sleep',
    transformer: (seconds: number) => Math.round((seconds / 3600) * 10) / 10
  },
  sleep_efficiency: {
    terraField: ['sleep_efficiency_percentage', 'sleep.efficiency_percentage'],
    unifiedName: 'Sleep Efficiency',
    unit: '%',
    category: 'sleep'
  },
  sleep_performance: {
    terraField: ['sleep_performance_percentage', 'sleep.performance_percentage'],
    unifiedName: 'Sleep Performance',
    unit: '%',
    category: 'sleep'
  },
  
  // Sleep Phases
  deep_sleep_duration: {
    terraField: [
      'sleep_durations_data.asleep.duration_asleep_state_deep_sleep_seconds',
      'asleep.duration_asleep_state_deep_sleep_seconds',
      'duration_asleep_state_deep_sleep_seconds',
      'deep_sleep_duration_seconds'
    ],
    unifiedName: 'Deep Sleep Duration',
    unit: 'h',
    category: 'sleep',
    transformer: (seconds: number) => Math.round((seconds / 3600) * 10) / 10
  },
  light_sleep_duration: {
    terraField: [
      'sleep_durations_data.asleep.duration_asleep_state_light_sleep_seconds',
      'asleep.duration_asleep_state_light_sleep_seconds',
      'duration_asleep_state_light_sleep_seconds',
      'light_sleep_duration_seconds'
    ],
    unifiedName: 'Light Sleep Duration',
    unit: 'h',
    category: 'sleep',
    transformer: (seconds: number) => Math.round((seconds / 3600) * 10) / 10
  },
  rem_sleep_duration: {
    terraField: [
      'sleep_durations_data.asleep.duration_asleep_state_rem_sleep_seconds',
      'asleep.duration_asleep_state_rem_sleep_seconds',
      'duration_asleep_state_rem_sleep_seconds',
      'rem_sleep_duration_seconds'
    ],
    unifiedName: 'REM Sleep Duration',
    unit: 'h',
    category: 'sleep',
    transformer: (seconds: number) => Math.round((seconds / 3600) * 10) / 10
  },
  awake_duration: {
    terraField: [
      'sleep_durations_data.awake.duration_awake_state_seconds',
      'awake.duration_awake_state_seconds',
      'duration_awake_state_seconds',
      'awake_duration_seconds'
    ],
    unifiedName: 'Awake Duration',
    unit: 'h',
    category: 'sleep',
    transformer: (seconds: number) => Math.round((seconds / 3600) * 10) / 10
  },
  
  // HRV
  hrv_rmssd: {
    terraField: ['hrv_rmssd_ms', 'hrv.rmssd_ms', 'hrv.rmssd_milli', 'heart_rate_data.summary.avg_hrv_rmssd'],
    unifiedName: 'HRV RMSSD',
    unit: 'ms',
    category: 'recovery'
  },
  
  // Activity
  steps: {
    terraField: ['steps', 'steps_data.steps'],
    unifiedName: 'Steps',
    unit: 'steps',
    category: 'activity'
  },
  calories: {
    terraField: ['calories_data.total_burned_calories', 'total_burned_calories', 'calories_burned'],
    unifiedName: 'Active Calories',
    unit: 'kcal',
    category: 'workout'
  },
  
  // Body
  weight: {
    terraField: ['weight_kg', 'measurements_data.measurements[0].weight_kg'],
    unifiedName: 'Weight',
    unit: 'kg',
    category: 'body'
  },
  body_fat: {
    terraField: ['body_fat_percentage', 'bodyfat_percentage', 'measurements_data.measurements[0].bodyfat_percentage'],
    unifiedName: 'Body Fat Percentage',
    unit: '%',
    category: 'body'
  },
  
  // VO2Max
  vo2max: {
    terraField: ['oxygen_data.vo2max_ml_per_min_per_kg', 'vo2max_ml_per_min_per_kg'],
    unifiedName: 'VO2Max',
    unit: 'ml/kg/min',
    category: 'cardio'
  },
};

// Helper to get value from nested object path
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value === undefined || value === null) return undefined;
    // Handle array indexing like measurements[0]
    if (key.includes('[')) {
      const arrayKey = key.substring(0, key.indexOf('['));
      const index = parseInt(key.match(/\[(\d+)\]/)?.[1] || '0');
      value = value[arrayKey]?.[index];
    } else {
      value = value[key];
    }
  }
  return value;
}

// Extract metric value from Terra data object
export function extractMetricValue(data: any, metricKey: string): number | null {
  const mapping = UNIFIED_METRICS[metricKey];
  if (!mapping) return null;
  
  const fields = Array.isArray(mapping.terraField) ? mapping.terraField : [mapping.terraField];
  
  for (const field of fields) {
    const value = getNestedValue(data, field);
    if (value !== undefined && value !== null && typeof value === 'number') {
      // Apply transformer if exists
      return mapping.transformer ? mapping.transformer(value) : value;
    }
  }
  
  return null;
}

// Get normalized metric config by Terra field name
export function getNormalizedMetric(terraFieldName: string): { name: string; unit: string; category: string } | null {
  for (const [key, mapping] of Object.entries(UNIFIED_METRICS)) {
    const fields = Array.isArray(mapping.terraField) ? mapping.terraField : [mapping.terraField];
    if (fields.some(f => f === terraFieldName || f.endsWith(`.${terraFieldName}`))) {
      return {
        name: mapping.unifiedName,
        unit: mapping.unit,
        category: mapping.category
      };
    }
  }
  return null;
}

// Provider name normalization
export function normalizeProviderName(provider: string): string {
  return provider.toLowerCase().trim();
}
