import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v2';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

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
  
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return tokenData.access_token;
  }

  console.log(`🔄 [whoop-sync-admin] Refreshing expired token for user ${tokenData.user_id}`);

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
    console.error(`❌ [whoop-sync-admin] Token refresh failed:`, errorText);
    
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

  console.log(`✅ [whoop-sync-admin] Token refreshed successfully`);
  return tokens.access_token;
}

async function fetchWhoopData(accessToken: string, endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${WHOOP_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  console.log(`🔗 [whoop-sync-admin] Requesting: ${url.toString()}`);
  
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  const responseText = await response.text();
  console.log(`📊 [whoop-sync-admin] Response for ${endpoint}: ${response.status} - ${responseText.slice(0, 300)}`);

  if (!response.ok) {
    throw new Error(`Whoop API error: ${response.status} - ${responseText}`);
  }

  return JSON.parse(responseText);
}

async function fetchAllWhoopData(accessToken: string, endpoint: string, params: Record<string, string>): Promise<any[]> {
  const allRecords: any[] = [];
  let nextToken: string | null = null;
  let pageCount = 0;
  const maxPages = 10;
  
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
    
    console.log(`📄 [whoop-sync-admin] ${endpoint} page ${pageCount}: ${records.length} records`);
  } while (nextToken && pageCount < maxPages);
  
  return allRecords;
}

