/**
 * Habits feature public API
 * Import from '@/features/habits' for all habits-related functionality
 */

// Hooks
export { useHabitsQuery, habitQueryKeys } from './hooks';
export { useHabitMutations } from './hooks';
export { useCompleteHabit, type HabitCompletionResult } from './hooks';
export { useUndoCompletion } from './hooks';

// Components (explicit exports to avoid conflicts)
export {
  // Core
  HabitCardV3,
  HabitCelebration,
  HabitOptionsMenu,
  HabitCreateDialog,
  // Charts
  SparklineChart,
  HabitMiniChart,
  HabitProgressChart,
  HabitCalendarHeatmap,
  // Layouts
  SmartView,
  AllHabitsView,
  CompactListView,
  FocusMode,
  TimelineView,
  AnalyticsView,
  OverviewStats,
  TimeSection,
  SocialView,
  // Gamification
  AchievementBadge,
  AchievementUnlockedToast,
  AchievementsModal,
  LevelProgressBar,
  LevelUpCelebration,
  XPIndicator,
  // Widgets
  CircularProgress,
  HabitSparklineWidget,
  HabitWidgetCardV3,
  DailyMeasurementInlineWidget,
  DurationCounterInlineWidget,
  FastingInlineWidget,
  NumericCounterInlineWidget,
  // Analytics
  AchievementProgress,
  InsightCard,
  StreakMilestoneTimeline,
  // Sections
  HabitsProgressSection,
  // Social
  TeamCard,
  CreateTeamDialog,
  AddTeamMemberDialog,
  FeedEvent,
  FriendsList,
  NotificationCenter,
  SocialOnboarding,
  // Detail
  FriendHabitCard,
  HabitSocialSection,
  TeamHabitCard,
  // Onboarding
  HabitsV3Onboarding,
  // Settings
  NotificationSettings,
  // Other
  HabitsInsightBanner,
} from './components';

// Types
export * from './types';

// Constants
export * from './constants';
