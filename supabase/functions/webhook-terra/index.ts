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

    // Get user_id for logging
    let userId = null;
    if (payload.user?.user_id) {
      const { data: tokenData } = await supabase
        .from('terra_tokens')
        .select('user_id')
        .eq('terra_user_id', payload.user.user_id)
        .eq('is_active', true)
        .maybeSingle();
      userId = tokenData?.user_id || null;
    }

    // Log webhook receipt
    await supabase.from('webhook_logs').insert({
      webhook_type: 'terra',
      event_type: payload.type,
      terra_user_id: payload.user?.user_id || null,
      user_id: userId,
      payload: payload,
      status: 'received',
      created_at: new Date().toISOString()
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

      // 🆕 АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ: Запускаем первую синхронизацию после подключения
      console.log('🔄 Triggering initial sync for newly connected device...');
      try {
        const { data: syncResult, error: syncError } = await supabase.functions.invoke('terra-integration', {
          body: {
            action: 'sync-data',
            userId: reference_id,
            provider: provider
          },
          headers: {
            Authorization: `Bearer ${supabaseKey}`
          }
        });
        
        if (syncError) {
          console.error('❌ Initial sync failed:', syncError);
        } else {
          console.log('✅ Initial sync triggered successfully');
        }
      } catch (e) {
        console.error('❌ Error triggering initial sync:', e);
      }

      // Создаем/обновляем запись в terra_users для корректной обработки данных
      const { data: existingUser } = await supabase
        .from('terra_users')
        .select('user_id')
        .eq('user_id', terraUser.user_id)
        .maybeSingle();

      const terraUserData = {
        user_id: terraUser.user_id,
        provider: provider,
        reference_id: reference_id,
        granted_scopes: terraUser.scopes || null,
        state: terraUser.active ? 'active' : 'inactive',
        created_at: terraUser.created_at || new Date().toISOString(),
      };

      if (existingUser) {
        await supabase
          .from('terra_users')
          .update(terraUserData)
          .eq('user_id', terraUser.user_id);
        console.log('✅ Updated terra_users');
      } else {
        await supabase
          .from('terra_users')
          .insert(terraUserData);
        console.log('✅ Inserted new terra_users');
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Обработка user_reauth - когда пользователь переподключился и получил новый user_id
    if (payload.type === 'user_reauth') {
      const { old_user, new_user } = payload;
      const provider = new_user.provider?.toUpperCase();
      
      console.log('🔄 User reauth:', { 
        old_user_id: old_user.user_id, 
        new_user_id: new_user.user_id,
        provider,
        reference_id: new_user.reference_id 
      });

      // Обновляем terra_user_id в terra_tokens
      await supabase
        .from('terra_tokens')
        .update({ 
          terra_user_id: new_user.user_id,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', new_user.reference_id)
        .eq('provider', provider);

      // Обновляем terra_users
      const terraUserData = {
        user_id: new_user.user_id,
        provider: provider,
        reference_id: new_user.reference_id,
        granted_scopes: new_user.scopes || null,
        state: new_user.active ? 'active' : 'inactive',
        created_at: new Date().toISOString(),
      };

      await supabase
        .from('terra_users')
        .upsert(terraUserData, { onConflict: 'user_id' });

      console.log('✅ Updated tokens and users for reauth');
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (['activity', 'body', 'daily', 'sleep', 'nutrition', 'athlete'].includes(payload.type)) {
      console.log(`🔄 Processing ${payload.type} webhook for user: ${payload.user?.user_id}`);
      
      let processingError: Error | null = null;
      
      try {
        await processTerraData(supabase, payload);
        console.log(`✅ ${payload.type} data processed successfully`);
      } catch (error) {
        console.error(`❌ Error processing ${payload.type} data:`, error);
        processingError = error as Error;
        
        // Log failed webhook for retry
        const { data: tokenData } = await supabase
          .from('terra_tokens')
          .select('user_id')
          .eq('terra_user_id', payload.user.user_id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (tokenData) {
          await supabase.from('failed_webhook_processing').insert({
            webhook_log_id: null,
            user_id: tokenData.user_id,
            provider: payload.user.provider?.toUpperCase() || 'UNKNOWN',
            payload: payload,
            error_message: error.message,
            retry_count: 0,
            next_retry_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // Retry in 2 minutes
            status: 'pending',
          });
          console.log('📝 Logged failed webhook for retry');
        }
      }
      
      // Обновляем last_sync_date и data freshness tracking
      if (payload.user?.user_id && !processingError) {
        const { data: tokenData } = await supabase
          .from('terra_tokens')
          .select('user_id, provider')
          .eq('terra_user_id', payload.user.user_id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (tokenData) {
          // Update last_sync_date
          const { error: updateError } = await supabase
            .from('terra_tokens')
            .update({ last_sync_date: new Date().toISOString() })
            .eq('terra_user_id', payload.user.user_id);
          
          if (updateError) {
            console.error('❌ Error updating last_sync_date:', updateError);
          } else {
            console.log(`✅ Updated last_sync_date for user: ${payload.user.user_id}`);
          }
          
          // Update data freshness tracking
          const dataDate = payload.data?.[0]?.metadata?.start_time || payload.data?.[0]?.metadata?.end_time;
          const receivedDate = dataDate ? new Date(dataDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          
          await supabase
            .from('data_freshness_tracking')
            .upsert({
              user_id: tokenData.user_id,
              provider: tokenData.provider,
              data_type: payload.type,
              last_received_at: new Date().toISOString(),
              last_received_date: receivedDate,
              consecutive_missing_days: 0,
              alert_sent: false,
            }, { onConflict: 'user_id,provider,data_type' });
          
          console.log(`✅ Updated data freshness tracking for ${payload.type}`);
        }
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
      .select('user_id, provider, terra_user_id')
      .eq('terra_user_id', user.user_id)
      .eq('is_active', true)
      .single();

    if (tokenError) {
      console.error('❌ Error fetching terra_tokens:', tokenError);
      
      // Fallback: check if user reconnected device (new terra_user_id)
      if (user.reference_id && user.provider) {
        const { data: existingToken } = await supabase
          .from('terra_tokens')
          .select('*')
          .eq('user_id', user.reference_id)
          .eq('provider', user.provider.toUpperCase())
          .single();
        
        if (existingToken && existingToken.terra_user_id !== user.user_id) {
          console.log('🔄 Updating terra_user_id for reconnected device:', {
            old: existingToken.terra_user_id,
            new: user.user_id,
            provider: user.provider
          });
          
          const { error: updateError } = await supabase
            .from('terra_tokens')
            .update({ 
              terra_user_id: user.user_id,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.reference_id)
            .eq('provider', user.provider.toUpperCase());
          
          if (updateError) {
            console.error('❌ Error updating terra_user_id:', updateError);
            return;
          }
          
          // Refetch the updated token
          const { data: updatedToken, error: refetchError } = await supabase
            .from('terra_tokens')
            .select('user_id, provider, terra_user_id')
            .eq('terra_user_id', user.user_id)
            .eq('is_active', true)
            .single();
          
          if (refetchError || !updatedToken) {
            console.error('❌ Error refetching updated token:', refetchError);
            return;
          }
          
          // Continue processing with the updated token - fall through to main logic
          const userId = updatedToken.user_id;
          const provider = updatedToken.provider;
          console.log('✅ Found user after update:', { userId, provider });
          
          // Replace tokenError/tokenData to continue normally
          Object.assign(tokenData || {}, updatedToken);
        }
      }
      
      if (!tokenData) {
        return;
      }
    }

    if (!tokenData) {
      console.error('❌ User not found for Terra user_id:', user.user_id, '— trying reference_id fallback');
      // Fallback: if webhook includes reference_id, bind token now
      if (payload.reference_id && payload.user?.provider) {
        const provider = String(payload.user.provider).toUpperCase();
        try {
          await supabase.from('terra_tokens').insert({
            user_id: String(payload.reference_id),
            terra_user_id: String(user.user_id),
            provider,
            is_active: true,
            last_sync_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
          console.log('✅ Bound terra_token via reference_id fallback');
        } catch (e) {
          console.error('⚠️ Failed to bind via reference_id fallback:', e);
          // Persist minimal diagnostic payload for reconciliation
          try {
            await supabase.from('terra_data_payloads').insert({
              user_id: String(user.user_id),
              data_type: String(payload.type),
              payload_id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
              start_time: payload.data?.[0]?.metadata?.start_time || null,
              end_time: payload.data?.[0]?.metadata?.end_time || null,
            });
          } catch (_) {}
          return;
        }
      } else {
        // No mapping possible; store diagnostic breadcrumb
        try {
          await supabase.from('terra_data_payloads').insert({
            user_id: String(user.user_id),
            data_type: String(payload.type),
            payload_id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            start_time: payload.data?.[0]?.metadata?.start_time || null,
            end_time: payload.data?.[0]?.metadata?.end_time || null,
          });
        } catch (_) {}
        return;
      }
      // fetch mapping again after fallback
      const { data: tokenDataRetry } = await supabase
        .from('terra_tokens')
        .select('user_id, provider')
        .eq('terra_user_id', user.user_id)
        .eq('is_active', true)
        .maybeSingle();
      if (!tokenDataRetry) return;
      const userId = tokenDataRetry.user_id;
      const provider = tokenDataRetry.provider;
      console.log('✅ Mapping established via fallback:', { userId, provider });
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
                    p_metric_category: 'cardio',
                    p_unit: 'bpm',
                    p_source: source,
                  });
                  if (avgHrMetricId) {
                    await supabase.from('metric_values').upsert({
                      user_id: userId,
                      metric_id: avgHrMetricId,
                      value: avgHr,
                      measurement_date: measurementDate,
                      external_id: `terra_${provider}_avghr_${workout.start_time}`,
                    }, {
                      onConflict: 'user_id,metric_id,measurement_date,external_id',
                    });
                  }
                }

                // Max Heart Rate
                const maxHr = activity.heart_rate_data?.max_hr_bpm;
                if (typeof maxHr === 'number') {
                  const { data: maxHrMetricId } = await supabase.rpc('create_or_get_metric', {
                    p_user_id: userId,
                    p_metric_name: 'Max Heart Rate',
                    p_metric_category: 'cardio',
                    p_unit: 'bpm',
                    p_source: source,
                  });
                  if (maxHrMetricId) {
                    await supabase.from('metric_values').upsert({
                      user_id: userId,
                      metric_id: maxHrMetricId,
                      value: maxHr,
                      measurement_date: measurementDate,
                      external_id: `terra_${provider}_maxhr_${workout.start_time}`,
                    }, {
                      onConflict: 'user_id,metric_id,measurement_date,external_id',
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
                    await supabase.from('metric_values').upsert({
                      user_id: userId,
                      metric_id: caloriesMetricId,
                      value: calories,
                      measurement_date: measurementDate,
                      external_id: externalId,
                      source_data: activity,
                    }, {
                      onConflict: 'user_id,metric_id,measurement_date,external_id',
                    });
                  }
                }

                // Workout Strain (if provided by provider)
                const strain = activity.score?.strain ?? activity.strain_score ?? workout.strain_score;
                if (typeof strain === 'number') {
                  const strainMetricId = await supabase.rpc('create_or_get_metric', {
                    p_user_id: userId,
                    p_metric_name: 'Workout Strain',
                    p_metric_category: 'workout',
                    p_unit: '',
                    p_source: source,
                  });
                  if (strainMetricId) {
                    await supabase.from('metric_values').upsert({
                      user_id: userId,
                      metric_id: strainMetricId,
                      value: strain,
                      measurement_date: measurementDate,
                      external_id: externalId,
                      source_data: activity,
                    }, {
                      onConflict: 'user_id,metric_id,measurement_date,external_id',
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
      console.log('📊 Processing body data', { 
        dataLength: data.length,
        provider,
        userId,
        firstItem: data[0] ? JSON.stringify(data[0]).substring(0, 500) : 'no data'
      });
      for (const bodyData of data) {
        try {
          // Terra возвращает measurements_data.measurements[] для Withings и других провайдеров
          const measurements = bodyData.measurements_data?.measurements || [];
          
          console.log('Body item:', { 
            hasMeasurements: measurements.length > 0,
            measurementsCount: measurements.length,
            hasDirectWeight: !!bodyData.weight_kg,
            hasDirectFat: !!bodyData.body_fat_percentage,
            rawMeasurements: JSON.stringify(measurements).substring(0, 500)
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
                console.log('✅ Saved body composition:', { 
                  weight: measurement.weight_kg, 
                  fat: measurement.bodyfat_percentage, 
                  date: measurementDate,
                  userId,
                  provider
                });
                
                // Also save to metric_values for dashboard display
                const source = provider.toLowerCase();
                
                // Save Weight
                if (measurement.weight_kg) {
                  const { data: weightMetricId, error: metricError } = await supabase.rpc('create_or_get_metric', {
                    p_user_id: userId,
                    p_metric_name: 'Weight',
                    p_metric_category: 'body',
                    p_unit: 'kg',
                    p_source: source,
                  });
                  
                  if (metricError) {
                    console.error('❌ Error creating/getting Weight metric:', metricError);
                  } else {
                    console.log('✅ Weight metric ID:', weightMetricId);
                    const { error: insertError } = await supabase.from('metric_values').upsert({
                      user_id: userId,
                      metric_id: weightMetricId,
                      value: measurement.weight_kg,
                      measurement_date: measurementDate,
                      external_id: `terra_${provider}_weight_${measurementDate}`,
                    }, {
                      onConflict: 'user_id,metric_id,measurement_date,external_id',
                    });
                    
                    if (insertError) {
                      console.error('❌ Error inserting weight metric value:', insertError);
                    } else {
                      console.log('✅ Weight metric value saved:', { value: measurement.weight_kg, date: measurementDate });
                    }
                  }
                }
                
                // Save Body Fat Percentage
                if (measurement.bodyfat_percentage) {
                  const { data: fatMetricId } = await supabase.rpc('create_or_get_metric', {
                    p_user_id: userId,
                    p_metric_name: 'Body Fat Percentage',
                    p_metric_category: 'body',
                    p_unit: '%',
                    p_source: source,
                  });
                  if (fatMetricId) {
                    await supabase.from('metric_values').upsert({
                      user_id: userId,
                      metric_id: fatMetricId,
                      value: measurement.bodyfat_percentage,
                      measurement_date: measurementDate,
                      external_id: `terra_${provider}_bodyfat_${measurementDate}`,
                    }, {
                      onConflict: 'user_id,metric_id,measurement_date,external_id',
                    });
                  }
                }
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
              
              // Also save to metric_values for dashboard display (fallback)
              const source = provider.toLowerCase();
              const measurementDate = bodyData.timestamp?.split('T')[0];
              
              if (bodyData.weight_kg && measurementDate) {
                const { data: weightMetricId } = await supabase.rpc('create_or_get_metric', {
                  p_user_id: userId,
                  p_metric_name: 'Weight',
                  p_metric_category: 'body',
                  p_unit: 'kg',
                  p_source: source,
                });
                if (weightMetricId) {
                  await supabase.from('metric_values').upsert({
                    user_id: userId,
                    metric_id: weightMetricId,
                    value: bodyData.weight_kg,
                    measurement_date: measurementDate,
                    external_id: `terra_${provider}_weight_${measurementDate}`,
                  }, {
                    onConflict: 'user_id,metric_id,measurement_date,external_id',
                  });
                }
              }
              
              if (bodyData.body_fat_percentage && measurementDate) {
                const { data: fatMetricId } = await supabase.rpc('create_or_get_metric', {
                  p_user_id: userId,
                  p_metric_name: 'Body Fat Percentage',
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
                  }, {
                    onConflict: 'user_id,metric_id,measurement_date,external_id',
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error('⚠️ Error processing body item:', e);
        }
      }
    }
    
    if (payload.type === 'sleep') {
      console.log('📊 Processing sleep data');
      for (const sleep of data) {
        try {
          const start = sleep.metadata?.start_time || sleep.start_time || sleep.sleep_start_time || sleep.timestamp;
          const end = sleep.metadata?.end_time || sleep.end_time || sleep.sleep_end_time;
          const measurementDate = (start || end || new Date().toISOString()).split('T')[0];
          const source = provider.toLowerCase();
          const externalIdBase = `terra_${provider}_sleep_${measurementDate}`;
          
          // Sleep Duration (from sleep_durations_data.asleep.duration_asleep_state_seconds or calculated)
          let durationSeconds = sleep.sleep_durations_data?.asleep?.duration_asleep_state_seconds || 
                               sleep.sleep_durations_data?.other?.duration_in_bed_seconds ||
                               sleep.duration_seconds || sleep.duration_sec || sleep.duration || null;
          if (!durationSeconds && start && end) {
            durationSeconds = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
          }
          
          if (durationSeconds) {
            const hours = Math.round((durationSeconds / 3600) * 10) / 10;
            const { data: sleepMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Sleep Duration',
              p_metric_category: 'sleep',
              p_unit: 'h',
              p_source: source,
            });
            if (sleepMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: sleepMetricId,
                value: hours,
                measurement_date: measurementDate,
                external_id: `${externalIdBase}_duration`,
                source_data: sleep,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }
          
          // Deep Sleep Duration (in hours)
          const deepSleepSeconds = sleep.sleep_durations_data?.asleep?.duration_deep_sleep_state_seconds;
          if (typeof deepSleepSeconds === 'number') {
            const deepHours = Math.round((deepSleepSeconds / 3600) * 10) / 10;
            const { data: deepMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Deep Sleep Duration',
              p_metric_category: 'sleep',
              p_unit: 'h',
              p_source: source,
            });
            if (deepMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: deepMetricId,
                value: deepHours,
                measurement_date: measurementDate,
                external_id: `${externalIdBase}_deep`,
                source_data: sleep,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }
          
          // REM Sleep Duration (in hours)
          const remSleepSeconds = sleep.sleep_durations_data?.asleep?.duration_REM_sleep_state_seconds;
          if (typeof remSleepSeconds === 'number') {
            const remHours = Math.round((remSleepSeconds / 3600) * 10) / 10;
            const { data: remMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'REM Sleep Duration',
              p_metric_category: 'sleep',
              p_unit: 'h',
              p_source: source,
            });
            if (remMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: remMetricId,
                value: remHours,
                measurement_date: measurementDate,
                external_id: `${externalIdBase}_rem`,
                source_data: sleep,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }
          
          // Light Sleep Duration (in hours)
          const lightSleepSeconds = sleep.sleep_durations_data?.asleep?.duration_light_sleep_state_seconds;
          if (typeof lightSleepSeconds === 'number') {
            const lightHours = Math.round((lightSleepSeconds / 3600) * 10) / 10;
            const { data: lightMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Light Sleep Duration',
              p_metric_category: 'sleep',
              p_unit: 'h',
              p_source: source,
            });
            if (lightMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: lightMetricId,
                value: lightHours,
                measurement_date: measurementDate,
                external_id: `${externalIdBase}_light`,
                source_data: sleep,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }
          
          // Average HRV RMSSD during sleep
          const hrvSamples = sleep.heart_rate_data?.detailed?.hrv_samples_rmssd;
          if (hrvSamples && hrvSamples.length > 0) {
            const avgHrv = hrvSamples.reduce((sum: number, s: any) => sum + (s.hrv_rmssd || 0), 0) / hrvSamples.length;
            const { data: hrvMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Sleep HRV RMSSD',
              p_metric_category: 'recovery',
              p_unit: 'ms',
              p_source: source,
            });
            if (hrvMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: hrvMetricId,
                value: Math.round(avgHrv),
                measurement_date: measurementDate,
                external_id: `${externalIdBase}_hrv`,
                source_data: sleep,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }
          
          // Average Respiratory Rate during sleep
          const respRate = sleep.respiration_data?.breaths_data?.avg_breaths_per_min;
          if (typeof respRate === 'number') {
            const { data: respMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Respiratory Rate',
              p_metric_category: 'sleep',
              p_unit: 'breaths/min',
              p_source: source,
            });
            if (respMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: respMetricId,
                value: Math.round(respRate * 10) / 10,
                measurement_date: measurementDate,
                external_id: `${externalIdBase}_resp`,
                source_data: sleep,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }
          
          // Sleep Efficiency (if provided)
          const sleepEff = sleep.sleep_durations_data?.sleep_efficiency;
          if (typeof sleepEff === 'number') {
            const { data: effMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Sleep Efficiency',
              p_metric_category: 'sleep',
              p_unit: '%',
              p_source: source,
            });
            if (effMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: effMetricId,
                value: Math.round(sleepEff * 100),
                measurement_date: measurementDate,
                external_id: `${externalIdBase}_efficiency`,
                source_data: sleep,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }
          
        } catch (e) {
          console.error('⚠️ Error processing sleep item:', e);
        }
      }
    }
    
    if (payload.type === 'daily') {
      console.log('📊 Processing daily data', {
        provider,
        dataLength: data.length,
        firstItemKeys: data[0] ? Object.keys(data[0]) : [],
        firstItemScores: data[0]?.scores,
        firstItemStrainData: data[0]?.strain_data,
        firstItemHeartRateData: data[0]?.heart_rate_data?.summary,
        firstItemMetadata: data[0]?.metadata
      });
      
      for (const daily of data) {
        try {
          const dateStr = (daily.metadata?.start_time || daily.metadata?.end_time || daily.day_start || daily.start_time || daily.timestamp || daily.date || new Date().toISOString()).split('T')[0];
          const source = provider.toLowerCase();
          const externalIdBase = `terra_${provider}_daily_${dateStr}`;

          // Recovery Score (%) - включая Whoop формат (scores.recovery)
          const recovery = daily.scores?.recovery ?? daily.recovery_score ?? daily.recovery?.score ?? daily.recovery_score_percentage ?? daily.recovery_percentage;
          if (typeof recovery === 'number') {
            const { data: recMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Recovery Score',
              p_metric_category: 'recovery',
              p_unit: '%',
              p_source: source,
            });
            if (recMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: recMetricId,
                value: recovery,
                measurement_date: dateStr,
                external_id: `${externalIdBase}_recovery`,
                source_data: daily,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
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
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: effMetricId,
                value: sleepEfficiency,
                measurement_date: dateStr,
                external_id: `${externalIdBase}_sleep_eff`,
                source_data: daily,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }

          // Sleep Performance (%) - включая Whoop формат (scores.sleep)
          const sleepPerformance = daily.scores?.sleep ?? daily.sleep_performance_percentage ?? daily.sleep?.performance_percentage;
          if (typeof sleepPerformance === 'number') {
            const { data: perfMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Sleep Performance',
              p_metric_category: 'sleep',
              p_unit: '%',
              p_source: source,
            });
            if (perfMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: perfMetricId,
                value: sleepPerformance,
                measurement_date: dateStr,
                external_id: `${externalIdBase}_sleep_perf`,
                source_data: daily,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
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
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: needMetricId,
                value: sleepNeed,
                measurement_date: dateStr,
                external_id: `${externalIdBase}_sleep_need`,
                source_data: daily,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }

          // Resting Heart Rate (bpm) - попробуем разные варианты
          const rhr = daily.heart_rate_data?.summary?.resting_hr_bpm ?? 
                      daily.resting_hr_bpm ?? 
                      daily.resting_heart_rate_bpm ?? 
                      daily.resting_hr ?? 
                      daily.resting_heart_rate;
          if (typeof rhr === 'number') {
            const { data: rhrMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Resting Heart Rate',
              p_metric_category: 'cardio',
              p_unit: 'bpm',
              p_source: source,
            });
            if (rhrMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: rhrMetricId,
                value: rhr,
                measurement_date: dateStr,
                external_id: `${externalIdBase}_rhr`,
                source_data: daily,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }

          // Average Heart Rate (bpm)
          const avgHr = daily.heart_rate_data?.summary?.avg_hr_bpm;
          if (typeof avgHr === 'number') {
            const { data: avgHrMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Average Heart Rate',
              p_metric_category: 'cardio',
              p_unit: 'bpm',
              p_source: source,
            });
            if (avgHrMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: avgHrMetricId,
                value: avgHr,
                measurement_date: dateStr,
                external_id: `${externalIdBase}_avg_hr`,
                source_data: daily,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }

          // HRV RMSSD (ms) - попробуем разные варианты
          const hrv = daily.heart_rate_data?.summary?.avg_hrv_rmssd ?? 
                      daily.hrv_rmssd_ms ?? 
                      daily.hrv?.rmssd_ms ?? 
                      daily.hrv?.rmssd_milli;
          if (typeof hrv === 'number') {
            const { data: hrvMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'HRV RMSSD',
              p_metric_category: 'recovery',
              p_unit: 'ms',
              p_source: source,
            });
            if (hrvMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: hrvMetricId,
                value: hrv,
                measurement_date: dateStr,
                external_id: `${externalIdBase}_hrv`,
                source_data: daily,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }
          
          // Steps
          const steps = daily.distance_data?.steps;
          if (typeof steps === 'number') {
            const { data: stepsMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Steps',
              p_metric_category: 'activity',
              p_unit: 'steps',
              p_source: source,
            });
            if (stepsMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: stepsMetricId,
                value: steps,
                measurement_date: dateStr,
                external_id: `${externalIdBase}_steps`,
                source_data: daily,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }
          
          // Active Calories
          const activeCalories = daily.calories_data?.net_activity_calories;
          if (typeof activeCalories === 'number') {
            const { data: calMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Active Calories',
              p_metric_category: 'activity',
              p_unit: 'kcal',
              p_source: source,
            });
            if (calMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: calMetricId,
                value: activeCalories,
                measurement_date: dateStr,
                external_id: `${externalIdBase}_active_cal`,
                source_data: daily,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }
          
          // Day Strain - Whoop формат (strain_data.strain_level)
          const dayStrain = daily.strain_data?.strain_level;
          if (typeof dayStrain === 'number') {
            const { data: strainMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Day Strain',
              p_metric_category: 'activity',
              p_unit: '',
              p_source: source,
            });
            if (strainMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: strainMetricId,
                value: dayStrain,
                measurement_date: dateStr,
                external_id: `${externalIdBase}_strain`,
                source_data: daily,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
              console.log(`✅ Saved Day Strain: ${dayStrain} for ${dateStr}`);
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
