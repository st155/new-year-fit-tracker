// Core cards
export { EnhancedProgressCard } from './EnhancedProgressCard';
export { ChallengeGoalCard } from './ChallengeGoalCard';
export { Echo11SyncCard } from './Echo11SyncCard';

// Summary & Analytics
export { CompactProgressSummary } from './CompactProgressSummary';
export { DisciplineRadialChart } from './DisciplineRadialChart';
export { BaselineComparisonCard } from './BaselineComparisonCard';
export { PointsImpactCard } from './PointsImpactCard';

// Dialogs
export { QuickAddMeasurementDialog } from './QuickAddMeasurementDialog';

// Utils
export * from './utils/goalCardUtils';

// Deprecated components - use alternatives instead
/** @deprecated Use CompactProgressSummary instead */
export { ProgressOverviewCard } from './ProgressOverviewCard';

/** @deprecated Use unified_metrics instead of metric_values */
export { MetricsTrends } from './MetricsTrends';

/** @deprecated Use EnhancedProgressCard instead */
export { GoalsProgress } from './GoalsProgress';

/** @deprecated Use DisciplineRadialChart instead */
export { BodyCompositionTimeline } from './BodyCompositionTimeline';
