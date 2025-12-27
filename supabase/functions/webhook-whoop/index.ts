import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// V2 API base URL
const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v2';

// Structured logging helper
function log(level: 'info' | 'warn' | 'error' | 'debug', message: string, metadata?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'webhook-whoop',
    message,
    ...metadata,
  };
  
  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

// Verify WHOOP webhook signature (HMAC-SHA256)
async function verifyWhoopSignature(
  rawBody: string, 
  signatureHeader: string | null, 
  timestampHeader: string | null
): Promise<{ valid: boolean; error?: string }> {
  const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET');
  
  if (!clientSecret) {
    // If secret not configured, skip validation but log warning
    return { valid: true, error: 'WHOOP_CLIENT_SECRET not configured - signature validation skipped' };
  }
  
  if (!signatureHeader || !timestampHeader) {
    return { valid: false, error: 'Missing signature headers' };
  }
  
  // Create the signature base string: timestamp + raw body
  const signatureBase = timestampHeader + rawBody;
  
  // Generate HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(clientSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureBase)
  );
  
  // Base64 encode the result
  const calculatedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );
  
  // Constant-time comparison to prevent timing attacks
  if (calculatedSignature.length !== signatureHeader.length) {
    return { valid: false, error: 'Signature length mismatch' };
  }
  
  let isValid = true;
  for (let i = 0; i < calculatedSignature.length; i++) {
    if (calculatedSignature[i] !== signatureHeader[i]) {
      isValid = false;
    }
  }
  
  return isValid 
    ? { valid: true } 
    : { valid: false, error: 'Invalid signature' };
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const url = new URL(req.url);
  
  log('info', 'Incoming request', {
    requestId,
    method: req.method,
    path: url.pathname,
    userAgent: req.headers.get('user-agent') || 'unknown',
    contentType: req.headers.get('content-type'),
  });
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET' || url.pathname.includes('/health')) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check database connectivity
    const { count: tokenCount, error: tokenError } = await supabase
      .from('whoop_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get recent webhook stats
    const { data: recentWebhooks, error: webhookError } = await supabase
      .from('webhook_logs')
      .select('event_type, processed_at')
      .eq('provider', 'WHOOP')
      .order('processed_at', { ascending: false })
      .limit(10);

    const lastWebhookTime = recentWebhooks?.[0]?.processed_at;
    const webhookTypes = [...new Set(recentWebhooks?.map(w => w.event_type) || [])];

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      requestId,
      service: 'webhook-whoop',
      version: '2.1',
      checks: {
        database: tokenError ? 'error' : 'ok',
        activeUsers: tokenCount || 0,
        lastWebhook: lastWebhookTime || 'never',
        recentEventTypes: webhookTypes,
        signatureValidation: Deno.env.get('WHOOP_CLIENT_SECRET') ? 'enabled' : 'disabled',
      },
      endpoints: {
        webhook: 'POST /',
        health: 'GET /',
      },
      expectedEvents: [
        'recovery.updated',
        'sleep.updated',
        'workout.updated',
        'cycle.updated',
      ],
    };

    log('info', 'Health check completed', { requestId, healthStatus: healthStatus.checks });

    return new Response(JSON.stringify(healthStatus, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Webhook processing (POST only)
  if (req.method !== 'POST') {
    log('warn', 'Invalid method', { requestId, method: req.method });
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let eventType = 'unknown';
  let rawBody = '';
  let whoopUserId = '';

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Read and parse body
    rawBody = await req.text();
    
    log('debug', 'Raw body received', {
      requestId,
      bodyLength: rawBody.length,
      bodyPreview: rawBody.substring(0, 200),
    });
    
    // Verify webhook signature
    const signatureHeader = req.headers.get('X-WHOOP-Signature');
    const timestampHeader = req.headers.get('X-WHOOP-Signature-Timestamp');
    
    const signatureResult = await verifyWhoopSignature(rawBody, signatureHeader, timestampHeader);
    
    if (!signatureResult.valid) {
      log('warn', 'Webhook signature verification failed', {
        requestId,
        error: signatureResult.error,
        hasSignature: !!signatureHeader,
        hasTimestamp: !!timestampHeader,
      });
      
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        message: signatureResult.error 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (signatureResult.error) {
      // Signature validation skipped (no secret configured)
      log('warn', signatureResult.error, { requestId });
    } else {
      log('info', 'Webhook signature verified', { requestId });
    }
    
    if (!rawBody || rawBody.trim() === '') {
      log('warn', 'Empty body received', { requestId });
      return new Response(JSON.stringify({ ok: true, message: 'Empty body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    eventType = payload.type || payload.event_type || 'unknown';
    whoopUserId = payload.user_id?.toString() || '';

    log('info', 'Webhook parsed', {
      requestId,
      eventType,
      whoopUserId,
      payloadKeys: Object.keys(payload),
      dataKeys: payload.data ? Object.keys(payload.data) : [],
      dataId: payload.data?.id,
    });

    // Log webhook to database with detailed info
    const { error: logError } = await supabase.from('webhook_logs').insert({
      provider: 'WHOOP',
      event_type: eventType,
      payload,
      processed_at: new Date().toISOString(),
    });

    if (logError) {
      log('error', 'Failed to log webhook', { requestId, error: logError.message });
    }

    if (!whoopUserId) {
      log('warn', 'No user_id in payload', {
        requestId,
        eventType,
        payload: JSON.stringify(payload).substring(0, 500),
      });
      return new Response(JSON.stringify({ ok: true, message: 'No user_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find our user by whoop_user_id
    const { data: tokenData, error: tokenError } = await supabase
      .from('whoop_tokens')
      .select('user_id, access_token, whoop_user_id')
      .eq('whoop_user_id', whoopUserId)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      log('warn', 'No active token found', {
        requestId,
        whoopUserId,
        error: tokenError?.message,
      });
      
      // Still acknowledge webhook to prevent retries
      return new Response(JSON.stringify({ ok: true, message: 'User not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = tokenData.user_id;
    const accessToken = tokenData.access_token;

    log('info', 'User matched', {
      requestId,
      userId,
      whoopUserId,
      eventType,
    });

    // Process based on event type
    let metricsCount = 0;
    
    switch (eventType) {
      case 'recovery.updated':
        metricsCount = await processRecoveryV2(supabase, userId, accessToken, payload.data, requestId);
        break;
      case 'sleep.updated':
        metricsCount = await processSleepV2(supabase, userId, accessToken, payload.data, requestId);
        break;
      case 'workout.updated':
        metricsCount = await processWorkoutV2(supabase, userId, accessToken, payload.data, requestId);
        break;
      case 'cycle.updated':
        metricsCount = await processCycleV2(supabase, userId, accessToken, payload.data, requestId);
        break;
      default:
        log('info', 'Unhandled event type', { requestId, eventType });
    }

    const duration = Date.now() - startTime;
    
    log('info', 'Webhook processed successfully', {
      requestId,
      eventType,
      userId,
      whoopUserId,
      metricsCount,
      durationMs: duration,
    });

    return new Response(JSON.stringify({ 
      ok: true, 
      processed: true,
      eventType,
      metricsCount,
      durationMs: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    log('error', 'Webhook processing failed', {
      requestId,
      eventType,
      whoopUserId,
      error: error.message,
      stack: error.stack,
      durationMs: duration,
      rawBodyPreview: rawBody.substring(0, 500),
    });

    return new Response(
      JSON.stringify({ 
        error: error.message,
        requestId,
        eventType,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// V2: Recovery processing
async function processRecoveryV2(
  supabase: any, 
  userId: string, 
  accessToken: string, 
  data: any,
  requestId: string
): Promise<number> {
  if (!data?.id) {
    log('warn', 'No data.id for recovery', { requestId, data });
    return 0;
  }

  try {
    log('debug', 'Processing recovery', { requestId, dataId: data.id });
    
    // Fetch recent recovery data
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const url = `${WHOOP_API_BASE}/recovery?start=${yesterday}T00:00:00.000Z&end=${today}T23:59:59.999Z`;
    log('debug', 'Fetching recovery collection', { requestId, url });
    
    const response = await fetch(url, { 
      headers: { 'Authorization': `Bearer ${accessToken}` } 
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'Failed to fetch recovery collection', { 
        requestId, 
        status: response.status, 
        error: errorText 
      });
      return 0;
    }

    const recoveryData = await response.json();
    const records = recoveryData.records || [];
    
    log('debug', 'Recovery collection fetched', { 
      requestId, 
      recordCount: records.length,
      targetSleepId: data.id,
    });
    
    // Find the matching recovery or use most recent
    const recovery = records.find((r: any) => r.sleep_id === data.id) || records[0];
    
    if (!recovery) {
      log('warn', 'No recovery found', { requestId, sleepId: data.id });
      return 0;
    }

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

    const externalId = recovery.sleep_id || recovery.cycle_id || data.id;

    for (const m of metrics) {
      await upsertMetric(supabase, userId, m.name, m.value, m.unit, m.category, date, externalId, requestId);
    }

    log('info', 'Recovery processed', { 
      requestId, 
      metricsCount: metrics.length,
      recoveryScore: score?.recovery_score,
      hrv: score?.hrv_rmssd_milli,
    });
    
    return metrics.length;
  } catch (error: any) {
    log('error', 'Error processing recovery', { requestId, error: error.message, stack: error.stack });
    return 0;
  }
}

// V2: Sleep processing
async function processSleepV2(
  supabase: any, 
  userId: string, 
  accessToken: string, 
  data: any,
  requestId: string
): Promise<number> {
  if (!data?.id) {
    log('warn', 'No data.id for sleep', { requestId, data });
    return 0;
  }

  try {
    const url = `${WHOOP_API_BASE}/activity/sleep/${data.id}`;
    log('debug', 'Fetching sleep', { requestId, url });
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'Failed to fetch sleep', { 
        requestId, 
        sleepId: data.id, 
        status: response.status,
        error: errorText,
      });
      return 0;
    }

    const sleep = await response.json();
    const score = sleep.score;
    const date = sleep.start?.split('T')[0] || new Date().toISOString().split('T')[0];

    log('debug', 'Sleep data fetched', { 
      requestId, 
      sleepId: sleep.id,
      start: sleep.start,
      end: sleep.end,
      scoreState: sleep.score_state,
    });

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
      await upsertMetric(supabase, userId, m.name, m.value, m.unit, m.category, date, sleep.id, requestId);
    }

    log('info', 'Sleep processed', { 
      requestId, 
      metricsCount: metrics.length,
      sleepPerformance: score?.sleep_performance_percentage,
    });
    
    return metrics.length;
  } catch (error: any) {
    log('error', 'Error processing sleep', { requestId, error: error.message, stack: error.stack });
    return 0;
  }
}

// V2: Workout processing
async function processWorkoutV2(
  supabase: any, 
  userId: string, 
  accessToken: string, 
  data: any,
  requestId: string
): Promise<number> {
  if (!data?.id) {
    log('warn', 'No data.id for workout', { requestId, data });
    return 0;
  }

  try {
    const url = `${WHOOP_API_BASE}/activity/workout/${data.id}`;
    log('debug', 'Fetching workout', { requestId, url });
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'Failed to fetch workout', { 
        requestId, 
        workoutId: data.id, 
        status: response.status,
        error: errorText,
      });
      return 0;
    }

    const workout = await response.json();
    const score = workout.score;
    const date = workout.start?.split('T')[0] || new Date().toISOString().split('T')[0];

    log('debug', 'Workout data fetched', { 
      requestId, 
      workoutId: workout.id,
      sportId: workout.sport_id,
      sportName: workout.sport_name || getSportName(workout.sport_id),
      start: workout.start,
      end: workout.end,
    });

    // Insert/update workout record
    const { error: workoutError } = await supabase.from('workouts').upsert({
      user_id: userId,
      external_id: workout.id.toString(),
      source: 'whoop',
      workout_type: workout.sport_name || getSportName(workout.sport_id),
      start_time: workout.start,
      end_time: workout.end,
      duration_minutes: score?.kilojoule ? null : null,
      calories: score?.kilojoule ? Math.round(score.kilojoule / 4.184) : null,
      strain: score?.strain,
      average_heart_rate: score?.average_heart_rate,
      max_heart_rate: score?.max_heart_rate,
      distance_meters: score?.distance_meter,
    }, { onConflict: 'user_id,external_id' });

    if (workoutError) {
      log('error', 'Failed to upsert workout', { requestId, error: workoutError.message });
    }

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
      await upsertMetric(supabase, userId, m.name, m.value, m.unit, m.category, date, workout.id, requestId);
    }

    log('info', 'Workout processed', { 
      requestId, 
      workoutId: workout.id,
      sportName: workout.sport_name || getSportName(workout.sport_id),
      strain: score?.strain,
      metricsCount: metrics.length,
    });
    
    return metrics.length;
  } catch (error: any) {
    log('error', 'Error processing workout', { requestId, error: error.message, stack: error.stack });
    return 0;
  }
}

// V2: Cycle processing
async function processCycleV2(
  supabase: any, 
  userId: string, 
  accessToken: string, 
  data: any,
  requestId: string
): Promise<number> {
  if (!data?.id) {
    log('warn', 'No data.id for cycle', { requestId, data });
    return 0;
  }

  try {
    const url = `${WHOOP_API_BASE}/cycle/${data.id}`;
    log('debug', 'Fetching cycle', { requestId, url });
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'Failed to fetch cycle', { 
        requestId, 
        cycleId: data.id, 
        status: response.status,
        error: errorText,
      });
      return 0;
    }

    const cycle = await response.json();
    const score = cycle.score;
    const date = cycle.start?.split('T')[0] || new Date().toISOString().split('T')[0];

    log('debug', 'Cycle data fetched', { 
      requestId, 
      cycleId: cycle.id,
      start: cycle.start,
      end: cycle.end,
    });

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
      await upsertMetric(supabase, userId, m.name, m.value, m.unit, m.category, date, cycle.id, requestId);
    }

    log('info', 'Cycle processed', { 
      requestId, 
      cycleId: cycle.id,
      strain: score?.strain,
      metricsCount: metrics.length,
    });
    
    return metrics.length;
  } catch (error: any) {
    log('error', 'Error processing cycle', { requestId, error: error.message, stack: error.stack });
    return 0;
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
  externalId: string,
  requestId: string
) {
  try {
    const { error } = await supabase.from('unified_metrics').upsert({
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
    
    if (error) {
      log('error', 'Failed to upsert metric', { requestId, metricName, error: error.message });
    }
  } catch (error: any) {
    log('error', 'Exception upserting metric', { requestId, metricName, error: error.message });
  }
}

function getSportName(sportId: number): string {
  const sports: Record<string, string> = {
    '-1': 'Activity',
    '0': 'Running',
    '1': 'Cycling',
    '16': 'Baseball',
    '17': 'Basketball',
    '18': 'Rowing',
    '19': 'Fencing',
    '20': 'Field Hockey',
    '21': 'Football',
    '22': 'Golf',
    '24': 'Ice Hockey',
    '25': 'Lacrosse',
    '27': 'Rugby',
    '28': 'Sailing',
    '29': 'Skiing',
    '30': 'Soccer',
    '31': 'Softball',
    '32': 'Squash',
    '33': 'Swimming',
    '34': 'Tennis',
    '35': 'Track & Field',
    '36': 'Volleyball',
    '37': 'Water Polo',
    '38': 'Wrestling',
    '39': 'Boxing',
    '42': 'Dance',
    '43': 'Pilates',
    '44': 'Yoga',
    '45': 'Weightlifting',
    '47': 'CrossFit',
    '48': 'Functional Fitness',
    '49': 'Duathlon',
    '51': 'Gymnastics',
    '52': 'Hiking/Rucking',
    '53': 'Horseback Riding',
    '55': 'Kayaking',
    '56': 'Martial Arts',
    '57': 'Mountain Biking',
    '59': 'Powerlifting',
    '60': 'Rock Climbing',
    '61': 'Paddleboarding',
    '62': 'Triathlon',
    '63': 'Walking',
    '64': 'Surfing',
    '65': 'Elliptical',
    '66': 'Stairmaster',
    '70': 'Meditation',
    '71': 'Other',
    '73': 'Diving',
    '74': 'Operations - Loss',
    '75': 'Operations - Tactical',
    '76': 'Operations - Medical',
    '77': 'Operations - Flying',
    '82': 'Ultimate',
    '83': 'Climber',
    '84': 'Jumping Rope',
    '85': 'Australian Football',
    '86': 'Skateboarding',
    '87': 'Coaching',
    '88': 'Ice Bath',
    '89': 'Commuting',
    '90': 'Gaming',
    '91': 'Snowboarding',
    '92': 'Motocross',
    '93': 'Caddying',
    '94': 'Obstacle Course Racing',
    '95': 'Motor Racing',
    '96': 'HIIT',
    '97': 'Spin',
    '98': 'Jiu Jitsu',
    '99': 'Manual Labor',
    '100': 'Cricket',
    '101': 'Pickleball',
    '102': 'Inline Skating',
    '103': 'Box Fitness',
    '104': 'Spikeball',
    '105': 'Wheelchair Pushing',
    '106': 'Paddle Tennis',
    '107': 'Barre',
    '108': 'Stage Performance',
    '109': 'High Stress Work',
    '110': 'Parkour',
    '111': 'Gaelic Football',
    '112': 'Hurling/Camogie',
    '113': 'Circus Arts',
    '116': 'Massage Therapy',
    '121': 'Netball',
    '126': 'Assault Bike',
    '260': 'Stretching',
  };
  return sports[sportId?.toString()] || 'Activity';
}
