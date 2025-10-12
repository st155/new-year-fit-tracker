import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
        .single();

      return new Response(
        JSON.stringify({
          connected: !!tokens,
          connectedAt: tokens?.created_at,
          userId: tokens?.terra_user_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Обработать webhook от Terra
    if (action === 'webhook') {
      const payload = await req.json();
      console.log('Terra webhook received:', JSON.stringify(payload, null, 2));

      // Terra отправляет различные типы событий
      if (payload.type === 'auth') {
        // Пользователь подключил устройство
        const { reference_id, user: terraUser } = payload;
        
        const { error: tokenError } = await supabase
          .from('terra_tokens')
          .upsert({
            user_id: reference_id,
            terra_user_id: terraUser.user_id,
            provider: terraUser.provider,
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (tokenError) {
          console.error('Error saving Terra token:', tokenError);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Данные от устройства (activity, body, daily, sleep, etc.)
      if (payload.type === 'activity' || payload.type === 'body' || payload.type === 'daily' || payload.type === 'sleep') {
        await processTerraData(supabase, payload);
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

    // Отключить Terra
    if (action === 'disconnect') {
      const { error: deleteError } = await supabase
        .from('terra_tokens')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error(deleteError.message);
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

async function processTerraData(supabase: any, payload: any) {
  const { user, data } = payload;
  
  // Получить user_id из reference_id
  const { data: tokenData } = await supabase
    .from('terra_tokens')
    .select('user_id')
    .eq('terra_user_id', user.user_id)
    .single();

  if (!tokenData) {
    console.error('User not found for Terra user_id:', user.user_id);
    return;
  }

  const userId = tokenData.user_id;

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
            source: 'terra',
            external_id: `terra_${workout.start_time}`,
          }, {
            onConflict: 'external_id',
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
          measurement_method: 'terra',
        }, {
          onConflict: 'user_id,measurement_date',
        });
      }
    }
  }

  if (payload.type === 'sleep') {
    // Сохранить данные о сне
    for (const sleepData of data) {
      const metricId = await supabase.rpc('create_or_get_metric', {
        p_user_id: userId,
        p_metric_name: 'Sleep Duration',
        p_metric_category: 'sleep',
        p_unit: 'hours',
        p_source: 'terra',
      });

      if (metricId && sleepData.sleep_durations_data?.asleep?.duration_asleep_state_seconds) {
        await supabase.from('metric_values').upsert({
          user_id: userId,
          metric_id: metricId,
          value: sleepData.sleep_durations_data.asleep.duration_asleep_state_seconds / 3600,
          measurement_date: sleepData.day,
          external_id: `terra_sleep_${sleepData.day}`,
        }, {
          onConflict: 'external_id',
          ignoreDuplicates: true,
        });
      }
    }
  }

  console.log(`Processed Terra ${payload.type} data for user ${userId}`);
}
