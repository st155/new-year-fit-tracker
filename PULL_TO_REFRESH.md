# Pull-to-Refresh Implementation

## Overview

This document describes the Pull-to-Refresh functionality implementation for mobile interactions in the fitness app.

## Components

### PullToRefresh Component

**Location**: `src/components/ui/pull-to-refresh.tsx`

Main component that wraps content and provides pull-to-refresh functionality.

**Props**:
- `onRefresh: () => Promise<void>` - Async function to call when refresh is triggered
- `children: ReactNode` - Content to wrap
- `disabled?: boolean` - Disable pull-to-refresh functionality
- `threshold?: number` - Distance (px) required to trigger refresh (default: 80)
- `resistance?: number` - Pull resistance factor (default: 2.5)

**Features**:
- Touch gesture detection
- Visual feedback with animated refresh icon
- Smooth animations with CSS transitions
- Resistance effect for natural feel
- Only works when scrolled to top

**Example**:
```tsx
<PullToRefresh onRefresh={handleRefresh}>
  <div className="content">
    {/* Your scrollable content */}
  </div>
</PullToRefresh>
```

### usePullToRefresh Hook

**Location**: `src/hooks/usePullToRefresh.tsx`

Custom hook that provides pull-to-refresh logic with toast notifications.

**Options**:
- `onRefresh: () => Promise<void>` - Refresh function
- `successMessage?: string` - Toast message on success
- `errorMessage?: string` - Toast message on error
- `showToast?: boolean` - Show toast notifications (default: true)

**Returns**:
- `isRefreshing: boolean` - Current refresh state
- `handleRefresh: () => Promise<void>` - Refresh handler function

**Example**:
```tsx
const { handleRefresh, isRefreshing } = usePullToRefresh({
  onRefresh: async () => {
    await fetchData();
  },
  successMessage: 'Data refreshed',
  showToast: false,
});
```

## Integration Examples

### Feed Page
```tsx
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

function Feed() {
  const { handleRefresh } = usePullToRefresh({
    onRefresh: async () => {
      await fetchActivities();
    },
    showToast: false,
  });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="container py-8">
        {/* Content */}
      </div>
    </PullToRefresh>
  );
}
```

### With Cache Invalidation
```tsx
const { data, refetch } = useProgressCache('key', fetchFn);

const { handleRefresh } = usePullToRefresh({
  onRefresh: async () => {
    await refetch(); // Invalidate cache and fetch fresh data
  },
  successMessage: 'Progress refreshed',
  showToast: false,
});
```

## Visual Behavior

1. **Pull Down**: User pulls down from top of page
2. **Visual Feedback**: Refresh icon appears and rotates as user pulls
3. **Threshold Reached**: Icon pulses when threshold is met
4. **Release**: User releases touch
5. **Refresh**: Icon spins, refresh function executes
6. **Complete**: Content updates, icon fades out

## Design Details

- **Icon**: RefreshCw from lucide-react
- **Colors**: Uses semantic tokens (background, border, primary)
- **Animation**: Smooth rotation and scale transforms
- **Resistance**: Natural pull resistance (2.5x factor)
- **Threshold**: 80px default (customizable)

## Mobile-First

- **Touch Events**: Uses touchstart, touchmove, touchend
- **Scroll Detection**: Only works at top of page
- **Performance**: Optimized with useRef and passive listeners
- **Accessibility**: Visual feedback for all states

## Pages with Pull-to-Refresh

Currently integrated on:
- ✅ Feed (`/feed`)
- ✅ Progress (`/progress`)
- ✅ Challenges (`/challenges`)
- ✅ Leaderboard (`/leaderboard`)

## Best Practices

1. **Async Operations**: Always use async/await in onRefresh
2. **Error Handling**: Handle errors in refresh function
3. **Loading States**: Show loading indicators during refresh
4. **Cache Invalidation**: Invalidate caches when refreshing
5. **Toast Messages**: Optionally disable toasts for seamless UX
6. **Disabled State**: Disable during loading to prevent multiple refreshes

## Accessibility

- Clear visual feedback at all stages
- Smooth animations for better UX
- Works with standard scrolling behavior
- No interference with normal page interactions

## Browser Compatibility

- Works on all modern touch devices
- iOS Safari tested
- Android Chrome tested
- Desktop: No effect (touch-only)

## Performance Considerations

- Minimal re-renders with useRef
- Passive touch listeners for better scroll performance
- CSS transforms for 60fps animations
- Debounced refresh to prevent duplicate calls
