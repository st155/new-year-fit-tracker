/**
 * Groups habits by time of day with stats
 */

import { useMemo } from 'react';
import { TimeOfDay } from '@/lib/habit-utils-v3';
import i18n from '@/i18n';

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

function createEmptyGroups(): GroupedHabits {
  return {
    morning: {
      time: 'morning',
      title: i18n.t('habits:groups.morningTitle'),
      icon: '☀️',
      habits: [],
      estimatedDuration: 0,
      completedCount: 0,
      totalCount: 0
    },
    afternoon: {
      time: 'afternoon',
      title: i18n.t('habits:groups.afternoonTitle'),
      icon: '☕',
      habits: [],
      estimatedDuration: 0,
      completedCount: 0,
      totalCount: 0
    },
    evening: {
      time: 'evening',
      title: i18n.t('habits:groups.eveningTitle'),
      icon: '🌙',
      habits: [],
      estimatedDuration: 0,
      completedCount: 0,
      totalCount: 0
    },
    night: {
      time: 'night',
      title: i18n.t('habits:groups.nightTitle'),
      icon: '✨',
      habits: [],
      estimatedDuration: 0,
      completedCount: 0,
      totalCount: 0
    },
    anytime: {
      time: 'anytime',
      title: i18n.t('habits:groups.anytimeTitle'),
      icon: '🎯',
      habits: [],
      estimatedDuration: 0,
      completedCount: 0,
      totalCount: 0
    },
    atRisk: []
  };
}

export function useHabitGrouping(habits: any[]): GroupedHabits {
  return useMemo(() => {
    const groups = createEmptyGroups();

    habits.forEach(habit => {
      const timeGroup = (habit.time_of_day as TimeOfDay) || 'anytime';
      const group = groups[timeGroup];

      if (group) {
        group.habits.push(habit);
        group.totalCount++;

        // Support both camelCase and snake_case for backwards compatibility
        const completedToday = habit.completedToday ?? habit.completed_today;
        if (completedToday) {
          group.completedCount++;
        }

        const duration = habit.estimatedDurationMinutes ?? habit.estimated_duration_minutes;
        if (duration) {
          group.estimatedDuration += duration;
        }
      }

      // Check if at risk (low completion rate)
      const completionRate = habit.stats?.completion_rate || 0;
      const totalCompletions = habit.stats?.total_completions || 0;
      const completedToday = habit.completedToday ?? habit.completed_today;
      
      if (completionRate < 50 && totalCompletions > 5 && !completedToday) {
        groups.atRisk.push(habit);
      }
    });

    return groups;
  }, [habits]);
}
