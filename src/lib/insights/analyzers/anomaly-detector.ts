/**
 * Anomaly Detection Utilities
 * Detects outliers and unusual patterns in metric data
 */

export interface Stats {
  mean: number;
  std: number;
  min: number;
  max: number;
  count: number;
}

/**
 * Calculate statistical measures for a set of values
 */
export function calculateStats(values: number[]): Stats {
  if (values.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0, count: 0 };
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);

  return {
    mean,
    std,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  };
}

/**
 * Calculate Z-score for a value
 */
export function calculateZScore(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

/**
 * Check if a value is an anomaly (Z-score > 2 or < -2)
 */
export function isAnomaly(currentValue: number, historicalValues: number[]): boolean {
  if (historicalValues.length < 7) return false;

  const stats = calculateStats(historicalValues);
  const zScore = calculateZScore(currentValue, stats.mean, stats.std);

  return Math.abs(zScore) > 2;
}

/**
 * Detect all anomalies in a set of values
 */
export function detectAnomalies(values: number[]): number[] {
  if (values.length < 7) return [];

  const stats = calculateStats(values);
  const anomalies: number[] = [];

  values.forEach((value, index) => {
    const zScore = calculateZScore(value, stats.mean, stats.std);
    if (Math.abs(zScore) > 2) {
      anomalies.push(index);
    }
  });

  return anomalies;
}

/**
 * Get anomaly severity level
 */
export function getAnomalySeverity(zScore: number): 'mild' | 'moderate' | 'severe' {
  const absZ = Math.abs(zScore);
  if (absZ > 3) return 'severe';
  if (absZ > 2.5) return 'moderate';
  return 'mild';
}

/**
 * Calculate percent difference from mean
 */
export function percentFromMean(value: number, mean: number): number {
  if (mean === 0) return 0;
  return ((value - mean) / mean) * 100;
}
