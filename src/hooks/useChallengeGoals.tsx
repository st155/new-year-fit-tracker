import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAggregatedBodyMetrics } from "./useAggregatedBodyMetrics";

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
}

export function useChallengeGoals(userId?: string) {
  const bodyMetrics = useAggregatedBodyMetrics(userId);

  return useQuery({
    queryKey: ["challenge-goals", userId],
    queryFn: async () => {
      if (!userId) return [];

      // 1. Get user's challenge participations
      const { data: participations } = await supabase
        .from("challenge_participants")
        .select("challenge_id, challenges(title)")
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

      // 3. Get measurements for all goals
      const goalIds = goals.map(g => g.id);
      const { data: measurements } = await supabase
        .from("measurements")
        .select("goal_id, value, measurement_date")
        .in("goal_id", goalIds)
        .eq("user_id", userId)
        .order("measurement_date", { ascending: false });

      // 4. Map goals with measurements and calculate progress
      const challengeGoals: ChallengeGoal[] = goals.map(goal => {
        const goalMeasurements = measurements?.filter(m => m.goal_id === goal.id) || [];
        
        // For body composition goals, use aggregated metrics
        let currentValue = 0;
        let source: 'inbody' | 'withings' | 'manual' | undefined;
        let sparklineData = goalMeasurements.slice(0, 14);

        const goalNameLower = goal.goal_name.toLowerCase();
        
        if (goalNameLower.includes('вес') || goalNameLower.includes('weight')) {
          currentValue = bodyMetrics.weight?.value || goalMeasurements[0]?.value || 0;
          source = bodyMetrics.weight?.source;
          if (bodyMetrics.weight?.sparklineData) {
            sparklineData = bodyMetrics.weight.sparklineData.slice(0, 14).map(d => ({
              goal_id: goal.id,
              value: d.value,
              measurement_date: d.date
            }));
          }
        } else if (goalNameLower.includes('жир') || goalNameLower.includes('fat')) {
          currentValue = bodyMetrics.bodyFat?.value || goalMeasurements[0]?.value || 0;
          source = bodyMetrics.bodyFat?.source;
          if (bodyMetrics.bodyFat?.sparklineData) {
            sparklineData = bodyMetrics.bodyFat.sparklineData.slice(0, 14).map(d => ({
              goal_id: goal.id,
              value: d.value,
              measurement_date: d.date
            }));
          }
        } else if (goalNameLower.includes('мышц') || goalNameLower.includes('muscle')) {
          currentValue = bodyMetrics.muscleMass?.value || goalMeasurements[0]?.value || 0;
          source = bodyMetrics.muscleMass?.source;
          if (bodyMetrics.muscleMass?.sparklineData) {
            sparklineData = bodyMetrics.muscleMass.sparklineData.slice(0, 14).map(d => ({
              goal_id: goal.id,
              value: d.value,
              measurement_date: d.date
            }));
          }
        } else {
          currentValue = goalMeasurements[0]?.value || 0;
          source = 'manual';
        }

        // Calculate progress ONLY if target_value is set
        let progress = 0;
        if (goal.target_value && currentValue) {
          const isLowerBetter = goalNameLower.includes('жир') || goalNameLower.includes('бег');
          if (isLowerBetter) {
            progress = Math.max(0, Math.min(100, ((goal.target_value - currentValue) / goal.target_value) * 100));
          } else {
            progress = Math.min(100, (currentValue / goal.target_value) * 100);
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
        const participation = participations?.find(p => p.challenge_id === goal.challenge_id);
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
          has_target: goal.target_value !== null
        };
      });

      return challengeGoals;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
