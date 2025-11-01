/**
 * Data Quality System - Central Exports
 */

export {
  DataSource,
  MetricCategory,
  SourcePriorityService,
} from './source-priority';

export {
  ConfidenceScorer,
  type ConfidenceFactors,
  type MetricWithConfidence,
} from './confidence-scoring';

export {
  ConflictResolver,
  ResolutionStrategy,
  type ConflictResolutionConfig,
} from './conflict-resolution';

export { UnifiedDataFetcherV2 } from './unified-data-fetcher-v2';

export {
  getConfidenceColor,
  getConfidenceBadgeVariant,
  getConfidenceLabel,
  getConfidenceIcon,
} from './ui-helpers';
