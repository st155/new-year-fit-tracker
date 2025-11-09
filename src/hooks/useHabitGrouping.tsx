import { useMemo } from 'react';
import { TimeOfDay } from '@/lib/habit-utils-v3';

export interface HabitGroup {
  time: TimeOfDay;
  title: string;
  icon: string;
  habits: any[];
  estimatedDuration: number;
  completedCount: number;
  totalCount: number;
}

export interface GroupedHabits {
  morning: HabitGroup;
  afternoon: HabitGroup;
  evening: HabitGroup;
  night: HabitGroup;
  anytime: HabitGroup;
  atRisk: any[];
}

/**
 * Groups habits by time of day with stats
 */
export function useHabitGrouping(habits: any[]): GroupedHabits {
  return useMemo(() => {
    const groups: GroupedHabits = {
      morning: {
        time: 'morning',
        title: '☀️ Утренние привычки',
        icon: '☀️',
        habits: [],
        estimatedDuration: 0,
        completedCount: 0,
        totalCount: 0
      },
      afternoon: {
        time: 'afternoon',
        title: '☕ Дневные привычки',
        icon: '☕',
        habits: [],
        estimatedDuration: 0,
        completedCount: 0,
        totalCount: 0
      },
      evening: {
        time: 'evening',
        title: '🌙 Вечерние привычки',
        icon: '🌙',
        habits: [],
        estimatedDuration: 0,
        completedCount: 0,
        totalCount: 0
      },
      night: {
        time: 'night',
        title: '✨ Ночные привычки',
        icon: '✨',
        habits: [],
        estimatedDuration: 0,
        completedCount: 0,
        totalCount: 0
      },
      anytime: {
        time: 'anytime',
        title: '🎯 В любое время',
        icon: '🎯',
        habits: [],
        estimatedDuration: 0,
        completedCount: 0,
        totalCount: 0
      },
      atRisk: []
    };

    habits.forEach(habit => {
      const timeGroup = (habit.time_of_day as TimeOfDay) || 'anytime';
      const group = groups[timeGroup];

      if (group) {
        group.habits.push(habit);
        group.totalCount++;
        
        if (habit.completed_today) {
          group.completedCount++;
        }
        
        if (habit.estimated_duration_minutes) {
          group.estimatedDuration += habit.estimated_duration_minutes;
        }
      }

      // Check if at risk (low completion rate)
      const completionRate = habit.stats?.completion_rate || 0;
      if (completionRate < 50 && habit.stats?.total_completions > 5 && !habit.completed_today) {
        groups.atRisk.push(habit);
      }
    });

    return groups;
  }, [habits]);
}
