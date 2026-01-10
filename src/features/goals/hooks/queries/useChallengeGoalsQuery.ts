import { useQuery } from "@tanstack/react-query";
import { useAggregatedBodyMetrics } from "@/hooks/useAggregatedBodyMetrics";
import { GoalsService } from "../../services/goals.service";
import type { ChallengeGoal, GoalSource } from "../../types";
import {
  isRecentDate,
  isLowerBetterGoal,
  calculateProgress,
  calculateTrend,
  getMetricNameVariants,
} from "../../utils/goalCalculations";
import { toast } from "sonner";
import i18n from "@/i18n";

/**
 * Query hook for fetching challenge goals with body metrics integration
 * Replaces the old useChallengeGoals hook
 */
export function useChallengeGoalsQuery(userId?: string) {
  const bodyMetrics = useAggregatedBodyMetrics(userId);

  // Build cache key that includes body metrics state
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
    queryFn: async (): Promise<ChallengeGoal[]> => {
      if (!userId) return [];

      try {
        // Fetch participations, goals, and unified history
        const [participations, personalGoals, unifiedHistory] = await Promise.all([
          GoalsService.fetchChallengeParticipations(userId),
          GoalsService.fetchPersonalGoals(userId),
          GoalsService.fetchUnifiedMetricsHistory(userId),
        ]);

        const challengeIds = participations.map(p => p.challenge_id);

        // Fetch challenge goals if user has participations
        let challengeGoalsData: any[] = [];
        if (challengeIds.length > 0) {
          challengeGoalsData = await GoalsService.fetchChallengeGoalsByIds(userId, challengeIds);
        }

        // Combine all goals
        const allGoals = [...personalGoals, ...challengeGoalsData];
        if (!allGoals.length) return [];

        const goalIds = allGoals.map(g => g.id);

        // Fetch measurements and current values
        const [measurements, currentValues] = await Promise.all([
          GoalsService.fetchMeasurements(userId, goalIds),
          GoalsService.fetchGoalCurrentValues(goalIds),
        ]);

        // Map goals with all data
        const challengeGoals: ChallengeGoal[] = allGoals.map(goal => {
          const allMeasurements = measurements.filter(m => m.goal_id === goal.id);
          const goalNameLower = goal.goal_name.toLowerCase();
          const participation = participations.find(p => p.challenge_id === goal.challenge_id);
          const challengeStartDate = participation?.challenges?.start_date;
          const baselineDate = participation?.baseline_recorded_at || challengeStartDate;

          let currentValue = 0;
          let source: GoalSource = 'manual';
          let sparklineData: ChallengeGoal['measurements'] = allMeasurements.slice(0, 14).map(m => ({
            goal_id: m.goal_id,
            value: m.value,
            measurement_date: m.measurement_date,
          }));
          let baselineValue: number | null = null;
          let subSources: ChallengeGoal['subSources'] = undefined;

          // Current value data from goal_current_values view
          const currentValueData = currentValues.find(cv => cv.goal_id === goal.id);

          // Handle special metric types (Recovery, HRV, Sleep, etc.)
          const metricVariants = getMetricNameVariants(goal.goal_name);
          const unifiedMetrics = unifiedHistory.filter(h => 
            metricVariants.some(v => h.metric_name === v)
          ).slice(0, 14);

          if (unifiedMetrics.length > 0 && 
              (goalNameLower === 'recovery score' || goalNameLower.includes('recovery') ||
               goalNameLower === 'hrv' || goalNameLower.includes('hrv') ||
               goalNameLower === 'resting heart rate' || goalNameLower.includes('resting heart rate') ||
               goalNameLower === 'sleep hours' || goalNameLower.includes('sleep'))) {
            currentValue = unifiedMetrics[0].value;
            source = 'whoop';
            sparklineData = unifiedMetrics.map(d => ({
              goal_id: goal.id,
              value: d.value,
              measurement_date: d.measurement_date,
            }));
            baselineValue = unifiedMetrics[unifiedMetrics.length - 1].value;
          }
          // Handle body composition goals using aggregated metrics
          else if (goalNameLower.includes('вес') || goalNameLower.includes('weight')) {
            currentValue = bodyMetrics.weight?.value || allMeasurements[0]?.value || 0;
            source = (bodyMetrics.weight?.source || 'manual') as GoalSource;
            if (bodyMetrics.weight?.sparklineData) {
              sparklineData = bodyMetrics.weight.sparklineData.slice(0, 14).map(d => ({
                goal_id: goal.id,
                value: d.value,
                measurement_date: d.date,
              }));
            }
            if (bodyMetrics.weight?.sparklineData?.length) {
              baselineValue = bodyMetrics.weight.sparklineData[0].value;
            }
            if (!baselineValue) {
              baselineValue = participation?.baseline_weight || allMeasurements[allMeasurements.length - 1]?.value || null;
            }
          }
          else if (goalNameLower.includes('жир') || goalNameLower.includes('fat')) {
            // Collect sub-sources for UI
            const sources = bodyMetrics.bodyFat?.sources;
            if (sources) {
              subSources = [];
          if (sources.inbody) subSources.push({ source: 'inbody' as const, value: sources.inbody.value, label: 'InBody' });
          if (sources.withings) subSources.push({ source: 'withings' as const, value: sources.withings.value, label: 'Withings' });
          if (sources.manual) subSources.push({ source: 'manual' as const, value: sources.manual.value, label: 'Калипер' });
            }

            if (bodyMetrics.bodyFat?.value !== undefined && bodyMetrics.bodyFat?.value !== null) {
              currentValue = bodyMetrics.bodyFat.value;
              source = bodyMetrics.bodyFat.source as GoalSource;
            } else if (allMeasurements[0]?.value && isRecentDate(allMeasurements[0]?.measurement_date, 30)) {
              currentValue = allMeasurements[0].value;
              source = 'manual';
            }

            if (bodyMetrics.bodyFat?.sparklineData) {
              let sparkline = bodyMetrics.bodyFat.sparklineData;
              if (baselineDate) {
                sparkline = sparkline.filter(d => new Date(d.date) >= new Date(baselineDate));
              }
              sparklineData = sparkline.slice(0, 14).map(d => ({
                goal_id: goal.id,
                value: d.value,
                measurement_date: d.date,
              }));
              if (sparkline.length > 0) {
                baselineValue = sparkline[0].value;
              }
            }
            if (!baselineValue) {
              baselineValue = participation?.baseline_body_fat || allMeasurements[allMeasurements.length - 1]?.value || null;
            }
          }
          else if (goalNameLower.includes('мышц') || goalNameLower.includes('muscle')) {
            currentValue = bodyMetrics.muscleMass?.value || allMeasurements[0]?.value || 0;
            source = (bodyMetrics.muscleMass?.source || 'manual') as GoalSource;
            if (bodyMetrics.muscleMass?.sparklineData) {
              sparklineData = bodyMetrics.muscleMass.sparklineData.slice(0, 14).map(d => ({
                goal_id: goal.id,
                value: d.value,
                measurement_date: d.date,
              }));
            }
            if (bodyMetrics.muscleMass?.sparklineData?.length) {
              baselineValue = bodyMetrics.muscleMass.sparklineData[0].value;
            }
            if (!baselineValue) {
              baselineValue = participation?.baseline_muscle_mass || allMeasurements[allMeasurements.length - 1]?.value || null;
            }
          }
          // Use unified metrics data from goal_current_values
          else if (currentValueData?.current_value) {
            currentValue = currentValueData.current_value;
            source = currentValueData.source as GoalSource || 'manual';

            const goalUnifiedHistory = unifiedHistory
              .filter(h => h.metric_name === goal.goal_name)
              .slice(0, 14);

            if (goalUnifiedHistory.length > 0) {
              sparklineData = goalUnifiedHistory.map(d => ({
                goal_id: goal.id,
                value: d.value,
                measurement_date: d.measurement_date,
              }));
              baselineValue = goalUnifiedHistory[goalUnifiedHistory.length - 1].value;
            }

            if (!baselineValue && allMeasurements.length > 1) {
              baselineValue = allMeasurements[allMeasurements.length - 1].value;
            }
          }
          // Fallback to manual measurements
          else {
            currentValue = allMeasurements[0]?.value || 0;
            source = (allMeasurements[0]?.source as GoalSource) || 'manual';
            if (allMeasurements.length > 1) {
              baselineValue = allMeasurements[allMeasurements.length - 1].value;
            }
          }

          // Calculate progress
          const isLowerBetter = isLowerBetterGoal(goal.goal_name);
          const progress = calculateProgress(currentValue, goal.target_value, baselineValue, isLowerBetter);

          // Calculate trend
          const { trend, trendPercentage } = calculateTrend(sparklineData);

          return {
            id: goal.id,
            goal_name: goal.goal_name,
            goal_type: goal.goal_type,
            target_value: goal.target_value,
            target_unit: goal.target_unit,
            target_reps: goal.target_reps || null,
            current_value: currentValue,
            progress_percentage: progress,
            trend,
            trend_percentage: trendPercentage,
            is_personal: goal.is_personal,
            challenge_id: goal.challenge_id,
            challenge_title: participation?.challenges?.title,
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
        toast.error(i18n.t('goals:errors.loadingGoals'));
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}
