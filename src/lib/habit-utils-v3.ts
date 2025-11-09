/**
 * Habit 3.0 utilities - Time-based themes and card states
 */

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
 * Get theme based on time of day
 */
export const getTimeBasedTheme = (timeOfDay: TimeOfDay | null): TimeBasedTheme => {
  switch (timeOfDay) {
    case 'morning':
      return {
        gradient: 'from-cyan-400/20 to-blue-500/30',
        glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]',
        textColor: 'text-cyan-400',
        icon: '☀️',
        accentColor: 'hsl(186, 94%, 44%)'
      };
    
    case 'afternoon':
      return {
        gradient: 'from-orange-400/20 to-amber-500/30',
        glow: 'shadow-[0_0_20px_rgba(251,146,60,0.3)]',
        textColor: 'text-orange-400',
        icon: '☕',
        accentColor: 'hsl(25, 95%, 53%)'
      };
    
    case 'evening':
      return {
        gradient: 'from-purple-400/20 to-indigo-500/30',
        glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
        textColor: 'text-purple-400',
        icon: '🌙',
        accentColor: 'hsl(271, 91%, 65%)'
      };
    
    case 'night':
      return {
        gradient: 'from-indigo-500/20 to-violet-600/30',
        glow: 'shadow-[0_0_20px_rgba(99,102,241,0.3)]',
        textColor: 'text-indigo-400',
        icon: '✨',
        accentColor: 'hsl(239, 84%, 67%)'
      };
    
    default: // anytime
      return {
        gradient: 'from-primary/20 to-primary/30',
        glow: 'shadow-glow',
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
 * Get state-based styling
 */
export const getStateStyles = (state: CardState) => {
  switch (state) {
    case 'completed':
      return {
        className: 'bg-gradient-to-br from-green-400/20 to-emerald-500/30 border-green-500/50',
        glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]'
      };
    
    case 'in_progress':
      return {
        className: 'bg-gradient-to-br from-blue-400/20 to-cyan-500/30 border-blue-500/50',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse'
      };
    
    case 'at_risk':
      return {
        className: 'bg-gradient-to-br from-orange-400/20 to-red-500/30 border-orange-500/50',
        glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)] animate-pulse'
      };
    
    case 'missed':
      return {
        className: 'bg-gradient-to-br from-gray-400/10 to-gray-500/20 border-gray-500/30 opacity-60',
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
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
};

/**
 * Get difficulty badge
 */
export const getDifficultyBadge = (level: string | null) => {
  switch (level) {
    case 'easy':
      return { icon: '🟢', label: 'Легко' };
    case 'medium':
      return { icon: '🟡', label: 'Средне' };
    case 'hard':
      return { icon: '🔴', label: 'Сложно' };
    default:
      return null;
  }
};
