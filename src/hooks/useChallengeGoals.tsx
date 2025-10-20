import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAggregatedBodyMetrics } from "./useAggregatedBodyMetrics";

// Normalize time values stored as M.SS to actual minutes (M + SS/60)
// Example: 3.50 (3:50) → 3.8333 minutes, 4.10 (4:10) → 4.1667 minutes
function normalizeTimeMinutes(value: number): number {
  const minutes = Math.floor(value);
  const seconds = Math.round((value - minutes) * 100);
  return minutes + seconds / 60;
}

export interface ChallengeGoal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number | null;
  target_unit: string;
  current_value: number;
  progress_percentage: number;
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
  is_personal: boolean;
  challenge_id?: string;
  challenge_title?: string;
  measurements: Array<{
    goal_id: string;
    value: number;
    measurement_date: string;
  }>;
  source?: 'inbody' | 'withings' | 'manual';
  has_target: boolean;
  baseline_value?: number;
}

export function useChallengeGoals(userId?: string) {
  const bodyMetrics = useAggregatedBodyMetrics(userId);

  return useQuery({
    queryKey: ["challenge-goals", userId],
    queryFn: async () => {
      if (!userId) return [];

      // 1. Get user's challenge participations with baseline data
      const { data: participations } = await supabase
        .from("challenge_participants")
        .select("challenge_id, baseline_body_fat, baseline_weight, baseline_muscle_mass, challenges(title)")
        .eq("user_id", userId);

      const challengeIds = participations?.map(p => p.challenge_id) || [];

      // 2. Get ALL user's goals from challenges + personal goals
      let goalsQuery = supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Filter by challenges OR personal goals
      if (challengeIds.length > 0) {
        goalsQuery = goalsQuery.or(`challenge_id.in.(${challengeIds.join(',')}),is_personal.eq.true`);
      } else {
        // Only personal goals if no challenges
        goalsQuery = goalsQuery.eq("is_personal", true);
      }

      const { data: goals, error: goalsError } = await goalsQuery;

      if (goalsError) throw goalsError;
      if (!goals) return [];

      // 3. Get ALL measurements for all goals (not limited)
      const goalIds = goals.map(g => g.id);
      const { data: measurements } = await supabase
        .from("measurements")
        .select("goal_id, value, measurement_date")
        .in("goal_id", goalIds)
        .eq("user_id", userId)
        .order("measurement_date", { ascending: false });

      // 4. Deduplicate goals: only replace personal goals with challenge goals of same type
      const deduplicatedGoals = goals.reduce((acc, goal) => {
        // Find existing goal with same type that's either:
        // - From same challenge (if both are challenge goals)
        // - Personal goal that could be replaced by challenge goal
        const existing = acc.find(g => 
          g.goal_type === goal.goal_type && 
          (
            // Both from same challenge
            (g.challenge_id === goal.challenge_id && goal.challenge_id !== null) ||
            // Personal vs Challenge with same type
            (g.is_personal && !goal.is_personal)
          )
        );
        
        if (!existing) {
          // No duplicate, add goal
          acc.push(goal);
        } else if (!goal.is_personal && existing.is_personal) {
          // Replace personal goal with challenge goal of same type
          const index = acc.indexOf(existing);
          acc[index] = goal;
        }
        // Otherwise skip (keep existing challenge goal)
        
        return acc;
      }, [] as typeof goals);

      // 5. Map goals with measurements and calculate progress
      const challengeGoals: ChallengeGoal[] = deduplicatedGoals.map(goal => {
        const allMeasurements = measurements?.filter(m => m.goal_id === goal.id) || [];
        
        // Check if this is a time-based goal
        const isTimeGoal = goal.target_unit?.toLowerCase().includes("мин") || 
                          goal.target_unit?.toLowerCase().includes("min");
        
        // For body composition goals, use aggregated metrics
        let currentValue = 0;
        let source: 'inbody' | 'withings' | 'manual' | undefined;
        let sparklineData = allMeasurements.slice(0, 14);
        let baselineValue: number | null = null;

        const goalNameLower = goal.goal_name.toLowerCase();
        const participation = participations?.find(p => p.challenge_id === goal.challenge_id);
        
        if (goalNameLower.includes('вес') || goalNameLower.includes('weight')) {
          currentValue = bodyMetrics.weight?.value || allMeasurements[0]?.value || 0;
          source = bodyMetrics.weight?.source;
          if (bodyMetrics.weight?.sparklineData) {
            sparklineData = bodyMetrics.weight.sparklineData.slice(0, 14).map(d => ({
              goal_id: goal.id,
              value: d.value,
              measurement_date: d.date
            }));
          }
          // Baseline: participation data > earliest measurement
          baselineValue = participation?.baseline_weight || 
                         allMeasurements[allMeasurements.length - 1]?.value || 
                         currentValue;
        } else if (goalNameLower.includes('жир') || goalNameLower.includes('fat')) {
          // Priority: InBody > Withings > Manual
          currentValue = bodyMetrics.bodyFat?.value || allMeasurements[0]?.value || 0;
          source = bodyMetrics.bodyFat?.source;
          if (bodyMetrics.bodyFat?.sparklineData) {
            sparklineData = bodyMetrics.bodyFat.sparklineData.slice(0, 14).map(d => ({
              goal_id: goal.id,
              value: d.value,
              measurement_date: d.date
            }));
          }
          // Baseline: participation data > earliest measurement
          baselineValue = participation?.baseline_body_fat || 
                         allMeasurements[allMeasurements.length - 1]?.value || 
                         currentValue;
        } else if (goalNameLower.includes('мышц') || goalNameLower.includes('muscle')) {
          currentValue = bodyMetrics.muscleMass?.value || allMeasurements[0]?.value || 0;
          source = bodyMetrics.muscleMass?.source;
          if (bodyMetrics.muscleMass?.sparklineData) {
            sparklineData = bodyMetrics.muscleMass.sparklineData.slice(0, 14).map(d => ({
              goal_id: goal.id,
              value: d.value,
              measurement_date: d.date
            }));
          }
          baselineValue = participation?.baseline_muscle_mass || 
                         allMeasurements[allMeasurements.length - 1]?.value || 
                         currentValue;
        } else {
          // For other goals (running, pull-ups, etc.)
          currentValue = allMeasurements[0]?.value || 0;
          source = 'manual';
          
          // Use earliest measurement as baseline
          const earliestMeasurement = allMeasurements[allMeasurements.length - 1];
          baselineValue = earliestMeasurement?.value || currentValue;
          
          // Normalize time values
          if (isTimeGoal && currentValue) {
            currentValue = normalizeTimeMinutes(currentValue);
            if (baselineValue) {
              baselineValue = normalizeTimeMinutes(baselineValue);
            }
          }
        }

        // Normalize target value for time goals
        const targetValue = goal.target_value ? 
          (isTimeGoal ? normalizeTimeMinutes(goal.target_value) : goal.target_value) : 
          0;

        // Calculate progress ONLY if target_value is set
        let progress = 0;
        if (goal.target_value && currentValue && baselineValue !== null) {
          const isLowerBetter = goalNameLower.includes('жир') || 
                                goalNameLower.includes('fat') ||
                                isTimeGoal;
          
          if (isLowerBetter) {
            // For "lower is better" metrics, use baseline
            if (currentValue <= targetValue) {
              // Already at or below target
              progress = 100;
            } else if (baselineValue > targetValue) {
              // Calculate: (baseline - current) / (baseline - target) * 100
              const totalRange = baselineValue - targetValue;
              const progressMade = baselineValue - currentValue;
              progress = Math.max(0, Math.min(100, (progressMade / totalRange) * 100));
            } else {
              // Baseline already below target
              progress = 100;
            }
          } else {
            // For "higher is better" metrics
            progress = Math.min(100, (currentValue / targetValue) * 100);
          }
        }

        // Calculate trend
        let trend: 'up' | 'down' | 'stable' = 'stable';
        let trendPercentage = 0;

        if (sparklineData.length >= 2) {
          let latest = sparklineData[0].value;
          let previous = sparklineData[1].value;
          
          // Normalize for time goals
          if (isTimeGoal) {
            latest = normalizeTimeMinutes(latest);
            previous = normalizeTimeMinutes(previous);
          }
          
          const diff = latest - previous;
          trendPercentage = previous ? (diff / previous) * 100 : 0;

          if (Math.abs(trendPercentage) > 0.5) {
            trend = diff > 0 ? 'up' : 'down';
          }
        }

        // Get challenge title
        const challengeTitle = participation?.challenges?.title;

        return {
          id: goal.id,
          goal_name: goal.goal_name,
          goal_type: goal.goal_type,
          target_value: goal.target_value,
          target_unit: goal.target_unit,
          current_value: currentValue,
          progress_percentage: progress,
          trend,
          trend_percentage: trendPercentage,
          is_personal: goal.is_personal,
          challenge_id: goal.challenge_id,
          challenge_title: challengeTitle,
          measurements: sparklineData,
          source,
          has_target: goal.target_value !== null,
          baseline_value: baselineValue || undefined,
        };
      });

      return challengeGoals;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
