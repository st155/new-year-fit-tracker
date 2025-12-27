import { withHandler, jsonResponse, parseBody } from '../_shared/handler.ts';

interface ScoreBreakdown {
  activity: {
    steps: number;
    workouts: number;
    strain: number;
    calories: number;
    total: number;
  };
  recovery: {
    recovery_quality: number;
    sleep_duration: number;
    sleep_efficiency: number;
    hrv: number;
    resting_hr: number;
    total: number;
  };
  progress: {
    streak: number;
    consistency: number;
    active_days: number;
    goals: number;
    total: number;
  };
  balance: {
    performance: number;
    recovery: number;
    synergy: number;
    harmony: number;
    total: number;
  };
}

interface CalculationResult {
  total_points: number;
  activity_score: number;
  recovery_score: number;
  progress_score: number;
  balance_score: number;
  breakdown: ScoreBreakdown;
}

function calculateAllScores(userData: any): CalculationResult {
  console.log('[Points Calculator] Processing user:', userData.user_id);

  // Extract metrics with defaults
  const stepsLast7d = userData.steps_last_7d || 0;
  const workoutsLast7d = userData.workouts_last_7d || 0;
  const avgStrainLast7d = userData.avg_strain_last_7d || 0;
  const totalCalories = userData.total_calories || 0;
  const avgRecoveryLast7d = userData.avg_recovery_last_7d || 0;
  const avgSleepLast7d = userData.avg_sleep_last_7d || 0;
  const avgSleepEfficiency = userData.avg_sleep_efficiency || 0;
  const avgHrv = userData.avg_hrv || 0;
  const avgRestingHr = userData.avg_resting_hr || 0;
  const streakDays = userData.streak_days || 0;
  const weeklyConsistency = userData.weekly_consistency || 0;
  const daysWithData = userData.days_with_data || userData.active_days || 0;

  // ============ 🏃 ACTIVITY SCORE (500 max) ============
  // Steps: 70k/week = max (150 pts)
  const stepsScore = Math.min((stepsLast7d / 70000) * 150, 150);
  // Workouts: 7/week = max (100 pts)
  const workoutsScore = Math.min(workoutsLast7d * 14.3, 100);
  // Strain: 21 avg = max (150 pts)
  const strainScore = Math.min((avgStrainLast7d / 21) * 150, 150);
  // Calories: 20k/week = max (100 pts)
  const caloriesScore = Math.min((totalCalories / 20000) * 100, 100);

  const activityScore = Math.round(stepsScore + workoutsScore + strainScore + caloriesScore);

  // ============ 💤 RECOVERY SCORE (500 max) ============
  // Recovery quality: 100% = max (200 pts)
  const recoveryQualityScore = (avgRecoveryLast7d / 100) * 200;
  // Sleep duration: 8h = max (150 pts)
  const sleepDurationScore = Math.min((avgSleepLast7d / 8) * 150, 150);
  // Sleep efficiency: 100% = max (80 pts)
  const sleepEfficiencyScore = (avgSleepEfficiency / 100) * 80;
  // HRV: 100ms = max (50 pts)
  const hrvScore = Math.min((avgHrv / 100) * 50, 50);
  // Resting HR: 50bpm = max 20pts, 70bpm = 0pts
  const restingHrScore = avgRestingHr > 0 ? Math.max(0, Math.min(20, (70 - avgRestingHr))) : 0;

  const recoveryScore = Math.round(recoveryQualityScore + sleepDurationScore + sleepEfficiencyScore + hrvScore + restingHrScore);

  // ============ 📈 PROGRESS SCORE (500 max) ============
  // Streak: 50 days = max (150 pts)
  const streakScore = Math.min(streakDays * 3, 150);
  // Consistency: 100% = max (150 pts)
  const consistencyScore = (weeklyConsistency / 100) * 150;
  // Active days: 7 = max (100 pts)
  const activeDaysScore = Math.min(daysWithData * 14.3, 100);
  // Goals bonus (placeholder - would need goals data)
  const goalsScore = 0;

  const progressScore = Math.round(streakScore + consistencyScore + activeDaysScore + goalsScore);

  // ============ ⚖️ BALANCE SCORE (500 max) ============
  // This rewards users who balance activity AND recovery well
  
  // Normalized metrics (0-1 scale)
  const normalizedActivity = Math.min(activityScore / 500, 1);
  const normalizedRecovery = Math.min(recoveryScore / 500, 1);
  
  // Performance component (150 pts based on activity)
  const balancePerformance = normalizedActivity * 150;
  // Recovery component (150 pts based on recovery)
  const balanceRecovery = normalizedRecovery * 150;
  // Synergy: streak + consistency bonus (100 pts)
  const balanceSynergy = Math.min((streakDays * 2) + (weeklyConsistency * 0.5), 100);
  // Harmony: reward balance between strain and recovery (100 pts)
  // Perfect harmony = strain normalized equals recovery normalized
  const strainNorm = avgStrainLast7d / 21;
  const recoveryNorm = avgRecoveryLast7d / 100;
  const harmonyScore = Math.max(0, 100 - Math.abs(strainNorm - recoveryNorm) * 100);

  const balanceScore = Math.round(balancePerformance + balanceRecovery + balanceSynergy + harmonyScore);

  // ============ TOTAL POINTS ============
  // Overall score = weighted average of all 4 categories
  const totalPoints = Math.round((activityScore + recoveryScore + progressScore + balanceScore) / 4);

  console.log('[Points Calculator] Results:', {
    user_id: userData.user_id,
    total: totalPoints,
    activity: activityScore,
    recovery: recoveryScore,
    progress: progressScore,
    balance: balanceScore
  });

  return {
    total_points: totalPoints,
    activity_score: activityScore,
    recovery_score: recoveryScore,
    progress_score: progressScore,
    balance_score: balanceScore,
    breakdown: {
      activity: {
        steps: Math.round(stepsScore),
        workouts: Math.round(workoutsScore),
        strain: Math.round(strainScore),
        calories: Math.round(caloriesScore),
        total: activityScore
      },
      recovery: {
        recovery_quality: Math.round(recoveryQualityScore),
        sleep_duration: Math.round(sleepDurationScore),
        sleep_efficiency: Math.round(sleepEfficiencyScore),
        hrv: Math.round(hrvScore),
        resting_hr: Math.round(restingHrScore),
        total: recoveryScore
      },
      progress: {
        streak: Math.round(streakScore),
        consistency: Math.round(consistencyScore),
        active_days: Math.round(activeDaysScore),
        goals: Math.round(goalsScore),
        total: progressScore
      },
      balance: {
        performance: Math.round(balancePerformance),
        recovery: Math.round(balanceRecovery),
        synergy: Math.round(balanceSynergy),
        harmony: Math.round(harmonyScore),
        total: balanceScore
      }
    }
  };
}

