import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let eventType = 'unknown';

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    eventType = payload.type || payload.event_type || 'unknown';
    const whoopUserId = payload.user_id?.toString();

    console.log(`📥 [webhook-whoop] Received ${eventType} for Whoop user ${whoopUserId}`);

    // Log webhook for debugging
    await supabase.from('webhook_logs').insert({
      provider: 'WHOOP',
      event_type: eventType,
      payload,
      processed_at: new Date().toISOString(),
    });

    if (!whoopUserId) {
      console.warn('⚠️ [webhook-whoop] No user_id in payload');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find our user by whoop_user_id
    const { data: tokenData, error: tokenError } = await supabase
      .from('whoop_tokens')
      .select('user_id, access_token')
      .eq('whoop_user_id', whoopUserId)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      console.warn(`⚠️ [webhook-whoop] No active token for Whoop user ${whoopUserId}`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = tokenData.user_id;
    const accessToken = tokenData.access_token;

    console.log(`👤 [webhook-whoop] Matched to user ${userId}`);

    // Process based on event type
    switch (eventType) {
      case 'recovery.updated':
        await processRecovery(supabase, userId, accessToken, payload.data);
        break;
      case 'sleep.updated':
        await processSleep(supabase, userId, accessToken, payload.data);
        break;
      case 'workout.updated':
        await processWorkout(supabase, userId, accessToken, payload.data);
        break;
      case 'cycle.updated':
        await processCycle(supabase, userId, accessToken, payload.data);
        break;
      default:
        console.log(`ℹ️ [webhook-whoop] Unhandled event type: ${eventType}`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [webhook-whoop] Processed ${eventType} in ${duration}ms`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error(`❌ [webhook-whoop] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processRecovery(supabase: any, userId: string, accessToken: string, data: any) {
  if (!data?.id) return;

  try {
    // Fetch full recovery data from Whoop API
    const response = await fetch(`https://api.prod.whoop.com/developer/v1/recovery/${data.id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.error(`❌ [webhook-whoop] Failed to fetch recovery ${data.id}`);
      return;
    }

    const recovery = await response.json();
    const score = recovery.score;
    const date = recovery.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];

    const metrics = [];

    if (score?.recovery_score != null) {
      metrics.push({ name: 'Recovery Score', value: score.recovery_score, unit: '%', category: 'recovery' });
    }
    if (score?.hrv_rmssd_milli != null) {
      metrics.push({ name: 'HRV', value: score.hrv_rmssd_milli, unit: 'ms', category: 'recovery' });
    }
    if (score?.resting_heart_rate != null) {
      metrics.push({ name: 'Resting Heart Rate', value: score.resting_heart_rate, unit: 'bpm', category: 'recovery' });
    }
    if (score?.spo2_percentage != null) {
      metrics.push({ name: 'SpO2', value: score.spo2_percentage, unit: '%', category: 'recovery' });
    }
    if (score?.skin_temp_celsius != null) {
      metrics.push({ name: 'Skin Temperature', value: score.skin_temp_celsius, unit: '°C', category: 'recovery' });
    }

    for (const m of metrics) {
      await upsertMetric(supabase, userId, m.name, m.value, m.unit, m.category, date, recovery.id);
    }

    console.log(`✅ [webhook-whoop] Processed recovery: ${metrics.length} metrics`);
  } catch (error) {
    console.error(`❌ [webhook-whoop] Error processing recovery:`, error);
  }
}

async function processSleep(supabase: any, userId: string, accessToken: string, data: any) {
  if (!data?.id) return;

  try {
    const response = await fetch(`https://api.prod.whoop.com/developer/v1/activity/sleep/${data.id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.error(`❌ [webhook-whoop] Failed to fetch sleep ${data.id}`);
      return;
    }

    const sleep = await response.json();
    const score = sleep.score;
    const date = sleep.start?.split('T')[0] || new Date().toISOString().split('T')[0];

    const metrics = [];

    // Sleep duration in hours
    if (sleep.end && sleep.start) {
      const durationMs = new Date(sleep.end).getTime() - new Date(sleep.start).getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      metrics.push({ name: 'Sleep Duration', value: Math.round(durationHours * 100) / 100, unit: 'hours', category: 'sleep' });
    }

    if (score?.sleep_performance_percentage != null) {
      metrics.push({ name: 'Sleep Performance', value: score.sleep_performance_percentage, unit: '%', category: 'sleep' });
    }
    if (score?.sleep_efficiency_percentage != null) {
      metrics.push({ name: 'Sleep Efficiency', value: score.sleep_efficiency_percentage, unit: '%', category: 'sleep' });
    }
    if (score?.respiratory_rate != null) {
      metrics.push({ name: 'Respiratory Rate', value: score.respiratory_rate, unit: 'breaths/min', category: 'sleep' });
    }

    // Sleep stages
    if (score?.stage_summary) {
      const stages = score.stage_summary;
      if (stages.total_light_sleep_time_milli != null) {
        metrics.push({ name: 'Light Sleep Duration', value: stages.total_light_sleep_time_milli / 3600000, unit: 'hours', category: 'sleep' });
      }
      if (stages.total_slow_wave_sleep_time_milli != null) {
        metrics.push({ name: 'Deep Sleep Duration', value: stages.total_slow_wave_sleep_time_milli / 3600000, unit: 'hours', category: 'sleep' });
      }
      if (stages.total_rem_sleep_time_milli != null) {
        metrics.push({ name: 'REM Sleep Duration', value: stages.total_rem_sleep_time_milli / 3600000, unit: 'hours', category: 'sleep' });
      }
      if (stages.total_awake_time_milli != null) {
        metrics.push({ name: 'Awake Duration', value: stages.total_awake_time_milli / 3600000, unit: 'hours', category: 'sleep' });
      }
      if (stages.total_in_bed_time_milli != null) {
        metrics.push({ name: 'Time in Bed', value: stages.total_in_bed_time_milli / 3600000, unit: 'hours', category: 'sleep' });
      }
    }

    for (const m of metrics) {
      await upsertMetric(supabase, userId, m.name, m.value, m.unit, m.category, date, sleep.id);
    }

    console.log(`✅ [webhook-whoop] Processed sleep: ${metrics.length} metrics`);
  } catch (error) {
    console.error(`❌ [webhook-whoop] Error processing sleep:`, error);
  }
}

async function processWorkout(supabase: any, userId: string, accessToken: string, data: any) {
  if (!data?.id) return;

  try {
    const response = await fetch(`https://api.prod.whoop.com/developer/v1/activity/workout/${data.id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.error(`❌ [webhook-whoop] Failed to fetch workout ${data.id}`);
      return;
    }

    const workout = await response.json();
    const score = workout.score;
    const date = workout.start?.split('T')[0] || new Date().toISOString().split('T')[0];

    // Insert/update workout record
    await supabase.from('workouts').upsert({
      user_id: userId,
      external_id: workout.id.toString(),
      source: 'whoop',
      workout_type: getSportName(workout.sport_id),
      start_time: workout.start,
      end_time: workout.end,
      duration_minutes: score?.kilojoule ? null : null, // Calculate if needed
      calories: score?.kilojoule ? Math.round(score.kilojoule / 4.184) : null,
      strain: score?.strain,
      average_heart_rate: score?.average_heart_rate,
      max_heart_rate: score?.max_heart_rate,
      distance_meters: score?.distance_meter,
    }, { onConflict: 'user_id,external_id' });

    // Also save as metrics
    const metrics = [];

    if (score?.strain != null) {
      metrics.push({ name: 'Workout Strain', value: score.strain, unit: 'strain', category: 'activity' });
    }
    if (score?.kilojoule != null) {
      metrics.push({ name: 'Workout Calories', value: Math.round(score.kilojoule / 4.184), unit: 'kcal', category: 'activity' });
    }
    if (score?.distance_meter != null) {
      metrics.push({ name: 'Distance', value: Math.round(score.distance_meter), unit: 'm', category: 'activity' });
    }
    if (score?.average_heart_rate != null) {
      metrics.push({ name: 'Average Heart Rate', value: score.average_heart_rate, unit: 'bpm', category: 'activity' });
    }
    if (score?.max_heart_rate != null) {
      metrics.push({ name: 'Max Heart Rate', value: score.max_heart_rate, unit: 'bpm', category: 'activity' });
    }

    for (const m of metrics) {
      await upsertMetric(supabase, userId, m.name, m.value, m.unit, m.category, date, workout.id);
    }

    console.log(`✅ [webhook-whoop] Processed workout: ${workout.id}`);
  } catch (error) {
    console.error(`❌ [webhook-whoop] Error processing workout:`, error);
  }
}

async function processCycle(supabase: any, userId: string, accessToken: string, data: any) {
  if (!data?.id) return;

  try {
    const response = await fetch(`https://api.prod.whoop.com/developer/v1/cycle/${data.id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.error(`❌ [webhook-whoop] Failed to fetch cycle ${data.id}`);
      return;
    }

    const cycle = await response.json();
    const score = cycle.score;
    const date = cycle.start?.split('T')[0] || new Date().toISOString().split('T')[0];

    const metrics = [];

    if (score?.strain != null) {
      metrics.push({ name: 'Day Strain', value: score.strain, unit: 'strain', category: 'activity' });
    }
    if (score?.kilojoule != null) {
      metrics.push({ name: 'Calories', value: Math.round(score.kilojoule / 4.184), unit: 'kcal', category: 'activity' });
    }
    if (score?.average_heart_rate != null) {
      metrics.push({ name: 'Average Heart Rate', value: score.average_heart_rate, unit: 'bpm', category: 'activity' });
    }
    if (score?.max_heart_rate != null) {
      metrics.push({ name: 'Max Heart Rate', value: score.max_heart_rate, unit: 'bpm', category: 'activity' });
    }

    for (const m of metrics) {
      await upsertMetric(supabase, userId, m.name, m.value, m.unit, m.category, date, cycle.id);
    }

    console.log(`✅ [webhook-whoop] Processed cycle: ${metrics.length} metrics`);
  } catch (error) {
    console.error(`❌ [webhook-whoop] Error processing cycle:`, error);
  }
}

async function upsertMetric(
  supabase: any,
  userId: string,
  metricName: string,
  value: number,
  unit: string,
  category: string,
  date: string,
  externalId: string
) {
  try {
    await supabase.from('unified_metrics').upsert({
      user_id: userId,
      metric_name: metricName,
      value,
      unit,
      metric_category: category,
      source: 'whoop',
      provider: 'whoop',
      measurement_date: date,
      external_id: `whoop_${externalId}_${metricName.toLowerCase().replace(/\s+/g, '_')}`,
      priority: 1,
      confidence_score: 95,
    }, { onConflict: 'user_id,metric_name,measurement_date,source' });
  } catch (error) {
    console.error(`❌ [webhook-whoop] Failed to upsert metric ${metricName}:`, error);
  }
}

function getSportName(sportId: number): string {
  const sports: Record<string, string> = {
    '-1': 'Activity',
    '0': 'Running',
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
    47: 'CrossFit',
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
    74: 'Operations - Loss',
    75: 'Operations - Tactical',
    76: 'Operations - Medical',
    77: 'Operations - Flying',
    82: 'Ultimate',
    83: 'Climber',
    84: 'Jumping Rope',
    85: 'Australian Football',
    86: 'Skateboarding',
    87: 'Coaching',
    88: 'Ice Bath',
    89: 'Commuting',
    90: 'Gaming',
    91: 'Snowboarding',
    92: 'Motocross',
    93: 'Caddying',
    94: 'Obstacle Course Racing',
    95: 'Motor Racing',
    96: 'HIIT',
    97: 'Spin',
    98: 'Jiu Jitsu',
    99: 'Manual Labor',
    100: 'Cricket',
    101: 'Pickleball',
    102: 'Inline Skating',
    103: 'Box Fitness',
    104: 'Spikeball',
    105: 'Wheelchair Pushing',
    106: 'Paddle Tennis',
    107: 'Barre',
    108: 'Stage Performance',
    109: 'High Stress Work',
    110: 'Parkour',
    111: 'Gaelic Football',
    112: 'Hurling/Camogie',
    113: 'Circus Arts',
    116: 'Massage Therapy',
    121: 'Netball',
    126: 'Assault Bike',
    260: 'Stretching',
  };
  return sports[sportId.toString()] || 'Activity';
}
