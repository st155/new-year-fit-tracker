/**
 * Correlation Analysis Utilities
 * Calculates correlations between metrics to find patterns
 */

export interface CorrelationResult {
  metric1: string;
  metric2: string;
  correlation: number;
  interpretation: string;
  strength: 'weak' | 'moderate' | 'strong';
}

/**
 * Calculate Pearson correlation coefficient between two arrays
 */
export function calculateCorrelation(values1: number[], values2: number[]): number {
  const n = Math.min(values1.length, values2.length);
  if (n < 2) return 0;

  // Calculate means
  const mean1 = values1.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
  const mean2 = values2.slice(0, n).reduce((sum, val) => sum + val, 0) / n;

  // Calculate correlation
  let numerator = 0;
  let denominator1 = 0;
  let denominator2 = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = values1[i] - mean1;
    const diff2 = values2[i] - mean2;
    numerator += diff1 * diff2;
    denominator1 += diff1 * diff1;
    denominator2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(denominator1 * denominator2);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Find strong correlations between metrics (|r| > 0.5)
 */
export function findStrongCorrelations(
  metricsData: Record<string, number[]>
): CorrelationResult[] {
  const results: CorrelationResult[] = [];
  const metricNames = Object.keys(metricsData);

  for (let i = 0; i < metricNames.length; i++) {
    for (let j = i + 1; j < metricNames.length; j++) {
      const metric1 = metricNames[i];
      const metric2 = metricNames[j];
      const values1 = metricsData[metric1];
      const values2 = metricsData[metric2];

      if (values1.length < 7 || values2.length < 7) continue;

      const r = calculateCorrelation(values1, values2);
      const absR = Math.abs(r);

      if (absR > 0.5) {
        results.push({
          metric1,
          metric2,
          correlation: r,
          interpretation: r > 0 ? 'positive' : 'negative',
          strength: absR > 0.7 ? 'strong' : absR > 0.5 ? 'moderate' : 'weak',
        });
      }
    }
  }

  return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

/**
 * Group data by date for correlation analysis
 */
export function groupByDate(data: any[]): Record<string, number>[] {
  const grouped = new Map<string, Record<string, number>>();

  data.forEach((item) => {
    const date = item.date || item.created_at?.split('T')[0];
    if (!date) return;

    if (!grouped.has(date)) {
      grouped.set(date, {});
    }

    const dayData = grouped.get(date)!;
    dayData[item.metric_name] = item.value;
  });

  return Array.from(grouped.values());
}
