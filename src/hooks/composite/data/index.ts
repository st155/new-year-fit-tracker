/**
 * Composite data hooks exports
 */

export { 
  useMetrics, 
  useLatestMetricsOnly, 
  useMetricHistory,
  useSingleMetric,
  // Backwards compatibility exports
  useLatestMetrics,
  useDeviceMetrics,
  type MetricData,
  type DeviceFilter,
} from './useMetrics';

export {
  useMetricWithQuality,
  useConflictDetection,
} from './useMetricsV2';

export { 
  useBodyComposition,
  type BodyCompositionData,
  type Body3DModel
} from './useBodyComposition';
