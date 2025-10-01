import { lazy, Suspense } from 'react';
import { ComponentLoader } from '@/components/ui/page-loader';
import { MetricsGridSkeleton, GoalsProgressSkeleton } from '@/components/ui/dashboard-skeleton';

// Lazy load dashboard components
const MetricsGrid = lazy(() => import('./metrics-grid').then(m => ({ default: m.MetricsGrid })));
const GoalsProgress = lazy(() => import('./goals-progress').then(m => ({ default: m.GoalsProgress })));
const AdditionalMetrics = lazy(() => import('./additional-metrics').then(m => ({ default: m.AdditionalMetrics })));
const TodayActivity = lazy(() => import('./today-activity').then(m => ({ default: m.TodayActivity })));
const QuickActions = lazy(() => import('./quick-actions').then(m => ({ default: m.QuickActions })));

interface LazyComponentProps {
  [key: string]: any;
}

export const LazyMetricsGrid = () => (
  <Suspense fallback={<MetricsGridSkeleton />}>
    <MetricsGrid />
  </Suspense>
);

export const LazyGoalsProgress = () => (
  <Suspense fallback={<GoalsProgressSkeleton />}>
    <GoalsProgress />
  </Suspense>
);

export const LazyAdditionalMetrics = () => (
  <Suspense fallback={<ComponentLoader />}>
    <AdditionalMetrics />
  </Suspense>
);

export const LazyTodayActivity = () => (
  <Suspense fallback={<ComponentLoader />}>
    <TodayActivity />
  </Suspense>
);

export const LazyQuickActions = ({ userRole }: { userRole: 'participant' | 'trainer' }) => (
  <Suspense fallback={<ComponentLoader />}>
    <QuickActions userRole={userRole} />
  </Suspense>
);
