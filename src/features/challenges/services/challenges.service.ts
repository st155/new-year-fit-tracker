/**
 * Challenges Service
 * Supabase operations for challenges module
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  Challenge, 
  ChallengeWithDetails, 
  ChallengeCreateInput, 
  ChallengeUpdateInput,
  ChallengeReport,
  GoalReport,
  HealthReport,
  PointsBreakdown
} from '../types';
import { calculateBadges } from '../utils/scoring';

// ============ Query Functions ============

/**
 * Get all active challenges for a user with participation status
 */
export async function getChallenges(userId: string): Promise<Challenge[]> {
  const { data: challenges, error } = await supabase
    .from('challenges')
    .select(`
      *,
      challenge_participants (
        user_id
      )
    `)
    .eq('is_active', true)
    .order('start_date', { ascending: false });

  if (error) throw error;
  if (!challenges) return [];

  return challenges.map(challenge => ({
    ...challenge,
    isParticipant: challenge.challenge_participants?.some(
      p => p.user_id === userId
    ) || false
  }));
}

/**
 * Get a single challenge by ID
 */
export async function getChallengeById(challengeId: string): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get challenges for a trainer (created by or assigned to)
 */
export async function getTrainerChallenges(trainerId: string): Promise<ChallengeWithDetails[]> {
  // Get challenge IDs where user is assigned as trainer
  const { data: trainerChallenges } = await supabase
    .from('challenge_trainers')
    .select('challenge_id')
    .eq('trainer_id', trainerId);

  const trainerChallengeIds = trainerChallenges?.map(ct => ct.challenge_id) || [];

  // Build query for challenges where user is creator OR assigned trainer
  let query = supabase.from('challenges').select('*');
  
  if (trainerChallengeIds.length > 0) {
    query = query.or(`created_by.eq.${trainerId},id.in.(${trainerChallengeIds.join(',')})`);
  } else {
    query = query.eq('created_by', trainerId);
  }

  const { data: allChallenges, error } = await query;
  if (error) throw error;
  if (!allChallenges) return [];

  // Fetch participants, goals, and disciplines for each challenge
  const challengesWithDetails = await Promise.all(
    allChallenges.map(async (challenge) => {
      const [participantsResult, goalsResult, disciplinesResult] = await Promise.all([
        supabase
          .from('challenge_participants')
          .select(`
            user_id,
            joined_at,
            profiles (
              username,
              full_name,
              avatar_url
            )
          `)
          .eq('challenge_id', challenge.id),
        supabase
          .from('goals')
          .select('*')
          .eq('challenge_id', challenge.id)
          .eq('is_personal', false),
        supabase
          .from('challenge_disciplines')
          .select('*')
          .eq('challenge_id', challenge.id)
      ]);

      return {
        ...challenge,
        participants: participantsResult.data || [],
        totalGoals: goalsResult.data?.length || 0,
        totalDisciplines: disciplinesResult.data?.length || 0
      } as ChallengeWithDetails;
    })
  );

  return challengesWithDetails;
}

/**
 * Check if user is a participant in a challenge
 */
export async function isParticipant(challengeId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('challenge_participants')
    .select('user_id')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error checking participation:', error);
    return false;
  }

  return !!data;
}

/**
 * Get user's challenge progress
 */
export async function getChallengeProgress(userId: string): Promise<unknown[]> {
  // Placeholder - implement when schema is finalized
  return [];
}

/**
 * Get full challenge report for a user
 */
