/**
 * Habit 3.0 utilities - Time-based themes and card states
 */

import i18n from '@/i18n';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';

export type CardState = 
  | 'not_started' 
  | 'in_progress' 
  | 'completed' 
  | 'missed' 
  | 'at_risk';

export interface TimeBasedTheme {
  gradient: string;
  glow: string;
  textColor: string;
  icon: string;
  accentColor: string;
}

/**
 * Get theme based on time of day with dark mode support
 */
export const getTimeBasedTheme = (timeOfDay: TimeOfDay | null): TimeBasedTheme => {
  const isDark = document.documentElement.classList.contains('dark');
  
  switch (timeOfDay) {
    case 'morning':
      return {
        gradient: isDark 
          ? 'from-cyan-900/30 to-blue-900/40'
          : 'from-cyan-400/20 to-blue-500/30',
        glow: isDark
          ? 'shadow-[0_0_15px_rgba(6,182,212,0.2)]'
          : 'shadow-[0_0_20px_rgba(6,182,212,0.4)]',
        textColor: isDark ? 'text-cyan-300' : 'text-cyan-400',
        icon: '☀️',
        accentColor: 'hsl(186, 94%, 44%)'
      };
    
    case 'afternoon':
      return {
        gradient: isDark
          ? 'from-orange-900/30 to-amber-900/40'
          : 'from-orange-400/20 to-amber-500/30',
        glow: isDark
          ? 'shadow-[0_0_15px_rgba(251,146,60,0.2)]'
          : 'shadow-[0_0_20px_rgba(251,146,60,0.4)]',
        textColor: isDark ? 'text-orange-300' : 'text-orange-400',
        icon: '☕',
        accentColor: 'hsl(25, 95%, 53%)'
      };
    
    case 'evening':
      return {
        gradient: isDark
          ? 'from-purple-900/30 to-indigo-900/40'
          : 'from-purple-400/20 to-indigo-500/30',
        glow: isDark
          ? 'shadow-[0_0_15px_rgba(168,85,247,0.2)]'
          : 'shadow-[0_0_20px_rgba(168,85,247,0.4)]',
        textColor: isDark ? 'text-purple-300' : 'text-purple-400',
        icon: '🌙',
        accentColor: 'hsl(271, 91%, 65%)'
      };
    
    case 'night':
      return {
        gradient: isDark
          ? 'from-indigo-900/30 to-violet-900/40'
          : 'from-indigo-500/20 to-violet-600/30',
        glow: isDark
          ? 'shadow-[0_0_15px_rgba(99,102,241,0.2)]'
          : 'shadow-[0_0_20px_rgba(99,102,241,0.4)]',
        textColor: isDark ? 'text-indigo-300' : 'text-indigo-400',
        icon: '✨',
        accentColor: 'hsl(239, 84%, 67%)'
      };
    
    default: // anytime
      return {
        gradient: isDark
          ? 'from-primary/10 to-primary/20'
          : 'from-primary/20 to-primary/30',
        glow: isDark
          ? 'shadow-[0_0_15px_hsl(var(--primary)/0.2)]'
          : 'shadow-glow',
        textColor: 'text-primary',
        icon: '🎯',
        accentColor: 'hsl(var(--primary))'
      };
  }
};

/**
 * Calculate card state based on habit data
 */
export const calculateCardState = (habit: any): CardState => {
  if (habit.completed_today) return 'completed';
  
  // Check if missed (no completion yesterday when it should have been done)
  if (habit.streak === 0 && habit.stats?.total_completions > 0) return 'missed';
  
  // Check if at risk (low completion rate or long time since last completion)
  const completionRate = habit.stats?.completion_rate || 0;
  if (completionRate < 50 && habit.stats?.total_completions > 5) return 'at_risk';
  
  // Check if in progress (for duration-based habits)
  if (habit.habit_type === 'duration_counter' && habit.custom_data?.current_attempt) {
    return 'in_progress';
  }
  
  return 'not_started';
};

/**
 * Get state-based styling with dark mode support
 */
export const getStateStyles = (state: CardState) => {
  const isDark = document.documentElement.classList.contains('dark');
  
  switch (state) {
    case 'completed':
      return {
        className: isDark
          ? 'bg-gradient-to-br from-green-900/20 to-emerald-900/30 border-green-500/30'
          : 'bg-gradient-to-br from-green-400/20 to-emerald-500/30 border-green-500/50',
        glow: isDark
          ? 'shadow-[0_0_15px_rgba(34,197,94,0.2)]'
          : 'shadow-[0_0_20px_rgba(34,197,94,0.3)]'
      };
    
    case 'in_progress':
      return {
        className: isDark
          ? 'bg-gradient-to-br from-blue-900/20 to-cyan-900/30 border-blue-500/30'
          : 'bg-gradient-to-br from-blue-400/20 to-cyan-500/30 border-blue-500/50',
        glow: isDark
          ? 'shadow-[0_0_15px_rgba(59,130,246,0.2)] animate-pulse'
          : 'shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse'
      };
    
    case 'at_risk':
      return {
        className: isDark
          ? 'bg-gradient-to-br from-orange-900/20 to-red-900/30 border-orange-500/30'
          : 'bg-gradient-to-br from-orange-400/20 to-red-500/30 border-orange-500/50',
        glow: isDark
          ? 'shadow-[0_0_15px_rgba(249,115,22,0.2)] animate-pulse'
          : 'shadow-[0_0_20px_rgba(249,115,22,0.3)] animate-pulse'
      };
    
    case 'missed':
      return {
        className: isDark
          ? 'bg-gradient-to-br from-gray-900/10 to-gray-800/20 border-gray-500/20 opacity-50'
          : 'bg-gradient-to-br from-gray-400/10 to-gray-500/20 border-gray-500/30 opacity-60',
        glow: ''
      };
    
    default: // not_started
      return {
        className: '',
        glow: ''
      };
  }
};

/**
 * Get estimated duration display
 */
export const formatDuration = (minutes: number | null): string => {
  if (!minutes) return '';
  if (minutes < 60) {
    return i18n.t('habits:duration.minutes', { minutes });
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins > 0) {
    return i18n.t('habits:duration.hoursMinutes', { hours, minutes: mins });
  }
  return i18n.t('habits:duration.hours', { hours });
};

/**
 * Get difficulty badge
 */
export const getDifficultyBadge = (level: string | null) => {
  switch (level) {
    case 'easy':
      return { icon: '🟢', label: i18n.t('habits:difficulty.easy') };
    case 'medium':
      return { icon: '🟡', label: i18n.t('habits:difficulty.medium') };
    case 'hard':
      return { icon: '🔴', label: i18n.t('habits:difficulty.hard') };
    default:
      return null;
  }
};
