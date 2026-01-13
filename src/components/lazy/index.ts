/**
 * Lazy-loaded components for performance optimization
 * 
 * Usage:
 * import { LazyInBodyHistory } from '@/components/lazy';
 * 
 * <Suspense fallback={<Skeleton />}>
 *   <LazyInBodyHistory />
 * </Suspense>
 */

import { lazy } from 'react';

// Body composition components (heavy)
export const LazyInBodyHistory = lazy(() => 
  import('@/components/body-composition/InBodyHistory').then(m => ({ 
    default: m.InBodyHistory 
  }))
);

export const LazyInBodyDetailView = lazy(() =>
  import('@/components/body-composition/InBodyDetailView').then(m => ({
    default: m.InBodyDetailView
  }))
);

export const LazyHumanBodyModel = lazy(() =>
  import('@/components/body-composition/HumanBodyModel').then(m => ({
    default: m.HumanBodyModel
  }))
);

export const LazyInBodyAIChat = lazy(() =>
  import('@/components/body-composition/InBodyAIChat').then(m => ({
    default: m.InBodyAIChat
  }))
);

// Progress charts (Recharts is heavy ~100KB)
export const LazyProgressChart = lazy(() =>
  import('@/components/ui/progress-chart').then(m => ({
    default: m.ProgressChart
  }))
);

// Trainer components
export const LazyTrainingPlanBuilder = lazy(() =>
  import('@/components/trainer/TrainingPlanBuilder').then(m => ({
    default: m.TrainingPlanBuilder
  }))
);

export const LazyClientProgressCharts = lazy(() =>
  import('@/components/trainer/ClientProgressCharts').then(m => ({
    default: m.ClientProgressCharts
  }))
);

// Challenge components
export const LazyChallengeFeed = lazy(() =>
  import('@/features/challenges/components/social/ChallengeFeed').then(m => ({
    default: m.ChallengeFeed
  }))
);

export const LazyChallengeLeaderboard = lazy(() =>
  import('@/features/challenges/components/social/ChallengeLeaderboard').then(m => ({
    default: m.ChallengeLeaderboard
  }))
);
