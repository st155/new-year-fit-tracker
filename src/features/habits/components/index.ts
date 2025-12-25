/**
 * Habits feature components barrel export
 */

// Core
export { HabitCardV3 } from './core/HabitCardV3';

// Charts
export { SparklineChart } from './charts/SparklineChart';
export { HabitMiniChart } from './charts/HabitMiniChart';

// Layouts
export { SmartView } from './layouts/SmartView';
export { AllHabitsView } from './layouts/AllHabitsView';
export { CompactListView } from './layouts/CompactListView';
export { FocusMode } from './layouts/FocusMode';
export { TimelineView } from './layouts/TimelineView';
export { AnalyticsView } from './layouts/AnalyticsView';
export { OverviewStats } from './layouts/OverviewStats';
export { TimeSection } from './layouts/TimeSection';
export { SocialView } from './layouts/SocialView';

// Gamification
export { AchievementBadge } from './gamification/AchievementBadge';
export { AchievementUnlockedToast } from './gamification/AchievementUnlockedToast';
export { AchievementsModal } from './gamification/AchievementsModal';
export { LevelProgressBar } from './gamification/LevelProgressBar';
export { LevelUpCelebration } from './gamification/LevelUpCelebration';
export { XPIndicator } from './gamification/XPIndicator';

// Widgets
export { CircularProgress } from './widgets/CircularProgress';
export { HabitSparklineWidget } from './widgets/HabitSparklineWidget';
export { HabitWidgetCard as HabitWidgetCardV3 } from './widgets/HabitWidgetCard';
export { DailyMeasurementInlineWidget } from './widgets/DailyMeasurementInlineWidget';
export { DurationCounterInlineWidget } from './widgets/DurationCounterInlineWidget';
export { FastingInlineWidget } from './widgets/FastingInlineWidget';
export { NumericCounterInlineWidget } from './widgets/NumericCounterInlineWidget';

// Analytics
export { AchievementProgress } from './analytics/AchievementProgress';
export { InsightCard } from './analytics/InsightCard';
export { StreakMilestoneTimeline } from './analytics/StreakMilestoneTimeline';

// Sections
export { HabitsProgressSection } from './sections/HabitsProgressSection';

// Social
export { TeamCard } from './social/TeamCard';
export { CreateTeamDialog } from './social/CreateTeamDialog';
export { AddTeamMemberDialog } from './social/AddTeamMemberDialog';
export { FeedEvent } from './social/FeedEvent';
export { FriendsList } from './social/FriendsList';
export { NotificationCenter } from './social/NotificationCenter';
export { SocialOnboarding } from './social/SocialOnboarding';

// Detail
export { FriendHabitCard } from './detail/FriendHabitCard';
export { HabitSocialSection } from './detail/HabitSocialSection';
export { TeamHabitCard } from './detail/TeamHabitCard';

// Onboarding
export { HabitsV3Onboarding } from './onboarding/HabitsV3Onboarding';

// Settings
export { NotificationSettings } from './settings/NotificationSettings';

// Other
export { HabitsInsightBanner } from './HabitsInsightBanner';

// Legacy components (from src/components/habits)
export * from './legacy';
