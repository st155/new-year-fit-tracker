/**
 * Habits API
 * 
 * Centralized API layer for all habit-related Supabase operations.
 * This replaces direct Supabase calls scattered across hooks.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Habit,
  HabitWithStats,
  HabitCompletion,
  HabitAttempt,
  HabitMeasurement,
  HabitStats,
  HabitStreakHistory,
  CreateHabitInput,
  UpdateHabitInput,
} from '../types';
import { DEFAULT_HABIT_VALUES } from '../constants';
import type { Json } from '@/integrations/supabase/types';

// ============================================================================
// Habits CRUD
// ============================================================================

/**
 * Fetch all habits for a user with stats, completions, and attempts
 */
export async function fetchHabits(userId: string): Promise<HabitWithStats[]> {
  const today = new Date().toISOString().split('T')[0];
  
  // Fetch habits
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .or('archived.is.null,archived.eq.false')
    .order('created_at', { ascending: false });

  if (habitsError) throw habitsError;
  if (!habits) return [];

  // Fetch related data in parallel
  const [statsResult, completionsResult, attemptsResult] = await Promise.all([
    supabase.from('habit_stats').select('*').eq('user_id', userId),
    supabase.from('habit_completions').select('*').eq('user_id', userId)
      .gte('completed_at', today).lt('completed_at', today + 'T23:59:59.999Z'),
    supabase.from('habit_attempts').select('*').eq('user_id', userId).is('end_date', null),
  ]);

  const stats = statsResult.data || [];
  const todayCompletions = completionsResult.data || [];
  const activeAttempts = attemptsResult.data || [];

  // Enrich habits with computed data
  return habits.map((habit): HabitWithStats => {
    const habitStats = stats.find(s => s.habit_id === habit.id);
    const habitCompletions = todayCompletions.filter(c => c.habit_id === habit.id);
    const currentAttempt = activeAttempts.find(a => a.habit_id === habit.id);

    return {
      ...habit as unknown as Habit,
      completed_today: habitCompletions.length > 0,
      stats: habitStats as HabitStats | null,
      completions: habitCompletions as HabitCompletion[],
      current_value: habitCompletions.reduce((sum, c) => sum + ((c as any).value || 1), 0),
      current_attempt: currentAttempt as HabitAttempt | null,
    };
  });
}

/**
 * Fetch a single habit by ID
 */
export async function fetchHabitById(habitId: string): Promise<HabitWithStats | null> {
  const { data: habit, error } = await supabase
    .from('habits')
    .select('*')
    .eq('id', habitId)
    .single();

  if (error) throw error;
  if (!habit) return null;

  const today = new Date().toISOString().split('T')[0];
  const [statsResult, completionsResult, attemptResult] = await Promise.all([
    supabase.from('habit_stats').select('*').eq('habit_id', habitId).maybeSingle(),
    supabase.from('habit_completions').select('*').eq('habit_id', habitId).gte('completed_at', today),
    supabase.from('habit_attempts').select('*').eq('habit_id', habitId).is('end_date', null).maybeSingle(),
  ]);

  const todayCompletions = completionsResult.data || [];

  return {
    ...habit as unknown as Habit,
    completed_today: todayCompletions.length > 0,
    stats: statsResult.data as HabitStats | null,
    completions: todayCompletions as HabitCompletion[],
    current_attempt: attemptResult.data as HabitAttempt | null,
  };
}

/**
 * Create a new habit
 */
export async function createHabit(userId: string, input: CreateHabitInput): Promise<Habit> {
  const today = new Date().toISOString().split('T')[0];
  
  const insertData = {
    user_id: userId,
    name: input.name,
    description: input.description || null,
    habit_type: input.habit_type,
    category: input.category || null,
    icon: input.icon || null,
    color: input.color || null,
    xp_reward: input.xp_reward ?? DEFAULT_HABIT_VALUES.xp_reward,
    target_value: input.target_value || null,
    target_unit: input.target_unit || null,
    frequency: input.frequency || null,
    reminder_time: input.reminder_time || null,
    custom_settings: (input.custom_settings || null) as Json,
    linked_goal_id: input.linked_goal_id || null,
    team_id: input.team_id || null,
    is_active: DEFAULT_HABIT_VALUES.is_active,
    start_date: today,
  };

  const { data, error } = await supabase
    .from('habits')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Habit;
}

/**
 * Update an existing habit
 */
export async function updateHabit(habitId: string, input: UpdateHabitInput): Promise<Habit> {
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.xp_reward !== undefined) updateData.xp_reward = input.xp_reward;
  if (input.target_value !== undefined) updateData.target_value = input.target_value;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;
  if (input.archived !== undefined) updateData.archived = input.archived;
  if (input.custom_settings !== undefined) updateData.custom_settings = input.custom_settings as Json;

  const { data, error } = await supabase
    .from('habits')
    .update(updateData)
    .eq('id', habitId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Habit;
}

/**
 * Delete a habit (via Edge Function for cascade delete)
 */
export async function deleteHabit(habitId: string): Promise<{ success: boolean; deletedCount: number }> {
  const { data, error } = await supabase.functions.invoke('delete-habit', {
    body: { habitId },
  });

  if (error) throw error;
  if (!data?.success) throw new Error('Failed to delete habit');

  return data;
}

