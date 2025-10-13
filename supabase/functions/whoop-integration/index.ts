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
    const whoopClientId = Deno.env.get('WHOOP_CLIENT_ID')!;
    const whoopClientSecret = Deno.env.get('WHOOP_CLIENT_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Получаем текущего пользователя
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action } = await req.json();
    console.log('Whoop integration action:', { action, userId: user.id });

    // Получить URL авторизации Whoop
    if (action === 'get-auth-url') {
      const redirectUri = `${req.headers.get('origin')}/integrations/whoop/callback`;
      const scope = 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement';
      const state = user.id; // Используем user ID как state для безопасности

      const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?` +
        `client_id=${whoopClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=${state}`;

      console.log('Generated Whoop auth URL:', { redirectUri });

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Обменять код на токен
    if (action === 'exchange-code') {
      const { code } = await req.json();
      const redirectUri = `${req.headers.get('origin')}/integrations/whoop/callback`;

      const tokenResponse = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: whoopClientId,
          client_secret: whoopClientSecret,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Whoop token exchange error:', error);
        throw new Error(`Failed to exchange code: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('Whoop token received');

      // Получаем информацию о пользователе Whoop
      const userResponse = await fetch('https://api.prod.whoop.com/developer/v1/user/profile/basic', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        console.error('Failed to get Whoop user profile');
        throw new Error('Failed to get user profile');
      }

      const userData = await userResponse.json();
      console.log('Whoop user profile:', userData);

      // Сохраняем токен в базу
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      const { error: dbError } = await supabase
        .from('whoop_tokens')
        .upsert({
          user_id: user.id,
          whoop_user_id: userData.user_id.toString(),
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt.toISOString(),
          scope: tokenData.scope,
          is_active: true,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Whoop token saved to database');

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Синхронизировать данные
    if (action === 'sync-data') {
      const { data: token } = await supabase
        .from('whoop_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!token) {
        throw new Error('No active Whoop connection found');
      }

      // Проверяем, не истек ли токен
      const now = new Date();
      const expiresAt = new Date(token.expires_at);

      let accessToken = token.access_token;

      if (now >= expiresAt) {
        // Обновляем токен
        console.log('Refreshing Whoop token');
        const refreshResponse = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: token.refresh_token,
            client_id: whoopClientId,
            client_secret: whoopClientSecret,
          }),
        });

        if (!refreshResponse.ok) {
          throw new Error('Failed to refresh token');
        }

        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;

        const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

        await supabase
          .from('whoop_tokens')
          .update({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token,
            expires_at: newExpiresAt.toISOString(),
          })
          .eq('user_id', user.id);
      }

      // Получаем данные за последние 7 дней
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Формат: YYYY-MM-DD
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      console.log('Syncing Whoop data from', start, 'to', end);

      // Получаем циклы (cycles) - основной источник данных
      const cyclesResponse = await fetch(
        `https://api.prod.whoop.com/developer/v1/cycle?start=${start}&end=${end}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!cyclesResponse.ok) {
        console.error('Failed to get Whoop cycles:', await cyclesResponse.text());
        throw new Error('Failed to get Whoop data');
      }

      const cyclesData = await cyclesResponse.json();
      console.log('Whoop cycles received:', cyclesData.records?.length || 0);

      // Сохраняем данные в metric_values
      if (cyclesData.records && cyclesData.records.length > 0) {
        for (const cycle of cyclesData.records) {
          // Recovery score
          if (cycle.score?.recovery_score !== undefined) {
            const metricId = await getOrCreateMetric(
              supabase,
              user.id,
              'Recovery Score',
              'recovery',
              '%',
              'whoop'
            );

            await supabase.from('metric_values').upsert({
              user_id: user.id,
              metric_id: metricId,
              value: cycle.score.recovery_score,
              measurement_date: cycle.days[0],
              external_id: `whoop_recovery_${cycle.id}`,
              source_data: { cycle_id: cycle.id, raw: cycle.score },
            });
          }

          // Strain
          if (cycle.score?.strain !== undefined) {
            const metricId = await getOrCreateMetric(
              supabase,
              user.id,
              'Day Strain',
              'workout',
              'score',
              'whoop'
            );

            await supabase.from('metric_values').upsert({
              user_id: user.id,
              metric_id: metricId,
              value: cycle.score.strain,
              measurement_date: cycle.days[0],
              external_id: `whoop_strain_${cycle.id}`,
              source_data: { cycle_id: cycle.id, raw: cycle.score },
            });
          }
        }
      }

      // Получаем workouts
      const workoutsResponse = await fetch(
        `https://api.prod.whoop.com/developer/v1/activity/workout?start=${start}&end=${end}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (workoutsResponse.ok) {
        const workoutsData = await workoutsResponse.json();
        console.log('Whoop workouts received:', workoutsData.records?.length || 0);

        if (workoutsData.records && workoutsData.records.length > 0) {
          for (const workout of workoutsData.records) {
            await supabase.from('workouts').upsert({
              user_id: user.id,
              external_id: `whoop_${workout.id}`,
              source: 'whoop',
              workout_type: workout.sport_id?.toString() || 'unknown',
              start_time: workout.start,
              end_time: workout.end,
              duration_minutes: Math.round((new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 60000),
              calories_burned: workout.score?.kilojoule ? Math.round(workout.score.kilojoule * 0.239) : null,
              metadata: { raw: workout },
            });
          }
        }
      }

      // Получаем sleep
      const sleepResponse = await fetch(
        `https://api.prod.whoop.com/developer/v1/activity/sleep?start=${start}&end=${end}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (sleepResponse.ok) {
        const sleepData = await sleepResponse.json();
        console.log('Whoop sleep received:', sleepData.records?.length || 0);

        if (sleepData.records && sleepData.records.length > 0) {
          for (const sleep of sleepData.records) {
            if (sleep.score?.sleep_performance_percentage !== undefined) {
              const metricId = await getOrCreateMetric(
                supabase,
                user.id,
                'Sleep Performance',
                'sleep',
                '%',
                'whoop'
              );

              const sleepDate = new Date(sleep.end).toISOString().split('T')[0];

              await supabase.from('metric_values').upsert({
                user_id: user.id,
                metric_id: metricId,
                value: sleep.score.sleep_performance_percentage,
                measurement_date: sleepDate,
                external_id: `whoop_sleep_${sleep.id}`,
                source_data: { sleep_id: sleep.id, raw: sleep },
              });
            }

            // Sleep duration
            if (sleep.score?.total_sleep_time_milli) {
              const metricId = await getOrCreateMetric(
                supabase,
                user.id,
                'Sleep Duration',
                'sleep',
                'hours',
                'whoop'
              );

              const sleepDate = new Date(sleep.end).toISOString().split('T')[0];
              const hours = sleep.score.total_sleep_time_milli / (1000 * 60 * 60);

              await supabase.from('metric_values').upsert({
                user_id: user.id,
                metric_id: metricId,
                value: hours,
                measurement_date: sleepDate,
                external_id: `whoop_sleep_duration_${sleep.id}`,
                source_data: { sleep_id: sleep.id, raw: sleep },
              });
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Unknown action');

  } catch (error: any) {
    console.error('Whoop integration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getOrCreateMetric(
  supabase: any,
  userId: string,
  metricName: string,
  category: string,
  unit: string,
  source: string
): Promise<string> {
  const { data: existing } = await supabase
    .from('user_metrics')
    .select('id')
    .eq('user_id', userId)
    .eq('metric_name', metricName)
    .eq('source', source)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: newMetric } = await supabase
    .from('user_metrics')
    .insert({
      user_id: userId,
      metric_name: metricName,
      metric_category: category,
      unit: unit,
      source: source,
    })
    .select('id')
    .single();

  return newMetric.id;
}
