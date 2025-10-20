import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAggregatedBodyMetrics } from "./useAggregatedBodyMetrics";
import { isTimeUnit } from "@/lib/utils";

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

      // 2. Fetch personal goals
      const { data: personalGoals, error: personalError } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .eq("is_personal", true)
        .order("created_at", { ascending: false });

      if (personalError) throw personalError;

      // 3. Fetch challenge goals
      // CRITICAL: Filter by user_id to get only current user's instances of challenge goals
      let challengeGoalsData: any[] = [];
      if (challengeIds.length > 0) {
        const { data, error: challengeError } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", userId)
          .eq("is_personal", false)
          .in("challenge_id", challengeIds)
          .order("created_at", { ascending: false });

        if (challengeError) throw challengeError;
        challengeGoalsData = data || [];
      }

      console.info('Goals loaded:', { 
        personal: personalGoals?.length || 0, 
        challenge: challengeGoalsData.length,
        challengeIds 
      });

      // 4. Combine all goals
      const goals = [...(personalGoals || []), ...challengeGoalsData];
      if (!goals.length) return [];

      // 5. Get ALL measurements for all goals (not limited)
      const goalIds = goals.map(g => g.id);
      const { data: measurements } = await supabase
        .from("measurements")
        .select("goal_id, value, measurement_date")
        .in("goal_id", goalIds)
        .eq("user_id", userId)
        .order("measurement_date", { ascending: false });

      // 6. Return all goals without deduplication
      // Display all 9 challenge goals + 2 personal goals (total 11)
      console.info('Total goals (no deduplication):', goals.length);

      // 7. Map goals with measurements and calculate progress
      const challengeGoals: ChallengeGoal[] = goals.map(goal => {
        const allMeasurements = measurements?.filter(m => m.goal_id === goal.id) || [];
        
        // Check if this is a time-based goal
        const isTimeGoal = isTimeUnit(goal.target_unit) ||
          goal.goal_name.toLowerCase().includes('время') ||
          goal.goal_name.toLowerCase().includes('бег');
        
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
        }

        const targetValue = goal.target_value || 0;

        // Calculate progress ONLY if target_value is set
        let progress = 0;
        if (goal.target_value && currentValue && baselineValue !== null) {
          const isLowerBetter = isTimeGoal ||
            goalNameLower.includes('жир') ||
            goalNameLower.includes('fat');
          
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
          const latest = sparklineData[0].value;
          const previous = sparklineData[1].value;
          
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
