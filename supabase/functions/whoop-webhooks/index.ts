import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-whoop-signature, x-whoop-signature-timestamp',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Функция для валидации подписи Whoop
async function validateWhoopSignature(
  body: string,
  signature: string,
  timestamp: string,
  clientSecret: string
): Promise<boolean> {
  try {
    const timestampBodyString = timestamp + body;
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(clientSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(timestampBodyString)
    );
    
    const calculatedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    
    console.log('Calculated signature:', calculatedSignature);
    console.log('Received signature:', signature);
    
    return calculatedSignature === signature;
  } catch (error) {
    console.error('Error validating signature:', error);
    return false;
  }
}

// Функция для обновления токена
async function refreshWhoopToken(refreshToken: string) {
  const clientId = Deno.env.get('WHOOP_CLIENT_ID');
  const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET');
  
  const response = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId!,
      client_secret: clientSecret!,
    }).toString(),
  });
  
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// Функция для получения валидного токена (с автообновлением)
async function getValidAccessToken(userId: string) {
  // Получаем все токены для пользователя и удаляем дубликаты
  const { data: allTokens, error } = await supabase
    .from('whoop_tokens')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
    
  if (error || !allTokens || allTokens.length === 0) {
    console.error('No token found for user:', userId, error);
    throw new Error('No Whoop tokens found');
  }
  
  // Если есть дубликаты, удаляем старые
  if (allTokens.length > 1) {
    console.log(`Found ${allTokens.length} token records for user ${userId}, cleaning up duplicates`);
    const oldTokenIds = allTokens.slice(1).map(t => t.id);
    
    const { error: cleanupError } = await supabase
      .from('whoop_tokens')
      .delete()
      .in('id', oldTokenIds);
      
    if (cleanupError) {
      console.error('Error cleaning up duplicate tokens:', cleanupError);
    } else {
      console.log(`Cleaned up ${oldTokenIds.length} duplicate token records`);
    }
  }
  
  const token = allTokens[0];
  const now = new Date();
  const expiresAt = new Date(token.expires_at);
  
  // Если токен истекает в течение 5 минут, обновляем его
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Token expires soon, refreshing...');
    
    try {
      const refreshResult = await refreshWhoopToken(token.refresh_token);
      
      // Сохраняем новые токены
      const newExpiresAt = new Date(now.getTime() + refreshResult.expires_in * 1000);
      
      const { error: updateError } = await supabase
        .from('whoop_tokens')
        .update({
          access_token: refreshResult.access_token,
          refresh_token: refreshResult.refresh_token || token.refresh_token,
          expires_at: newExpiresAt.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', token.id);
        
      if (updateError) {
        console.error('Failed to update tokens:', updateError);
        throw new Error('Failed to update tokens');
      }
      
      console.log('Token refreshed successfully');
      return refreshResult.access_token;
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      throw new Error('Token refresh failed');
    }
  }
  
  return token.access_token;
}

// Функция для получения токена пользователя из базы данных
async function getUserToken(whoopUserId: string): Promise<{ access_token: string, user_id: string } | null> {
  try {
    console.log(`Looking for user with Whoop ID: ${whoopUserId}`);
    
    // Получаем mapping Whoop user_id -> наш user_id
    const { data: mapping, error: mappingError } = await supabase
      .from('whoop_user_mapping')
      .select('user_id')
      .eq('whoop_user_id', whoopUserId)
      .single();

    if (mappingError || !mapping) {
      console.error('No user mapping found for Whoop user:', whoopUserId, mappingError);
      return null;
    }

    console.log(`Found mapping: Whoop user ${whoopUserId} -> our user ${mapping.user_id}`);

    // Получаем валидный токен с автообновлением
    try {
      const access_token = await getValidAccessToken(mapping.user_id);
      return { access_token, user_id: mapping.user_id };
    } catch (tokenError) {
      console.error('Token validation/refresh failed:', tokenError);
      return null;
    }
  } catch (error) {
    console.error('Error in getUserToken:', error);
    return null;
  }
}

// Функция для получения данных от Whoop API v2
async function fetchWhoopData(
  endpoint: string,
  accessToken: string
): Promise<any> {
  try {
    const response = await fetch(`https://api.prod.whoop.com/developer/v2/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Whoop API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching Whoop data from ${endpoint}:`, error);
    throw error;
  }
}

// Функция для сохранения данных восстановления
async function saveRecoveryData(data: any, userId: string, whoopSleepId: string) {
  try {
    const recoveryMetrics = [
      {
        user_id: userId,
        metric_name: 'Recovery Score',
        metric_category: 'recovery',
        unit: '%',
        source: 'whoop'
      },
      {
        user_id: userId,
        metric_name: 'Sleep Efficiency',
        metric_category: 'sleep',
        unit: '%',
        source: 'whoop'
      },
      {
        user_id: userId,
        metric_name: 'Sleep Performance',
        metric_category: 'sleep',
        unit: '%',
        source: 'whoop'
      }
    ];

    // Создаем или получаем метрики
    for (const metric of recoveryMetrics) {
      const { data: existingMetric } = await supabase
        .from('user_metrics')
        .select('id')
        .eq('user_id', userId)
        .eq('metric_name', metric.metric_name)
        .eq('source', 'whoop')
        .single();

      let metricId = existingMetric?.id;

      if (!metricId) {
        const { data: newMetric, error } = await supabase
          .from('user_metrics')
          .insert(metric)
          .select('id')
          .single();

        if (error) {
          console.error('Error creating metric:', error);
          continue;
        }
        metricId = newMetric.id;
      }

      // Сохраняем значения метрик
      const today = new Date().toISOString().split('T')[0];
      
      if (metric.metric_name === 'Recovery Score' && data.score !== undefined) {
        await supabase.from('metric_values').upsert({
          user_id: userId,
          metric_id: metricId,
          value: data.score,
          measurement_date: today,
          external_id: whoopSleepId,
          source_data: { recovery_data: data, source: 'whoop_webhook' }
        });
      }
      
      // Можно добавить больше метрик из данных восстановления
    }

    console.log('Recovery data saved successfully');
  } catch (error) {
    console.error('Error saving recovery data:', error);
  }
}

// Функция для сохранения данных сна
async function saveSleepData(data: any, userId: string, whoopSleepId: string) {
  try {
    const sleepMetrics = [
      {
        user_id: userId,
        metric_name: 'Sleep Duration',
        metric_category: 'sleep',
        unit: 'hours',
        source: 'whoop'
      },
      {
        user_id: userId,
        metric_name: 'Sleep Efficiency',
        metric_category: 'sleep',
        unit: '%',
        source: 'whoop'
      }
    ];

    for (const metric of sleepMetrics) {
      const { data: existingMetric } = await supabase
        .from('user_metrics')
        .select('id')
        .eq('user_id', userId)
        .eq('metric_name', metric.metric_name)
        .eq('source', 'whoop')
        .single();

      let metricId = existingMetric?.id;

      if (!metricId) {
        const { data: newMetric, error } = await supabase
          .from('user_metrics')
          .insert(metric)
          .select('id')
          .single();

        if (error) {
          console.error('Error creating sleep metric:', error);
          continue;
        }
        metricId = newMetric.id;
      }

      const sleepDate = data.end ? new Date(data.end).toISOString().split('T')[0] : 
                       new Date().toISOString().split('T')[0];

      // Сохраняем значения сна
      if (metric.metric_name === 'Sleep Duration' && data.score?.sleep_duration_score !== undefined) {
        const durationHours = data.score.sleep_duration_score / 100 * 8; // примерный расчет
        await supabase.from('metric_values').upsert({
          user_id: userId,
          metric_id: metricId,
          value: durationHours,
          measurement_date: sleepDate,
          external_id: whoopSleepId,
          source_data: { sleep_data: data, source: 'whoop_webhook' }
        });
      }

      if (metric.metric_name === 'Sleep Efficiency' && data.score?.sleep_efficiency_percentage !== undefined) {
        await supabase.from('metric_values').upsert({
          user_id: userId,
          metric_id: metricId,
          value: data.score.sleep_efficiency_percentage,
          measurement_date: sleepDate,
          external_id: whoopSleepId,
          source_data: { sleep_data: data, source: 'whoop_webhook' }
        });
      }
    }

    console.log('Sleep data saved successfully');
  } catch (error) {
    console.error('Error saving sleep data:', error);
  }
}

// Функция для сохранения данных тренировки
async function saveWorkoutData(data: any, userId: string, whoopWorkoutId: string) {
  try {
    const workoutMetrics = [
      {
        user_id: userId,
        metric_name: 'Workout Strain',
        metric_category: 'workout',
        unit: 'strain',
        source: 'whoop'
      },
      {
        user_id: userId,
        metric_name: 'Average Heart Rate',
        metric_category: 'workout',
        unit: 'bpm',
        source: 'whoop'
      },
      {
        user_id: userId,
        metric_name: 'Max Heart Rate',
        metric_category: 'workout',
        unit: 'bpm',
        source: 'whoop'
      },
      {
        user_id: userId,
        metric_name: 'Workout Calories',
        metric_category: 'workout',
        unit: 'kcal',
        source: 'whoop'
      }
    ];

    for (const metric of workoutMetrics) {
      const { data: existingMetric } = await supabase
        .from('user_metrics')
        .select('id')
        .eq('user_id', userId)
        .eq('metric_name', metric.metric_name)
        .eq('source', 'whoop')
        .single();

      let metricId = existingMetric?.id;

      if (!metricId) {
        const { data: newMetric, error } = await supabase
          .from('user_metrics')
          .insert(metric)
          .select('id')
          .single();

        if (error) {
          console.error('Error creating workout metric:', error);
          continue;
        }
        metricId = newMetric.id;
      }

      const workoutDate = data.end ? new Date(data.end).toISOString().split('T')[0] : 
                          new Date().toISOString().split('T')[0];

      // Сохраняем значения тренировки
      let value = null;
      switch (metric.metric_name) {
        case 'Workout Strain':
          value = data.score?.strain;
          break;
        case 'Average Heart Rate':
          value = data.score?.average_heart_rate;
          break;
        case 'Max Heart Rate':
          value = data.score?.max_heart_rate;
          break;
        case 'Workout Calories':
          value = data.score?.kilojoule;
          break;
      }

      if (value !== null && value !== undefined) {
        await supabase.from('metric_values').upsert({
          user_id: userId,
          metric_id: metricId,
          value: value,
          measurement_date: workoutDate,
          external_id: whoopWorkoutId,
          source_data: { workout_data: data, source: 'whoop_webhook' }
        });
      }
    }

    // Также сохраняем в таблицу workouts для совместимости
    const workoutDate = data.end ? new Date(data.end).toISOString() : new Date().toISOString();
    const startDate = data.start ? new Date(data.start).toISOString() : workoutDate;
    
    await supabase.from('workouts').upsert({
      user_id: userId,
      external_id: whoopWorkoutId,
      workout_type: data.sport_name || 'Unknown',
      start_time: startDate,
      end_time: workoutDate,
      duration_minutes: data.score?.strain ? Math.round(data.score.strain * 10) : null,
      calories_burned: data.score?.kilojoule || null,
      heart_rate_avg: data.score?.average_heart_rate || null,
      heart_rate_max: data.score?.max_heart_rate || null,
      source: 'whoop',
      source_data: data
    });

    console.log('Workout data saved successfully');
  } catch (error) {
    console.error('Error saving workout data:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('Whoop webhook received');
    
    const signature = req.headers.get('x-whoop-signature');
    const timestamp = req.headers.get('x-whoop-signature-timestamp');
    const rawBody = await req.text();
    
    console.log('Headers:', {
      signature: signature ? 'present' : 'missing',
      timestamp: timestamp ? 'present' : 'missing',
      bodyLength: rawBody.length
    });

    // Валидируем подпись (если есть секрет)
    const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET');
    if (clientSecret && signature && timestamp) {
      const isValidSignature = await validateWhoopSignature(rawBody, signature, timestamp, clientSecret);
      if (!isValidSignature) {
        console.error('Invalid webhook signature');
        return new Response('Invalid signature', { 
          status: 401, 
          headers: corsHeaders 
        });
      }
      console.log('Webhook signature validated successfully');
    } else {
      console.log('Skipping signature validation - missing secret or headers');
    }

    const webhookData = JSON.parse(rawBody);
    console.log('Webhook data:', webhookData);

    const { user_id, id, type, trace_id } = webhookData;

    // Получаем токен пользователя
    const userToken = await getUserToken(user_id.toString());
    if (!userToken) {
      console.error(`No token found for Whoop user ${user_id}`);
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    console.log(`Processing webhook for user ${userToken.user_id}, type: ${type}, id: ${id}`);

    // Обрабатываем разные типы событий
    try {
      switch (type) {
        case 'recovery.updated':
          console.log('Processing recovery update...');
          // Для v2 API используем sleep ID для получения recovery данных
          const recoveryData = await fetchWhoopData(`recovery?start=${new Date().toISOString().split('T')[0]}&end=${new Date().toISOString().split('T')[0]}`, userToken.access_token);
          if (recoveryData && recoveryData.records && recoveryData.records.length > 0) {
            // Находим recovery связанную с этим sleep
            const recovery = recoveryData.records.find((r: any) => r.sleep_id === id);
            if (recovery) {
              await saveRecoveryData(recovery, userToken.user_id, id);
            }
          }
          break;

        case 'recovery.deleted':
          console.log('Processing recovery deletion...');
          // Удаляем записи recovery по sleep_id
          await supabase
            .from('metric_values')
            .delete()
            .eq('user_id', userToken.user_id)
            .eq('external_id', id);
          break;

        case 'sleep.updated':
          console.log('Processing sleep update...');
          const sleepData = await fetchWhoopData(`activity/sleep/${id}`, userToken.access_token);
          if (sleepData) {
            await saveSleepData(sleepData, userToken.user_id, id);
          }
          break;

        case 'sleep.deleted':
          console.log('Processing sleep deletion...');
          await supabase
            .from('metric_values')
            .delete()
            .eq('user_id', userToken.user_id)
            .eq('external_id', id);
          break;

        case 'workout.updated':
          console.log('Processing workout update...');
          const workoutData = await fetchWhoopData(`activity/workout/${id}`, userToken.access_token);
          if (workoutData) {
            await saveWorkoutData(workoutData, userToken.user_id, id);
          }
          break;

        case 'workout.deleted':
          console.log('Processing workout deletion...');
          await supabase
            .from('workouts')
            .delete()
            .eq('user_id', userToken.user_id)
            .eq('external_id', id);
          await supabase
            .from('metric_values')
            .delete()
            .eq('user_id', userToken.user_id)
            .eq('external_id', id);
          break;

        default:
          console.log(`Unknown webhook type: ${type}`);
      }

      // Логируем успешную обработку webhook'а
      console.log(`Successfully processed webhook: ${type} for user ${userToken.user_id}`);
      
      return new Response('OK', { 
        status: 200, 
        headers: corsHeaders 
      });

    } catch (dataError) {
      console.error('Error processing webhook data:', dataError);
      // Возвращаем 200 чтобы Whoop не ретраил, но логируем ошибку
      return new Response('Data processing error', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

  } catch (error: any) {
    console.error('Whoop webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error?.message || 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});