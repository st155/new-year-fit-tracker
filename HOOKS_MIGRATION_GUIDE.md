# Hooks Architecture Migration Guide

## Overview

We've refactored the hooks architecture from 46 hooks to ~22 hooks, reducing complexity by 52% and eliminating duplication.

## New 3-Tier Architecture

```
┌─────────────────────────────────────┐
│   FEATURE HOOKS (5-7 hooks)        │  ← Business Logic
│   useDashboard, useProgressView    │
├─────────────────────────────────────┤
│   COMPOSITE HOOKS (10-12 hooks)    │  ← Data Composition
│   useMetrics, useBodyComposition   │
│   useRealtimeSubscription          │
├─────────────────────────────────────┤
│   PRIMITIVE HOOKS (5-8 hooks)      │  ← Low-level utilities
│   useAuth, useDebounce            │
│   useMediaQuery                    │
└─────────────────────────────────────┘
```

## Migration Map

### Primitive Hooks

| Old Hook | New Hook | Status |
|----------|----------|--------|
| `useAuth` | `useAuth` | ✅ Enhanced with role helpers |
| `useUserRole` | `useAuth().isTrainer` | ❌ Merged |
| `useIsMobile` | `useMediaQuery('(max-width: 768px)')` | ✅ Replaced |
| - | `useDebounce` | ✅ New |

### Composite Data Hooks

| Old Hook | New Hook | Notes |
|----------|----------|-------|
| `useMetricData` | `useMetrics()` | Unified interface |
| `useLatestMetrics` | `useMetrics()` | Simplified API |
| `useLatestMetric` | `useMetrics().getMetric()` | Helper method |
| `useAggregatedBodyMetrics` | `useBodyComposition()` | All-in-one |
| `useEnhancedBodyModel` | `useBodyComposition().model3D` | Integrated |
| `useBodyMetricsFromInBody` | `useBodyComposition()` | Unified source |
| `useBodyMetricsFromWithings` | `useBodyComposition()` | Unified source |
| `useBodyMetricsFromManual` | `useBodyComposition()` | Unified source |

### Composite Realtime Hooks

| Old Hook | New Hook | Notes |
|----------|----------|-------|
| `useRealtime` | `useRealtimeSubscription()` | Centralized |
| `useGoalsRealtime` | `useGoalsRealtime()` | Convenience wrapper |
| `useMeasurementsRealtime` | `useMetricsRealtime()` | Renamed |
| `useAIActionsRealtime` | `useAIActionsRealtime()` | Convenience wrapper |
| `useChallengeParticipantsRealtime` | `useChallengeRealtime()` | Renamed |

### Cache Hooks (Removed)

| Old Hook | Replacement | Notes |
|----------|------------|-------|
| `useFitnessDataCache` | React Query | Auto-caching |
| `useProgressCache` | React Query | Auto-caching |
| `useAutoCacheClear` | React Query invalidation | Built-in |

## Code Examples

### 1. Authentication with Roles

#### Before:
```tsx
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

function MyComponent() {
  const { user } = useAuth();
  const { role, isTrainer, isClient } = useUserRole();
  
  if (isTrainer) {
    // trainer logic
  }
}
```

#### After:
```tsx
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isTrainer, isClient, role } = useAuth();
  
  if (isTrainer) {
    // trainer logic
  }
}
```

### 2. Metrics Fetching

#### Before:
```tsx
import { useLatestMetrics } from '@/hooks/useLatestMetrics';
import { useMetricData } from '@/hooks/useMetricData';

function MetricsView() {
  const { data: latest } = useLatestMetrics();
  const { data: history } = useMetricData({
    userId: user.id,
    metricName: 'weight',
    startDate: startDate,
    endDate: endDate,
  });
  
  const weight = latest?.find(m => m.metric_name === 'weight');
}
```

#### After:
```tsx
import { useMetrics } from '@/hooks/composite/data/useMetrics';

function MetricsView() {
  const { latest, history, getMetric } = useMetrics({
    metricTypes: ['weight', 'body_fat'],
    dateRange: { start: startDate, end: endDate }
  });
  
  const weight = getMetric('weight');
}
```

### 3. Body Composition

#### Before:
```tsx
import { useAggregatedBodyMetrics } from '@/hooks/useAggregatedBodyMetrics';
import { useEnhancedBodyModel } from '@/hooks/useEnhancedBodyModel';

function BodyView() {
  const { weight, bodyFat, muscleMass } = useAggregatedBodyMetrics();
  const { model3D } = useEnhancedBodyModel();
  
  return (
    <>
      <BodyMetrics weight={weight} bodyFat={bodyFat} />
      <BodyModel data={model3D} />
    </>
  );
}
```

#### After:
```tsx
import { useBodyComposition } from '@/hooks/composite/data/useBodyComposition';

function BodyView() {
  const { bodyData, model3D } = useBodyComposition();
  
  return (
    <>
      <BodyMetrics {...bodyData} />
      <BodyModel data={model3D} />
    </>
  );
}
```

