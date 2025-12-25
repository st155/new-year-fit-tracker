import { withHandler, jsonResponse, parseBody } from '../_shared/handler.ts';

interface PointsBreakdown {
  performance: {
    strain_score: number;
    activity_volume: number;
    consistency: number;
    total: number;
  };
  recovery: {
    recovery_quality: number;
    sleep_quality: number;
    heart_health: number;
    total: number;
  };
  synergy: {
    balance_bonus: number;
    streak_bonus: number;
    badge_bonus: number;
    total: number;
  };
}

interface CalculationResult {
  total_points: number;
  breakdown: PointsBreakdown;
}

function calculateHealthPoints(userData: any): CalculationResult {
  console.log('[Points Calculator] Processing user:', userData.user_id);

  // 1. PERFORMANCE SCORE (400 points max)
  
  // 1.1 Strain Score (200 points)
  const avgStrain = userData.avg_strain_last_7d || 0;
  let strainScore = Math.min((avgStrain / 21) * 200, 200);
  
  // Consistency bonus: +20 if 5+ workouts
  const workoutsLast7d = userData.workouts_last_7d || 0;
  if (workoutsLast7d >= 5) {
    strainScore = Math.min(strainScore + 20, 220);
  }
  
  // 1.2 Activity Volume (150 points)
  const stepsLast7d = userData.steps_last_7d || 0;
  const stepsScore = Math.min((stepsLast7d / 70000) * 100, 100);
  const workoutsScore = Math.min(workoutsLast7d * 10, 50);
  const activityVolume = stepsScore + workoutsScore;
  
  // 1.3 Consistency Bonus (50 points)
  const weeklyConsistency = userData.weekly_consistency || 0;
  const consistencyBonus = (weeklyConsistency / 100) * 50;
  
  const performanceTotal = Math.round(strainScore + activityVolume + consistencyBonus);
  
  // 2. RECOVERY SCORE (400 points max)
  
  // 2.1 Recovery Quality (200 points)
  const avgRecovery = userData.avg_recovery_last_7d || 0;
  const recoveryQuality = (avgRecovery / 100) * 200;
  
  // 2.2 Sleep Quality (150 points)
  const avgSleep = userData.avg_sleep_last_7d || 0;
  const sleepDuration = Math.min((avgSleep / 8) * 100, 120);
  
  const avgSleepEfficiency = userData.avg_sleep_efficiency || 0;
  const sleepEfficiency = (avgSleepEfficiency / 100) * 50;
  const sleepQuality = sleepDuration + sleepEfficiency;
  
  // 2.3 Heart Health (50 points)
  const avgRestingHr = userData.avg_resting_hr || 0;
  let heartHealth = 0;
  if (avgRestingHr > 0) {
    heartHealth = Math.max(0, 50 - (avgRestingHr - 50));
  }
  
  const recoveryTotal = Math.round(recoveryQuality + sleepQuality + heartHealth);
  
  // 3. SYNERGY BONUS (200 points max)
  
  // 3.1 Strain-Recovery Balance (100 points)
  const normalizedStrain = avgStrain / 21;
  const normalizedRecovery = avgRecovery / 100;
  const balanceBonus = Math.max(0, 100 - Math.abs(normalizedStrain - normalizedRecovery) * 100);
  
  // 3.2 Streak Bonus (50 points)
  const streakDays = userData.streak_days || 0;
  const streakBonus = Math.min(streakDays * 2, 50);
  
  // 3.3 Badge Bonus (50 points)
  const badgeBonus = 0;
  
  const synergyTotal = Math.round(balanceBonus + streakBonus + badgeBonus);
  
  // TOTAL
  const totalPoints = performanceTotal + recoveryTotal + synergyTotal;
  
  console.log('[Points Calculator] Results:', {
    user_id: userData.user_id,
    total: totalPoints,
    performance: performanceTotal,
    recovery: recoveryTotal,
    synergy: synergyTotal
  });
  
  return {
    total_points: totalPoints,
    breakdown: {
      performance: {
        strain_score: Math.round(strainScore),
        activity_volume: Math.round(activityVolume),
        consistency: Math.round(consistencyBonus),
        total: performanceTotal
      },
      recovery: {
        recovery_quality: Math.round(recoveryQuality),
        sleep_quality: Math.round(sleepQuality),
        heart_health: Math.round(heartHealth),
        total: recoveryTotal
      },
      synergy: {
        balance_bonus: Math.round(balanceBonus),
        streak_bonus: Math.round(streakBonus),
        badge_bonus: Math.round(badgeBonus),
        total: synergyTotal
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

      for (const userData of leaderboardData || []) {
        const result = calculateHealthPoints(userData);

        const { error: updateError } = await supabase
          .from('challenge_points')
          .upsert({
            user_id: userData.user_id,
            challenge_id: challenge.id,
            points: result.total_points,
            performance_points: result.breakdown.performance.total,
            recovery_points: result.breakdown.recovery.total,
            synergy_points: result.breakdown.synergy.total,
            points_breakdown: result.breakdown,
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

  const result = calculateHealthPoints(userData);

  const { error: updateError } = await supabase
    .from('challenge_points')
    .upsert({
      user_id,
      challenge_id,
      points: result.total_points,
      performance_points: result.breakdown.performance.total,
      recovery_points: result.breakdown.recovery.total,
      synergy_points: result.breakdown.synergy.total,
      points_breakdown: result.breakdown,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,challenge_id'
    });

  if (updateError) throw updateError;

  return jsonResponse({ success: true, ...result });
}));