/**
 * Archive a habit (soft delete)
 */
export async function archiveHabit(habitId: string): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({ archived: true, is_active: false })
    .eq('id', habitId);

  if (error) throw error;
}

// ============================================================================
// Habit Completions
// ============================================================================

/**
 * Mark a habit as completed
 */
export async function completeHabit(
  habitId: string,
  userId: string,
  value?: number,
  notes?: string
): Promise<HabitCompletion> {
  const { data, error } = await supabase
    .from('habit_completions')
    .insert({
      habit_id: habitId,
      user_id: userId,
      completed_at: new Date().toISOString(),
      value,
      notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data as HabitCompletion;
}

/**
 * Undo the last completion
 */
export async function undoCompletion(habitId: string, userId: string): Promise<boolean> {
  const { data: lastCompletion } = await supabase
    .from('habit_completions')
    .select('id')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  if (!lastCompletion) return false;

  const { error } = await supabase
    .from('habit_completions')
    .delete()
    .eq('id', lastCompletion.id);

  return !error;
}

/**
 * Fetch completions for a date range
 */
export async function fetchCompletions(
  habitId: string,
  startDate: string,
  endDate: string
): Promise<HabitCompletion[]> {
  const { data, error } = await supabase
    .from('habit_completions')
    .select('*')
    .eq('habit_id', habitId)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate + 'T23:59:59.999Z')
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data as HabitCompletion[];
}

// ============================================================================
// Habit Attempts (Duration Counters)
// ============================================================================

/**
 * Fetch attempts for a habit
 */
export async function fetchAttempts(habitId: string): Promise<HabitAttempt[]> {
  const { data, error } = await supabase
    .from('habit_attempts')
    .select('*')
    .eq('habit_id', habitId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as HabitAttempt[];
}

/**
 * Reset a duration counter habit (end current attempt, start new one)
 */
export async function resetHabitAttempt(
  habitId: string,
  userId: string,
  reason?: string
): Promise<HabitAttempt> {
  const today = new Date().toISOString().split('T')[0];

  // Find current active attempt
  const { data: currentAttempt } = await supabase
    .from('habit_attempts')
    .select('*')
    .eq('habit_id', habitId)
    .is('end_date', null)
    .single();

  if (currentAttempt) {
    // Calculate days lasted
    const daysLasted = Math.floor(
      (new Date(today).getTime() - new Date(currentAttempt.start_date).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // End current attempt
    await supabase
      .from('habit_attempts')
      .update({
        end_date: today,
        days_lasted: daysLasted,
        reset_reason: reason,
      })
      .eq('id', currentAttempt.id);
  }

  // Start new attempt
  const { data: newAttempt, error } = await supabase
    .from('habit_attempts')
    .insert({
      habit_id: habitId,
      user_id: userId,
      start_date: today,
    })
    .select()
    .single();

  if (error) throw error;

  // Update habit start_date
  await supabase.from('habits').update({ start_date: today }).eq('id', habitId);

  return newAttempt as HabitAttempt;
}

// ============================================================================
// Habit Measurements
// ============================================================================

/**
 * Add a measurement for a habit
 */
export async function addMeasurement(
  habitId: string,
  userId: string,
  value: number,
  date?: string,
  notes?: string
): Promise<HabitMeasurement> {
  const { data, error } = await supabase
    .from('habit_measurements')
    .insert({
      habit_id: habitId,
      user_id: userId,
      value,
      measurement_date: date || new Date().toISOString().split('T')[0],
      notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data as HabitMeasurement;
}

/**
 * Fetch measurements for a habit
 */
export async function fetchMeasurements(habitId: string): Promise<HabitMeasurement[]> {
  const { data, error } = await supabase
    .from('habit_measurements')
    .select('*')
    .eq('habit_id', habitId)
    .order('measurement_date', { ascending: false });

  if (error) throw error;
  return data as HabitMeasurement[];
}

// ============================================================================
// Streak & Analytics
// ============================================================================

/**
 * Calculate current streak for a habit
 */
export async function calculateStreak(habitId: string, userId: string): Promise<number> {
  const { data: completions } = await supabase
    .from('habit_completions')
    .select('completed_at')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(100);

  if (!completions || completions.length === 0) return 0;

  let streak = 1;
  let checkDate = new Date();
  checkDate.setDate(checkDate.getDate() - 1);

  for (const comp of completions) {
    const compDate = new Date(comp.completed_at).toDateString();
    const expectedDate = checkDate.toDateString();

    if (compDate === expectedDate) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Fetch streak history for a user
 */
export async function fetchStreakHistory(userId: string): Promise<HabitStreakHistory[]> {
  const { data, error } = await supabase
    .from('habit_streak_history')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return data as HabitStreakHistory[];
}

/**
 * Fetch habit completions for analytics
 */
export async function fetchHabitCompletionsForAnalytics(
  userId: string,
  days: number = 30
): Promise<HabitCompletion[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('habit_completions')
    .select('*')
    .eq('user_id', userId)
    .gte('completed_at', startDate.toISOString())
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data as HabitCompletion[];
}
