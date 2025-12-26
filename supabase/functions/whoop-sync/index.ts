import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v1';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

// Whitelist of users who can use direct Whoop integration
const WHOOP_DIRECT_USERS = [
  'b9fc3f8b-e7bf-44f9-a591-cec47f9c93ae', // Alexey Gubarev
  'f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', // Anton
  '932aab9d-a104-4ba2-885f-2dfdc5dd5df2', // Pavel Radaev
];

interface WhoopToken {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

async function refreshTokenIfNeeded(
  serviceClient: any,
  tokenData: WhoopToken
): Promise<string> {
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  
  // Refresh if expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return tokenData.access_token;
  }

  console.log(`🔄 [whoop-sync] Refreshing expired token for user ${tokenData.user_id}`);

  const clientId = Deno.env.get('WHOOP_CLIENT_ID');
  const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET');

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
    const errorText = await tokenResponse.text();
    console.error(`❌ [whoop-sync] Token refresh failed:`, errorText);
    
    // Mark token as inactive
    await serviceClient
      .from('whoop_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', tokenData.user_id);
      
    throw new Error('Token refresh failed');
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

  console.log(`✅ [whoop-sync] Token refreshed successfully`);
  return tokens.access_token;
}

async function fetchWhoopData(accessToken: string, endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${WHOOP_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [whoop-sync] API error for ${endpoint}:`, errorText);
    throw new Error(`Whoop API error: ${response.status}`);
  }

  return response.json();
}

async function syncUserData(serviceClient: any, tokenData: WhoopToken, daysBack: number = 7) {
  const userId = tokenData.user_id;
  console.log(`📊 [whoop-sync] Syncing data for user ${userId}, last ${daysBack} days`);

  const accessToken = await refreshTokenIfNeeded(serviceClient, tokenData);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = new Date().toISOString().split('T')[0];

  const metricsToInsert: any[] = [];
  const workoutsToInsert: any[] = [];

  try {
    // Fetch cycles (contains strain data)
    console.log(`🔄 [whoop-sync] Fetching cycles...`);
    const cyclesData = await fetchWhoopData(accessToken, '/cycle', {
      start: `${startStr}T00:00:00.000Z`,
      end: `${endStr}T23:59:59.999Z`,
    });

    for (const cycle of cyclesData.records || []) {
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
          external_id: `whoop_cycle_hr_${cycle.id}`,
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
          external_id: `whoop_cycle_maxhr_${cycle.id}`,
        });
      }

      if (cycle.score?.kilojoule !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Active Calories',
          metric_category: 'activity',
          value: Math.round(cycle.score.kilojoule / 4.184), // kJ to kcal
          unit: 'kcal',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_cycle_cal_${cycle.id}`,
        });
      }
    }

    // Fetch recovery data
    console.log(`🔄 [whoop-sync] Fetching recovery...`);
    const recoveryData = await fetchWhoopData(accessToken, '/recovery', {
      start: `${startStr}T00:00:00.000Z`,
      end: `${endStr}T23:59:59.999Z`,
    });

    for (const recovery of recoveryData.records || []) {
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
          external_id: `whoop_recovery_${recovery.cycle_id}`,
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
          external_id: `whoop_hrv_${recovery.cycle_id}`,
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
          external_id: `whoop_rhr_${recovery.cycle_id}`,
        });
      }

      // SpO2 - like Terra API
      if (recovery.score?.spo2_percentage !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'SpO2',
          metric_category: 'recovery',
          value: recovery.score.spo2_percentage,
          unit: '%',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_spo2_${recovery.cycle_id}`,
        });
      }

      // Respiratory Rate - like Terra API
      if (recovery.score?.respiratory_rate !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Respiratory Rate',
          metric_category: 'sleep',
          value: recovery.score.respiratory_rate,
          unit: 'breaths/min',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_resp_${recovery.cycle_id}`,
        });
      }

      // Skin Temperature Delta - if available
      if (recovery.score?.skin_temp_celsius !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Skin Temperature',
          metric_category: 'recovery',
          value: recovery.score.skin_temp_celsius,
          unit: '°C',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_skin_temp_${recovery.cycle_id}`,
        });
      }
    }

    // Fetch sleep data
    console.log(`🔄 [whoop-sync] Fetching sleep...`);
    const sleepData = await fetchWhoopData(accessToken, '/sleep', {
      start: `${startStr}T00:00:00.000Z`,
      end: `${endStr}T23:59:59.999Z`,
    });

    for (const sleep of sleepData.records || []) {
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

      // Calculate sleep duration and individual stages from stage summary
      const stages = sleep.score?.stage_summary;
      if (stages) {
        const deepSleepHours = (stages.total_slow_wave_sleep_time_milli || 0) / 3600000;
        const remSleepHours = (stages.total_rem_sleep_time_milli || 0) / 3600000;
        const lightSleepHours = (stages.total_light_sleep_time_milli || 0) / 3600000;
        const awakeHours = (stages.total_awake_time_milli || 0) / 3600000;
        const totalSleepHours = deepSleepHours + remSleepHours + lightSleepHours;
        const timeInBedHours = totalSleepHours + awakeHours;

        // Total Sleep Duration
        if (totalSleepHours > 0) {
          metricsToInsert.push({
            user_id: userId,
            metric_name: 'Sleep Duration',
            metric_category: 'sleep',
            value: Math.round(totalSleepHours * 10) / 10,
            unit: 'hours',
            source: 'whoop',
            provider: 'whoop',
            measurement_date: measurementDate,
            priority: 1,
            confidence_score: 95,
            external_id: `whoop_sleep_dur_${sleep.id}`,
            source_data: {
              deep_sleep_duration: deepSleepHours,
              rem_sleep_duration: remSleepHours,
              light_sleep_duration: lightSleepHours,
              awake_duration: awakeHours,
            },
          });
        }

        // Deep Sleep Duration - like Terra API
        if (deepSleepHours > 0) {
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

        // REM Sleep Duration - like Terra API
        if (remSleepHours > 0) {
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

        // Light Sleep Duration - like Terra API
        if (lightSleepHours > 0) {
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

        // Time Awake During Sleep - like Terra API
        if (awakeHours > 0) {
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
            external_id: `whoop_awake_${sleep.id}`,
          });
        }

        // Time in Bed - like Terra API
        if (timeInBedHours > 0) {
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
      }
    }

    // Fetch workouts
    console.log(`🔄 [whoop-sync] Fetching workouts...`);
    const workoutsData = await fetchWhoopData(accessToken, '/workout', {
      start: `${startStr}T00:00:00.000Z`,
      end: `${endStr}T23:59:59.999Z`,
    });

    // Whoop sport_id mapping to readable names
    const WHOOP_SPORTS: Record<number, string> = {
      [-1]: 'Activity',
      0: 'Running',
      1: 'Cycling',
      16: 'Baseball',
      17: 'Basketball',
      18: 'Rowing',
      19: 'Fencing',
      20: 'Field Hockey',
      21: 'Football',
      22: 'Golf',
      24: 'Ice Hockey',
      25: 'Lacrosse',
      27: 'Rugby',
      28: 'Sailing',
      29: 'Skiing',
      30: 'Soccer',
      31: 'Softball',
      32: 'Squash',
      33: 'Swimming',
      34: 'Tennis',
      35: 'Track & Field',
      36: 'Volleyball',
      37: 'Water Polo',
      38: 'Wrestling',
      39: 'Boxing',
      42: 'Dance',
      43: 'Pilates',
      44: 'Yoga',
      45: 'Weightlifting',
      47: 'Cross Country Skiing',
      48: 'Functional Fitness',
      49: 'Duathlon',
      51: 'Gymnastics',
      52: 'Hiking/Rucking',
      53: 'Horseback Riding',
      55: 'Kayaking',
      56: 'Martial Arts',
      57: 'Mountain Biking',
      59: 'Powerlifting',
      60: 'Rock Climbing',
      61: 'Paddleboarding',
      62: 'Triathlon',
      63: 'Walking',
      64: 'Surfing',
      65: 'Elliptical',
      66: 'Stairmaster',
      70: 'Meditation',
      71: 'Other',
      73: 'Diving',
      74: 'Operations - Loss of Life',
      75: 'Operations - Loss of Property',
      76: 'Operations - All',
      77: 'Operations - War',
      82: 'Ultimate',
      83: 'Climbing',
      84: 'Jumping Rope',
      85: 'Kickboxing',
      86: 'Skateboarding',
      87: 'Wheelchair Pushing',
      88: 'Spinning',
      89: 'Stretching',
      90: 'HIIT',
      91: 'Snowboarding',
      92: 'Assault Bike',
      96: 'Barre',
      97: 'Pickleball',
      98: 'Ice Bath',
      99: 'Commuting',
      100: 'Gaming',
      101: 'Snowshoeing',
      102: 'Motocross',
      103: 'Caddying',
      104: 'Obstacle Course Racing',
      105: 'Motor Racing',
      106: 'HYROX',
      108: 'Padel',
    };

    // Track workouts by date for Workout Count metric
    const workoutsByDate: Record<string, number> = {};

    for (const workout of workoutsData.records || []) {
      const startTime = workout.start;
      const endTime = workout.end;
      if (!startTime) continue;

      const measurementDate = startTime.split('T')[0];

      // Count workouts per day
      workoutsByDate[measurementDate] = (workoutsByDate[measurementDate] || 0) + 1;

      // Calculate calories (convert from kJ to kcal) and round to integer
      const caloriesKcal = workout.score?.kilojoule 
        ? Math.round(workout.score.kilojoule / 4.184) 
        : null;

      // Calculate duration in minutes
      let durationMinutes: number | null = null;
      if (startTime && endTime) {
        durationMinutes = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
      }

      // Map sport_id to workout type name
      const workoutType = WHOOP_SPORTS[workout.sport_id ?? -1] || 'Unknown';

      workoutsToInsert.push({
        user_id: userId,
        workout_type: workoutType,
        start_time: startTime,
        end_time: endTime,
        heart_rate_avg: workout.score?.average_heart_rate ? Math.round(workout.score.average_heart_rate) : null,
        heart_rate_max: workout.score?.max_heart_rate ? Math.round(workout.score.max_heart_rate) : null,
        calories_burned: caloriesKcal,
        source: 'whoop',
        external_id: `whoop_workout_${workout.id}`,
        source_data: workout.score?.strain ? { strain: workout.score.strain } : null,
      });

      // Workout Strain metric
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
          priority: 2,
          confidence_score: 95,
          external_id: `whoop_workout_strain_${workout.id}`,
        });
      }

      // Workout Calories metric - like Terra API
      if (caloriesKcal !== null && caloriesKcal > 0) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Workout Calories',
          metric_category: 'workout',
          value: caloriesKcal,
          unit: 'kcal',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 2,
          confidence_score: 95,
          external_id: `whoop_workout_cal_${workout.id}`,
        });
      }

      // Workout Time metric - like Terra API
      if (durationMinutes !== null && durationMinutes > 0) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Workout Time',
          metric_category: 'workout',
          value: durationMinutes,
          unit: 'min',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 2,
          confidence_score: 95,
          external_id: `whoop_workout_time_${workout.id}`,
        });
      }

      // Distance metric - like Terra API (if available)
      if (workout.distance_meter !== undefined && workout.distance_meter > 0) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Distance',
          metric_category: 'workout',
          value: Math.round(workout.distance_meter / 10) / 100, // meters to km, 2 decimals
          unit: 'km',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 2,
          confidence_score: 95,
          external_id: `whoop_workout_dist_${workout.id}`,
        });
      }
    }

    // Add Workout Count metrics per day - like Terra API
    for (const [date, count] of Object.entries(workoutsByDate)) {
      metricsToInsert.push({
        user_id: userId,
        metric_name: 'Workout Count',
        metric_category: 'activity',
        value: count,
        unit: 'count',
        source: 'whoop',
        provider: 'whoop',
        measurement_date: date,
        priority: 2,
        confidence_score: 95,
        external_id: `whoop_workout_count_${date}`,
      });
    }

    // Batch insert metrics
    if (metricsToInsert.length > 0) {
      console.log(`💾 [whoop-sync] Inserting ${metricsToInsert.length} metrics...`);
      
      const { error: metricsError } = await serviceClient
        .from('unified_metrics')
        .upsert(metricsToInsert, {
          onConflict: 'user_id,metric_name,measurement_date,source',
          ignoreDuplicates: false,
        });

      if (metricsError) {
        console.error(`❌ [whoop-sync] Error inserting metrics:`, metricsError);
      }
    }

    // Batch insert workouts
    if (workoutsToInsert.length > 0) {
      console.log(`💾 [whoop-sync] Inserting ${workoutsToInsert.length} workouts...`);
      
      const { error: workoutsError } = await serviceClient
        .from('workouts')
        .upsert(workoutsToInsert, {
          onConflict: 'external_id',
          ignoreDuplicates: false,
        });

      if (workoutsError) {
        console.error(`❌ [whoop-sync] Error inserting workouts:`, workoutsError);
      }
    }

    // Update last sync time
    await serviceClient
      .from('whoop_tokens')
      .update({ 
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    console.log(`✅ [whoop-sync] Sync completed for user ${userId}: ${metricsToInsert.length} metrics, ${workoutsToInsert.length} workouts`);

    return {
      success: true,
      metrics_count: metricsToInsert.length,
      workouts_count: workoutsToInsert.length,
    };

  } catch (error: any) {
    console.error(`❌ [whoop-sync] Error syncing user ${userId}:`, error.message);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is whitelisted
    if (!WHOOP_DIRECT_USERS.includes(user.id)) {
      throw new Error('Direct Whoop integration is not available for this user');
    }

    const { days_back = 7 } = await req.json().catch(() => ({}));

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user's token
    const { data: tokenData, error: tokenError } = await serviceClient
      .from('whoop_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('No active Whoop connection found. Please connect Whoop first.');
    }

    const result = await syncUserData(serviceClient, tokenData, days_back);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`❌ [whoop-sync] Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