export async function getChallengeReport(
  challengeId: string, 
  userId: string, 
  isPreview: boolean = false
): Promise<ChallengeReport | null> {
  // Fetch challenge info
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
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
    .eq('id', challengeId)
    .single();

  if (challengeError || !challenge) return null;

  const startDate = new Date(challenge.start_date);
  const effectiveEndDate = isPreview 
    ? new Date().toISOString().split('T')[0]
    : challenge.end_date;
  const endDate = new Date(effectiveEndDate);
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalParticipants = challenge.challenge_participants?.length || 0;

  const userParticipation = challenge.challenge_participants?.find(p => p.user_id === userId);
  if (!userParticipation) return null;

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, avatar_url')
    .eq('user_id', userId)
    .single();

  // Fetch user's points
  const { data: points } = await supabase
    .from('challenge_points')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .single();

  // Calculate rank
  const { data: allPoints } = await supabase
    .from('challenge_points')
    .select('user_id, points')
    .eq('challenge_id', challengeId)
    .order('points', { ascending: false });

  const rank = (allPoints?.findIndex(p => p.user_id === userId) ?? -1) + 1;

  // Fetch goals for this user
  const { data: goals } = await supabase
    .from('goals')
    .select('id, goal_name, goal_type, target_value, target_unit')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId);

  // Fetch baselines and measurements
  const { data: baselines } = await supabase
    .from('goal_baselines')
    .select('goal_id, baseline_value')
    .eq('user_id', userId);

  const { data: measurements } = await supabase
    .from('measurements')
    .select('goal_id, value, measurement_date')
    .eq('user_id', userId)
    .order('measurement_date', { ascending: true });

  // Process goals
  const processedGoals: GoalReport[] = (goals || []).map(goal => {
    const allGoalMeasurements = measurements?.filter(m => m.goal_id === goal.id) || [];
    const challengeMeasurements = allGoalMeasurements.filter(
      m => m.measurement_date >= challenge.start_date && m.measurement_date <= effectiveEndDate
    );
    
    const baseline = baselines?.find(b => b.goal_id === goal.id);
    const baselineValue = baseline?.baseline_value 
      ?? (allGoalMeasurements.length > 0 ? allGoalMeasurements[0].value : null);
    
    const currentValue = challengeMeasurements.length > 0 
      ? challengeMeasurements[challengeMeasurements.length - 1].value 
      : baselineValue;
    const targetValue = goal.target_value;

    const lowerName = goal.goal_name.toLowerCase();
    const lowerType = goal.goal_type.toLowerCase();
    const isLowerBetter = 
      lowerName.includes('бег') || 
      lowerName.includes('жир') || 
      lowerName.includes('вес') ||
      lowerName.includes('run') ||
      ['body_fat', 'weight', 'resting_hr', 'run', 'time'].some(
        t => lowerType.includes(t) || lowerName.includes(t)
      );

    let progress = 0;
    let achieved = false;
    let trend: 'improved' | 'declined' | 'stable' = 'stable';

    if (baselineValue !== null && currentValue !== null && targetValue !== null) {
      if (isLowerBetter) {
        const totalChange = baselineValue - targetValue;
        const actualChange = baselineValue - currentValue;
        if (totalChange !== 0) {
          progress = Math.max(0, (actualChange / totalChange) * 100);
        }
        achieved = currentValue <= targetValue;
        trend = currentValue < baselineValue ? 'improved' : currentValue > baselineValue ? 'declined' : 'stable';
      } else {
        const totalChange = targetValue - baselineValue;
        const actualChange = currentValue - baselineValue;
        if (totalChange !== 0) {
          progress = Math.max(0, (actualChange / totalChange) * 100);
        }
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
      measurements: challengeMeasurements.map(m => ({
        date: m.measurement_date,
        value: m.value
      }))
    };
  });

  const goalsAchieved = processedGoals.filter(g => g.achieved).length;

  // Fetch activity metrics
  const { data: activityMetrics } = await supabase
    .from('unified_metrics')
    .select('metric_name, value, measurement_date')
    .eq('user_id', userId)
    .gte('measurement_date', challenge.start_date)
    .lte('measurement_date', effectiveEndDate)
    .in('metric_name', ['steps', 'active_calories', 'workouts']);

  const stepsData = activityMetrics?.filter(m => m.metric_name === 'steps') || [];
  const caloriesData = activityMetrics?.filter(m => m.metric_name === 'active_calories') || [];
  const workoutsData = activityMetrics?.filter(m => m.metric_name === 'workouts') || [];

  const totalSteps = stepsData.reduce((sum, m) => sum + (m.value || 0), 0);
  const totalCalories = caloriesData.reduce((sum, m) => sum + (m.value || 0), 0);
  const totalWorkouts = workoutsData.reduce((sum, m) => sum + (m.value || 0), 0);
  const activeDays = new Set([
    ...stepsData.filter(m => m.value > 0).map(m => m.measurement_date),
    ...workoutsData.filter(m => m.value > 0).map(m => m.measurement_date)
  ]).size;

  // Fetch health metrics
  const { data: healthMetrics } = await supabase
    .from('unified_metrics')
    .select('metric_name, value, measurement_date')
    .eq('user_id', userId)
    .gte('measurement_date', challenge.start_date)
    .lte('measurement_date', effectiveEndDate)
    .in('metric_name', ['recovery_score', 'sleep_hours', 'hrv', 'resting_hr', 'strain', 'sleep_efficiency']);

  const calcAvg = (name: string) => {
    const values = healthMetrics?.filter(m => m.metric_name === name && m.value != null).map(m => m.value!) || [];
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  const health: HealthReport = {
    avgRecovery: Math.round(calcAvg('recovery_score')),
    avgSleep: Number(calcAvg('sleep_hours').toFixed(1)),
    avgHrv: Math.round(calcAvg('hrv')),
    avgRestingHr: Math.round(calcAvg('resting_hr')),
    avgStrain: Number(calcAvg('strain').toFixed(1)),
    avgSleepEfficiency: Math.round(calcAvg('sleep_efficiency'))
  };

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
}

// ============ Mutation Functions ============

/**
 * Join a challenge
 */
export async function joinChallenge(
  challengeId: string, 
  userId: string, 
  difficultyLevel: number = 2
): Promise<void> {
  const { error } = await supabase
    .from('challenge_participants')
    .insert({
      challenge_id: challengeId,
      user_id: userId,
      difficulty_level: difficultyLevel
    });

  if (error) throw error;
}

/**
 * Leave a challenge
 */
export async function leaveChallenge(challengeId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('challenge_participants')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Create a new challenge
 */
export async function createChallenge(data: ChallengeCreateInput): Promise<Challenge> {
  const { data: challenge, error } = await supabase
    .from('challenges')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return challenge;
}

/**
 * Update a challenge
 */
export async function updateChallenge(id: string, data: ChallengeUpdateInput): Promise<Challenge> {
  const { data: challenge, error } = await supabase
    .from('challenges')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return challenge;
}

/**
 * Delete a challenge
 */
export async function deleteChallenge(id: string): Promise<void> {
  const { error } = await supabase
    .from('challenges')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
