// Goals Service - Supabase data layer
import { supabase } from "@/integrations/supabase/client";
import type {
  Goal,
  GoalCreateInput,
  GoalUpdateInput,
  Measurement,
  MeasurementCreateInput,
  ChallengeParticipation,
  GoalCurrentValue,
  UnifiedMetric,
} from "../types";

// ============= Goals Queries =============

export async function fetchGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ [GoalsService] Error fetching goals:", error);
    throw error;
  }

  return data || [];
}

export async function fetchGoalById(goalId: string): Promise<Goal | null> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (error) {
    console.error("❌ [GoalsService] Error fetching goal:", error);
    throw error;
  }

  return data;
}

export async function fetchPersonalGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_personal", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ [GoalsService] Error fetching personal goals:", error);
    throw error;
  }

  return data || [];
}

export async function fetchChallengeGoalsByIds(
  userId: string,
  challengeIds: string[]
): Promise<Goal[]> {
  if (challengeIds.length === 0) return [];

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_personal", false)
    .in("challenge_id", challengeIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ [GoalsService] Error fetching challenge goals:", error);
    throw error;
  }

  return data || [];
}

// ============= Measurements Queries =============

export async function fetchMeasurements(
  userId: string,
  goalIds: string[]
): Promise<Measurement[]> {
  if (goalIds.length === 0) return [];

  const { data, error } = await supabase
    .from("measurements")
    .select("goal_id, value, measurement_date, source")
    .in("goal_id", goalIds)
    .eq("user_id", userId)
    .order("measurement_date", { ascending: false });

  if (error) {
    console.error("❌ [GoalsService] Error fetching measurements:", error);
    throw error;
  }

  return (data || []) as Measurement[];
}

export async function fetchMeasurementsByGoalId(
  goalId: string,
  userId: string
): Promise<Measurement[]> {
  const { data, error } = await supabase
    .from("measurements")
    .select("*")
    .eq("goal_id", goalId)
    .eq("user_id", userId)
    .order("measurement_date", { ascending: false });

  if (error) {
    console.error("❌ [GoalsService] Error fetching measurements:", error);
    throw error;
  }

  return (data || []) as Measurement[];
}

// ============= Current Values Queries =============

export async function fetchGoalCurrentValues(
  goalIds: string[]
): Promise<GoalCurrentValue[]> {
  if (goalIds.length === 0) return [];

  const { data, error } = await supabase
    .from("goal_current_values")
    .select("*")
    .in("goal_id", goalIds);

  if (error) {
    console.error("❌ [GoalsService] Error fetching current values:", error);
    throw error;
  }

  return (data || []) as GoalCurrentValue[];
}

// ============= Challenge Participations =============

export async function fetchChallengeParticipations(
  userId: string
): Promise<ChallengeParticipation[]> {
  const { data, error } = await supabase
    .from("challenge_participants")
    .select(
      "challenge_id, baseline_body_fat, baseline_weight, baseline_muscle_mass, baseline_recorded_at, challenges(title, start_date)"
    )
    .eq("user_id", userId);

  if (error) {
    console.error("❌ [GoalsService] Error fetching participations:", error);
    throw error;
  }

  return (data || []).map((p: any) => ({
    challenge_id: p.challenge_id,
    baseline_body_fat: p.baseline_body_fat,
    baseline_weight: p.baseline_weight,
    baseline_muscle_mass: p.baseline_muscle_mass,
    baseline_recorded_at: p.baseline_recorded_at,
    challenges: p.challenges,
  }));
}

// ============= Unified Metrics =============

export async function fetchUnifiedMetricsHistory(
  userId: string
): Promise<UnifiedMetric[]> {
  const { data, error } = await supabase
    .from("unified_metrics")
    .select("metric_name, value, measurement_date")
    .eq("user_id", userId)
    .order("measurement_date", { ascending: false });

  if (error) {
    console.error("❌ [GoalsService] Error fetching unified metrics:", error);
    throw error;
  }

  return (data || []) as UnifiedMetric[];
}

// ============= Goals Mutations =============

export async function createGoal(input: GoalCreateInput): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: input.user_id,
      goal_name: input.goal_name,
      goal_type: input.goal_type,
      target_value: input.target_value,
      target_unit: input.target_unit,
      target_reps: input.target_reps,
      is_personal: input.is_personal ?? true,
      challenge_id: input.challenge_id,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ [GoalsService] Error creating goal:", error);
    throw error;
  }

  return data;
}

export async function updateGoal(input: GoalUpdateInput): Promise<Goal> {
  const { id, ...updates } = input;

  const { data, error } = await supabase
    .from("goals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ [GoalsService] Error updating goal:", error);
    throw error;
  }

  return data;
}

export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", goalId);

  if (error) {
    console.error("❌ [GoalsService] Error deleting goal:", error);
    throw error;
  }
}

// ============= Measurements Mutations =============

export async function createMeasurement(
  input: MeasurementCreateInput
): Promise<Measurement> {
  const { data, error } = await supabase
    .from("measurements")
    .insert({
      goal_id: input.goal_id,
      user_id: input.user_id,
      value: input.value,
      unit: input.unit,
      measurement_date: input.measurement_date,
      reps: input.reps,
      source: input.source || "manual",
    })
    .select()
    .single();

  if (error) {
    console.error("❌ [GoalsService] Error creating measurement:", error);
    throw error;
  }

  return data as Measurement;
}

export async function createMeasurementsBatch(
  measurements: MeasurementCreateInput[]
): Promise<Measurement[]> {
  if (measurements.length === 0) return [];

  const { data, error } = await supabase
    .from("measurements")
    .insert(
      measurements.map((m) => ({
        goal_id: m.goal_id,
        user_id: m.user_id,
        value: m.value,
        unit: m.unit,
        measurement_date: m.measurement_date,
        reps: m.reps,
        source: m.source || "manual",
      }))
    )
    .select();

  if (error) {
    console.error("❌ [GoalsService] Error creating measurements batch:", error);
    throw error;
  }

  return (data || []) as Measurement[];
}

export async function deleteMeasurement(measurementId: string): Promise<void> {
  const { error } = await supabase
    .from("measurements")
    .delete()
    .eq("id", measurementId);

  if (error) {
    console.error("❌ [GoalsService] Error deleting measurement:", error);
    throw error;
  }
}

// ============= GoalsService Object Export =============

export const GoalsService = {
  // Goals
  fetchGoals,
  fetchGoalById,
  fetchPersonalGoals,
  fetchChallengeGoalsByIds,
  createGoal,
  updateGoal,
  deleteGoal,
  // Measurements
  fetchMeasurements,
  fetchMeasurementsByGoalId,
  createMeasurement,
  createMeasurementsBatch,
  deleteMeasurement,
  // Current Values & Participations
  fetchGoalCurrentValues,
  fetchChallengeParticipations,
  fetchUnifiedMetricsHistory,
};
