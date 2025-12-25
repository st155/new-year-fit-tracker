/**
 * Habits Service Layer
 * Clean, typed functions for habit CRUD operations
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// =============================================================================
// Types
// =============================================================================

type DbHabitInsert = Database['public']['Tables']['habits']['Insert'];

/** Clean DTO for Frontend consumption */
export interface HabitDTO {
  id: string;
  name: string;
  description: string | null;
  habitType: string;
  category: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  completedToday: boolean;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  xpReward: number;
  createdAt: string;
}

/** Input type for creating a habit */
export interface CreateHabitDTO {
  name: string;
  habitType?: string;
  description?: string;
  category?: string;
  icon?: string;
  color?: string;
  xpReward?: number;
  targetValue?: number;
}

/** Error codes for habit operations */
export type HabitErrorCode = 
  | 'AUTH_REQUIRED' 
  | 'FETCH_FAILED' 
  | 'CREATE_FAILED' 
  | 'STATUS_UPDATE_FAILED' 
  | 'DELETE_FAILED'
  | 'NOT_FOUND';

// =============================================================================
// Error Class
// =============================================================================

export class HabitServiceError extends Error {
  constructor(
    message: string,
    public readonly code: HabitErrorCode,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'HabitServiceError';
  }
}

// =============================================================================
// Helpers
// =============================================================================

/** Get current authenticated user or throw */
async function requireUser(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new HabitServiceError('User not authenticated', 'AUTH_REQUIRED', error);
  }
  return user.id;
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Fetch all active habits for a given date
 * Includes completion status and stats
 */
export async function fetchHabits(date: string): Promise<HabitDTO[]> {
  const userId = await requireUser();

  // Fetch habits
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (habitsError) {
    throw new HabitServiceError(
      `Failed to fetch habits: ${habitsError.message}`,
      'FETCH_FAILED',
      habitsError
    );
  }

  if (!habits?.length) return [];

  const habitIds = habits.map(h => h.id);

  // Fetch completions for the date
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data: completions } = await supabase
    .from('habit_completions')
    .select('habit_id, completed_at')
    .in('habit_id', habitIds)
    .gte('completed_at', startOfDay)
    .lte('completed_at', endOfDay);

  // Fetch stats
  const { data: stats } = await supabase
    .from('habit_stats')
    .select('habit_id, current_streak, longest_streak, total_completions')
    .in('habit_id', habitIds);

  // Build lookup maps
  const completionMap = new Map<string, boolean>();
  (completions ?? []).forEach(c => completionMap.set(c.habit_id, true));

  const statsMap = new Map<string, { current_streak: number; longest_streak: number; total_completions: number }>();
  (stats ?? []).forEach(s => statsMap.set(s.habit_id, {
    current_streak: s.current_streak ?? 0,
    longest_streak: s.longest_streak ?? 0,
    total_completions: s.total_completions ?? 0,
  }));

  // Transform to DTOs
  return habits.map((habit): HabitDTO => ({
    id: habit.id,
    name: habit.name,
    description: habit.description,
    habitType: habit.habit_type ?? 'daily_check',
    category: habit.category ?? 'custom',
    icon: habit.icon,
    color: habit.color,
    isActive: habit.is_active,
    completedToday: completionMap.has(habit.id),
    currentStreak: statsMap.get(habit.id)?.current_streak ?? 0,
    longestStreak: statsMap.get(habit.id)?.longest_streak ?? 0,
    totalCompletions: statsMap.get(habit.id)?.total_completions ?? 0,
    xpReward: habit.xp_reward ?? 10,
    createdAt: habit.created_at,
  }));
}

/**
 * Create a new habit
 */
export async function createHabit(data: CreateHabitDTO): Promise<HabitDTO> {
  const userId = await requireUser();
  const today = new Date().toISOString().split('T')[0];

  const insertData: DbHabitInsert = {
    user_id: userId,
    name: data.name,
    habit_type: data.habitType ?? 'daily_check',
    category: data.category ?? 'custom',
    description: data.description ?? null,
    icon: data.icon ?? null,
    color: data.color ?? null,
    xp_reward: data.xpReward ?? 10,
    target_value: data.targetValue ?? null,
    is_active: true,
  };

  const { data: habit, error } = await supabase
    .from('habits')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new HabitServiceError(
      `Failed to create habit: ${error.message}`,
      'CREATE_FAILED',
      error
    );
  }

  return {
    id: habit.id,
    name: habit.name,
    description: habit.description,
    habitType: habit.habit_type ?? 'daily_check',
    category: habit.category ?? 'custom',
    icon: habit.icon,
    color: habit.color,
    isActive: habit.is_active,
    completedToday: false,
    currentStreak: 0,
    longestStreak: 0,
    totalCompletions: 0,
    xpReward: habit.xp_reward ?? 10,
    createdAt: habit.created_at,
  };
}

/**
 * Update habit completion status for a specific date
 */
export async function updateHabitStatus(
  id: string,
  status: 'completed' | 'uncompleted',
  date: string
): Promise<void> {
  const userId = await requireUser();

  if (status === 'completed') {
    // Add completion record
    const { error } = await supabase
      .from('habit_completions')
      .insert({
        habit_id: id,
        user_id: userId,
        completed_at: `${date}T12:00:00.000Z`,
      });

    if (error) {
      throw new HabitServiceError(
        `Failed to mark habit as completed: ${error.message}`,
        'STATUS_UPDATE_FAILED',
        error
      );
    }
  } else {
    // Remove completion for this date
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const { error } = await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', id)
      .eq('user_id', userId)
      .gte('completed_at', startOfDay)
      .lte('completed_at', endOfDay);

    if (error) {
      throw new HabitServiceError(
        `Failed to unmark habit completion: ${error.message}`,
        'STATUS_UPDATE_FAILED',
        error
      );
    }
  }
}

/**
 * Delete a habit and all related data
 * Uses Edge Function for cascading delete
 */
export async function deleteHabit(id: string): Promise<void> {
  await requireUser();

  const { data, error } = await supabase.functions.invoke('delete-habit', {
    body: { habitId: id },
  });

  if (error) {
    throw new HabitServiceError(
      `Failed to delete habit: ${error.message}`,
      'DELETE_FAILED',
      error
    );
  }

  if (data && !data.success) {
    throw new HabitServiceError(
      data.error ?? 'Unknown error during deletion',
      'DELETE_FAILED'
    );
  }
}
