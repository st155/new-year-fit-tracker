/**
 * Habit 3.0 utilities - Time-based themes and card states
 * Consolidated from habit-utils.ts and habit-utils-v3.ts
 */

import i18n from '@/i18n';
import { 
  CigaretteOff, 
  Dumbbell, 
  BookOpen, 
  MessageCircle, 
  Moon, 
  Apple, 
  BrainCircuit, 
  Target,
  Activity,
  Coffee,
  Wine,
  Smartphone,
  Tv,
  type LucideIcon
} from "lucide-react";

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

// ============================================
// Migrated from habit-utils.ts (legacy)
// ============================================

export type HabitSentiment = 'negative' | 'positive' | 'neutral';

/**
 * Determines the sentiment/type of a habit based on its category and name
 */
export function getHabitSentiment(habit: any): HabitSentiment {
  const name = habit.name?.toLowerCase() || '';
  const category = habit.category?.toLowerCase() || '';
  const settings = habit.custom_settings || {};

  // Check if explicitly set in custom settings
  if (settings.sentiment) {
    return settings.sentiment as HabitSentiment;
  }

  // Negative habits (things to quit/avoid)
  const negativeKeywords = [
    'quit', 'stop', 'avoid', 'smoking', 'drinking', 'alcohol', 
    'sugar', 'junk food', 'soda', 'screen time', 'social media',
    'procrastination', 'бросить', 'перестать'
  ];

  // Positive habits (things to build/do)
  const positiveKeywords = [
    'exercise', 'workout', 'run', 'walk', 'meditation', 'yoga',
    'reading', 'learning', 'practice', 'study', 'water', 'sleep',
    'fitness', 'health', 'тренировка', 'упражнение', 'чтение'
  ];

  // Check name for keywords
  for (const keyword of negativeKeywords) {
    if (name.includes(keyword)) return 'negative';
  }

  for (const keyword of positiveKeywords) {
    if (name.includes(keyword)) return 'positive';
  }

  // Check category
  if (['fitness', 'nutrition', 'sleep', 'mindfulness', 'learning'].includes(category)) {
    return 'positive';
  }

  // Default to neutral
  return 'neutral';
}

/**
 * Returns the appropriate Lucide icon for a habit
 */
export function getHabitIcon(habit: any): LucideIcon {
  const name = habit.name?.toLowerCase() || '';
  const category = habit.category?.toLowerCase() || '';

  // Icon mapping based on keywords
  if (name.includes('smok') || name.includes('курить')) return CigaretteOff;
  if (name.includes('drink') || name.includes('alcohol') || name.includes('алкоголь')) return Wine;
  if (name.includes('exercise') || name.includes('workout') || name.includes('тренировка')) return Dumbbell;
  if (name.includes('run') || name.includes('бег')) return Activity;
  if (name.includes('read') || name.includes('book') || name.includes('чтение')) return BookOpen;
  if (name.includes('speak') || name.includes('talk') || name.includes('communication')) return MessageCircle;
  if (name.includes('sleep') || name.includes('сон')) return Moon;
  if (name.includes('food') || name.includes('eat') || name.includes('nutrition') || name.includes('питание')) return Apple;
  if (name.includes('meditation') || name.includes('mindful') || name.includes('медитация')) return BrainCircuit;
  if (name.includes('coffee') || name.includes('кофе')) return Coffee;
  if (name.includes('phone') || name.includes('screen') || name.includes('телефон')) return Smartphone;
  if (name.includes('tv') || name.includes('television')) return Tv;

  // Category-based fallback
  if (category === 'fitness') return Dumbbell;
  if (category === 'nutrition') return Apple;
  if (category === 'sleep') return Moon;
  if (category === 'mindfulness') return BrainCircuit;

  // Default
  return Target;
}

/**
 * Returns the HSL color string for a habit's neon glow
 */
export function getHabitNeonColor(sentiment: HabitSentiment): string {
  switch (sentiment) {
    case 'negative':
      return 'hsl(0 100% 65%)';
    case 'positive':
      return 'hsl(142 76% 53%)';
    case 'neutral':
      return 'hsl(262 83% 58%)';
  }
}

/**
 * Returns CSS class for habit card based on sentiment
 */
export function getHabitCardClass(sentiment: HabitSentiment): string {
  return `habit-card-${sentiment}`;
}

/**
 * Returns CSS class for neon circle based on sentiment
 */
export function getNeonCircleClass(sentiment: HabitSentiment): string {
  return `neon-circle-${sentiment}`;
}
