/**
 * Habit Domain Types
 * 
 * Centralized type definitions for the Habits feature.
 * All habit-related interfaces should be defined here.
 */

import type { LucideIcon } from 'lucide-react';

// ============================================================================
// Core Habit Types
// ============================================================================

export type HabitType = 
  | 'duration_counter'    // Track time since start (e.g., no smoking)
  | 'fasting_tracker'     // Intermittent fasting
  | 'daily_check'         // Simple daily checkbox
  | 'numeric_counter'     // Count-based (e.g., 8 glasses of water)
  | 'daily_measurement';  // Daily value tracking

export type HabitSentiment = 'positive' | 'negative' | 'neutral';

export type HabitCategory = 
  | 'health'
  | 'fitness'
  | 'nutrition'
  | 'sleep'
  | 'mindfulness'
  | 'learning'
  | 'productivity'
  | 'social'
  | 'custom';

export type HabitDifficulty = 'easy' | 'medium' | 'hard';

export type HabitCustomSettings = Record<string, unknown>;

/**
 * Habit entity - matches database schema
 * Note: Using partial types to match Supabase schema flexibility
 */
export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  habit_type: string; // HabitType in DB but stored as string
  category?: string | null;
  icon?: string | null;
  color?: string | null;
  xp_reward: number;
  difficulty_level?: number | null; // Stored as number in DB
  start_date?: string | null;
  target_value?: number | null;
  target_unit?: string | null;
  frequency?: string | null;
  reminder_time?: string | null;
  is_active: boolean;
  archived?: boolean | null; // Optional in DB
  custom_settings?: HabitCustomSettings | null;
  linked_goal_id?: string | null;
  team_id?: string | null;
  created_at: string;
  updated_at: string;
  // Additional DB fields
  ai_motivation?: unknown;
  estimated_duration_minutes?: number | null;
  is_public?: boolean | null;
  max_daily_value?: number | null;
  sort_order?: number | null;
}

// ============================================================================
// Habit Completion & Progress
// ============================================================================

export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  notes?: string | null;
  value?: number | null;
  created_at?: string;
}

export interface HabitAttempt {
  id: string;
  habit_id: string;
  user_id: string;
  start_date: string;
  end_date?: string | null;
  days_lasted?: number | null;
  reset_reason?: string | null;
  created_at: string;
}

export interface HabitMeasurement {
  id: string;
  habit_id: string;
  user_id: string;
  value: number;
  measurement_date: string;
  notes?: string | null;
  created_at?: string;
}

export interface HabitStreakHistory {
  id: string;
  habit_id: string;
  user_id: string;
  start_date: string;
  end_date?: string | null;
  streak_length: number;
  was_recovered?: boolean;
  recovery_used_at?: string | null;
  created_at: string;
}

// ============================================================================
// Habit Stats & Analytics
// ============================================================================

export interface HabitStats {
  id?: string;
  habit_id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  completion_rate: number;
  last_completed_at?: string | null;
  total_xp_earned?: number; // Optional, computed
  updated_at: string;
  created_at?: string;
}

export interface HabitDailyProgress {
  date: string;
  completed: boolean;
  reset: boolean;
  streak_day?: number;
  value?: number;
}

export interface HabitAnalytics {
  completions: HabitCompletion[];
  streakHistory: HabitStreakHistory[];
  xpHistory: { id: string; habit_id: string; completed_at: string }[];
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// Enriched Habit (with computed data)
// ============================================================================

export interface HabitWithStats extends Habit {
  completed_today: boolean;
  stats?: HabitStats | null;
  completions?: HabitCompletion[];
  current_value?: number;      // For numeric counters
  current_attempt?: HabitAttempt | null;  // For duration counters
}

// ============================================================================
// Habit Templates
// ============================================================================

export interface HabitAIMotivation {
  milestones: Record<number, string>; // minutes -> message
}

export interface HabitTemplate {
  id: string;
  name: string;
  icon: string;
  color: string;
  habit_type: HabitType;
  category: string;
  description: string;
  custom_settings?: HabitCustomSettings;
  ai_motivation?: HabitAIMotivation;
}

// ============================================================================
// Habit Mutations
// ============================================================================

export interface CreateHabitInput {
  name: string;
  habit_type: HabitType;
  description?: string;
  category?: string;
  icon?: string;
  color?: string;
  xp_reward?: number;
  difficulty_level?: HabitDifficulty;
  target_value?: number;
  target_unit?: string;
  frequency?: string;
  reminder_time?: string;
  custom_settings?: HabitCustomSettings;
  linked_goal_id?: string;
  team_id?: string;
}

export interface UpdateHabitInput extends Partial<CreateHabitInput> {
  is_active?: boolean;
  archived?: boolean;
}

// ============================================================================
// Habit Completion Result (Gamification)
// ============================================================================

export interface HabitCompletionResult {
  success: boolean;
  xpEarned: number;
  newLevel?: number;
  oldLevel?: number;
  celebrationType: 'completion' | 'streak' | 'milestone' | 'level_up';
  streakCount: number;
  newAchievements?: HabitAchievement[];
}

export interface HabitAchievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description?: string;
  icon?: string;
  earned_at: string;
}

// ============================================================================
// Habit UI Types
// ============================================================================

export interface HabitIconMapping {
  keyword: string;
  icon: LucideIcon;
}

export interface HabitCardState {
  isExpanded: boolean;
  isAnimating: boolean;
  showConfetti: boolean;
}

// ============================================================================
// Habit Feed & Social
// ============================================================================

export interface HabitFeedEvent {
  id: string;
  user_id: string;
  habit_id: string;
  event_type: 'habit_completion' | 'streak_milestone' | 'achievement_unlocked' | 'team_challenge';
  event_data: {
    habit_name?: string;
    habit_icon?: string;
    streak?: number;
    xp_earned?: number;
    [key: string]: unknown;
  };
  visibility: 'public' | 'friends' | 'private';
  created_at: string;
}

export interface HabitTeam {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  invite_code: string;
  is_public: boolean;
  created_at: string;
}

export interface HabitTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}
