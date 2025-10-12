import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const terraApiKey = Deno.env.get('TERRA_API_KEY')!;
    const terraDevId = Deno.env.get('TERRA_DEV_ID')!;
    const terraSigningSecret = Deno.env.get('TERRA_SIGNING_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log(`Terra Integration - Action: ${action}, User: ${user.id}`);

    // Получить URL для авторизации
    if (action === 'get-auth-url') {
      const widgetUrl = `https://widget.tryterra.co/session?${new URLSearchParams({
        reference_id: user.id,
        providers: 'ULTRAHUMAN,WHOOP,GARMIN,FITBIT,OURA,APPLE_HEALTH',
        auth_success_redirect_url: `${req.headers.get('origin')}/terra-callback`,
        auth_failure_redirect_url: `${req.headers.get('origin')}/integrations`,
        language: 'en',
      })}`;

      return new Response(
        JSON.stringify({ url: widgetUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Проверить статус подключения
    if (action === 'check-status') {
      const { data: tokens } = await supabase
        .from('terra_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const providers = tokens?.map(t => ({
        provider: t.provider,
        connectedAt: t.created_at,
        lastSync: t.last_sync_date,
        terraUserId: t.terra_user_id,
      })) || [];

      return new Response(
        JSON.stringify({
          connected: tokens && tokens.length > 0,
          providers,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Обработать webhook от Terra
    if (action === 'webhook') {
      // Проверить подпись для безопасности
      const signature = req.headers.get('terra-signature');
      if (!signature) {
        console.error('Missing terra-signature header');
        return new Response(
          JSON.stringify({ error: 'Missing signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Получить raw body для проверки подписи
      const rawBody = await req.text();
      const isValidSignature = verifyTerraSignature(rawBody, signature, terraSigningSecret);
      
      if (!isValidSignature) {
        console.error('Invalid signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload = JSON.parse(rawBody);
      console.log('Valid Terra webhook received:', JSON.stringify(payload, null, 2));

      // Terra отправляет различные типы событий
      if (payload.type === 'auth') {
        // Пользователь подключил устройство
        const { reference_id, user: terraUser } = payload;
        
        const { error: tokenError } = await supabase
          .from('terra_tokens')
          .upsert({
            user_id: reference_id,
            terra_user_id: terraUser.user_id,
            provider: terraUser.provider?.toUpperCase(),
            is_active: true,
            last_sync_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,provider'
          });

        if (tokenError) {
          console.error('Error saving Terra token:', tokenError);
        }

        console.log(`User ${reference_id} connected ${terraUser.provider} via Terra`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Данные от устройства (activity, body, daily, sleep, nutrition, etc.)
      if (['activity', 'body', 'daily', 'sleep', 'nutrition', 'athlete'].includes(payload.type)) {
        await processTerraData(supabase, payload);
        
        // Обновить last_sync_date
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
    }

    // Синхронизировать данные вручную
    if (action === 'sync-data') {
      const { data: token } = await supabase
        .from('terra_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!token) {
        throw new Error('Terra not connected');
      }

      // Запросить исторические данные через Terra API
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // последние 30 дней

      const response = await fetch(`https://api.tryterra.co/v2/daily`, {
        method: 'GET',
        headers: {
          'dev-id': terraDevId,
          'x-api-key': terraApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Terra API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Terra sync data:', JSON.stringify(data, null, 2));

      return new Response(
        JSON.stringify({ success: true, message: 'Данные синхронизируются через webhook' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Отключить конкретный провайдер или все подключения
    if (action === 'disconnect') {
      const provider = url.searchParams.get('provider');
      
      if (provider) {
        // Отключить конкретный провайдер
        const { error: updateError } = await supabase
          .from('terra_tokens')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('provider', provider);

        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        // Отключить все подключения
        const { error: updateError } = await supabase
          .from('terra_tokens')
          .update({ is_active: false })
          .eq('user_id', user.id);

        if (updateError) {
          throw new Error(updateError.message);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Terra integration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Функция проверки подписи Terra
function verifyTerraSignature(rawBody: string, signature: string, secret: string): boolean {
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
      console.error('Invalid signature format');
      return false;
    }
    
    // Создаем payload для подписи (timestamp + rawBody)
    const payload = timestamp + rawBody;
    
    // Создаем HMAC SHA256 подпись
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const computedSignature = hmac.digest('hex');
    
    // Сравниваем подписи
    const isValid = computedSignature === sig;
    
    if (!isValid) {
      console.error('Signature verification failed', {
        expected: sig,
        computed: computedSignature,
        timestamp,
        payloadLength: payload.length
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

async function processTerraData(supabase: any, payload: any) {
  const { user, data } = payload;
  
  // Получить user_id из terra_user_id
  const { data: tokenData } = await supabase
    .from('terra_tokens')
    .select('user_id, provider')
    .eq('terra_user_id', user.user_id)
    .eq('is_active', true)
    .single();

  if (!tokenData) {
    console.error('User not found for Terra user_id:', user.user_id);
    return;
  }

  const userId = tokenData.user_id;
  const provider = tokenData.provider;

  // Обработать различные типы данных
  if (payload.type === 'activity') {
    // Сохранить тренировки
    for (const activity of data) {
      if (activity.active_durations && activity.active_durations.length > 0) {
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
            source: provider.toLowerCase(),
            external_id: `terra_${provider}_${workout.start_time}`,
          }, {
            onConflict: 'external_id',
            ignoreDuplicates: true,
          });
        }
      }
      
      // Сохранить метрики Strain для Whoop/Ultrahuman
      if (activity.metadata?.strain) {
        const strainMetricId = await supabase.rpc('create_or_get_metric', {
          p_user_id: userId,
          p_metric_name: 'Workout Strain',
          p_metric_category: 'workout',
          p_unit: 'strain',
          p_source: provider.toLowerCase(),
        }).then((res: any) => res.data);

        if (strainMetricId) {
          await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: strainMetricId,
            value: activity.metadata.strain,
            measurement_date: activity.metadata.start_time?.split('T')[0],
            external_id: `terra_${provider}_strain_${activity.metadata.start_time}`,
          }, {
            onConflict: 'metric_id,measurement_date,external_id',
            ignoreDuplicates: true,
          });
        }
      }
    }
  }

  if (payload.type === 'body') {
    // Сохранить данные о теле
    for (const bodyData of data) {
      if (bodyData.body_fat_percentage || bodyData.weight_kg) {
        await supabase.from('body_composition').upsert({
          user_id: userId,
          measurement_date: bodyData.timestamp?.split('T')[0],
          weight: bodyData.weight_kg,
          body_fat_percentage: bodyData.body_fat_percentage,
          muscle_mass: bodyData.muscle_mass_kg,
          measurement_method: provider.toLowerCase(),
        }, {
          onConflict: 'user_id,measurement_date',
        });
      }
      
      // Withings - дополнительные метрики
      if (bodyData.measurements) {
        for (const [metricName, value] of Object.entries(bodyData.measurements)) {
          if (value && typeof value === 'number') {
            const metricId = await supabase.rpc('create_or_get_metric', {
              p_user_id: userId,
              p_metric_name: metricName,
              p_metric_category: 'body_composition',
              p_unit: 'kg',
              p_source: provider.toLowerCase(),
            }).then((res: any) => res.data);

            if (metricId) {
              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: metricId,
                value,
                measurement_date: bodyData.timestamp?.split('T')[0],
                external_id: `terra_${provider}_${metricName}_${bodyData.timestamp}`,
              }, {
                onConflict: 'metric_id,measurement_date,external_id',
                ignoreDuplicates: true,
              });
            }
          }
        }
      }
    }
  }

  if (payload.type === 'sleep') {
    // Сохранить данные о сне
    for (const sleepData of data) {
      // Sleep Duration
      if (sleepData.sleep_durations_data?.asleep?.duration_asleep_state_seconds) {
        const sleepMetricId = await supabase.rpc('create_or_get_metric', {
          p_user_id: userId,
          p_metric_name: 'Sleep Duration',
          p_metric_category: 'sleep',
          p_unit: 'hours',
          p_source: provider.toLowerCase(),
        }).then((res: any) => res.data);

        if (sleepMetricId) {
          await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: sleepMetricId,
            value: sleepData.sleep_durations_data.asleep.duration_asleep_state_seconds / 3600,
            measurement_date: sleepData.day,
            external_id: `terra_${provider}_sleep_${sleepData.day}`,
          }, {
            onConflict: 'metric_id,measurement_date,external_id',
            ignoreDuplicates: true,
          });
        }
      }
      
      // Recovery Score для Whoop/Oura
      if (sleepData.metadata?.recovery_score) {
        const recoveryMetricId = await supabase.rpc('create_or_get_metric', {
          p_user_id: userId,
          p_metric_name: 'Recovery Score',
          p_metric_category: 'recovery',
          p_unit: '%',
          p_source: provider.toLowerCase(),
        }).then((res: any) => res.data);

        if (recoveryMetricId) {
          await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: recoveryMetricId,
            value: sleepData.metadata.recovery_score,
            measurement_date: sleepData.day,
            external_id: `terra_${provider}_recovery_${sleepData.day}`,
          }, {
            onConflict: 'metric_id,measurement_date,external_id',
            ignoreDuplicates: true,
          });
        }
      }
    }
  }
  
  // Nutrition для Ultrahuman (глюкоза)
  if (payload.type === 'nutrition') {
    for (const nutritionData of data) {
      if (nutritionData.metadata?.glucose_data) {
        const glucoseMetricId = await supabase.rpc('create_or_get_metric', {
          p_user_id: userId,
          p_metric_name: 'Blood Glucose',
          p_metric_category: 'health',
          p_unit: 'mg/dL',
          p_source: provider.toLowerCase(),
        }).then((res: any) => res.data);

        if (glucoseMetricId && nutritionData.metadata.glucose_data.avg_glucose_mg_per_dL) {
          await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: glucoseMetricId,
            value: nutritionData.metadata.glucose_data.avg_glucose_mg_per_dL,
            measurement_date: nutritionData.metadata.start_time?.split('T')[0],
            external_id: `terra_${provider}_glucose_${nutritionData.metadata.start_time}`,
            source_data: nutritionData.metadata.glucose_data,
          }, {
            onConflict: 'metric_id,measurement_date,external_id',
            ignoreDuplicates: true,
          });
        }
      }
    }
  }
  
  // Daily data (aggregate metrics)
  if (payload.type === 'daily') {
    for (const dailyData of data) {
      // VO2Max для Garmin
      if (dailyData.vo2max_ml_per_min_per_kg) {
        const vo2maxMetricId = await supabase.rpc('create_or_get_metric', {
          p_user_id: userId,
          p_metric_name: 'VO2Max',
          p_metric_category: 'cardio',
          p_unit: 'ml/kg/min',
          p_source: provider.toLowerCase(),
        }).then((res: any) => res.data);

        if (vo2maxMetricId) {
          await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: vo2maxMetricId,
            value: dailyData.vo2max_ml_per_min_per_kg,
            measurement_date: dailyData.metadata?.start_time?.split('T')[0],
            external_id: `terra_${provider}_vo2max_${dailyData.metadata?.start_time}`,
          }, {
            onConflict: 'metric_id,measurement_date,external_id',
            ignoreDuplicates: true,
          });
        }
      }
    }
  }

  console.log(`✅ Processed Terra ${payload.type} data from ${provider} for user ${userId}`);
}