### 4. Realtime Subscriptions

#### Before:
```tsx
import { useGoalsRealtime } from '@/hooks/useRealtime';
import { useMeasurementsRealtime } from '@/hooks/useRealtime';

function GoalsPage() {
  const { user } = useAuth();
  
  useGoalsRealtime(user.id, () => {
    queryClient.invalidateQueries(['goals']);
  });
  
  useMeasurementsRealtime(user.id, () => {
    queryClient.invalidateQueries(['measurements']);
  });
}
```

#### After:
```tsx
import { useGoalsRealtime, useMetricsRealtime } from '@/hooks/composite/realtime/useRealtimeSubscription';

function GoalsPage() {
  // Auto-subscribes for current user
  // Auto-invalidates related queries
  useGoalsRealtime();
  useMetricsRealtime();
}
```

### 5. Dashboard Page

#### Before:
```tsx
import { useWidgets } from '@/hooks/useWidgets';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useGoals } from '@/hooks/useGoals';
import { useChallenges } from '@/hooks/useChallenges';
import { useLatestMetrics } from '@/hooks/useLatestMetrics';

function Dashboard() {
  const { data: widgets } = useWidgets();
  const { data: activities } = useActivityFeed();
  const { data: goals } = useGoals();
  const { data: challenges } = useChallenges();
  const { data: metrics } = useLatestMetrics();
  
  return <DashboardView ... />;
}
```

#### After:
```tsx
import { useDashboard } from '@/hooks/feature/useDashboard';

function Dashboard() {
  const { 
    widgets, 
    habits, 
    challenges, 
    isLoading 
  } = useDashboard();
  
  return <DashboardView ... />;
}
```

### 6. Progress Page

#### Before:
```tsx
function Progress() {
  const [selectedMetrics, setSelectedMetrics] = useState(['weight', 'body_fat']);
  const [timeRange, setTimeRange] = useState('30d');
  
  const { data: metrics } = useMetricData({
    metricNames: selectedMetrics,
    ...calculateDateRange(timeRange)
  });
  
  // Manual data processing...
  const chartData = processMetricsForChart(metrics);
}
```

#### After:
```tsx
import { useProgressView } from '@/hooks/feature/useProgressView';

function Progress() {
  const { 
    chartData, 
    summary, 
    selectedMetrics, 
    setTimeRange,
    toggleMetric 
  } = useProgressView();
  
  // All data processing done by hook
}
```

## New Infrastructure

### Query Keys

All query keys are now centralized:

```tsx
import { queryKeys } from '@/lib/query-keys';

// Use in queries
queryKey: queryKeys.metrics.latest(userId, ['weight', 'body_fat'])

// Invalidate entire domain
queryClient.invalidateQueries({ queryKey: queryKeys.metrics.all });
```

### Subscription Manager

Realtime subscriptions are centralized and auto-managed:

```tsx
// No need to manually manage channels
// SubscriptionManager handles:
// - Channel creation
// - Deduplication
// - Auto-invalidation
// - Cleanup
```

### Metric Utilities

Shared utilities extracted to `lib/metrics/`:

```tsx
import { 
  formatMetricValue,
  getMetricColor,
  getMetricLabel,
  calculateTrend 
} from '@/lib/metrics/metric-utils';
```

## Benefits

### Before:
- **46 hooks** with high coupling
- **5-7 levels** of hook nesting
- **High duplication** (5 realtime hooks, 3 body hooks)
- **Inconsistent patterns**

### After:
- **~22 hooks** (-52%)
- **2-3 levels** of nesting (-60%)
- **Zero duplication**
- **Consistent patterns**

## Testing

New hooks include comprehensive tests:

```bash
npm run test src/hooks/composite
npm run test src/hooks/feature
```

## Rollout Plan

### Phase 1 (Current)
- ✅ New hooks created
- ✅ Old hooks marked deprecated
- ⚠️ Warnings in console

### Phase 2 (Next Sprint)
- 🔄 Update all pages to use new hooks
- 🔄 Fix all deprecation warnings

### Phase 3 (Following Release)
- ❌ Remove deprecated hooks
- ✅ Complete migration

## Support

If you encounter issues during migration:

1. Check this guide for examples
2. Review `src/hooks/_deprecated/README.md`
3. Ask in #engineering-frontend channel
4. Create migration issue if needed

## TypeScript

All new hooks have strict TypeScript types:

```tsx
import type { UseMetricsOptions } from '@/hooks/composite/data/useMetrics';
import type { BodyCompositionData } from '@/hooks/composite/data/useBodyComposition';
```

## Performance

New architecture improves performance:

- **Batch fetching**: Dashboard now uses single query instead of N queries
- **Smart caching**: React Query handles all caching automatically
- **Reduced re-renders**: Better memoization in composite hooks
- **Optimized subscriptions**: Shared realtime channels

## Questions?

Contact @frontend-team for help with migration.
