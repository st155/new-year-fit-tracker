/**
 * Metric categories and freshness rules
 */

export type MetricDataType = 'automatic' | 'manual';

export interface MetricFreshnessConfig {
  type: MetricDataType;
  maxAgeDays: number; // Maximum age before showing warning
  criticalAgeDays: number; // Maximum age before showing error
}

const FRESHNESS_CONFIG: Record<string, MetricFreshnessConfig> = {
  // Manual metrics - measured by user
  'Weight': {
    type: 'manual',
    maxAgeDays: 7,
    criticalAgeDays: 14,
  },
  'Body Fat Percentage': {
    type: 'manual',
    maxAgeDays: 7,
    criticalAgeDays: 14,
  },
  'Muscle Mass': {
    type: 'manual',
    maxAgeDays: 7,
    criticalAgeDays: 14,
  },

  // Automatic metrics - synced from devices
  'Steps': {
    type: 'automatic',
    maxAgeDays: 2,
    criticalAgeDays: 3,
  },
  'Active Calories': {
    type: 'automatic',
    maxAgeDays: 2,
    criticalAgeDays: 3,
  },
  'Sleep Duration': {
    type: 'automatic',
    maxAgeDays: 2,
    criticalAgeDays: 3,
  },
  'Sleep Efficiency': {
    type: 'automatic',
    maxAgeDays: 2,
    criticalAgeDays: 3,
  },
  'Recovery Score': {
    type: 'automatic',
    maxAgeDays: 2,
    criticalAgeDays: 3,
  },
  'Resting Heart Rate': {
    type: 'automatic',
    maxAgeDays: 2,
    criticalAgeDays: 3,
  },
  'HRV': {
    type: 'automatic',
    maxAgeDays: 2,
    criticalAgeDays: 3,
  },
  'Strain': {
    type: 'automatic',
    maxAgeDays: 2,
    criticalAgeDays: 3,
  },
  'Max Heart Rate': {
    type: 'automatic',
    maxAgeDays: 2,
    criticalAgeDays: 3,
  },
  'VO2 Max': {
    type: 'automatic',
    maxAgeDays: 7, // VO2 Max doesn't change often
    criticalAgeDays: 30,
  },
};

export function getMetricFreshnessConfig(metricName: string): MetricFreshnessConfig {
  return FRESHNESS_CONFIG[metricName] || {
    type: 'automatic',
    maxAgeDays: 2,
    criticalAgeDays: 3,
  };
}

export function isMetricStale(metricName: string, measurementDate: string): {
  isStale: boolean;
  isCritical: boolean;
  ageDays: number;
} {
  const config = getMetricFreshnessConfig(metricName);
  const now = new Date();
  const date = new Date(measurementDate);
  const ageDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isStale: ageDays > config.maxAgeDays,
    isCritical: ageDays > config.criticalAgeDays,
    ageDays,
  };
}

export function shouldShowFreshnessWarning(metricName: string, measurementDate: string): boolean {
  const { isStale, isCritical } = isMetricStale(metricName, measurementDate);
  const config = getMetricFreshnessConfig(metricName);
  
  // Don't show warnings for manual metrics unless critical
  if (config.type === 'manual') {
    return isCritical;
  }
  
  // Show warnings for automatic metrics if stale
  return isStale;
}

export function getDataAge(measurementDate: string): string {
  const now = new Date();
  const date = new Date(measurementDate);
  const ageDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (ageDays === 0) return 'Сегодня';
  if (ageDays === 1) return 'Вчера';
  return `${ageDays}д назад`;
}
