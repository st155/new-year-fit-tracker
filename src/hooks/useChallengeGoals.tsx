import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAggregatedBodyMetrics } from "./useAggregatedBodyMetrics";
import { isTimeUnit } from "@/lib/utils";
import { toast } from "sonner";

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
  source?: 'inbody' | 'withings' | 'manual' | 'garmin' | 'whoop';
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

  // Ensure react-query recalculates when aggregated body metrics arrive/refresh.
  const bodyMetricsKey = [
    bodyMetrics.weight?.date,
    bodyMetrics.weight?.value,
    bodyMetrics.bodyFat?.date,
    bodyMetrics.bodyFat?.value,
    bodyMetrics.muscleMass?.date,
    bodyMetrics.muscleMass?.value,
  ]
    .filter(Boolean)
    .join('|');

  return useQuery({
    queryKey: ["challenge-goals", userId, bodyMetricsKey],
    queryFn: async () => {
      if (!userId) return [];

      try {
        // 1. Get user's challenge participations with baseline data
        const { data: participations, error: partErr } = await supabase
          .from("challenge_participants")
          .select("challenge_id, baseline_body_fat, baseline_weight, baseline_muscle_mass, baseline_recorded_at, challenges(title, start_date)")
          .eq("user_id", userId);

        if (partErr) {
          console.error('❌ [useChallengeGoals] Error fetching participations:', partErr);
          throw partErr;
        }

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
        .select("goal_id, value, measurement_date, source")
        .in("goal_id", goalIds)
        .eq("user_id", userId)
        .order("measurement_date", { ascending: false });

      // 6. Get current values from unified_metrics via goal_current_values view
      const { data: currentValues } = await supabase
        .from("goal_current_values")
        .select("*")
        .in("goal_id", goalIds);

      // 7. Fetch unified metrics history for goals that have mappings
      const { data: allUnifiedHistory } = await supabase
        .from("unified_metrics")
        .select("metric_name, value, measurement_date")
        .eq("user_id", userId)
        .order("measurement_date", { ascending: false });

      // 8. Return all goals without deduplication
      // Display all 9 challenge goals + 2 personal goals (total 11)
      console.info('Total goals (no deduplication):', goals.length);

      // 9. Map goals with measurements and calculate progress
      const challengeGoals: ChallengeGoal[] = goals.map(goal => {
        const allMeasurements = measurements?.filter(m => m.goal_id === goal.id) || [];
        
        // Check if this is a time-based goal
        const isTimeGoal = isTimeUnit(goal.target_unit) ||
          goal.goal_name.toLowerCase().includes('время') ||
          goal.goal_name.toLowerCase().includes('бег');
        
        // For body composition goals, use aggregated metrics
        let currentValue = 0;
        let source: ChallengeGoal['source'];
        let sparklineData: ChallengeGoal['measurements'] = allMeasurements.slice(0, 14).map(m => ({
          goal_id: m.goal_id,
          value: m.value,
          measurement_date: m.measurement_date
        }));
        let baselineValue: number | null = null;

        const isRecentDate = (dateStr?: string, days: number = 30) => {
          if (!dateStr) return false;
          const date = new Date(dateStr);
          const now = new Date();
          const diffMs = Math.abs(now.getTime() - date.getTime());
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          return diffDays <= days;
        };

        const goalNameLower = goal.goal_name.toLowerCase();
        const participation = participations?.find(p => p.challenge_id === goal.challenge_id);
        const challengeStartDate = participation?.challenges?.start_date;
        const baselineDate = participation?.baseline_recorded_at || challengeStartDate;
        
        let subSources: ChallengeGoal['subSources'] = undefined;
        
        // Check if we have unified metrics data for this goal
        const currentValueData = currentValues?.find(cv => cv.goal_id === goal.id);
        const isBodyCompositionGoal = goalNameLower.includes('вес') || 
                                      goalNameLower.includes('weight') ||
                                      goalNameLower.includes('жир') || 
                                      goalNameLower.includes('fat') ||
                                      goalNameLower.includes('мышц') || 
                                      goalNameLower.includes('muscle');
        
        // Special handling for Recovery & Sleep metrics
        if (goalNameLower === 'recovery score' || goalNameLower.includes('recovery score')) {
          const recoveryMetrics = allUnifiedHistory?.filter(h => 
            h.metric_name === 'Recovery Score' || h.metric_name === 'Recovery'
          ).slice(0, 14) || [];
          
          if (recoveryMetrics.length > 0) {
            currentValue = recoveryMetrics[0].value;
            source = 'whoop' as any;
            sparklineData = recoveryMetrics.map(d => ({
              goal_id: goal.id,
              value: d.value,
              measurement_date: d.measurement_date
            }));
            baselineValue = recoveryMetrics[recoveryMetrics.length - 1].value;
          }
        } else if (goalNameLower === 'hrv' || goalNameLower === 'hrv (heart rate variability)') {
          const hrvMetrics = allUnifiedHistory?.filter(h => 
            h.metric_name === 'HRV' || 
            h.metric_name === 'HRV RMSSD' || 
            h.metric_name === 'Sleep HRV RMSSD' ||
            h.metric_name === 'Heart Rate Variability'
          ).slice(0, 14) || [];
          
          if (hrvMetrics.length > 0) {
            currentValue = hrvMetrics[0].value;
            source = 'whoop' as any;
            sparklineData = hrvMetrics.map(d => ({
              goal_id: goal.id,
              value: d.value,
              measurement_date: d.measurement_date
            }));
            baselineValue = hrvMetrics[hrvMetrics.length - 1].value;
          }
        } else if (goalNameLower === 'resting heart rate' || goalNameLower.includes('resting heart rate')) {
          const rhrMetrics = allUnifiedHistory?.filter(h => 
            h.metric_name === 'Resting Heart Rate' || 
            h.metric_name === 'Resting HR' || 
            h.metric_name === 'RHR' ||
            h.metric_name === 'Sleep Resting Heart Rate'
          ).slice(0, 14) || [];
          
          if (rhrMetrics.length > 0) {
            currentValue = rhrMetrics[0].value;
            source = 'whoop' as any;
            sparklineData = rhrMetrics.map(d => ({
              goal_id: goal.id,
              value: d.value,
              measurement_date: d.measurement_date
            }));
            baselineValue = rhrMetrics[rhrMetrics.length - 1].value;
          }
        } else if (goalNameLower === 'sleep hours' || goalNameLower.includes('sleep hours')) {
          const sleepMetrics = allUnifiedHistory?.filter(h => 
            h.metric_name === 'Sleep Duration' || 
            h.metric_name === 'Sleep Hours' ||
            h.metric_name === 'Total Sleep'
          ).slice(0, 14) || [];
          
          if (sleepMetrics.length > 0) {
            currentValue = sleepMetrics[0].value;
            source = 'whoop' as any;
            sparklineData = sleepMetrics.map(d => ({
              goal_id: goal.id,
              value: d.value,
              measurement_date: d.measurement_date
            }));
            baselineValue = sleepMetrics[sleepMetrics.length - 1].value;
          }
        } else if (goalNameLower.includes('вес') || goalNameLower.includes('weight')) {
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
          // Collect all sources (for UI)
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

          // Prefer aggregated body metrics; fallback to manual measurements only if they are recent.
          if (bodyMetrics.bodyFat?.value !== undefined && bodyMetrics.bodyFat?.value !== null) {
            currentValue = bodyMetrics.bodyFat.value;
            source = bodyMetrics.bodyFat.source;
          } else if (allMeasurements[0]?.value && isRecentDate(allMeasurements[0]?.measurement_date, 30)) {
            currentValue = allMeasurements[0].value;
            source = 'manual';
          } else {
            currentValue = 0;
            source = bodyMetrics.bodyFat?.source;
          }

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
        } else if (currentValueData && currentValueData.current_value) {
          // For other goals, use unified_metrics data from goal_current_values view
          currentValue = currentValueData.current_value;
          source = currentValueData.source as any;
          
          // Get history from pre-fetched unified metrics
          const unifiedHistory = allUnifiedHistory
            ?.filter(h => h.metric_name === goal.goal_name)
            .slice(0, 14) || [];
          
          if (unifiedHistory.length > 0) {
            sparklineData = unifiedHistory.map(d => ({
              goal_id: goal.id,
              value: d.value,
              measurement_date: d.measurement_date
            }));
            
            // Use earliest from unified_metrics as baseline
            baselineValue = unifiedHistory[unifiedHistory.length - 1].value;
          }
          
          // Fallback to manual measurements if no unified history
          if (allMeasurements.length > 1 && !baselineValue) {
            baselineValue = allMeasurements[allMeasurements.length - 1].value;
          }
        } else {
          // Final fallback: use manual measurements
          currentValue = allMeasurements[0]?.value || 0;
          source = (allMeasurements[0]?.source as ChallengeGoal['source']) || 'manual';
          
          // Use earliest measurement as baseline
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
            // Fallback when no baseline: assume started 50% worse than current
            // Example: fat 21.7%, target 11% → assume started at 32.55% (21.7 * 1.5)
            // Progress = (32.55 - 21.7) / (32.55 - 11) * 100 ≈ 50%
            const assumedStart = currentValue * 1.5;
            const totalRange = assumedStart - targetValue;
            const progressMade = assumedStart - currentValue;
            progress = Math.max(0, Math.min(100, (progressMade / totalRange) * 100));
          }
        } else {
          // Higher is better (duration, strength, reps) - allow >100% for overachievement
          if (baselineValue && baselineValue < targetValue && baselineValue !== currentValue) {
            const totalRange = targetValue - baselineValue;
            const progressMade = currentValue - baselineValue;
            progress = Math.max(0, (progressMade / totalRange) * 100);
          } else {
            // Fallback when no baseline: show simple ratio (70/50 = 140%)
            progress = Math.max(0, (currentValue / targetValue) * 100);
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
      } catch (error) {
        console.error('❌ Error fetching challenge goals:', error);
        toast.error('Ошибка загрузки целей');
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds for faster updates
  });
}
