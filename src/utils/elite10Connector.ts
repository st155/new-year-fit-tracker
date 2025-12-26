/**
 * Elite10 → Echo11 Connector
 * 
 * Syncs fitness data with Echo11's AI assistant.
 * The AI will adapt its recommendations based on your physical state.
 */

export interface Elite10DailyData {
  user_id: string;
  date: string; // YYYY-MM-DD format
  sleep_quality: number; // 0-100
  recovery_score: number; // 0-100
  workout_type: string; // 'Leg Day', 'Cardio', 'Upper Body', 'Rest', etc.
  workout_intensity: 'Low' | 'Medium' | 'High' | 'Extreme';
  nutrition_status: 'Fasting' | 'Surplus' | 'Deficit' | 'Maintenance';
}

export interface PushResult {
  success: boolean;
  cognitive_load_capacity?: number;
  focus_mode?: string;
  physical_energy_tag?: string;
  ai_strategy?: string;
  error?: string;
}

// Echo11 Sync Endpoint
const ECHO11_SYNC_URL = "https://ftnlxzcaahvuuisffhka.supabase.co/functions/v1/sync-elite10-data";

/**
 * Push daily fitness data from Elite10 to Echo11
 */
export async function pushToEcho11(
  data: Elite10DailyData, 
  syncSecret: string
): Promise<PushResult> {
  try {
    // Validate required fields
    if (!data.user_id) {
      return { success: false, error: "Missing user_id" };
    }
    if (!data.date) {
      return { success: false, error: "Missing date" };
    }
    if (!syncSecret) {
      return { success: false, error: "Missing sync secret" };
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

    const response = await fetch(ECHO11_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Elite10-Secret": syncSecret,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        errorMessage = errorText;
      }

      return { 
        success: false, 
        error: `HTTP ${response.status}: ${errorMessage}` 
      };
    }

    const result = await response.json();

    return { 
      success: true, 
      cognitive_load_capacity: result.cognitive_load_capacity,
      focus_mode: result.focus_mode,
      physical_energy_tag: result.physical_energy_tag,
      ai_strategy: result.ai_strategy,
    };
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
  userId: string,
  metrics: Omit<Elite10DailyData, 'user_id' | 'date'>,
  syncSecret: string
): Promise<PushResult> {
  const today = new Date().toISOString().split('T')[0];

  return pushToEcho11({
    user_id: userId,
    date: today,
    ...metrics,
  }, syncSecret);
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
