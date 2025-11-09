/**
 * Apple Health style themes for habit widgets
 */

export interface HabitWidgetTheme {
  gradient: string;
  ringGradient: [string, string];
  glowClass: string;
  icon: string;
}

export const habitWidgetThemes: Record<string, HabitWidgetTheme> = {
  duration_counter: {
    gradient: 'from-blue-500/20 via-indigo-500/20 to-purple-500/20',
    ringGradient: ['hsl(217, 91%, 60%)', 'hsl(271, 76%, 53%)'],
    glowClass: 'shadow-glow-blue',
    icon: '⏱️',
  },
  fasting_tracker: {
    gradient: 'from-emerald-500/20 via-green-500/20 to-teal-500/20',
    ringGradient: ['hsl(142, 76%, 45%)', 'hsl(158, 64%, 52%)'],
    glowClass: 'shadow-glow-green',
    icon: '🍽️',
  },
  numeric_counter: {
    gradient: 'from-orange-500/20 via-amber-500/20 to-yellow-500/20',
    ringGradient: ['hsl(25, 95%, 53%)', 'hsl(45, 100%, 51%)'],
    glowClass: 'shadow-glow-orange',
    icon: '📊',
  },
  daily: {
    gradient: 'from-rose-500/20 via-pink-500/20 to-fuchsia-500/20',
    ringGradient: ['hsl(349, 100%, 60%)', 'hsl(271, 76%, 53%)'],
    glowClass: 'shadow-glow-rose',
    icon: '✓',
  },
  daily_measurement: {
    gradient: 'from-cyan-500/20 via-blue-500/20 to-indigo-500/20',
    ringGradient: ['hsl(189, 100%, 50%)', 'hsl(217, 91%, 60%)'],
    glowClass: 'shadow-glow-cyan',
    icon: '📈',
  },
};

export function getHabitTheme(habitType: string): HabitWidgetTheme {
  return habitWidgetThemes[habitType] || habitWidgetThemes.daily;
}
