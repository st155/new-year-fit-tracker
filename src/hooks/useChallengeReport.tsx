import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateBadges, MetricsBadge, PointsBreakdown } from "@/lib/challenge-scoring-v3";

export interface GoalReport {
  id: string;
  name: string;
  type: string;
  baseline: number | null;
  current: number | null;
  target: number | null;
  unit: string;
  progress: number;
  achieved: boolean;
  trend: 'improved' | 'declined' | 'stable';
  measurements: Array<{ date: string; value: number }>;
}

export interface ActivityReport {
  totalActiveDays: number;
  totalWorkouts: number;
  totalSteps: number;
  totalCalories: number;
  longestStreak: number;
  avgDailySteps: number;
}

export interface HealthReport {
  avgRecovery: number;
  avgSleep: number;
  avgHrv: number;
  avgRestingHr: number;
  avgStrain: number;
  avgSleepEfficiency: number;
}

export interface ChallengeReport {
  // Challenge info
  challengeId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  durationDays: number;
  
  // User results
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  finalRank: number;
  totalPoints: number;
  
  // Points breakdown
  performancePoints: number;
  recoveryPoints: number;
  synergyPoints: number;
  pointsBreakdown: PointsBreakdown | null;
  
  // Goals progress
  goals: GoalReport[];
  goalsAchieved: number;
  totalGoals: number;
  
  // Activity summary
  activity: ActivityReport;
  
  // Health averages
  health: HealthReport;
  
  // Achievements
  badges: MetricsBadge[];
  streakDays: number;
  
  // Joined date
  joinedAt: string;
}

export interface ChallengeReportOptions {
  preview?: boolean;
}

