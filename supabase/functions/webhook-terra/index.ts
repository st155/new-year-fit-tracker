import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, terra-signature',
};

serve(async (req) => {
  // Log every request immediately
  console.log('🌐 Incoming request:', {
    method: req.method,
    url: req.url,
    provider: req.headers.get('user-id') || req.headers.get('dev-id'),
    type: req.headers.get('type')
  });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  // Health checks for GET/HEAD without signature
  if (req.method === 'GET' || req.method === 'HEAD') {
    return new Response(req.method === 'HEAD' ? null : JSON.stringify({ ok: true, message: 'Terra webhook live. Send signed POST webhooks here.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const terraSigningSecret = Deno.env.get('TERRA_SIGNING_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔔 Terra webhook received', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries())
    });
    
    const signature = req.headers.get('terra-signature') || req.headers.get('x-terra-signature');
    if (!signature) {
      console.error('❌ Missing terra-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await req.text();
    console.log('📦 Raw body received:', rawBody);
    
    const isValidSignature = await verifyTerraSignature(rawBody, signature, terraSigningSecret);
    
    if (!isValidSignature) {
      console.error('❌ Invalid signature - responding with 400');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.parse(rawBody);
    console.log('✅ Valid Terra webhook received:', {
      type: payload.type,
      user: payload.user,
      reference_id: payload.reference_id
    });

    // Persist minimal payload audit trail for diagnostics
    try {
      const auditUser = payload.user?.user_id || payload.reference_id || 'unknown';
      await supabase.from('terra_misc_payloads').insert({
        user_id: String(auditUser),
        payload_type: payload.type,
        data_type: payload.type,
        payload_id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('⚠️ Failed to insert payload audit:', e);
    }

    // Обработка healthcheck от Terra
    if (payload.type === 'healthcheck') {
      console.log('💚 Healthcheck received from Terra - responding OK');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook is healthy' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.type === 'auth') {
      const { reference_id, user: terraUser } = payload;
      const provider = terraUser.provider?.toUpperCase();

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
        console.log('✅ Updated terra_tokens');
      } else {
        await supabase.from('terra_tokens').insert(tokenData);
        console.log('✅ Inserted new terra_tokens');
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (['activity', 'body', 'daily', 'sleep', 'nutrition', 'athlete'].includes(payload.type)) {
      await processTerraData(supabase, payload);
      
      if (payload.user?.user_id) {
        await supabase
          .from('terra_tokens')
          .update({ last_sync_date: new Date().toISOString() })
          .eq('terra_user_id', payload.user.user_id);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Terra webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
    
    if (!timestamp || !sig) {
      console.error('❌ Invalid signature format', { signature });
      return false;
    }
    
    // Попробуем оба формата Terra: с точкой и без
    const formats = [
      `${timestamp}.${rawBody}`,  // Стандартный формат Stripe-style
      `${timestamp}${rawBody}`,   // Альтернативный формат
    ];
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    for (const payload of formats) {
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
      const computed = bufferToHex(signatureBuffer);
      
      if (computed === sig) {
        console.log('✅ Signature verified successfully with format:', payload.includes('.') ? 'timestamp.body' : 'timestamp+body');
        return true;
      }
    }
    
    // Если ни один формат не подошел
    console.error('❌ Signature mismatch with both formats', { 
      expected: sig,
      timestamp,
      bodyLength: rawBody.length,
      bodyPreview: rawBody.substring(0, 100)
    });
    
    return false;
  } catch (error) {
    console.error('❌ Error verifying signature:', error);
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
    console.log('🔍 Processing Terra data:', { 
      type: payload.type, 
      provider: payload.user?.provider,
      hasData: !!payload.data,
      dataLength: payload.data?.length 
    });

    const { user, data } = payload;
    
    if (!user?.user_id) {
      console.error('❌ Missing user.user_id in payload');
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ Empty data array, skipping processing');
      return;
    }
    
    const { data: tokenData, error: tokenError } = await supabase
      .from('terra_tokens')
      .select('user_id, provider')
      .eq('terra_user_id', user.user_id)
      .eq('is_active', true)
      .single();

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
    
    console.log('✅ Found user:', { userId, provider });

    if (payload.type === 'activity') {
      console.log('📊 Processing activity data');
      for (const activity of data) {
        console.log('Activity item:', { 
          hasActiveDurations: !!activity.active_durations,
          durationsCount: activity.active_durations?.length 
        });
        
        if (activity.active_durations?.length > 0) {
          for (const workout of activity.active_durations) {
            const externalId = `terra_${provider}_${workout.start_time}`;
            const { error: workoutError } = await supabase.from('workouts').upsert({
              user_id: userId,
              workout_type: workout.activity_type || 'Activity',
              start_time: workout.start_time,
              end_time: workout.end_time,
              duration_minutes: Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000),
              calories_burned: activity.calories_data?.total_burned_calories,
              heart_rate_avg: activity.heart_rate_data?.avg_hr_bpm,
              heart_rate_max: activity.heart_rate_data?.max_hr_bpm,
              source: provider.toLowerCase(),
              external_id,
            }, {
              onConflict: 'external_id',
              ignoreDuplicates: true,
            });
            
            if (workoutError) {
              console.error('❌ Error upserting workout:', workoutError);
            } else {
              // Additionally store key workout metrics in metric_values for Whoop dashboard
              try {
                const measurementDate = (workout.start_time || activity.start_time || activity.timestamp || new Date().toISOString()).split('T')[0];
                const source = provider.toLowerCase();

                // Average Heart Rate
                const avgHr = activity.heart_rate_data?.avg_hr_bpm;
                if (typeof avgHr === 'number') {
                  const { data: avgHrMetricId } = await supabase.rpc('create_or_get_metric', {
                    p_user_id: userId,
                    p_metric_name: 'Average Heart Rate',
                    p_metric_category: 'workout',
                    p_unit: 'bpm',
                    p_source: source,
                  });
                  if (avgHrMetricId) {
                    await supabase.from('metric_values').insert({
                      user_id: userId,
                      metric_id: avgHrMetricId,
                      value: avgHr,
                      measurement_date: measurementDate,
                      external_id: externalId,
                      source_data: activity,
                    });
                  }
                }

                // Max Heart Rate
                const maxHr = activity.heart_rate_data?.max_hr_bpm;
                if (typeof maxHr === 'number') {
                  const { data: maxHrMetricId } = await supabase.rpc('create_or_get_metric', {
                    p_user_id: userId,
                    p_metric_name: 'Max Heart Rate',
                    p_metric_category: 'workout',
                    p_unit: 'bpm',
                    p_source: source,
                  });
                  if (maxHrMetricId) {
                    await supabase.from('metric_values').insert({
                      user_id: userId,
                      metric_id: maxHrMetricId,
                      value: maxHr,
                      measurement_date: measurementDate,
                      external_id: externalId,
                      source_data: activity,
                    });
                  }
                }

                // Workout Calories
                const calories = activity.calories_data?.total_burned_calories;
                if (typeof calories === 'number') {
                  const { data: caloriesMetricId } = await supabase.rpc('create_or_get_metric', {
                    p_user_id: userId,
                    p_metric_name: 'Workout Calories',
                    p_metric_category: 'workout',
                    p_unit: 'kcal',
                    p_source: source,
                  });
                  if (caloriesMetricId) {
                    await supabase.from('metric_values').insert({
                      user_id: userId,
                      metric_id: caloriesMetricId,
                      value: calories,
                      measurement_date: measurementDate,
                      external_id: externalId,
                      source_data: activity,
                    });
                  }
                }

                // Workout Strain (if provided by provider)
                const strain = activity.score?.strain ?? activity.strain_score ?? workout.strain_score;
                if (typeof strain === 'number') {
                  const { data: strainMetricId } = await supabase.rpc('create_or_get_metric', {
                    p_user_id: userId,
                    p_metric_name: 'Workout Strain',
                    p_metric_category: 'workout',
                    p_unit: '',
                    p_source: source,
                  });
                  if (strainMetricId) {
                    await supabase.from('metric_values').insert({
                      user_id: userId,
                      metric_id: strainMetricId,
                      value: strain,
                      measurement_date: measurementDate,
                      external_id: externalId,
                      source_data: activity,
                    });
                  }
                }
              } catch (e) {
                console.error('⚠️ Error storing workout metrics:', e);
              }
            }
          }
        }
      }
    }

    if (payload.type === 'body') {
      console.log('📊 Processing body data');
      for (const bodyData of data) {
        // Terra возвращает measurements_data.measurements[] для Withings и других провайдеров
        const measurements = bodyData.measurements_data?.measurements || [];
        
        console.log('Body item:', { 
          hasMeasurements: measurements.length > 0,
          hasDirectWeight: !!bodyData.weight_kg,
          hasDirectFat: !!bodyData.body_fat_percentage,
        });
        
        // Обрабатываем каждое измерение отдельно
        for (const measurement of measurements) {
          if (measurement.weight_kg || measurement.bodyfat_percentage) {
            const measurementDate = measurement.measurement_time?.split('T')[0];
            
            if (!measurementDate) {
              console.warn('⚠️ Skipping measurement without date');
              continue;
            }
            
            const { error: bodyError } = await supabase.from('body_composition').upsert({
              user_id: userId,
              measurement_date: measurementDate,
              weight: measurement.weight_kg,
              body_fat_percentage: measurement.bodyfat_percentage,
              muscle_mass: measurement.muscle_mass_g ? measurement.muscle_mass_g / 1000 : null,
              measurement_method: provider.toLowerCase(),
            }, {
              onConflict: 'user_id,measurement_date',
            });
            
            if (bodyError) {
              console.error('❌ Error upserting body composition:', bodyError);
            } else {
              console.log('✅ Saved body composition:', { weight: measurement.weight_kg, fat: measurement.bodyfat_percentage, date: measurementDate });
            }
          }
        }
        
        // Фоллбэк: если данные пришли напрямую (старый формат или другие провайдеры)
        if ((bodyData.body_fat_percentage || bodyData.weight_kg) && bodyData.timestamp) {
          const { error: bodyError } = await supabase.from('body_composition').upsert({
            user_id: userId,
            measurement_date: bodyData.timestamp?.split('T')[0],
            weight: bodyData.weight_kg,
            body_fat_percentage: bodyData.body_fat_percentage,
            muscle_mass: bodyData.muscle_mass_kg,
            measurement_method: provider.toLowerCase(),
          }, {
            onConflict: 'user_id,measurement_date',
          });
          
          if (bodyError) {
            console.error('❌ Error upserting body composition (fallback):', bodyError);
          } else {
            console.log('✅ Saved body composition (fallback):', { weight: bodyData.weight_kg, fat: bodyData.body_fat_percentage });
          }
        }
      }
    }
    
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
          if (durationSeconds) {
            const hours = Math.round((durationSeconds / 3600) * 10) / 10;
            const measurementDate = (start || end || new Date().toISOString()).split('T')[0];
            const { data: sleepMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Sleep Duration',
              p_metric_category: 'sleep',
              p_unit: 'h',
              p_source: provider.toLowerCase(),
            });
            if (sleepMetricId) {
              await supabase.from('metric_values').insert({
                user_id: userId,
                metric_id: sleepMetricId,
                value: hours,
                measurement_date: measurementDate,
                source_data: sleep,
              });
            }
          }
        } catch (e) {
          console.error('⚠️ Error processing sleep item:', e);
        }
      }
    }
    
    if (payload.type === 'daily') {
      console.log('📊 Processing daily data');
      for (const daily of data) {
        try {
          const dateStr = (daily.day_start || daily.start_time || daily.timestamp || daily.date || new Date().toISOString()).split('T')[0];
          const source = provider.toLowerCase();

          // Recovery Score (%)
          const recovery = daily.recovery_score ?? daily.recovery?.score ?? daily.recovery_score_percentage ?? daily.recovery_percentage;
          if (typeof recovery === 'number') {
            const { data: recMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Recovery Score',
              p_metric_category: 'recovery',
              p_unit: '%',
              p_source: source,
            });
            if (recMetricId) {
              await supabase.from('metric_values').insert({
                user_id: userId,
                metric_id: recMetricId,
                value: recovery,
                measurement_date: dateStr,
                source_data: daily,
              });
            }
          }

          // Sleep Efficiency / Performance / Need Fulfillment (%) if available
          const sleepEfficiency = daily.sleep_efficiency_percentage ?? daily.sleep?.efficiency_percentage;
          if (typeof sleepEfficiency === 'number') {
            const { data: effMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Sleep Efficiency',
              p_metric_category: 'sleep',
              p_unit: '%',
              p_source: source,
            });
            if (effMetricId) {
              await supabase.from('metric_values').insert({
                user_id: userId,
                metric_id: effMetricId,
                value: sleepEfficiency,
                measurement_date: dateStr,
                source_data: daily,
              });
            }
          }

          const sleepPerformance = daily.sleep_performance_percentage ?? daily.sleep?.performance_percentage;
          if (typeof sleepPerformance === 'number') {
            const { data: perfMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Sleep Performance',
              p_metric_category: 'sleep',
              p_unit: '%',
              p_source: source,
            });
            if (perfMetricId) {
              await supabase.from('metric_values').insert({
                user_id: userId,
                metric_id: perfMetricId,
                value: sleepPerformance,
                measurement_date: dateStr,
                source_data: daily,
              });
            }
          }

          const sleepNeed = daily.sleep_need_fulfillment_percentage ?? daily.sleep?.need_fulfillment_percentage;
          if (typeof sleepNeed === 'number') {
            const { data: needMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Sleep Need Fulfillment',
              p_metric_category: 'sleep',
              p_unit: '%',
              p_source: source,
            });
            if (needMetricId) {
              await supabase.from('metric_values').insert({
                user_id: userId,
                metric_id: needMetricId,
                value: sleepNeed,
                measurement_date: dateStr,
                source_data: daily,
              });
            }
          }

          // Resting Heart Rate (bpm)
          const rhr = daily.resting_hr_bpm ?? daily.resting_heart_rate_bpm ?? daily.resting_hr ?? daily.resting_heart_rate;
          if (typeof rhr === 'number') {
            const { data: rhrMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Resting Heart Rate',
              p_metric_category: 'cardio',
              p_unit: 'bpm',
              p_source: source,
            });
            if (rhrMetricId) {
              await supabase.from('metric_values').insert({
                user_id: userId,
                metric_id: rhrMetricId,
                value: rhr,
                measurement_date: dateStr,
                source_data: daily,
              });
            }
          }

          // HRV RMSSD (ms)
          const hrv = daily.hrv_rmssd_ms ?? daily.hrv?.rmssd_ms ?? daily.hrv?.rmssd_milli;
          if (typeof hrv === 'number') {
            const { data: hrvMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'HRV RMSSD',
              p_metric_category: 'recovery',
              p_unit: 'ms',
              p_source: source,
            });
            if (hrvMetricId) {
              await supabase.from('metric_values').insert({
                user_id: userId,
                metric_id: hrvMetricId,
                value: hrv,
                measurement_date: dateStr,
                source_data: daily,
              });
            }
          }
        } catch (e) {
          console.error('⚠️ Error processing daily item:', e);
        }
      }
    }

    console.log(`✅ Processed Terra ${payload.type} data from ${provider} for user ${userId}`);
  } catch (error) {
    console.error('❌ Error in processTerraData:', error);
    throw error;
  }
}
