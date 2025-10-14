import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, terra-signature, x-whoop-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Определяем провайдера по заголовкам
    const terraSignature = req.headers.get('terra-signature');
    const whoopSignature = req.headers.get('x-whoop-signature');
    
    // Получаем URL для определения провайдера по пути
    const url = new URL(req.url);
    const provider = url.searchParams.get('provider');

    console.log('🔔 Webhook received:', {
      provider,
      headers: {
        terraSignature: !!terraSignature,
        whoopSignature: !!whoopSignature,
      }
    });

    // Маршрутизация на основе заголовков или параметра provider
    if (terraSignature || provider === 'terra') {
      return await handleTerraWebhook(req, supabase);
    } else if (whoopSignature || provider === 'whoop') {
      return await handleWhoopWebhook(req, supabase);
    } else if (provider === 'withings') {
      return await handleWithingsWebhook(req, supabase);
    }

    return new Response(
      JSON.stringify({ error: 'Unknown webhook provider' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Terra Webhook Handler
async function handleTerraWebhook(req: Request, supabase: any) {
  const terraSigningSecret = Deno.env.get('TERRA_SIGNING_SECRET')!;
  const signature = req.headers.get('terra-signature');

  console.log('🔔 Terra webhook received');

  if (!signature) {
    console.error('❌ Missing terra-signature');
    return new Response(
      JSON.stringify({ error: 'Missing terra-signature' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const rawBody = await req.text();
  const isValid = await verifyTerraSignature(rawBody, signature, terraSigningSecret);

  if (!isValid) {
    console.error('❌ Invalid signature');
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const payload = JSON.parse(rawBody);
  console.log('✅ Terra webhook:', { 
    type: payload.type, 
    provider: payload.user?.provider,
    userId: payload.user?.user_id,
    dataLength: payload.data?.length 
  });

  try {
    if (payload.type === 'auth') {
      const { reference_id, user: terraUser } = payload;
      const provider = terraUser.provider?.toUpperCase();

      console.log('🔐 Processing auth event:', { reference_id, provider });

      const { data: existing } = await supabase
        .from('terra_tokens')
        .select('id')
        .eq('user_id', reference_id)
        .eq('provider', provider)
        .maybeSingle();

      const tokenData = {
        user_id: reference_id,
        terra_user_id: terraUser.user_id,
        provider,
        is_active: true,
        last_sync_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      if (existing?.id) {
        await supabase.from('terra_tokens').update(tokenData).eq('id', existing.id);
        console.log('✅ Updated existing token');
      } else {
        await supabase.from('terra_tokens').insert(tokenData);
        console.log('✅ Created new token');
      }
    } else if (['activity', 'body', 'daily', 'sleep', 'nutrition', 'athlete'].includes(payload.type)) {
      console.log(`📊 Processing ${payload.type} data`);
      await processTerraData(supabase, payload);
      
      if (payload.user?.user_id) {
        await supabase
          .from('terra_tokens')
          .update({ last_sync_date: new Date().toISOString() })
          .eq('terra_user_id', payload.user.user_id);
        console.log('✅ Updated last_sync_date');
      }
    } else {
      console.log(`⚠️ Unknown payload type: ${payload.type}`);
    }
  } catch (error) {
    console.error('❌ Error processing Terra webhook:', error);
    // Return success anyway to avoid Terra retrying
    return new Response(
      JSON.stringify({ success: true, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Whoop Webhook Handler
async function handleWhoopWebhook(req: Request, supabase: any) {
  const payload = await req.json();
  console.log('✅ Whoop webhook:', payload);

  // Implement Whoop webhook logic here
  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Withings Webhook Handler
async function handleWithingsWebhook(req: Request, supabase: any) {
  const payload = await req.json();
  console.log('✅ Withings webhook:', payload);

  // Implement Withings webhook logic here
  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Terra signature verification
async function verifyTerraSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const parts = signature.split(',');
    let timestamp = '';
    let sig = '';
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') sig = value;
    }
    
    if (!timestamp || !sig) return false;
    
    const payload = timestamp + rawBody;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const computed = bufferToHex(signatureBuffer);
    
    return computed === sig;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function processTerraData(supabase: any, payload: any) {
  try {
    const { user, data } = payload;
    
    if (!user?.user_id) {
      console.error('❌ Missing user.user_id in payload');
      return;
    }

    console.log('🔍 Looking up user for Terra user_id:', user.user_id);
    
    const { data: tokenData, error: tokenError } = await supabase
      .from('terra_tokens')
      .select('user_id, provider')
      .eq('terra_user_id', user.user_id)
      .eq('is_active', true)
      .maybeSingle();

    if (tokenError) {
      console.error('❌ Error fetching terra_tokens:', tokenError);
      return;
    }

    if (!tokenData) {
      console.error('❌ User not found for Terra user_id:', user.user_id);
      return;
    }

    const userId = tokenData.user_id;
    const provider = tokenData.provider;
    const source = provider.toLowerCase();

    console.log(`✅ Found user: ${userId}, provider: ${provider}, processing ${payload.type} data (${data?.length || 0} items)`);

    if (!data || data.length === 0) {
      console.log('⚠️ Empty data array, skipping');
      return;
    }

  if (payload.type === 'activity') {
    for (const activity of data) {
      if (activity.active_durations?.length > 0) {
        for (const workout of activity.active_durations) {
          await supabase.from('workouts').upsert({
            user_id: userId,
            workout_type: workout.activity_type || 'Activity',
            start_time: workout.start_time,
            end_time: workout.end_time,
            duration_minutes: Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000),
            calories_burned: activity.calories_data?.total_burned_calories,
            heart_rate_avg: activity.heart_rate_data?.avg_hr_bpm,
            heart_rate_max: activity.heart_rate_data?.max_hr_bpm,
            source,
            external_id: `terra_${provider}_${workout.start_time}`,
          }, {
            onConflict: 'external_id',
            ignoreDuplicates: true,
          });
        }
      }
    }
  }

  if (payload.type === 'body') {
    console.log('📊 Processing body data');
    for (const bodyData of data) {
      try {
        const measurementDate = (bodyData.timestamp || bodyData.date || new Date().toISOString()).split('T')[0];
        
        // Save to body_composition table
        if (bodyData.body_fat_percentage || bodyData.weight_kg) {
          await supabase.from('body_composition').upsert({
            user_id: userId,
            measurement_date: measurementDate,
            weight: bodyData.weight_kg,
            body_fat_percentage: bodyData.body_fat_percentage,
            muscle_mass: bodyData.muscle_mass_kg,
            measurement_method: source,
          }, {
            onConflict: 'user_id,measurement_date',
          });
        }

        // Save Weight to metric_values
        if (bodyData.weight_kg) {
          const { data: weightMetricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Вес',
            p_metric_category: 'body',
            p_unit: 'кг',
            p_source: source,
          });
          if (weightMetricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: weightMetricId,
              value: bodyData.weight_kg,
              measurement_date: measurementDate,
              external_id: `terra_${provider}_weight_${measurementDate}`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }

        // Save Body Fat to metric_values
        if (bodyData.body_fat_percentage) {
          const { data: fatMetricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Процент жира',
            p_metric_category: 'body',
            p_unit: '%',
            p_source: source,
          });
          if (fatMetricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: fatMetricId,
              value: bodyData.body_fat_percentage,
              measurement_date: measurementDate,
              external_id: `terra_${provider}_bodyfat_${measurementDate}`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }

        // Save Muscle Mass to metric_values
        if (bodyData.muscle_mass_kg) {
          const { data: muscleMetricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Мышечная масса',
            p_metric_category: 'body',
            p_unit: 'кг',
            p_source: source,
          });
          if (muscleMetricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: muscleMetricId,
              value: bodyData.muscle_mass_kg,
              measurement_date: measurementDate,
              external_id: `terra_${provider}_muscle_${measurementDate}`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }

        // Save Muscle Percentage if available
        if (bodyData.muscle_percentage || (bodyData.muscle_mass_kg && bodyData.weight_kg)) {
          const musclePercent = bodyData.muscle_percentage || 
            Math.round((bodyData.muscle_mass_kg / bodyData.weight_kg) * 100 * 100) / 100;
          const { data: musclePctMetricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Процент мышц',
            p_metric_category: 'body',
            p_unit: '%',
            p_source: source,
          });
          if (musclePctMetricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: musclePctMetricId,
              value: musclePercent,
              measurement_date: measurementDate,
              external_id: `terra_${provider}_muscle_pct_${measurementDate}`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }
      } catch (e) {
        console.error('⚠️ Error processing body item:', e);
      }
    }
  }

  // Process Daily data
  if (payload.type === 'daily') {
    console.log('📊 Processing daily data');
    for (const daily of data) {
      try {
        const dateStr = (daily.day_start || daily.start_time || daily.timestamp || daily.date || new Date().toISOString()).split('T')[0];

        // Steps
        if (typeof daily.steps === 'number' || daily.steps_data?.summary?.steps) {
          const steps = daily.steps || daily.steps_data?.summary?.steps;
          const { data: metricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Steps',
            p_metric_category: 'activity',
            p_unit: 'steps',
            p_source: source,
          });
          if (metricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: metricId,
              value: steps,
              measurement_date: dateStr,
              external_id: `terra_${provider}_daily_${dateStr}_steps`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }

        // Active Calories
        if (daily.calories_data?.total_burned_calories || daily.active_calories) {
          const cal = daily.calories_data?.total_burned_calories || daily.active_calories;
          const { data: metricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Active Calories',
            p_metric_category: 'activity',
            p_unit: 'kcal',
            p_source: source,
          });
          if (metricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: metricId,
              value: cal,
              measurement_date: dateStr,
              external_id: `terra_${provider}_daily_${dateStr}_active_cal`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }

        // Heart Rate - Average
        if (daily.heart_rate_data?.avg_hr_bpm) {
          const { data: metricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Average Heart Rate',
            p_metric_category: 'cardio',
            p_unit: 'bpm',
            p_source: source,
          });
          if (metricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: metricId,
              value: daily.heart_rate_data.avg_hr_bpm,
              measurement_date: dateStr,
              external_id: `terra_${provider}_daily_${dateStr}_avg_hr`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }

        // Resting Heart Rate
        if (daily.heart_rate_data?.resting_hr_bpm) {
          const { data: metricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Resting Heart Rate',
            p_metric_category: 'cardio',
            p_unit: 'bpm',
            p_source: source,
          });
          if (metricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: metricId,
              value: daily.heart_rate_data.resting_hr_bpm,
              measurement_date: dateStr,
              external_id: `terra_${provider}_daily_${dateStr}_rhr`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }
      } catch (e) {
        console.error('⚠️ Error processing daily item:', e);
      }
    }
  }

  // Process Sleep data
  if (payload.type === 'sleep') {
    console.log('📊 Processing sleep data');
    for (const sleep of data) {
      try {
        const start = sleep.start_time || sleep.sleep_start_time || sleep.timestamp;
        const end = sleep.end_time || sleep.sleep_end_time;
        let durationSeconds = sleep.duration_seconds || sleep.duration_sec || sleep.duration || null;
        if (!durationSeconds && start && end) {
          durationSeconds = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
        }
        const measurementDate = (start || end || new Date().toISOString()).split('T')[0];

        // Sleep Duration
        if (durationSeconds) {
          const hours = Math.round((durationSeconds / 3600) * 10) / 10;
          const { data: metricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Sleep Duration',
            p_metric_category: 'sleep',
            p_unit: 'h',
            p_source: source,
          });
          if (metricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: metricId,
              value: hours,
              measurement_date: measurementDate,
              external_id: `terra_${provider}_sleep_${measurementDate}_duration`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }

        // Deep Sleep
        if (sleep.deep_sleep_duration_seconds || sleep.sleep_durations_data?.deep_sleep_duration_seconds) {
          const deepSec = sleep.deep_sleep_duration_seconds || sleep.sleep_durations_data.deep_sleep_duration_seconds;
          const hours = Math.round((deepSec / 3600) * 10) / 10;
          const { data: metricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Deep Sleep Duration',
            p_metric_category: 'sleep',
            p_unit: 'h',
            p_source: source,
          });
          if (metricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: metricId,
              value: hours,
              measurement_date: measurementDate,
              external_id: `terra_${provider}_sleep_${measurementDate}_deep`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }

        // REM Sleep
        if (sleep.rem_sleep_duration_seconds || sleep.sleep_durations_data?.rem_sleep_duration_seconds) {
          const remSec = sleep.rem_sleep_duration_seconds || sleep.sleep_durations_data.rem_sleep_duration_seconds;
          const hours = Math.round((remSec / 3600) * 10) / 10;
          const { data: metricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'REM Sleep Duration',
            p_metric_category: 'sleep',
            p_unit: 'h',
            p_source: source,
          });
          if (metricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: metricId,
              value: hours,
              measurement_date: measurementDate,
              external_id: `terra_${provider}_sleep_${measurementDate}_rem`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }

        // Light Sleep
        if (sleep.light_sleep_duration_seconds || sleep.sleep_durations_data?.light_sleep_duration_seconds) {
          const lightSec = sleep.light_sleep_duration_seconds || sleep.sleep_durations_data.light_sleep_duration_seconds;
          const hours = Math.round((lightSec / 3600) * 10) / 10;
          const { data: metricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Light Sleep Duration',
            p_metric_category: 'sleep',
            p_unit: 'h',
            p_source: source,
          });
          if (metricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: metricId,
              value: hours,
              measurement_date: measurementDate,
              external_id: `terra_${provider}_sleep_${measurementDate}_light`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }

        // Sleep HRV
        if (sleep.hr_variability_rmssd_millis || sleep.heart_rate_data?.hrv_rmssd_millis) {
          const hrv = sleep.hr_variability_rmssd_millis || sleep.heart_rate_data.hrv_rmssd_millis;
          const { data: metricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Sleep HRV RMSSD',
            p_metric_category: 'recovery',
            p_unit: 'ms',
            p_source: source,
          });
          if (metricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: metricId,
              value: hrv,
              measurement_date: measurementDate,
              external_id: `terra_${provider}_sleep_${measurementDate}_hrv`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }

        // Respiratory Rate
        if (sleep.avg_respiration_rate || sleep.respiration_data?.breaths_per_minute) {
          const resp = sleep.avg_respiration_rate || sleep.respiration_data.breaths_per_minute;
          const { data: metricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Respiratory Rate',
            p_metric_category: 'sleep',
            p_unit: 'breaths/min',
            p_source: source,
          });
          if (metricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: metricId,
              value: resp,
              measurement_date: measurementDate,
              external_id: `terra_${provider}_sleep_${measurementDate}_resp`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }

        // Sleep Efficiency
        if (sleep.sleep_efficiency_percentage || sleep.sleep_efficiency) {
          const eff = sleep.sleep_efficiency_percentage || sleep.sleep_efficiency;
          const { data: metricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Sleep Efficiency',
            p_metric_category: 'sleep',
            p_unit: '%',
            p_source: source,
          });
          if (metricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: metricId,
              value: eff,
              measurement_date: measurementDate,
              external_id: `terra_${provider}_sleep_${measurementDate}_efficiency`,
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          }
        }
      } catch (e) {
        console.error('⚠️ Error processing sleep item:', e);
      }
    }
  }

  console.log(`✅ Processed Terra ${payload.type} data from ${provider} for user ${userId}`);
  } catch (error) {
    console.error('❌ Error in processTerraData:', error);
    throw error;
  }
}
