/**
 * Timeline View utilities for grouping and positioning habits
 */

export interface HabitsByHour {
  [hour: number]: any[];
}

/**
 * Group habits by hour (0-23) based on time_of_day and reminder_time
 */
export function groupHabitsByHour(habits: any[]): HabitsByHour {
  const grouped: HabitsByHour = {};
  
  habits.forEach(habit => {
    const hour = getHabitHour(habit.time_of_day, habit.reminder_time);
    if (!grouped[hour]) {
      grouped[hour] = [];
    }
    grouped[hour].push(habit);
  });
  
  return grouped;
}

/**
 * Determine hour for a habit based on time_of_day and optional reminder_time
 */
export function getHabitHour(timeOfDay?: string, reminderTime?: string): number {
  if (reminderTime) {
    const [hours] = reminderTime.split(':').map(Number);
    return hours;
  }
  
  // Default hours based on time_of_day
  const defaults: Record<string, number> = {
    morning: 7,
    afternoon: 13,
    evening: 18,
    night: 21,
    anytime: 12
  };
  
  return defaults[timeOfDay || 'anytime'] || 12;
}

/**
 * Get gradient background color based on hour (dawn, day, dusk, night)
 */
export function getHourGradient(hour: number): string {
  if (hour >= 5 && hour < 8) {
    return 'from-orange-50/30 to-yellow-50/30 dark:from-orange-950/20 dark:to-yellow-950/20';
  } else if (hour >= 8 && hour < 17) {
    return 'from-sky-50/30 to-blue-50/30 dark:from-sky-950/20 dark:to-blue-950/20';
  } else if (hour >= 17 && hour < 20) {
    return 'from-purple-50/30 to-pink-50/30 dark:from-purple-950/20 dark:to-pink-950/20';
  } else {
    return 'from-indigo-50/30 to-slate-50/30 dark:from-indigo-950/20 dark:to-slate-950/20';
  }
}

/**
 * Calculate position on timeline (0-1440 minutes in a day)
 */
export function calculateTimelinePosition(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format hour to "HH:00" string
 */
export function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Get current hour and minute
 */
export function getCurrentTime(): { hour: number; minute: number } {
  const now = new Date();
  return {
    hour: now.getHours(),
    minute: now.getMinutes()
  };
}

/**
 * Check if a habit is scheduled for current hour
 */
export function isCurrentHour(habitHour: number, currentHour: number): boolean {
  return habitHour === currentHour;
}
