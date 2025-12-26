import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// V2 API base URL
const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v2';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

// Direct Whoop integration is now available for all users with valid tokens

async function refreshTokenIfNeeded(serviceClient: any, tokenData: any): Promise<string | null> {
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return tokenData.access_token;
  }

  console.log(`🔄 [scheduled-sync] Refreshing token for user ${tokenData.user_id}`);

  const clientId = Deno.env.get('WHOOP_CLIENT_ID');
  const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET');

  try {
    const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
        client_id: clientId!,
        client_secret: clientSecret!,
      }),
    });

    if (!tokenResponse.ok) {
      console.error(`❌ Token refresh failed for user ${tokenData.user_id}`);
      await serviceClient
        .from('whoop_tokens')
        .update({ is_active: false })
        .eq('user_id', tokenData.user_id);
      return null;
    }

    const tokens = await tokenResponse.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await serviceClient
      .from('whoop_tokens')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || tokenData.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', tokenData.user_id);

    return tokens.access_token;
  } catch (error) {
    console.error(`❌ Token refresh error for user ${tokenData.user_id}:`, error);
    return null;
  }
}

async function fetchWhoopData(accessToken: string, endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${WHOOP_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  console.log(`🔗 [scheduled-sync] Requesting: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  const responseText = await response.text();
  console.log(`📊 [scheduled-sync] Response for ${endpoint}: ${response.status} - ${responseText.slice(0, 300)}`);

  if (!response.ok) {
    throw new Error(`Whoop API error: ${response.status} - ${responseText}`);
  }

  return JSON.parse(responseText);
}

// Fetch all pages with pagination
async function fetchAllWhoopData(accessToken: string, endpoint: string, params: Record<string, string>): Promise<any[]> {
  const allRecords: any[] = [];
  let nextToken: string | null = null;
  let pageCount = 0;
  const maxPages = 5; // Smaller limit for scheduled sync
  
  do {
    const queryParams = {
      ...params,
      limit: '25',
      ...(nextToken ? { nextToken } : {}),
    };
    
    const data = await fetchWhoopData(accessToken, endpoint, queryParams);
    const records = data.records || [];
    allRecords.push(...records);
    nextToken = data.next_token || null;
    pageCount++;
  } while (nextToken && pageCount < maxPages);
  
  console.log(`✅ [scheduled-sync] ${endpoint} total: ${allRecords.length} records`);
  return allRecords;
}

async function syncUserData(serviceClient: any, tokenData: any) {
  const userId = tokenData.user_id;
  const accessToken = await refreshTokenIfNeeded(serviceClient, tokenData);
  
  if (!accessToken) {
    return { success: false, error: 'Token refresh failed' };
  }

  // Sync last 2 days for scheduled sync (more frequent, less data)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 2);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = new Date().toISOString().split('T')[0];

  const metricsToInsert: any[] = [];
  const workoutsToInsert: any[] = [];

  // Fetch cycles
  try {
    const cycles = await fetchAllWhoopData(accessToken, '/cycle', {
      start: `${startStr}T00:00:00.000Z`,
      end: `${endStr}T23:59:59.999Z`,
    });

    for (const cycle of cycles) {
      const measurementDate = cycle.start?.split('T')[0];
      if (!measurementDate) continue;

      if (cycle.score?.strain !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Day Strain',
          metric_category: 'activity',
          value: cycle.score.strain,
          unit: 'strain',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_cycle_${cycle.id}`,
        });
      }

      if (cycle.score?.average_heart_rate !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Average Heart Rate',
          metric_category: 'heart',
          value: cycle.score.average_heart_rate,
          unit: 'bpm',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_avg_hr_${cycle.id}`,
        });
      }

      if (cycle.score?.max_heart_rate !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Max Heart Rate',
          metric_category: 'heart',
          value: cycle.score.max_heart_rate,
          unit: 'bpm',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_max_hr_${cycle.id}`,
        });
      }

      if (cycle.score?.kilojoule !== undefined) {
        const kcal = Math.round(cycle.score.kilojoule / 4.184);
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Calories Burned',
          metric_category: 'activity',
          value: kcal,
          unit: 'kcal',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_kcal_${cycle.id}`,
        });
      }
    }
  } catch (error) {
    console.warn(`⚠️ [scheduled-sync] Failed to fetch cycles:`, error);
  }

  // Fetch recovery
  try {
    const recoveries = await fetchAllWhoopData(accessToken, '/recovery', {
      start: `${startStr}T00:00:00.000Z`,
      end: `${endStr}T23:59:59.999Z`,
    });

    for (const recovery of recoveries) {
      const measurementDate = recovery.created_at?.split('T')[0];
      if (!measurementDate) continue;

      if (recovery.score?.recovery_score !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Recovery Score',
          metric_category: 'recovery',
          value: recovery.score.recovery_score,
          unit: '%',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_recovery_${recovery.cycle_id || recovery.sleep_id}`,
        });
      }

      if (recovery.score?.hrv_rmssd_milli !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'HRV RMSSD',
          metric_category: 'recovery',
          value: recovery.score.hrv_rmssd_milli,
          unit: 'ms',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_hrv_${recovery.cycle_id || recovery.sleep_id}`,
        });
      }

      if (recovery.score?.resting_heart_rate !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Resting Heart Rate',
          metric_category: 'heart',
          value: recovery.score.resting_heart_rate,
          unit: 'bpm',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_rhr_${recovery.cycle_id || recovery.sleep_id}`,
        });
      }

      if (recovery.score?.spo2_percentage !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'SpO2',
          metric_category: 'vitals',
          value: recovery.score.spo2_percentage,
          unit: '%',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_spo2_${recovery.cycle_id || recovery.sleep_id}`,
        });
      }

      if (recovery.score?.skin_temp_celsius !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Skin Temperature',
          metric_category: 'vitals',
          value: recovery.score.skin_temp_celsius,
          unit: '°C',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_skin_temp_${recovery.cycle_id || recovery.sleep_id}`,
        });
      }
    }
  } catch (error) {
    console.warn(`⚠️ [scheduled-sync] Failed to fetch recovery (OK if no data):`, error);
  }

  // Fetch sleep
  try {
    const sleeps = await fetchAllWhoopData(accessToken, '/sleep', {
      start: `${startStr}T00:00:00.000Z`,
      end: `${endStr}T23:59:59.999Z`,
    });

    for (const sleep of sleeps) {
      const measurementDate = sleep.start?.split('T')[0];
      if (!measurementDate) continue;

      if (sleep.score?.sleep_performance_percentage !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Sleep Performance',
          metric_category: 'sleep',
          value: sleep.score.sleep_performance_percentage,
          unit: '%',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_sleep_perf_${sleep.id}`,
        });
      }

      if (sleep.score?.sleep_efficiency_percentage !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Sleep Efficiency',
          metric_category: 'sleep',
          value: sleep.score.sleep_efficiency_percentage,
          unit: '%',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_sleep_eff_${sleep.id}`,
        });
      }

      // Respiratory Rate from sleep
      if (sleep.score?.respiratory_rate !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Respiratory Rate',
          metric_category: 'vitals',
          value: sleep.score.respiratory_rate,
          unit: 'breaths/min',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_resp_rate_${sleep.id}`,
        });
      }

      // Sleep stage durations
      if (sleep.score?.stage_summary) {
        const stages = sleep.score.stage_summary;

        // Total Sleep Duration (hours)
        if (stages.total_in_bed_time_milli !== undefined) {
          const totalSleepHours = (stages.total_in_bed_time_milli - (stages.total_awake_time_milli || 0)) / 3600000;
          metricsToInsert.push({
            user_id: userId,
            metric_name: 'Sleep Duration',
            metric_category: 'sleep',
            value: Math.round(totalSleepHours * 100) / 100,
            unit: 'hours',
            source: 'whoop',
            provider: 'whoop',
            measurement_date: measurementDate,
            priority: 1,
            confidence_score: 95,
            external_id: `whoop_sleep_duration_${sleep.id}`,
          });
        }

        // Time in Bed
        if (stages.total_in_bed_time_milli !== undefined) {
          const timeInBedHours = stages.total_in_bed_time_milli / 3600000;
          metricsToInsert.push({
            user_id: userId,
            metric_name: 'Time in Bed',
            metric_category: 'sleep',
            value: Math.round(timeInBedHours * 100) / 100,
            unit: 'hours',
            source: 'whoop',
            provider: 'whoop',
            measurement_date: measurementDate,
            priority: 1,
            confidence_score: 95,
            external_id: `whoop_time_in_bed_${sleep.id}`,
          });
        }

        // Deep Sleep Duration
        if (stages.total_slow_wave_sleep_time_milli !== undefined) {
          const deepSleepHours = stages.total_slow_wave_sleep_time_milli / 3600000;
          metricsToInsert.push({
            user_id: userId,
            metric_name: 'Deep Sleep Duration',
            metric_category: 'sleep',
            value: Math.round(deepSleepHours * 100) / 100,
            unit: 'hours',
            source: 'whoop',
            provider: 'whoop',
            measurement_date: measurementDate,
            priority: 1,
            confidence_score: 95,
            external_id: `whoop_deep_sleep_${sleep.id}`,
          });
        }

        // REM Sleep Duration
        if (stages.total_rem_sleep_time_milli !== undefined) {
          const remSleepHours = stages.total_rem_sleep_time_milli / 3600000;
          metricsToInsert.push({
            user_id: userId,
            metric_name: 'REM Sleep Duration',
            metric_category: 'sleep',
            value: Math.round(remSleepHours * 100) / 100,
            unit: 'hours',
            source: 'whoop',
            provider: 'whoop',
            measurement_date: measurementDate,
            priority: 1,
            confidence_score: 95,
            external_id: `whoop_rem_sleep_${sleep.id}`,
          });
        }

        // Light Sleep Duration
        if (stages.total_light_sleep_time_milli !== undefined) {
          const lightSleepHours = stages.total_light_sleep_time_milli / 3600000;
          metricsToInsert.push({
            user_id: userId,
            metric_name: 'Light Sleep Duration',
            metric_category: 'sleep',
            value: Math.round(lightSleepHours * 100) / 100,
            unit: 'hours',
            source: 'whoop',
            provider: 'whoop',
            measurement_date: measurementDate,
            priority: 1,
            confidence_score: 95,
            external_id: `whoop_light_sleep_${sleep.id}`,
          });
        }

        // Awake Duration
        if (stages.total_awake_time_milli !== undefined) {
          const awakeHours = stages.total_awake_time_milli / 3600000;
          metricsToInsert.push({
            user_id: userId,
            metric_name: 'Awake Duration',
            metric_category: 'sleep',
            value: Math.round(awakeHours * 100) / 100,
            unit: 'hours',
            source: 'whoop',
            provider: 'whoop',
            measurement_date: measurementDate,
            priority: 1,
            confidence_score: 95,
            external_id: `whoop_awake_duration_${sleep.id}`,
          });
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ [scheduled-sync] Failed to fetch sleep:`, error);
  }

  // Fetch workouts
  try {
    const workouts = await fetchAllWhoopData(accessToken, '/workout', {
      start: `${startStr}T00:00:00.000Z`,
      end: `${endStr}T23:59:59.999Z`,
    });

    // Track daily aggregates for workout metrics
    const dailyWorkoutStats: Record<string, { count: number; totalCalories: number; totalMinutes: number; totalDistance: number }> = {};

    for (const workout of workouts) {
      const measurementDate = workout.start?.split('T')[0];
      if (!measurementDate) continue;

      // Initialize daily stats
      if (!dailyWorkoutStats[measurementDate]) {
        dailyWorkoutStats[measurementDate] = { count: 0, totalCalories: 0, totalMinutes: 0, totalDistance: 0 };
      }

      dailyWorkoutStats[measurementDate].count++;

      // Calculate duration
      if (workout.start && workout.end) {
        const durationMs = new Date(workout.end).getTime() - new Date(workout.start).getTime();
        const durationMinutes = durationMs / 60000;
        dailyWorkoutStats[measurementDate].totalMinutes += durationMinutes;
      }

      // Workout strain
      if (workout.score?.strain !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Workout Strain',
          metric_category: 'activity',
          value: workout.score.strain,
          unit: 'strain',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_workout_strain_${workout.id}`,
        });
      }

      // Workout kilojoules (calories)
      if (workout.score?.kilojoule !== undefined) {
        const kcal = Math.round(workout.score.kilojoule / 4.184);
        dailyWorkoutStats[measurementDate].totalCalories += kcal;
      }

      // Workout distance
      if (workout.score?.distance_meter !== undefined) {
        const distanceKm = workout.score.distance_meter / 1000;
        dailyWorkoutStats[measurementDate].totalDistance += distanceKm;
      }

      // Insert individual workout to workouts table
      workoutsToInsert.push({
        user_id: userId,
        workout_type: workout.sport_id?.toString() || 'unknown',
        workout_name: `Whoop Workout ${workout.id}`,
        start_time: workout.start,
        end_time: workout.end,
        duration_minutes: workout.start && workout.end
          ? Math.round((new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 60000)
          : null,
        calories_burned: workout.score?.kilojoule ? Math.round(workout.score.kilojoule / 4.184) : null,
        distance_km: workout.score?.distance_meter ? workout.score.distance_meter / 1000 : null,
        heart_rate_avg: workout.score?.average_heart_rate,
        heart_rate_max: workout.score?.max_heart_rate,
        source: 'whoop',
        external_id: `whoop_workout_${workout.id}`,
      });
    }

    // Add daily workout aggregate metrics
    for (const [date, stats] of Object.entries(dailyWorkoutStats)) {
      // Workout Count
      metricsToInsert.push({
        user_id: userId,
        metric_name: 'Workout Count',
        metric_category: 'activity',
        value: stats.count,
        unit: 'workouts',
        source: 'whoop',
        provider: 'whoop',
        measurement_date: date,
        priority: 1,
        confidence_score: 95,
        external_id: `whoop_workout_count_${date}`,
      });

      // Workout Calories
      if (stats.totalCalories > 0) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Workout Calories',
          metric_category: 'activity',
          value: Math.round(stats.totalCalories),
          unit: 'kcal',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: date,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_workout_calories_${date}`,
        });
      }

      // Workout Time
      if (stats.totalMinutes > 0) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Workout Time',
          metric_category: 'activity',
          value: Math.round(stats.totalMinutes),
          unit: 'min',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: date,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_workout_time_${date}`,
        });
      }

      // Distance
      if (stats.totalDistance > 0) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Distance',
          metric_category: 'activity',
          value: Math.round(stats.totalDistance * 100) / 100,
          unit: 'km',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: date,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_distance_${date}`,
        });
      }
    }
  } catch (error) {
    console.warn(`⚠️ [scheduled-sync] Failed to fetch workouts:`, error);
  }

  // Insert metrics
  if (metricsToInsert.length > 0) {
    await serviceClient
      .from('unified_metrics')
      .upsert(metricsToInsert, {
        onConflict: 'user_id,metric_name,measurement_date,source',
        ignoreDuplicates: false,
      });
  }

  // Insert workouts
  if (workoutsToInsert.length > 0) {
    await serviceClient
      .from('workouts')
      .upsert(workoutsToInsert, {
        onConflict: 'user_id,external_id',
        ignoreDuplicates: false,
      });
  }

  // Update last sync time
  await serviceClient
    .from('whoop_tokens')
    .update({ 
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  console.log(`✅ [scheduled-sync] User ${userId}: ${metricsToInsert.length} metrics, ${workoutsToInsert.length} workouts synced`);
  return { success: true, metrics_count: metricsToInsert.length, workouts_count: workoutsToInsert.length };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`⏰ [whoop-scheduled-sync] Starting scheduled sync (every 5 minutes)...`);

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all active whoop tokens (for all users)
    const { data: tokens, error: tokensError } = await serviceClient
      .from('whoop_tokens')
      .select('*')
      .eq('is_active', true);

    if (tokensError) {
      throw new Error(`Failed to fetch tokens: ${tokensError.message}`);
    }

    console.log(`📋 [whoop-scheduled-sync] Found ${tokens?.length || 0} active tokens`);

    const results: any[] = [];

    for (const tokenData of tokens || []) {
      try {
        const result = await syncUserData(serviceClient, tokenData);
        results.push({ user_id: tokenData.user_id, ...result });
      } catch (error: any) {
        results.push({ user_id: tokenData.user_id, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ [whoop-scheduled-sync] Completed: ${successCount}/${results.length} users synced`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        users_synced: successCount,
        total_users: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`❌ [whoop-scheduled-sync] Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
