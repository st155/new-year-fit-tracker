/**
 * Habits React Query Configuration
 * 
 * Query options and factory functions for React Query hooks.
 */

import { queryOptions, infiniteQueryOptions } from '@tanstack/react-query';
import { HABIT_QUERY_KEYS, DEFAULT_QUERY_OPTIONS } from '../constants';
import * as habitsApi from './habits.api';

// ============================================================================
// Query Options Factories
// ============================================================================

/**
 * Query options for fetching all habits for a user
 */
export const habitsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: HABIT_QUERY_KEYS.list(userId || ''),
    queryFn: () => habitsApi.fetchHabits(userId!),
    enabled: !!userId,
    staleTime: DEFAULT_QUERY_OPTIONS.staleTime,
  });

/**
 * Query options for fetching a single habit
 */
export const habitDetailQueryOptions = (habitId: string | undefined) =>
  queryOptions({
    queryKey: HABIT_QUERY_KEYS.detail(habitId || ''),
    queryFn: () => habitsApi.fetchHabitById(habitId!),
    enabled: !!habitId,
    staleTime: DEFAULT_QUERY_OPTIONS.staleTime,
  });

/**
 * Query options for habit completions in a date range
 */
export const habitCompletionsQueryOptions = (
  habitId: string,
  startDate: string,
  endDate: string
) =>
  queryOptions({
    queryKey: HABIT_QUERY_KEYS.completionsRange(habitId, startDate, endDate),
    queryFn: () => habitsApi.fetchCompletions(habitId, startDate, endDate),
    enabled: !!habitId && !!startDate && !!endDate,
  });

/**
 * Query options for habit attempts
 */
export const habitAttemptsQueryOptions = (habitId: string | undefined) =>
  queryOptions({
    queryKey: HABIT_QUERY_KEYS.attempts(habitId || ''),
    queryFn: () => habitsApi.fetchAttempts(habitId!),
    enabled: !!habitId,
  });

/**
 * Query options for habit measurements
 */
export const habitMeasurementsQueryOptions = (habitId: string | undefined) =>
  queryOptions({
    queryKey: HABIT_QUERY_KEYS.measurements(habitId || ''),
    queryFn: () => habitsApi.fetchMeasurements(habitId!),
    enabled: !!habitId,
  });

/**
 * Query options for streak history
 */
export const streakHistoryQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: HABIT_QUERY_KEYS.streakHistory(userId || ''),
    queryFn: () => habitsApi.fetchStreakHistory(userId!),
    enabled: !!userId,
  });

/**
 * Query options for habit analytics
 */
export const habitAnalyticsQueryOptions = (userId: string | undefined, days: number = 30) =>
  queryOptions({
    queryKey: HABIT_QUERY_KEYS.analytics(userId || '', days),
    queryFn: () => habitsApi.fetchHabitCompletionsForAnalytics(userId!, days),
    enabled: !!userId,
  });

// ============================================================================
// Invalidation Helpers
// ============================================================================

/**
 * Get all query keys to invalidate after habit mutations
 */
export const getHabitInvalidationKeys = (userId: string, habitId?: string): readonly (readonly string[])[] => {
  const baseKeys: readonly (readonly string[])[] = [
    HABIT_QUERY_KEYS.list(userId),
    HABIT_QUERY_KEYS.stats(userId),
    HABIT_QUERY_KEYS.streakHistory(userId),
    HABIT_QUERY_KEYS.feed(userId),
  ];

  if (!habitId) return baseKeys;

  return [
    ...baseKeys,
    HABIT_QUERY_KEYS.detail(habitId),
    HABIT_QUERY_KEYS.completions(habitId),
    HABIT_QUERY_KEYS.attempts(habitId),
    HABIT_QUERY_KEYS.measurements(habitId),
    HABIT_QUERY_KEYS.habitStats(habitId),
  ];
};
