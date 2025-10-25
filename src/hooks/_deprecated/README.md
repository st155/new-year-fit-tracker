# Deprecated Hooks

⚠️ **WARNING**: These hooks are deprecated and will be removed in a future release.

## Migration Guide

All deprecated hooks have been replaced with a new 3-tier architecture:

### Tier 1: Primitive Hooks
- ✅ `useAuth` - Now includes role helpers (replaces `useUserRole`)
- ✅ `useDebounce` - New utility hook
- ✅ `useMediaQuery` - Replaces `useIsMobile`

### Tier 2: Composite Hooks

#### Data Hooks
- ✅ `useMetrics` - Replaces:
  - `useMetricData`
  - `useLatestMetrics` (partial)
  - `useLatestMetric`
  
- ✅ `useBodyComposition` - Replaces:
  - `useAggregatedBodyMetrics`
  - `useEnhancedBodyModel`
  - `useBodyMetricsFromInBody`
  - `useBodyMetricsFromWithings`
  - `useBodyMetricsFromManual`

#### Realtime Hooks
- ✅ `useRealtimeSubscription` - Replaces:
  - `useRealtime`
  - `useGoalsRealtime`
  - `useMeasurementsRealtime`
  - `useAIActionsRealtime`
  - `useChallengeParticipantsRealtime`

### Tier 3: Feature Hooks
- ✅ `useDashboard` - Page-level orchestration
- ✅ `useProgressView` - Progress page state management

## Deprecated Hooks List

### Will be removed in next release:

1. **useUserRole** → Use `useAuth().isTrainer`, `useAuth().isClient`, etc.
2. **useMetricData** → Use `useMetrics()`
3. **useLatestMetrics** (old version) → Use `useMetrics()`
4. **useLatestMetric** → Use `useMetrics().getMetric()`
5. **useAggregatedBodyMetrics** → Use `useBodyComposition()`
6. **useEnhancedBodyModel** → Use `useBodyComposition().model3D`
7. **useBodyMetricsFromInBody** → Use `useBodyComposition()`
8. **useBodyMetricsFromWithings** → Use `useBodyComposition()`
9. **useBodyMetricsFromManual** → Use `useBodyComposition()`
10. **useRealtime** → Use `useRealtimeSubscription()`
11. **useGoalsRealtime** → Use `useGoalsRealtime()` (new convenience hook)
12. **useMeasurementsRealtime** → Use `useMetricsRealtime()`
13. **useAIActionsRealtime** → Use `useAIActionsRealtime()` (new convenience hook)
14. **useChallengeParticipantsRealtime** → Use `useChallengeRealtime()`

### Cache hooks (removed - React Query handles caching):
- ❌ `useFitnessDataCache` - DELETED (React Query auto-caches)
- ❌ `useProgressCache` - DELETED (React Query auto-caches)
- ❌ `useAutoCacheClear` - DELETED (React Query handles invalidation)

## Quick Migration Examples

### Before:
```tsx
// OLD: Multiple separate hooks
const { data: metrics } = useLatestMetrics();
const { data: bodyMetrics } = useAggregatedBodyMetrics();
const { model } = useEnhancedBodyModel();
useGoalsRealtime(userId, onUpdate);
```

### After:
```tsx
// NEW: Unified hooks
const { latest, getMetric } = useMetrics({ metricTypes: ['weight', 'body_fat'] });
const { bodyData, model3D } = useBodyComposition();
useGoalsRealtime(); // Auto-subscribes for current user
```

## Timeline

- **v1.0** (Current): Deprecated hooks still work but show warnings
- **v1.1** (Next release): Deprecated hooks removed

Please update your code before the next release!
