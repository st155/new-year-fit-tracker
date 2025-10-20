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
  subSources?: Array<{
    source: 'inbody' | 'withings' | 'manual';
    value: number;
    label: string;
  }>;
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
        .select("challenge_id, baseline_body_fat, baseline_weight, baseline_muscle_mass, baseline_recorded_at, challenges(title, start_date)")
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
        const challengeStartDate = participation?.challenges?.start_date;
        const baselineDate = participation?.baseline_recorded_at || challengeStartDate;
        
        let subSources: ChallengeGoal['subSources'] = undefined;
        
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
          // Baseline: from sparkline earliest point > participation > earliest measurement
          if (bodyMetrics.weight?.sparklineData && bodyMetrics.weight.sparklineData.length > 0) {
            baselineValue = bodyMetrics.weight.sparklineData[0].value;
          }
          if (!baselineValue) {
            baselineValue = participation?.baseline_weight || allMeasurements[allMeasurements.length - 1]?.value || null;
          }
        } else if (goalNameLower.includes('жир') || goalNameLower.includes('fat')) {
          // Collect all sources
          const sources = bodyMetrics.bodyFat?.sources;
          if (sources) {
            subSources = [];
            if (sources.inbody) {
              subSources.push({ source: 'inbody', value: sources.inbody.value, label: 'InBody' });
            }
            if (sources.withings) {
              subSources.push({ source: 'withings', value: sources.withings.value, label: 'Withings' });
            }
            if (sources.manual) {
              subSources.push({ source: 'manual', value: sources.manual.value, label: 'Калипер' });
            }
          }
          
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
          
          // Baseline: from sparkline earliest point (after challenge start) > participation > earliest measurement
          if (bodyMetrics.bodyFat?.sparklineData && bodyMetrics.bodyFat.sparklineData.length > 0) {
            let sparkline = bodyMetrics.bodyFat.sparklineData;
            if (baselineDate) {
              sparkline = sparkline.filter(d => new Date(d.date) >= new Date(baselineDate));
            }
            if (sparkline.length > 0) {
              baselineValue = sparkline[0].value;
            }
          }
          if (!baselineValue) {
            baselineValue = participation?.baseline_body_fat || allMeasurements[allMeasurements.length - 1]?.value || null;
          }
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
          // Baseline: from sparkline earliest point > participation > earliest measurement
          if (bodyMetrics.muscleMass?.sparklineData && bodyMetrics.muscleMass.sparklineData.length > 0) {
            baselineValue = bodyMetrics.muscleMass.sparklineData[0].value;
          }
          if (!baselineValue) {
            baselineValue = participation?.baseline_muscle_mass || allMeasurements[allMeasurements.length - 1]?.value || null;
          }
        } else {
          // For other goals (running, pull-ups, etc.)
          currentValue = allMeasurements[0]?.value || 0;
          source = 'manual';
          
          // Use earliest measurement as baseline, but NOT currentValue
          if (allMeasurements.length > 1) {
            baselineValue = allMeasurements[allMeasurements.length - 1].value;
          } else {
            baselineValue = null;
          }
        }

        const targetValue = goal.target_value || 0;

        // Определяем тип цели для правильного расчета прогресса
        const isDurationGoal = goalNameLower.includes('планка') || 
                              goalNameLower.includes('plank') ||
                              goalNameLower.includes('vo2');
        
        const isRunningGoal = goalNameLower.includes('бег') || 
                             goalNameLower.includes('run') ||
                             goalNameLower.includes('км');
        
        // "Меньше = лучше" только для жира, веса и бега (не для планки!)
        const isLowerBetter = (goalNameLower.includes('жир') || 
                              goalNameLower.includes('вес') ||
                              isRunningGoal) && !isDurationGoal;

        // Calculate progress ONLY if target_value is set
        let progress = 0;
        if (!goal.target_value || !currentValue) {
          progress = 0;
          console.debug(`⏭️ ${goal.goal_name}: Skipping progress calc (target=${goal.target_value}, current=${currentValue})`);
        } else if (isLowerBetter) {
          // Lower is better (body fat, weight, running time)
          if (currentValue <= targetValue) {
            progress = 100;
          } else if (baselineValue && baselineValue > targetValue && baselineValue !== currentValue) {
            const totalRange = baselineValue - targetValue;
            const progressMade = baselineValue - currentValue;
            progress = Math.max(0, Math.min(100, (progressMade / totalRange) * 100));
          } else {
            // Fallback when no baseline: show 0% with suggestion to add baseline
            progress = 0;
          }
        } else {
          // Higher is better (duration, strength, reps)
          if (currentValue >= targetValue) {
            progress = 100;
          } else if (baselineValue && baselineValue < targetValue && baselineValue !== currentValue) {
            const totalRange = targetValue - baselineValue;
            const progressMade = currentValue - baselineValue;
            progress = Math.max(0, Math.min(100, (progressMade / totalRange) * 100));
          } else {
            // Fallback when no baseline: show simple ratio (10/16 = 62.5%)
            progress = Math.max(0, Math.min(100, (currentValue / targetValue) * 100));
          }
        }

        // Debug logging for 0% progress
        if (progress === 0 && currentValue > 0) {
          console.warn(`🚨 ${goal.goal_name}: Progress is 0% despite current=${currentValue}`, {
            currentValue,
            targetValue,
            baselineValue,
            isLowerBetter,
            isDurationGoal,
            measurements: allMeasurements.length
          });
        }

        // Validation
        if (baselineValue === currentValue && currentValue > 0) {
          console.debug(`ℹ️ ${goal.goal_name}: baseline equals current (${baselineValue}), using ratio formula`);
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
          subSources,
        };
      });

      return challengeGoals;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
