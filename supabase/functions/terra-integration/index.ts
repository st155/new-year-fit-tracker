import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { writeToUnifiedMetrics } from '../_shared/unified-metrics-writer.ts';

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

    // 🔒 SECURITY: Conditional JWT verification based on request type
    // - Cron mode: Allow if requestUserId is provided (internal calls only)
    // - User mode: Require valid JWT token
    
    if (requestUserId) {
      // Cron mode: internal automated sync
      // NOTE: This should only be called by trusted internal services
      console.log('🔐 Using userId from request (cron mode):', requestUserId);
      user = { id: requestUserId };
      
      // Additional security: validate that this is likely a cron call
      // by checking if it's a sync action
      if (action !== 'sync-data') {
        console.error('❌ requestUserId provided but action is not sync-data');
        throw new Error('Invalid request: requestUserId only allowed for sync-data');
      }
    } else {
      // User mode: require authentication via JWT
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        console.error('❌ No authorization header provided');
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('🔐 Authenticating user via JWT...');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (authError || !authUser) {
        console.error('❌ Authentication failed:', authError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      user = authUser;
      console.log('✅ User authenticated:', user.id);
    }
    console.log('📋 Action requested:', { action, provider, userId: user.id });

    // Generate Widget Session (for iframe embedding)
    if (action === 'generate-widget-session') {
      console.log('🔗 Generating widget session...');
      
      // Always use production URL for redirect (Terra callback)
      const redirectUrl = 'https://elite10.club/terra-callback';
      
      console.log('🌐 Using production redirect URL:', redirectUrl);
      console.log('📋 Reference ID:', user.id);
      
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
          providers: 'WHOOP,ULTRAHUMAN,OURA,GARMIN,WITHINGS,POLAR,GOOGLE',
          language: 'en',
          auth_success_redirect_url: redirectUrl,
          auth_failure_redirect_url: redirectUrl,
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
      
      // Retry механизм для запросов к БД
      const fetchTokensWithRetry = async (maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            const { data, error } = await supabase
              .from('terra_tokens')
              .select('id, user_id, provider, terra_user_id, is_active, last_sync_date, created_at')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .abortSignal(AbortSignal.timeout(5000)); // 5s timeout
            
            if (error) throw error;
            return { data, error: null };
          } catch (e) {
            if (i === maxRetries - 1) throw e;
            console.warn(`⚠️ DB retry ${i + 1}/${maxRetries} after error:`, e);
            await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
          }
        }
      };

      const { data: tokens, error: tokensError } = await fetchTokensWithRetry();

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
          
          // Helper function: fetch with timeout and retry
          const fetchWithTimeout = async (url: string, options: any, timeoutMs = 10000, maxRetries = 2) => {
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
              
              try {
                const response = await fetch(url, {
                  ...options,
                  signal: controller.signal
                });
                clearTimeout(timeoutId);
                return response;
              } catch (error: any) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                  const isLastAttempt = attempt === maxRetries;
                  console.warn(`⏱️ Terra API timeout (${timeoutMs}ms) for ${url} - attempt ${attempt + 1}/${maxRetries + 1}`);
                  
                  if (isLastAttempt) {
                    throw new Error(`Terra API timeout after ${maxRetries + 1} attempts`);
                  }
                  
                  // Exponential backoff: 2s, 5s
                  const delay = attempt === 0 ? 2000 : 5000;
                  console.log(`🔄 Retrying in ${delay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  continue;
                }
                
                throw error;
              }
            }
            throw new Error('Max retries exceeded');
          };
          
          // Запрашиваем каждый тип данных отдельно
          for (const endpoint of endpoints) {
            const url = `${endpoint.url}?user_id=${token.terra_user_id}&start_date=${start}&end_date=${endDate}`;
            
            console.log(`📡 Fetching ${endpoint.type} from Terra API...`);
            console.log(`🔗 URL: ${url}`);
            
            try {
              const syncResponse = await fetchWithTimeout(url, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'dev-id': terraDevId,
                  'x-api-key': terraApiKey,
                },
              }, 10000, 2);

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
            } catch (error: any) {
              if (error.message.includes('timeout')) {
                console.error(`⏱️ Terra API timeout for ${endpoint.type}, skipping...`);
                // Continue with other endpoints
              } else {
                console.error(`❌ Error fetching ${endpoint.type}:`, error.message);
              }
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
          const totalStats = {
            insertedCounts: { body: 0, activity: 0, sleep: 0, daily: 0, nutrition: 0 },
            errors: [] as string[],
            hadAnyData: false,
          };

          for (const endpoint of endpoints) {
            if (allData[endpoint.type] && allData[endpoint.type].length > 0) {
              console.log(`🔄 Processing ${endpoint.type} data for ${token.provider}...`);
              const stats = await processTerraData(supabase, {
                type: endpoint.type,
                user: { user_id: token.terra_user_id, provider: token.provider },
                data: allData[endpoint.type]
              });
              
              if (stats) {
                // Merge stats
                Object.keys(stats.insertedCounts).forEach(key => {
                  totalStats.insertedCounts[key] += stats.insertedCounts[key];
                });
                totalStats.errors.push(...stats.errors);
                totalStats.hadAnyData = totalStats.hadAnyData || stats.hadData;
                
                console.log(`✅ ${endpoint.type} processed:`, stats.insertedCounts[endpoint.type], 'records saved');
                if (stats.sampleRecords?.length > 0) {
                  console.log(`📋 Sample records:`, stats.sampleRecords);
                }
              }
            }
          }
          
          // Update last_sync_date ALWAYS after sync (even if no new data)
          const totalSaved = Object.values(totalStats.insertedCounts).reduce((a, b) => a + b, 0);
          await supabase
            .from('terra_tokens')
            .update({ 
              last_sync_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', token.id);
          
          console.log(`✅ Updated last_sync_date for ${token.provider}, saved ${totalSaved} records`);
          
          if (totalSaved === 0 && !totalStats.hadAnyData) {
            console.log(`ℹ️ No new data from ${token.provider}, but sync timestamp updated`);
          }
          
          if (totalStats.errors.length > 0) {
            console.warn(`⚠️ Errors during sync for ${token.provider}:`, totalStats.errors.slice(0, 5));
          }
          
          console.log(`✅ Completed sync for ${token.provider}:`, totalStats.insertedCounts);
        } catch (error) {
          console.error(`❌ Error syncing ${token.provider}:`, error);
          console.error('Stack trace:', error.stack);
        }
      }

      console.log('✅ All Terra syncs completed');

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Sync completed',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Отключить провайдера
    if (action === 'disconnect') {
      console.log('🔌 Disconnecting provider:', { userId: user.id, provider });
      
      const { error: disconnectError } = await supabase
        .from('terra_tokens')
        .update({ 
          is_active: false,
          last_sync_date: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('provider', provider);

      if (disconnectError) {
        console.error('❌ Failed to disconnect provider:', disconnectError);
        throw disconnectError;
      }

      console.log('✅ Successfully disconnected provider:', provider);

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
  const stats = {
    insertedCounts: { body: 0, activity: 0, sleep: 0, daily: 0, nutrition: 0 },
    errors: [] as string[],
    hadData: false,
    sampleRecords: [] as any[],
  };

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
      stats.errors.push('Missing user.user_id in payload');
      return stats;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ Empty data array, skipping processing');
      return stats;
    }

    stats.hadData = true;
    
    const { data: tokenData, error: tokenError } = await supabase
      .from('terra_tokens')
      .select('user_id, provider')
      .eq('terra_user_id', user.user_id)
      .eq('is_active', true)
      .maybeSingle();

    if (tokenError) {
      console.error('❌ Error fetching terra_tokens:', tokenError);
      stats.errors.push(`Error fetching terra_tokens: ${tokenError.message}`);
      return stats;
    }

    if (!tokenData) {
      console.error('❌ User not found for Terra user_id:', user.user_id);
      stats.errors.push(`User not found for Terra user_id: ${user.user_id}`);
      return stats;
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
              ignoreDuplicates: false,
            });
            
            if (workoutError) {
              console.error('❌ Error upserting workout:', workoutError);
              stats.errors.push(`Workout upsert failed: ${workoutError.message}`);
            } else {
              stats.insertedCounts.activity++;
              if (stats.sampleRecords.length < 3) {
                stats.sampleRecords.push({ type: 'activity', date: workout.start_time?.split('T')[0], external_id: externalId });
              }
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
                    const { error: metricError } = await supabase.from('metric_values').upsert({
                      user_id: userId,
                      metric_id: avgHrMetricId,
                      value: avgHr,
                      measurement_date: measurementDate,
                      external_id: `terra_${provider}_avghr_${workout.start_time}`,
                    }, {
                      onConflict: 'user_id,metric_id,measurement_date,external_id',
                    });
                    if (metricError) {
                      console.error('❌ Error upserting avg HR metric:', metricError);
                      stats.errors.push(`Avg HR metric upsert: ${metricError.message}`);
                    } else {
                      // Write to unified metrics
                      await writeToUnifiedMetrics(supabase, {
                        userId,
                        metricName: 'Average Heart Rate',
                        source: provider,
                        value: avgHr,
                        unit: 'bpm',
                        measurementDate,
                      });
                    }
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
                    const { error: maxHrError } = await supabase.from('metric_values').upsert({
                      user_id: userId,
                      metric_id: maxHrMetricId,
                      value: maxHr,
                      measurement_date: measurementDate,
                      external_id: `terra_${provider}_maxhr_${workout.start_time}`,
                    }, {
                      onConflict: 'user_id,metric_id,measurement_date,external_id',
                    });
                    
                    if (!maxHrError) {
                      // Write to unified metrics
                      await writeToUnifiedMetrics(supabase, {
                        userId,
                        metricName: 'Max Heart Rate',
                        source: provider,
                        value: maxHr,
                        unit: 'bpm',
                        measurementDate,
                      });
                    }
                  }
                }

                // Workout Calories -> Active Calories для унификации
                const calories = activity.calories_data?.total_burned_calories;
                if (typeof calories === 'number') {
                  const { data: caloriesMetricId } = await supabase.rpc('create_or_get_metric', {
                    p_user_id: userId,
                    p_metric_name: 'Active Calories',
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

                // Workout Strain - используем Day Strain для совместимости с виджетами
                const strain = activity.score?.strain ?? activity.strain_score ?? workout.strain_score;
                if (typeof strain === 'number') {
                  const { data: strainMetricId } = await supabase.rpc('create_or_get_metric', {
                    p_user_id: userId,
                    p_metric_name: 'Day Strain',
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
                stats.errors.push(`Body composition upsert: ${bodyError.message}`);
              } else {
                stats.insertedCounts.body++;
                console.log('✅ Saved body composition:', { weight: measurement.weight_kg, fat: measurement.bodyfat_percentage, date: measurementDate });
                if (stats.sampleRecords.length < 3) {
                  stats.sampleRecords.push({ type: 'body', date: measurementDate, weight: measurement.weight_kg });
                }
                
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
                    const { error: weightError } = await supabase.from('metric_values').upsert({
                      user_id: userId,
                      metric_id: weightMetricId,
                      value: measurement.weight_kg,
                      measurement_date: measurementDate,
                      external_id: `terra_${provider}_weight_${measurementDate}`,
                    }, {
                      onConflict: 'user_id,metric_id,measurement_date,external_id',
                    });
                    if (weightError && !weightError.message?.includes('duplicate')) {
                      console.error('❌ Weight metric upsert error:', weightError);
                      stats.errors.push(`Weight metric: ${weightError.message}`);
                    }
                  }
                  
                  // CRITICAL: Also insert into unified_metrics
                  await supabase.from('unified_metrics').upsert({
                    user_id: userId,
                    metric_name: 'Weight',
                    metric_category: 'body',
                    value: measurement.weight_kg,
                    unit: 'kg',
                    measurement_date: measurementDate,
                    source: source,
                    provider: provider,
                    external_id: `terra_${provider}_weight_${measurementDate}`,
                    priority: source === 'withings' ? 4 : 7,
                    confidence_score: 50,
                  }, {
                    onConflict: 'user_id,metric_name,measurement_date,source',
                  });
                  
                  console.log(`✅ Inserted Weight into unified_metrics: ${measurement.weight_kg}kg on ${measurementDate}`);
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
                  
                  // CRITICAL: Also insert into unified_metrics
                  await supabase.from('unified_metrics').upsert({
                    user_id: userId,
                    metric_name: 'Body Fat Percentage',
                    metric_category: 'body',
                    value: measurement.bodyfat_percentage,
                    unit: '%',
                    measurement_date: measurementDate,
                    source: source,
                    provider: provider,
                    external_id: `terra_${provider}_bodyfat_${measurementDate}`,
                    priority: source === 'withings' ? 4 : 7,
                    confidence_score: 50,
                  }, {
                    onConflict: 'user_id,metric_name,measurement_date,source',
                  });
                  
                  console.log(`✅ Inserted Body Fat Percentage into unified_metrics: ${measurement.bodyfat_percentage}% on ${measurementDate}`);
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
              const { error: sleepError } = await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: sleepMetricId,
                value: hours,
                measurement_date: measurementDate,
                source_data: sleep,
                external_id: `terra_${provider}_sleep_${measurementDate}`,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
              if (sleepError) {
                stats.errors.push(`Sleep metric: ${sleepError.message}`);
              } else {
                stats.insertedCounts.sleep++;
                if (stats.sampleRecords.length < 3) {
                  stats.sampleRecords.push({ type: 'sleep', date: measurementDate, hours });
                }
              }
            }
          }

          // Sleep Efficiency
          const sleepEffObj = sleep.sleep_durations_data?.sleep_efficiency ?? 
                              sleep.sleep_efficiency_percentage ?? 
                              sleep.sleep?.efficiency_percentage;
                              
          if (typeof sleepEffObj === 'number' && sleepEffObj > 0) {
            // Convert to percentage if needed (0.95 -> 95%)
            const sleepEff = sleepEffObj < 1 ? sleepEffObj * 100 : sleepEffObj;
            
            const { data: effMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Sleep Efficiency',
              p_metric_category: 'sleep',
              p_unit: '%',
              p_source: provider.toLowerCase(),
            });
            
            if (effMetricId) {
              const { error: effError } = await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: effMetricId,
                value: Math.round(sleepEff * 10) / 10, // Round to 1 decimal
                measurement_date: measurementDate,
                source_data: sleep,
                external_id: `terra_${provider}_sleepeff_${measurementDate}`,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
              
              if (!effError) {
                stats.insertedCounts.sleep++;
                if (stats.sampleRecords.length < 5) {
                  stats.sampleRecords.push({ type: 'sleep_efficiency', date: measurementDate, efficiency: sleepEff });
                }
              }
            }
          } else if (provider === 'ULTRAHUMAN') {
            // Для Ultrahuman рассчитываем Sleep Efficiency на основе других полей
            const durations = sleep.sleep_durations_data;
            const totalSleep = (durations?.asleep?.duration_deep_sleep_state_seconds || 0) +
                              (durations?.asleep?.duration_light_sleep_state_seconds || 0) +
                              (durations?.asleep?.duration_REM_sleep_state_seconds || 0);
            
            const timeInBed = durations?.time_in_bed_seconds || 
                             durations?.asleep?.time_in_bed_seconds ||
                             (totalSleep + (durations?.awake?.duration_awake_state_seconds || 0));
            
            if (totalSleep > 0 && timeInBed > 0 && totalSleep <= timeInBed) {
              const calculatedEfficiency = Math.round((totalSleep / timeInBed) * 10000) / 100;
              
              const { data: effMetricId } = await supabase.rpc('create_or_get_metric', {
                p_user_id: userId,
                p_metric_name: 'Sleep Efficiency',
                p_metric_category: 'sleep',
                p_unit: '%',
                p_source: provider.toLowerCase(),
              });
              
              if (effMetricId) {
                const { error: effError } = await supabase.from('metric_values').upsert({
                  user_id: userId,
                  metric_id: effMetricId,
                  value: Math.min(calculatedEfficiency, 100),
                  measurement_date: measurementDate,
                  source_data: sleep,
                  external_id: `terra_${provider}_sleepeff_calc_${measurementDate}`,
                }, {
                  onConflict: 'user_id,metric_id,measurement_date,external_id',
                });
                
                if (!effError) {
                  stats.insertedCounts.sleep++;
                  if (stats.sampleRecords.length < 5) {
                    stats.sampleRecords.push({ type: 'sleep_efficiency_calc', date: measurementDate, efficiency: calculatedEfficiency });
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('⚠️ Error processing sleep item:', e);
          stats.errors.push(`Sleep processing error: ${e.message}`);
        }
      }
      console.log(`✅ sleep data processed successfully`);
    }
    
    if (payload.type === 'daily') {
      console.log('📊 Processing daily data');
      for (const daily of data) {
        try {
          const dateStr = (daily.day_start || daily.start_time || daily.timestamp || daily.date || new Date().toISOString()).split('T')[0];
          const source = provider.toLowerCase();

          let metricsInserted = 0;

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
              const { error: recError } = await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: recMetricId,
                value: recovery,
                measurement_date: dateStr,
                source_data: daily,
                external_id: `terra_${provider}_recovery_${dateStr}`,
              }, {
                onConflict: 'user_id,metric_id,measurement_date,external_id',
              });
              if (!recError) {
                stats.insertedCounts.daily++;
                metricsInserted++;
                if (stats.sampleRecords.length < 3) {
                  stats.sampleRecords.push({ type: 'daily_recovery', date: dateStr, value: recovery });
                }
                
                // Write to unified metrics
                await writeToUnifiedMetrics(supabase, {
                  userId,
                  metricName: 'Recovery Score',
                  source: provider,
                  value: recovery,
                  unit: '%',
                  measurementDate: dateStr,
                });
              } else {
                stats.errors.push(`Recovery metric: ${recError.message}`);
              }
            }
          }

          // Training Readiness (Garmin) / Body Battery
          if (source === 'garmin') {
            const trainingReadiness = 
              daily.training_readiness ?? 
              daily.readiness_score ?? 
              daily.training_readiness_score ??
              daily.body_battery?.score ??
              daily.body_battery;
              
            if (typeof trainingReadiness === 'number') {
              console.log(`✅ Found Training Readiness: ${trainingReadiness} for ${dateStr}`);
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
                stats.insertedCounts.daily++;
                metricsInserted++;
              }
            }
          }

          // Day Strain (Whoop) - ВАЖНО: используем "Day Strain", не "Workout Strain"
          if (source === 'whoop') {
            const dayStrain = daily.score?.strain ?? daily.strain ?? daily.day_strain;
            if (typeof dayStrain === 'number') {
              console.log(`✅ Found Day Strain: ${dayStrain} for ${dateStr}`);
              const { data: strainMetricId } = await supabase.rpc('create_or_get_metric', {
                p_user_id: userId,
                p_metric_name: 'Day Strain',
                p_metric_category: 'workout',
                p_unit: '',
                p_source: source,
              });
              if (strainMetricId) {
                const { error: strainError } = await supabase.from('metric_values').upsert({
                  user_id: userId,
                  metric_id: strainMetricId,
                  value: dayStrain,
                  measurement_date: dateStr,
                  source_data: daily,
                  external_id: `terra_${provider}_daystrain_${dateStr}`,
                }, {
                  onConflict: 'user_id,metric_id,measurement_date,external_id',
                });
                
                if (!strainError) {
                  stats.insertedCounts.daily++;
                  metricsInserted++;
                  
                  // Write to unified metrics
                  await writeToUnifiedMetrics(supabase, {
                    userId,
                    metricName: 'Day Strain',
                    source: provider,
                    value: dayStrain,
                    unit: '',
                    measurementDate: dateStr,
                  });
                }
              }
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
              metricsInserted++;
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
              metricsInserted++;
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
              metricsInserted++;
            }
          }

          // Steps (always update to maximum value for incremental metric)
          const steps = daily.steps ?? daily.steps_data?.steps ?? daily.distance_data?.steps;
          if (typeof steps === 'number') {
            const { data: stepsMetricId } = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: 'Steps',
              p_metric_category: 'activity',
              p_unit: 'steps',
              p_source: source,
            });
            if (stepsMetricId) {
              // Check existing value to only update if new is greater
              const { data: existing } = await supabase
                .from('metric_values')
                .select('value')
                .eq('user_id', userId)
                .eq('metric_id', stepsMetricId)
                .eq('measurement_date', dateStr)
                .eq('external_id', `terra_${provider}_steps_${dateStr}`)
                .maybeSingle();

              const shouldUpdate = !existing || steps > existing.value;

              if (shouldUpdate) {
                await supabase.from('metric_values').upsert({
                  user_id: userId,
                  metric_id: stepsMetricId,
                  value: steps,
                  measurement_date: dateStr,
                  source_data: daily,
                  external_id: `terra_${provider}_steps_${dateStr}`,
                }, {
                  onConflict: 'user_id,metric_id,measurement_date,external_id',
                });
                metricsInserted++;
                console.log(`📊 Steps updated: ${existing?.value || 0} → ${steps}`);
              } else {
                console.log(`⏭️ Steps skipped: ${steps} <= ${existing.value} (existing)`);
              }
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
              metricsInserted++;
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
              metricsInserted++;
            }
          }
          
          console.log(`✅ [${provider}] Daily metrics for ${dateStr}: ${metricsInserted} metrics saved`);
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

