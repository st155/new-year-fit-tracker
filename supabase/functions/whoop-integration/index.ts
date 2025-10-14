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

    const body = await req.json();
    const { action, code, user_id } = body;

    // Для cron jobs или sync-all-users не требуется авторизация
    let user: any = null;
    
    if (action === 'sync-all-users') {
      console.log('Starting sync for all Whoop users');
      
      const { data: tokens } = await supabase
        .from('whoop_tokens')
        .select('user_id')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      if (!tokens || tokens.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No active tokens found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = [];
      for (const token of tokens) {
        try {
          await syncWhoopData(supabase, token.user_id, whoopClientId, whoopClientSecret);
          results.push({ user_id: token.user_id, success: true });
        } catch (error: any) {
          console.error(`Failed to sync user ${token.user_id}:`, error);
          results.push({ user_id: token.user_id, success: false, error: error.message });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Для остальных действий требуется авторизация
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !authUser) {
      throw new Error('Unauthorized');
    }

    user = authUser;
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
        const errorText = await tokenResponse.text();
        console.error('Whoop token exchange error:', errorText);

        // If code already used or invalid_grant, consider it idempotent: check if token already saved
        if (errorText.includes('authorization code has already been used') || errorText.includes('invalid_grant')) {
          const { data: existingToken } = await supabase
            .from('whoop_tokens')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

          if (existingToken) {
            return new Response(
              JSON.stringify({ success: true, alreadyLinked: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        throw new Error(`Failed to exchange code: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('Whoop token received');

      // Получаем информацию о пользователе Whoop (v2 API)
      const userResponse = await fetch('https://api.prod.whoop.com/developer/v2/user/profile/basic', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json'
        },
      });

      if (!userResponse.ok) {
        const text = await userResponse.text();
        console.error('Failed to get Whoop user profile', text);
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
          client_id: whoopClientId,
          is_active: true,
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
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
    if (action === 'sync' || action === 'sync-data') {
      await syncWhoopData(supabase, user.id, whoopClientId, whoopClientSecret);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Отключить Whoop
    if (action === 'disconnect') {
      await supabase
        .from('whoop_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id);

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
  // Сначала пытаемся найти существующую метрику
  const { data: existing } = await supabase
    .from('user_metrics')
    .select('id')
    .eq('user_id', userId)
    .eq('metric_name', metricName)
    .eq('unit', unit)
    .eq('source', source)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Пытаемся создать новую метрику
  const { data: newMetric, error } = await supabase
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

  // Если произошла ошибка дублирования, пытаемся найти метрику снова
  if (error) {
    console.log(`Error creating metric ${metricName}, trying to find existing:`, error.message);
    const { data: retryExisting } = await supabase
      .from('user_metrics')
      .select('id')
      .eq('user_id', userId)
      .eq('metric_name', metricName)
      .eq('unit', unit)
      .eq('source', source)
      .maybeSingle();
    
    if (retryExisting) {
      return retryExisting.id;
    }
    
    throw new Error(`Failed to get or create metric ${metricName}: ${error.message}`);
  }

  if (!newMetric) {
    throw new Error(`Failed to create metric ${metricName}: no data returned`);
  }

  return newMetric.id;
}

// Функция синхронизации данных Whoop для пользователя
async function syncWhoopData(
  supabase: any,
  userId: string,
  whoopClientId: string,
  whoopClientSecret: string
) {
  console.log('Syncing Whoop data for user:', userId);

  // Получаем токен пользователя
  const { data: token } = await supabase
    .from('whoop_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!token) {
    throw new Error('No active Whoop connection found');
  }

  // Проверяем токен и обновляем при необходимости
  const now = new Date();
  const expiresAt = new Date(token.expires_at);
  let accessToken = token.access_token;

  if (now >= expiresAt) {
    console.log('Refreshing Whoop token');

    // Используем тот client_id, с которым токен был изначально выдан
    const clientIdForRefresh = token.client_id || whoopClientId;
    console.log('Whoop token refresh using client_id:', {
      storedClientId: token.client_id,
      envClientId: whoopClientId,
      effectiveClientId: clientIdForRefresh,
    });

    const refreshResponse = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
        client_id: clientIdForRefresh,
        client_secret: whoopClientSecret,
      }),
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('Token refresh failed:', {
        status: refreshResponse.status,
        statusText: refreshResponse.statusText,
        error: errorText,
        tokenExpiresAt: token.expires_at,
        now: now.toISOString(),
        triedClientId: clientIdForRefresh,
      });
      throw new Error(`Failed to refresh token: ${refreshResponse.status} ${errorText}`);
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
        // Фиксируем корректный client_id, чтобы будущие рефреши использовали его же
        client_id: clientIdForRefresh,
      })
      .eq('user_id', userId);
  }

  // Получаем данные за последние 7 дней
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const start = startDate.toISOString();
  const end = endDate.toISOString();

  console.log('Syncing Whoop data from', start, 'to', end);

  // Синхронизация циклов
  const cyclesResponse = await fetch(
    `https://api.prod.whoop.com/developer/v2/cycle?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=25`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (cyclesResponse.ok) {
    const cyclesData = await cyclesResponse.json();
    console.log('Whoop cycles received:', cyclesData.records?.length || 0);

    if (cyclesData.records && cyclesData.records.length > 0) {
      for (const cycle of cyclesData.records) {
        // Recovery и Strain относятся к дате окончания цикла (утро после сна)
        const cycleDate = new Date(cycle.end).toISOString().split('T')[0];
        
        // Получаем Recovery score для цикла (отдельный API endpoint)
        try {
          const recoveryResponse = await fetch(
            `https://api.prod.whoop.com/developer/v2/cycle/${cycle.id}/recovery`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          if (recoveryResponse.ok) {
            const recoveryData = await recoveryResponse.json();
            console.log(`Recovery for cycle ${cycle.id} (${cycleDate}):`, {
              state: recoveryData.score_state,
              score: recoveryData.score?.recovery_score,
              calibrating: recoveryData.user_calibrating
            });
            
            // Проверяем что recovery scored (не в калибровке)
            if (recoveryData.score_state === 'SCORED' && recoveryData.score?.recovery_score !== undefined) {
              const metricId = await getOrCreateMetric(
                supabase,
                userId,
                'Recovery Score',
                'recovery',
                '%',
                'whoop'
              );

              await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: metricId,
                value: recoveryData.score.recovery_score,
                measurement_date: cycleDate,
                external_id: `whoop_recovery_${cycle.id}`,
                source_data: { 
                  cycle_id: cycle.id, 
                  raw: recoveryData.score,
                  user_calibrating: recoveryData.user_calibrating 
                },
              }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
              console.log(`✅ Saved Recovery ${recoveryData.score.recovery_score}% for ${cycleDate}`);
            } else {
              console.log(`❌ Recovery not scored for cycle ${cycle.id}, state: ${recoveryData.score_state}`);
            }
          } else {
            console.error(`Failed to fetch recovery for cycle ${cycle.id}: ${recoveryResponse.status}`);
          }
        } catch (error) {
          console.error(`Failed to fetch recovery for cycle ${cycle.id}:`, error);
        }

        // Strain
        if (cycle.score?.strain !== undefined) {
          const metricId = await getOrCreateMetric(
            supabase,
            userId,
            'Day Strain',
            'activity',
            'score',
            'whoop'
          );

          await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: metricId,
            value: cycle.score.strain,
            measurement_date: cycleDate,
            external_id: `whoop_strain_${cycle.id}`,
            source_data: { cycle_id: cycle.id, raw: cycle.score },
          }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
        }
      }
    }
  }

  // Синхронизация workouts
  const workoutsResponse = await fetch(
    `https://api.prod.whoop.com/developer/v2/activity/workout?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=25`,
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
        // Сохраняем в таблицу workouts
        const { error: workoutError } = await supabase.from('workouts').upsert({
          user_id: userId,
          external_id: `whoop_${workout.id}`,
          source: 'whoop',
          workout_type: workout.sport_id?.toString() || 'unknown',
          start_time: workout.start,
          end_time: workout.end,
          duration_minutes: Math.round((new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 60000),
          calories_burned: workout.score?.kilojoule ? Math.round(workout.score.kilojoule * 0.239) : null,
          heart_rate_avg: workout.score?.average_heart_rate || null,
          heart_rate_max: workout.score?.max_heart_rate || null,
          source_data: workout,
        }, { onConflict: 'user_id,external_id' });

        if (workoutError) {
          console.error('Failed to save workout:', workoutError);
        }

        // Также сохраняем Workout Strain в метрики
        if (workout.score?.strain !== undefined) {
          const workoutDate = new Date(workout.start).toISOString().split('T')[0];
          const metricId = await getOrCreateMetric(
            supabase,
            userId,
            'Workout Strain',
            'workout',
            'score',
            'whoop'
          );

          await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: metricId,
            value: workout.score.strain,
            measurement_date: workoutDate,
            external_id: `whoop_workout_strain_${workout.id}`,
            source_data: { workout_id: workout.id, raw: workout.score },
          }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
        }
      }
    }
  }

  // Синхронизация sleep
  const sleepResponse = await fetch(
    `https://api.prod.whoop.com/developer/v2/activity/sleep?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=25`,
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
        const sleepDate = new Date(sleep.end).toISOString().split('T')[0];
        
        // Sleep Performance
        if (sleep.score?.sleep_performance_percentage !== undefined) {
          const metricId = await getOrCreateMetric(
            supabase,
            userId,
            'Sleep Performance',
            'sleep',
            '%',
            'whoop'
          );

          await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: metricId,
            value: sleep.score.sleep_performance_percentage,
            measurement_date: sleepDate,
            external_id: `whoop_sleep_perf_${sleep.id}`,
            source_data: { sleep_id: sleep.id, raw: sleep },
          }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
        }

        // Sleep Efficiency
        if (sleep.score?.sleep_efficiency_percentage !== undefined) {
          const metricId = await getOrCreateMetric(
            supabase,
            userId,
            'Sleep Efficiency',
            'sleep',
            '%',
            'whoop'
          );

          await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: metricId,
            value: sleep.score.sleep_efficiency_percentage,
            measurement_date: sleepDate,
            external_id: `whoop_sleep_eff_${sleep.id}`,
            source_data: { sleep_id: sleep.id, raw: sleep },
          }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
        }

        // Sleep Duration
        if (sleep.score?.stage_summary?.total_in_bed_time_milli) {
          const metricId = await getOrCreateMetric(
            supabase,
            userId,
            'Sleep Duration',
            'sleep',
            'hours',
            'whoop'
          );

          const hours = sleep.score.stage_summary.total_in_bed_time_milli / (1000 * 60 * 60);

          await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: metricId,
            value: hours,
            measurement_date: sleepDate,
            external_id: `whoop_sleep_dur_${sleep.id}`,
            source_data: { sleep_id: sleep.id, raw: sleep },
          }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
        }
      }
    }
  }

  // Обновляем last_sync_date
  await supabase
    .from('whoop_tokens')
    .update({ last_sync_date: new Date().toISOString() })
    .eq('user_id', userId);

  console.log('Whoop sync completed for user:', userId);
}