async function syncUserData(serviceClient: any, tokenData: WhoopToken, daysBack: number = 28) {
  const userId = tokenData.user_id;
  console.log(`📊 [whoop-sync-admin] Syncing data for user ${userId}, last ${daysBack} days`);

  const accessToken = await refreshTokenIfNeeded(serviceClient, tokenData);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
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
          external_id: `whoop_cycle_hr_${cycle.id}`,
        });
      }

      if (cycle.score?.kilojoule !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Active Calories',
          metric_category: 'activity',
          value: Math.round(cycle.score.kilojoule / 4.184),
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
    console.log(`✅ [whoop-sync-admin] Cycles processed: ${cycles.length}`);
  } catch (error) {
    console.warn(`⚠️ [whoop-sync-admin] Failed to fetch cycles:`, error);
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
    }
    console.log(`✅ [whoop-sync-admin] Recovery processed: ${recoveries.length}`);
  } catch (error) {
    console.warn(`⚠️ [whoop-sync-admin] Failed to fetch recovery:`, error);
  }

  // Fetch sleep
  try {
    const sleeps = await fetchAllWhoopData(accessToken, '/activity/sleep', {
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

      const stages = sleep.score?.stage_summary;
      if (stages) {
        const deepSleepHours = (stages.total_slow_wave_sleep_time_milli || 0) / 3600000;
        const remSleepHours = (stages.total_rem_sleep_time_milli || 0) / 3600000;
        const lightSleepHours = (stages.total_light_sleep_time_milli || 0) / 3600000;
        const awakeHours = (stages.total_awake_time_milli || 0) / 3600000;
        const totalSleepHours = deepSleepHours + remSleepHours + lightSleepHours;

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
      }
    }
    console.log(`✅ [whoop-sync-admin] Sleep processed: ${sleeps.length}`);
  } catch (error) {
    console.warn(`⚠️ [whoop-sync-admin] Failed to fetch sleep:`, error);
  }

  // Fetch workouts
  try {
    const workouts = await fetchAllWhoopData(accessToken, '/activity/workout', {
      start: `${startStr}T00:00:00.000Z`,
      end: `${endStr}T23:59:59.999Z`,
    });

    for (const workout of workouts) {
      const startTime = workout.start;
      const endTime = workout.end;
      if (!startTime || !endTime) continue;

      workoutsToInsert.push({
        user_id: userId,
        workout_name: workout.score?.sport_id?.toString() || 'Whoop Workout',
        start_time: startTime,
        end_time: endTime,
        duration_minutes: Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
        calories_burned: workout.score?.kilojoule ? Math.round(workout.score.kilojoule / 4.184) : null,
        avg_heart_rate: workout.score?.average_heart_rate,
        max_heart_rate: workout.score?.max_heart_rate,
        source: 'whoop',
        external_id: `whoop_workout_${workout.id}`,
        metadata: { strain: workout.score?.strain, zone_duration: workout.score?.zone_duration },
      });

      const measurementDate = startTime.split('T')[0];
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
    }
    console.log(`✅ [whoop-sync-admin] Workouts processed: ${workouts.length}`);
  } catch (error) {
    console.warn(`⚠️ [whoop-sync-admin] Failed to fetch workouts:`, error);
  }

  // Deduplicate and insert metrics
  if (metricsToInsert.length > 0) {
    const uniqueMetricsMap = new Map<string, typeof metricsToInsert[0]>();
    for (const metric of metricsToInsert) {
      const key = `${metric.metric_name}_${metric.measurement_date}_${metric.source}`;
      if (!uniqueMetricsMap.has(key) || metric.external_id) {
        uniqueMetricsMap.set(key, metric);
      }
    }
    const uniqueMetrics = Array.from(uniqueMetricsMap.values());
    
    console.log(`💾 [whoop-sync-admin] Inserting ${uniqueMetrics.length} metrics...`);
    
    const { error: metricsError } = await serviceClient
      .from('unified_metrics')
      .upsert(uniqueMetrics, {
        onConflict: 'user_id,metric_name,measurement_date,source',
        ignoreDuplicates: false,
      });

    if (metricsError) {
      console.error(`❌ [whoop-sync-admin] Error inserting metrics:`, metricsError);
    }
  }

  // Insert workouts
  if (workoutsToInsert.length > 0) {
    console.log(`💾 [whoop-sync-admin] Inserting ${workoutsToInsert.length} workouts...`);
    
    const { error: workoutsError } = await serviceClient
      .from('workouts')
      .upsert(workoutsToInsert, {
        onConflict: 'user_id,external_id',
        ignoreDuplicates: false,
      });

    if (workoutsError) {
      console.error(`❌ [whoop-sync-admin] Error inserting workouts:`, workoutsError);
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

  console.log(`✅ [whoop-sync-admin] Sync completed for user ${userId}`);

  return {
    success: true,
    metrics_count: metricsToInsert.length,
    workouts_count: workoutsToInsert.length,
  };
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

    const { target_user_id, days_back = 28 } = await req.json();

    if (!target_user_id) {
      throw new Error('target_user_id is required');
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify trainer has access to this client
    const { data: trainerClient, error: tcError } = await serviceClient
      .from('trainer_clients')
      .select('id')
      .eq('trainer_id', user.id)
      .eq('client_id', target_user_id)
      .eq('active', true)
      .single();

    if (tcError || !trainerClient) {
      // Also check if user is a challenge trainer
      const { data: challengeTrainer, error: ctError } = await serviceClient
        .from('challenge_trainers')
        .select('challenge_id')
        .eq('trainer_id', user.id)
        .limit(1);

      if (ctError || !challengeTrainer?.length) {
        throw new Error('Access denied. You are not authorized to sync this user.');
      }

      // Check if target user is in one of trainer's challenges
      const challengeIds = challengeTrainer.map(ct => ct.challenge_id);
      const { data: isParticipant } = await serviceClient
        .from('challenge_participants')
        .select('id')
        .eq('user_id', target_user_id)
        .in('challenge_id', challengeIds)
        .limit(1);

      if (!isParticipant?.length) {
        throw new Error('Access denied. User is not in your challenges.');
      }
    }

    // Get target user's whoop token
    const { data: tokenData, error: tokenError } = await serviceClient
      .from('whoop_tokens')
      .select('*')
      .eq('user_id', target_user_id)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('No active Whoop connection found for this user.');
    }

    console.log(`🚀 [whoop-sync-admin] Trainer ${user.id} syncing data for client ${target_user_id}, ${days_back} days`);

    const result = await syncUserData(serviceClient, tokenData, days_back);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`❌ [whoop-sync-admin] Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
