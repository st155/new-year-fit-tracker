import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🌐 Terra integration request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const terraApiKey = Deno.env.get('TERRA_API_KEY')!;
    const terraDevId = Deno.env.get('TERRA_DEV_ID')!;

    console.log('🔑 Environment check:', {
      supabaseUrl: supabaseUrl ? '✅' : '❌',
      supabaseKey: supabaseKey ? '✅' : '❌',
      terraApiKey: terraApiKey ? `✅ (${terraApiKey.substring(0, 8)}...)` : '❌',
      terraDevId: terraDevId ? `✅ (${terraDevId})` : '❌'
    });

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, provider, userId: requestUserId } = body;

    let user: any;

    // Если передан userId (от cron-задачи), используем его напрямую
    if (requestUserId) {
      console.log('🔐 Using userId from request (cron mode):', requestUserId);
      user = { id: requestUserId };
    } else {
      // Обычный режим - получаем пользователя из JWT
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        console.error('❌ No authorization header provided');
        throw new Error('Missing authorization header');
      }

      console.log('🔐 Authenticating user via JWT...');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (authError || !authUser) {
        console.error('❌ Authentication failed:', authError);
        throw new Error('Unauthorized');
      }

      user = authUser;
      console.log('✅ User authenticated:', user.id);
    }
    console.log('📋 Action requested:', { action, provider, userId: user.id });

    // Generate Widget Session (for iframe embedding)
    if (action === 'generate-widget-session') {
      console.log('🔗 Generating widget session...');
      const authSuccessUrl = `${req.headers.get('origin')}/integrations`;
      const authFailureUrl = `${req.headers.get('origin')}/integrations`;
      
      console.log('🔄 Calling Terra Widget API...');
      const response = await fetch('https://api.tryterra.co/v2/auth/generateWidgetSession', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'dev-id': terraDevId,
          'x-api-key': terraApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference_id: user.id,
          providers: 'ULTRAHUMAN,OURA,GARMIN,WITHINGS,POLAR',
          language: 'en',
          auth_success_redirect_url: authSuccessUrl,
          auth_failure_redirect_url: authFailureUrl,
        }),
      });

      console.log('📡 Terra Widget API response status:', response.status);

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Terra widget error:', error);
        throw new Error(`Terra API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Terra widget session created:', JSON.stringify(data, null, 2));

      return new Response(
        JSON.stringify({ url: data.url, sessionId: data.session_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Получить URL авторизации Terra (legacy, for specific provider)
    if (action === 'get-auth-url') {
      const authSuccessUrl = `${req.headers.get('origin')}/terra-callback`;
      const authFailureUrl = `${req.headers.get('origin')}/terra-callback`;
      
      const response = await fetch('https://api.tryterra.co/v2/auth/generateWidgetSession', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'dev-id': terraDevId,
          'x-api-key': terraApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference_id: user.id,
          providers: provider,
          language: 'en',
          auth_success_redirect_url: authSuccessUrl,
          auth_failure_redirect_url: authFailureUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Terra widget error:', error);
        throw new Error(`Terra API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Terra widget session created:', data);

      return new Response(
        JSON.stringify({ authUrl: data.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Синхронизировать данные
    if (action === 'sync-data') {
      console.log('🔄 Starting data sync for user:', user.id);
      
      const { data: tokens, error: tokensError } = await supabase
        .from('terra_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      console.log('📊 Terra tokens found:', tokens?.length || 0);

      if (tokensError) {
        console.error('❌ Error fetching Terra tokens:', tokensError);
        throw new Error('Database error fetching tokens');
      }

      if (!tokens || tokens.length === 0) {
        console.log('⚠️ No active Terra connections found for user:', user.id);
        throw new Error('No active connections found');
      }

      // Запускаем синхронизацию для всех провайдеров
      for (const token of tokens) {
        console.log(`🔄 Processing token for provider: ${token.provider}, terra_user_id: ${token.terra_user_id}`);
        
        try {
          const endDate = new Date().toISOString().split('T')[0];
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          const start = startDate.toISOString().split('T')[0];

          console.log(`📅 Date range: ${start} to ${endDate}`);

          // Terra API v2 endpoints - используем правильный формат
          const endpoints = [
            { type: 'body', url: `https://api.tryterra.co/v2/body` },
            { type: 'activity', url: `https://api.tryterra.co/v2/activity` },
            { type: 'daily', url: `https://api.tryterra.co/v2/daily` },
            { type: 'sleep', url: `https://api.tryterra.co/v2/sleep` },
            { type: 'nutrition', url: `https://api.tryterra.co/v2/nutrition` }
          ];
          
          let allData: any = { body: [], activity: [], daily: [], sleep: [], nutrition: [] };
          
          // Запрашиваем каждый тип данных отдельно
          for (const endpoint of endpoints) {
            const url = `${endpoint.url}?user_id=${token.terra_user_id}&start_date=${start}&end_date=${endDate}`;
            
            console.log(`📡 Fetching ${endpoint.type} from Terra API...`);
            console.log(`🔗 URL: ${url}`);
            
            const syncResponse = await fetch(url, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'dev-id': terraDevId,
                'x-api-key': terraApiKey,
              },
            });

            console.log(`📊 ${endpoint.type} response status:`, syncResponse.status);

            if (syncResponse.ok) {
              const typeData = await syncResponse.json();
              console.log(`📦 ${endpoint.type} data received:`, JSON.stringify(typeData, null, 2).substring(0, 500) + '...');
              if (typeData.data && Array.isArray(typeData.data)) {
                allData[endpoint.type] = typeData.data;
                console.log(`✅ ${token.provider} ${endpoint.type}: ${typeData.data.length} records`);
              }
            } else {
              const errorText = await syncResponse.text();
              console.error(`❌ Sync failed for ${token.provider} (${endpoint.type}):`, syncResponse.status, errorText.substring(0, 200));
            }
          }

          // Обрабатываем полученные данные
          console.log(`📊 Sync summary for ${token.provider}:`, {
            body: allData.body?.length || 0,
            activity: allData.activity?.length || 0,
            daily: allData.daily?.length || 0,
            sleep: allData.sleep?.length || 0,
            nutrition: allData.nutrition?.length || 0
          });

          // Обрабатываем каждый тип данных
          for (const endpoint of endpoints) {
            if (allData[endpoint.type] && allData[endpoint.type].length > 0) {
              console.log(`🔄 Processing ${endpoint.type} data for ${token.provider}...`);
              await processTerraData(supabase, {
                type: endpoint.type,
                user: { user_id: token.terra_user_id, provider: token.provider },
                data: allData[endpoint.type]
              });
              console.log(`✅ ${endpoint.type} data processed successfully`);
            }
          }
          
          // Update last_sync_date
          await supabase
            .from('terra_tokens')
            .update({ last_sync_date: new Date().toISOString() })
            .eq('id', token.id);
          
          console.log(`✅ Completed sync for ${token.provider}`);
        } catch (error) {
          console.error(`❌ Error syncing ${token.provider}:`, error);
          console.error('Stack trace:', error.stack);
        }
      }

      console.log('✅ All Terra syncs completed');

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Отключить провайдера
    if (action === 'disconnect') {
      await supabase
        .from('terra_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('provider', provider);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Unknown action');

  } catch (error: any) {
    console.error('❌ Terra integration error:', error);
    console.error('Stack trace:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Функция проверки подписи Terra (Web Crypto API)
async function verifyTerraSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    // Парсим заголовок terra-signature: "t=timestamp,v1=signature"
    const parts = signature.split(',');
    let timestamp = '';
    let sig = '';
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') sig = value;
    }
    
    if (!timestamp || !sig) {
      console.error('Invalid signature format', { signature });
      return false;
    }
    
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
    const isValid = computed === sig;
    
    if (!isValid) {
      console.error('Signature verification failed', { expected: sig, computed, timestamp, payloadLength: payload.length });
    }
    return isValid;
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

// Функция обработки данных Terra (синхронизирована с webhook-terra)
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
              external_id: externalId,
            }, {
              onConflict: 'external_id',
              ignoreDuplicates: true,
            });
            
            if (workoutError) {
              console.error('❌ Error upserting workout:', workoutError);
            } else {
              // Store workout metrics in metric_values
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

                // Workout Strain
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
      console.log('📊 Processing body data');
      for (const bodyData of data) {
        try {
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
                
                // Save to metric_values
                const source = provider.toLowerCase();
                
                // Save Weight
                if (measurement.weight_kg) {
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
                      value: measurement.weight_kg,
                      measurement_date: measurementDate,
                      external_id: `terra_${provider}_weight_${measurementDate}`,
                    }, {
                      onConflict: 'user_id,metric_id,measurement_date,external_id',
                    });
                  }
                }
                
                // Save Body Fat
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
          
          // Fallback: direct data format
          if ((bodyData.body_fat_percentage || bodyData.weight_kg) && bodyData.timestamp) {
            const measurementDate = bodyData.timestamp?.split('T')[0];
            const { error: bodyError } = await supabase.from('body_composition').upsert({
              user_id: userId,
              measurement_date: measurementDate,
              weight: bodyData.weight_kg,
              body_fat_percentage: bodyData.body_fat_percentage,
              muscle_mass: bodyData.muscle_mass_kg,
              measurement_method: provider.toLowerCase(),
            }, {
              onConflict: 'user_id,measurement_date',
            });
            
            if (!bodyError) {
              const source = provider.toLowerCase();
              
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
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: sleepMetricId,
                value: hours,
                measurement_date: measurementDate,
                source_data: sleep,
                external_id: `terra_${provider}_sleep_${measurementDate}`,
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
      console.log('📊 Processing daily data');
      for (const daily of data) {
        try {
          const dateStr = (daily.day_start || daily.start_time || daily.timestamp || daily.date || new Date().toISOString()).split('T')[0];
          const source = provider.toLowerCase();

          // Recovery Score
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
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: recMetricId,
                value: recovery,
                measurement_date: dateStr,
                source_data: daily,
                external_id: `terra_${provider}_recovery_${dateStr}`,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }

          // Training Readiness (Garmin)
          const trainingReadiness = daily.training_readiness ?? daily.readiness_score ?? daily.training_readiness_score;
          if (typeof trainingReadiness === 'number') {
            const { data: readinessMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Training Readiness',
              p_metric_category: 'recovery',
              p_unit: '%',
              p_source: source,
            });
            if (readinessMetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: readinessMetricId,
                value: trainingReadiness,
                measurement_date: dateStr,
                source_data: daily,
                external_id: `terra_${provider}_readiness_${dateStr}`,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }

          // Sleep Efficiency
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
                source_data: daily,
                external_id: `terra_${provider}_sleepeff_${dateStr}`,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }

          // Sleep Performance
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
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: perfMetricId,
                value: sleepPerformance,
                measurement_date: dateStr,
                source_data: daily,
                external_id: `terra_${provider}_sleepperf_${dateStr}`,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }

          // Sleep Need Fulfillment
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
                source_data: daily,
                external_id: `terra_${provider}_sleepneed_${dateStr}`,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }

          // Resting Heart Rate
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
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: rhrMetricId,
                value: rhr,
                measurement_date: dateStr,
                source_data: daily,
                external_id: `terra_${provider}_rhr_${dateStr}`,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }

          // HRV RMSSD
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
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: hrvMetricId,
                value: hrv,
                measurement_date: dateStr,
                source_data: daily,
                external_id: `terra_${provider}_hrv_${dateStr}`,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }

          // VO2Max
          const vo2max = daily.oxygen_data?.vo2max_ml_per_min_per_kg ?? daily.vo2max_ml_per_min_per_kg;
          if (typeof vo2max === 'number') {
            const { data: vo2MetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'VO2Max',
              p_metric_category: 'cardio',
              p_unit: 'ml/kg/min',
              p_source: source,
            });
            if (vo2MetricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: vo2MetricId,
                value: vo2max,
                measurement_date: dateStr,
                source_data: daily,
                external_id: `terra_${provider}_vo2max_${dateStr}`,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }
        } catch (e) {
          console.error('⚠️ Error processing daily item:', e);
        }
      }
    }

    if (payload.type === 'nutrition') {
      console.log('📊 Processing nutrition data');
      for (const nutritionData of data) {
        try {
          // Blood Glucose (Ultrahuman)
          if (nutritionData.blood_glucose_data_mg_per_dL) {
            const measurementDate = nutritionData.metadata?.start_time?.split('T')[0] || new Date().toISOString().split('T')[0];
            const { data: metricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Blood Glucose',
              p_metric_category: 'health',
              p_unit: 'mg/dL',
              p_source: provider.toLowerCase(),
            });

            if (metricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: metricId,
                value: nutritionData.blood_glucose_data_mg_per_dL,
                measurement_date: measurementDate,
                external_id: `terra_${provider}_glucose_${measurementDate}`,
                source_data: nutritionData,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
            }
          }
        } catch (e) {
          console.error('⚠️ Error processing nutrition item:', e);
        }
      }
    }

    console.log(`✅ Processed Terra ${payload.type} data from ${provider} for user ${userId}`);
  } catch (error) {
    console.error('❌ Error in processTerraData:', error);
    throw error;
  }
}

