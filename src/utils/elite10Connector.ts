/**
 * Elite10 → Echo11 Connector
 * 
 * Syncs fitness data with Echo11's AI assistant via Edge Function.
 * The AI will adapt its recommendations based on your physical state.
 */

import { supabase } from "@/integrations/supabase/client";

export interface Elite10DailyData {
  user_id: string;
  date: string; // YYYY-MM-DD format
  sleep_quality: number; // 0-100
  recovery_score: number; // 0-100
  workout_type: string; // 'Leg Day', 'Cardio', 'Upper Body', 'Rest', etc.
  workout_intensity: 'Low' | 'Medium' | 'High' | 'Extreme' | null;
  nutrition_status: 'Fasting' | 'Surplus' | 'Deficit' | 'Maintenance';
}

export interface HistoricalDayData {
  date: string; // YYYY-MM-DD format
  sleep_quality: number; // 0-100
  recovery_score: number; // 0-100
  workout_type: string;
  workout_intensity: 'Low' | 'Medium' | 'High' | 'Extreme' | null;
  nutrition_status?: 'Fasting' | 'Surplus' | 'Deficit' | 'Maintenance';
}

export interface PushResult {
  success: boolean;
  cognitive_load_capacity?: number;
  focus_mode?: string;
  physical_energy_tag?: string;
  ai_strategy?: string;
  error?: string;
}

export interface HistoricalSyncResult {
  success: number;
  failed: number;
  errors: string[];
  results: Array<{ date: string; success: boolean; error?: string }>;
}

/**
 * Push daily fitness data from Elite10 to Echo11 via Edge Function
 */
export async function pushToEcho11(
  data: Omit<Elite10DailyData, 'user_id'>
): Promise<PushResult> {
  try {
    // Validate required fields
    if (!data.date) {
      return { success: false, error: "Missing date" };
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      return { success: false, error: "Invalid date format. Use YYYY-MM-DD" };
    }

    // Validate numeric ranges
    if (data.sleep_quality !== undefined && (data.sleep_quality < 0 || data.sleep_quality > 100)) {
      return { success: false, error: "sleep_quality must be between 0 and 100" };
    }
    if (data.recovery_score !== undefined && (data.recovery_score < 0 || data.recovery_score > 100)) {
      return { success: false, error: "recovery_score must be between 0 and 100" };
    }

    const { data: result, error } = await supabase.functions.invoke('echo11-sync', {
      body: { days: [data] }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (result.failed > 0) {
      return { success: false, error: result.errors?.[0] || 'Unknown error' };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}

/**
 * Calculate cognitive load capacity locally (for preview/testing)
 */
export function calculateCognitiveCapacity(
  sleepQuality: number,
  recoveryScore: number,
  workoutIntensity: string
): number {
  let capacity = (sleepQuality * 0.6) + (recoveryScore * 0.4);

  if (workoutIntensity === "Extreme") {
    capacity = capacity * 0.9;
  }

  return Math.max(0, Math.min(100, Math.round(capacity)));
}

/**
 * Quick sync for today's data
 */
export async function syncTodayToEcho11(
  metrics: Omit<Elite10DailyData, 'user_id' | 'date'>
): Promise<PushResult> {
  const today = new Date().toISOString().split('T')[0];

  return pushToEcho11({
    date: today,
    ...metrics,
  });
}

/**
 * Map workout duration to intensity level
 */
export function mapDurationToIntensity(durationMinutes: number): 'Low' | 'Medium' | 'High' | 'Extreme' {
  if (durationMinutes < 30) return 'Low';
  if (durationMinutes < 60) return 'Medium';
  if (durationMinutes < 90) return 'High';
  return 'Extreme';
}

/**
 * Sync historical data (multiple days) to Echo11 via Edge Function
 */
export async function syncHistoricalToEcho11(
  days: HistoricalDayData[],
  onProgress?: (current: number, total: number) => void
): Promise<HistoricalSyncResult> {
  try {
    // Report initial progress
    if (onProgress) {
      onProgress(0, days.length);
    }

    const { data: result, error } = await supabase.functions.invoke('echo11-sync', {
      body: { days }
    });

    if (error) {
      return {
        success: 0,
        failed: days.length,
        errors: [error.message],
        results: days.map(d => ({ date: d.date, success: false, error: error.message }))
      };
    }

    // Report final progress
    if (onProgress) {
      onProgress(days.length, days.length);
    }

    return {
      success: result.success || 0,
      failed: result.failed || 0,
      errors: result.errors || [],
      results: result.results || []
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: 0,
      failed: days.length,
      errors: [errorMessage],
      results: days.map(d => ({ date: d.date, success: false, error: errorMessage }))
    };
  }
}