export function useChallengeReport(
  challengeId: string | undefined, 
  userId: string | undefined,
  options?: ChallengeReportOptions
) {
  const isPreview = options?.preview ?? false;

  return useQuery({
    queryKey: ["challenge-report", challengeId, userId, isPreview],
    queryFn: async (): Promise<ChallengeReport | null> => {
      if (!challengeId || !userId) return null;

      // Fetch challenge info
      const { data: challenge, error: challengeError } = await supabase
        .from("challenges")
        .select(`
          id,
          title,
          description,
          start_date,
          end_date,
          challenge_participants (
            user_id,
            joined_at,
            baseline_weight,
            baseline_body_fat,
            baseline_muscle_mass
          )
        `)
        .eq("id", challengeId)
        .single();

      if (challengeError || !challenge) {
        console.error("Failed to fetch challenge:", challengeError);
        return null;
      }

      const startDate = new Date(challenge.start_date);
      // In preview mode, use today's date as the effective end date
      const effectiveEndDate = isPreview 
        ? new Date().toISOString().split('T')[0]
        : challenge.end_date;
      const endDate = new Date(effectiveEndDate);
      const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalParticipants = challenge.challenge_participants?.length || 0;

      // Find user's participation
      const userParticipation = challenge.challenge_participants?.find(
        p => p.user_id === userId
      );

      if (!userParticipation) {
        console.error("User is not a participant");
        return null;
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("user_id", userId)
        .single();

      // Fetch user's points
      const { data: points } = await supabase
        .from("challenge_points")
        .select("*")
        .eq("challenge_id", challengeId)
        .eq("user_id", userId)
        .single();

      // Calculate rank
      const { data: allPoints } = await supabase
        .from("challenge_points")
        .select("user_id, points")
        .eq("challenge_id", challengeId)
        .order("points", { ascending: false });

      const rank = (allPoints?.findIndex(p => p.user_id === userId) ?? -1) + 1;

      // Fetch goals for THIS USER only
      const { data: goals } = await supabase
        .from("goals")
        .select(`
          id,
          goal_name,
          goal_type,
          target_value,
          target_unit
        `)
        .eq("challenge_id", challengeId)
        .eq("user_id", userId);

      // Fetch baselines for goals
      const { data: baselines } = await supabase
        .from("goal_baselines")
        .select("goal_id, baseline_value")
        .eq("user_id", userId);

      // Fetch measurements for goals
      const { data: measurements } = await supabase
        .from("measurements")
        .select("goal_id, value, measurement_date")
        .eq("user_id", userId)
        .gte("measurement_date", challenge.start_date)
        .lte("measurement_date", effectiveEndDate)
        .order("measurement_date", { ascending: true });

      // Process goals
      const processedGoals: GoalReport[] = (goals || []).map(goal => {
        const goalMeasurements = measurements?.filter(m => m.goal_id === goal.id) || [];
        const baseline = baselines?.find(b => b.goal_id === goal.id);
        const baselineValue = baseline?.baseline_value ?? null;
        const currentValue = goalMeasurements.length > 0 
          ? goalMeasurements[goalMeasurements.length - 1].value 
          : baselineValue;
        const targetValue = goal.target_value;

        // Determine if goal is "lower is better" type
        const isLowerBetter = ['body_fat', 'weight', 'resting_hr'].some(
          t => goal.goal_type.toLowerCase().includes(t) || goal.goal_name.toLowerCase().includes(t)
        );

        // Calculate progress
        let progress = 0;
        let achieved = false;
        let trend: 'improved' | 'declined' | 'stable' = 'stable';

        if (baselineValue !== null && currentValue !== null && targetValue !== null) {
          const totalChange = targetValue - baselineValue;
          const actualChange = currentValue - baselineValue;
          
          if (totalChange !== 0) {
            progress = Math.min(100, Math.max(0, (actualChange / totalChange) * 100));
          }

          if (isLowerBetter) {
            achieved = currentValue <= targetValue;
            trend = currentValue < baselineValue ? 'improved' : currentValue > baselineValue ? 'declined' : 'stable';
          } else {
            achieved = currentValue >= targetValue;
            trend = currentValue > baselineValue ? 'improved' : currentValue < baselineValue ? 'declined' : 'stable';
          }
        }

        return {
          id: goal.id,
          name: goal.goal_name,
          type: goal.goal_type,
          baseline: baselineValue,
          current: currentValue,
          target: targetValue,
          unit: goal.target_unit || '',
          progress,
          achieved,
          trend,
          measurements: goalMeasurements.map(m => ({
            date: m.measurement_date,
            value: m.value
          }))
        };
      });

      const goalsAchieved = processedGoals.filter(g => g.achieved).length;

      // Fetch activity metrics during challenge period
      const { data: activityMetrics } = await supabase
        .from("unified_metrics")
        .select("metric_name, value, measurement_date")
        .eq("user_id", userId)
        .gte("measurement_date", challenge.start_date)
        .lte("measurement_date", effectiveEndDate)
        .in("metric_name", ["steps", "active_calories", "workouts"]);

      // Calculate activity stats
      const stepsData = activityMetrics?.filter(m => m.metric_name === "steps") || [];
      const caloriesData = activityMetrics?.filter(m => m.metric_name === "active_calories") || [];
      const workoutsData = activityMetrics?.filter(m => m.metric_name === "workouts") || [];

      const totalSteps = stepsData.reduce((sum, m) => sum + (m.value || 0), 0);
      const totalCalories = caloriesData.reduce((sum, m) => sum + (m.value || 0), 0);
      const totalWorkouts = workoutsData.reduce((sum, m) => sum + (m.value || 0), 0);
      const activeDays = new Set([
        ...stepsData.filter(m => m.value > 0).map(m => m.measurement_date),
        ...workoutsData.filter(m => m.value > 0).map(m => m.measurement_date)
      ]).size;

      // Fetch health metrics
      const { data: healthMetrics } = await supabase
        .from("unified_metrics")
        .select("metric_name, value, measurement_date")
        .eq("user_id", userId)
        .gte("measurement_date", challenge.start_date)
        .lte("measurement_date", effectiveEndDate)
        .in("metric_name", ["recovery_score", "sleep_hours", "hrv", "resting_hr", "strain", "sleep_efficiency"]);

      // Calculate health averages
      const calcAvg = (name: string) => {
        const values = healthMetrics?.filter(m => m.metric_name === name && m.value != null).map(m => m.value!) || [];
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      };

      const health: HealthReport = {
        avgRecovery: Math.round(calcAvg("recovery_score")),
        avgSleep: Number(calcAvg("sleep_hours").toFixed(1)),
        avgHrv: Math.round(calcAvg("hrv")),
        avgRestingHr: Math.round(calcAvg("resting_hr")),
        avgStrain: Number(calcAvg("strain").toFixed(1)),
        avgSleepEfficiency: Math.round(calcAvg("sleep_efficiency"))
      };

      // Calculate streak
      const streakDays = points?.streak_days || 0;

      // Calculate badges
      const badgeEntry = {
        userId,
        username: profile?.username || '',
        activeDays,
        lastActivityDate: endDate.toISOString(),
        streakDays,
        avgRecovery: health.avgRecovery,
        avgStrain: health.avgStrain,
        avgSleep: health.avgSleep,
        avgSleepEfficiency: health.avgSleepEfficiency,
        avgRestingHr: health.avgRestingHr,
        avgHrv: health.avgHrv,
        totalSteps,
        totalActiveCalories: totalCalories,
        totalGoals: processedGoals.length,
        goalsWithBaseline: processedGoals.filter(g => g.baseline !== null).length,
        trackableGoals: processedGoals.filter(g => g.measurements.length > 0).length,
        totalPoints: points?.points || 0
      };

      const badges = calculateBadges(badgeEntry);

      // Parse points breakdown
      let pointsBreakdown: PointsBreakdown | null = null;
      if (points?.points_breakdown) {
        try {
          pointsBreakdown = points.points_breakdown as unknown as PointsBreakdown;
        } catch {
          pointsBreakdown = null;
        }
      }

      return {
        challengeId: challenge.id,
        title: challenge.title,
        description: challenge.description,
        startDate: challenge.start_date,
        endDate: effectiveEndDate,
        totalParticipants,
        durationDays,

        userId,
        username: profile?.username || '',
        fullName: profile?.full_name || profile?.username || '',
        avatarUrl: profile?.avatar_url || null,
        finalRank: rank || totalParticipants,
        totalPoints: points?.points || 0,

        performancePoints: points?.performance_points || 0,
        recoveryPoints: points?.recovery_points || 0,
        synergyPoints: points?.synergy_points || 0,
        pointsBreakdown,

        goals: processedGoals,
        goalsAchieved,
        totalGoals: processedGoals.length,

        activity: {
          totalActiveDays: activeDays,
          totalWorkouts,
          totalSteps,
          totalCalories,
          longestStreak: streakDays,
          avgDailySteps: activeDays > 0 ? Math.round(totalSteps / activeDays) : 0
        },

        health,
        badges,
        streakDays,
        joinedAt: userParticipation.joined_at
      };
    },
    enabled: !!challengeId && !!userId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}