interface RequestBody {
  user_id?: string;
  challenge_id?: string;
  recalculate_all?: boolean;
}

Deno.serve(withHandler(async ({ req, supabase }) => {
  const { user_id, challenge_id, recalculate_all } = await parseBody<RequestBody>(req);

  console.log('[Calculate Health Points] Request:', { user_id, challenge_id, recalculate_all });

  if (recalculate_all) {
    // Recalculate for all users in all active challenges
    const { data: challenges, error: challengesError } = await supabase
      .from('challenges')
      .select('id')
      .eq('is_active', true);

    if (challengesError) throw challengesError;

    let totalUpdated = 0;

    for (const challenge of challenges || []) {
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('challenge_leaderboard_v2')
        .select('*')
        .eq('challenge_id', challenge.id);

      if (leaderboardError) {
        console.error('[Calculate Health Points] Error fetching leaderboard:', leaderboardError);
        continue;
      }

      console.log(`[Calculate Health Points] Processing ${leaderboardData?.length || 0} users for challenge ${challenge.id}`);

      for (const userData of leaderboardData || []) {
        const result = calculateAllScores(userData);

        const { error: updateError } = await supabase
          .from('challenge_points')
          .upsert({
            user_id: userData.user_id,
            challenge_id: challenge.id,
            points: result.total_points,
            performance_points: result.breakdown.activity.total,
            recovery_points: result.breakdown.recovery.total,
            synergy_points: result.breakdown.balance.synergy,
            activity_score: result.activity_score,
            recovery_score: result.recovery_score,
            progress_score: result.progress_score,
            balance_score: result.balance_score,
            points_breakdown: result.breakdown,
            streak_days: userData.streak_days || 0,
            last_activity_date: userData.last_activity_date,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,challenge_id'
          });

        if (updateError) {
          console.error('[Calculate Health Points] Error updating points:', updateError);
        } else {
          totalUpdated++;
        }
      }
    }

    return jsonResponse({ success: true, updated: totalUpdated });
  }

  // Single user calculation
  if (!user_id || !challenge_id) {
    throw new Error('user_id and challenge_id are required');
  }

  const { data: userData, error: dataError } = await supabase
    .from('challenge_leaderboard_v2')
    .select('*')
    .eq('user_id', user_id)
    .eq('challenge_id', challenge_id)
    .single();

  if (dataError) throw dataError;
  if (!userData) throw new Error('User not found in leaderboard');

  const result = calculateAllScores(userData);

  const { error: updateError } = await supabase
    .from('challenge_points')
    .upsert({
      user_id,
      challenge_id,
      points: result.total_points,
      performance_points: result.breakdown.activity.total,
      recovery_points: result.breakdown.recovery.total,
      synergy_points: result.breakdown.balance.synergy,
      activity_score: result.activity_score,
      recovery_score: result.recovery_score,
      progress_score: result.progress_score,
      balance_score: result.balance_score,
      points_breakdown: result.breakdown,
      streak_days: userData.streak_days || 0,
      last_activity_date: userData.last_activity_date,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,challenge_id'
    });

  if (updateError) throw updateError;

  return jsonResponse({ success: true, ...result });
}));
