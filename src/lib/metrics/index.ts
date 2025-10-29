/**
 * Metrics utilities exports
 */

export {
  formatMetricValue,
  getMetricColor,
  getMetricLabel,
  getMetricUnit,
  calculateTrend,
  calculateTrendPercent,
  deduplicateByPriority,
  groupMetricsByDate,
} from './metric-utils';

export {
  getMetricFreshnessConfig,
  isMetricStale,
  shouldShowFreshnessWarning,
  getDataAge,
  type MetricDataType,
  type MetricFreshnessConfig,
} from './metric-categories';
