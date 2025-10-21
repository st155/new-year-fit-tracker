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
    const whoopRedirectBaseUrl = Deno.env.get('WHOOP_REDIRECT_BASE_URL') || 'https://elite10.club';

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, code, user_id } = body;

    // Для cron jobs или sync-all-users не требуется авторизация
    let user: any = null;
    
    if (action === 'sync-all-users') {
      console.log('Starting sync for all Whoop users');
      
      // Получаем все активные токены (включая те, что скоро истекут)
      const { data: tokens } = await supabase
        .from('whoop_tokens')
        .select('user_id, expires_at, access_token, refresh_token')
        .eq('is_active', true);

      if (!tokens || tokens.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No active tokens found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Found ${tokens.length} active Whoop tokens`);

      const results = [];
      const now = new Date();
      const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);

      for (const token of tokens) {
        const expiresAt = new Date(token.expires_at);
        const willExpireSoon = twelveHoursFromNow >= expiresAt;
        
        console.log(`User ${token.user_id}: expires ${expiresAt.toISOString()}, will expire soon: ${willExpireSoon}`);

        try {
          // Если токен истек или скоро истечёт, сначала обновляем его
          if (willExpireSoon) {
            console.log(`⚠️ Token for user ${token.user_id} will expire soon, refreshing first...`);
            await refreshTokenIfNeeded(supabase, token.user_id, whoopClientId, whoopClientSecret, true);
          }

          // Затем синхронизируем данные
          await syncWhoopData(supabase, token.user_id, whoopClientId, whoopClientSecret);
          results.push({ user_id: token.user_id, success: true, tokenRefreshed: willExpireSoon });
        } catch (error: any) {
          console.error(`Failed to sync user ${token.user_id}:`, error);
          
          // If reconnect required, deactivate token
          if (error.message === 'RECONNECT_REQUIRED') {
            await supabase
              .from('whoop_tokens')
              .update({ is_active: false })
              .eq('user_id', token.user_id);
          }
          
          results.push({ 
            user_id: token.user_id, 
            success: false, 
            error: error.message,
            needsReconnect: error.message === 'RECONNECT_REQUIRED'
          });
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
      // Используем фиксированный redirect URL из секрета
      const redirectUri = `${whoopRedirectBaseUrl}/integrations/whoop/callback`;
      const scope = 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement';
      const state = user.id; // Используем user ID как state для безопасности

      const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?` +
        `client_id=${whoopClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=${state}&` +
        `access_type=offline`;

      console.log('Generated Whoop auth URL:', { redirectUri, baseUrl: whoopRedirectBaseUrl });

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Обменять код на токен
    if (action === 'exchange-code') {
      // Используем тот же фиксированный redirect URL
      const redirectUri = `${whoopRedirectBaseUrl}/integrations/whoop/callback`;

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
      console.log('Whoop token received:', {
        has_access_token: !!tokenData.access_token,
        has_refresh_token: !!tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        expires_in_hours: tokenData.expires_in ? Math.round(tokenData.expires_in / 3600) : 'N/A',
        token_type: tokenData.token_type,
        scope: tokenData.scope
      });

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

      // Whoop v2 API возвращает долгоживущие токены (срок действия ~6 месяцев)
      // refresh_token может отсутствовать - это нормально для Whoop
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      const { error: dbError } = await supabase
        .from('whoop_tokens')
        .upsert({
          user_id: user.id,
          whoop_user_id: userData.user_id.toString(),
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null, // может быть null
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
      try {
        await syncWhoopData(supabase, user.id, whoopClientId, whoopClientSecret);
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        if (error.message === 'RECONNECT_REQUIRED') {
          return new Response(
            JSON.stringify({ 
              error: 'Whoop credentials have changed. Please reconnect your account.',
              needsReconnect: true 
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw error;
      }
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
    
    // Если учетные данные изменились, возвращаем 401 для переподключения
    if (error.message?.includes('credentials have changed') || 
        error.message?.includes('reconnect your Whoop account')) {
      return new Response(
        JSON.stringify({ 
          error: error.message,
          needsReconnect: true 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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

// Отдельная функция для обновления токена
async function refreshTokenIfNeeded(
  supabase: any,
  userId: string,
  whoopClientId: string,
  whoopClientSecret: string,
  forceRefresh: boolean = false
): Promise<string> {
  const { data: token } = await supabase
    .from('whoop_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!token) {
    throw new Error('No active Whoop token found');
  }

  const now = new Date();
  const expiresAt = new Date(token.expires_at);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  // Whoop v2 API: refresh_token может быть null для долгоживущих токенов
  // В этом случае используем существующий access_token пока не истёк
  if (!token.refresh_token) {
    // Если токен истёк
    if (now >= expiresAt) {
      const daysSinceExpiry = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24));
      
      // Если истёк недавно (< 7 дней) - логируем warning, но пытаемся использовать
      if (daysSinceExpiry < 7) {
        console.log(`⚠️ Token expired ${daysSinceExpiry} days ago for user ${userId}, attempting to use anyway`);
        return token.access_token;
      }
      
      // Если истёк давно - требуем переподключения
      console.log(`❌ Token expired ${daysSinceExpiry} days ago and no refresh_token available for user ${userId}`);
      await supabase
        .from('whoop_tokens')
        .update({ is_active: false })
        .eq('user_id', userId);
      throw new Error('RECONNECT_REQUIRED');
    }
    
    // Токен ещё действителен, используем его
    console.log(`✅ Using existing long-lived token for user ${userId}, expires at ${expiresAt.toISOString()}`);
    return token.access_token;
  }
  
  // Обновляем если истёк, истечёт через 5 минут, или принудительно
  if (forceRefresh || fiveMinutesFromNow >= expiresAt) {
    console.log(`🔄 Refreshing token for user ${userId}`, {
      forceRefresh,
      expiresAt: expiresAt.toISOString(),
      now: now.toISOString()
    });

    const clientIdForRefresh = token.client_id || whoopClientId;

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
        error: errorText,
        userId
      });

      if (errorText.includes('Client ID from this request does not match') || 
          errorText.includes('invalid_request') ||
          errorText.includes('invalid_grant')) {
        
        console.log('Deactivating token due to credential mismatch');
        await supabase
          .from('whoop_tokens')
          .update({ is_active: false })
          .eq('user_id', userId);
        
        throw new Error('RECONNECT_REQUIRED');
      }

      throw new Error(`Failed to refresh token: ${refreshResponse.status} ${errorText}`);
    }

    const refreshData = await refreshResponse.json();
    const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

    await supabase
      .from('whoop_tokens')
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token || token.refresh_token,
        expires_at: newExpiresAt.toISOString(),
        last_sync_date: new Date().toISOString(),
        client_id: clientIdForRefresh,
      })
      .eq('user_id', userId);
    
    console.log('✅ Token refreshed successfully for user:', userId, 'new expires_at:', newExpiresAt.toISOString());
    return refreshData.access_token;
  }

  return token.access_token;
}

// Local date utilities - convert ISO to local date string accounting for timezone
function toLocalDateStr(iso: string): string {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
}

function todayLocalStr(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
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
    throw new Error('No active Whoop connection found. Please reconnect your Whoop account.');
  }

  // Проверяем валидность токена (refresh_token опционален для Whoop v2)
  if (!token.access_token) {
    await supabase
      .from('whoop_tokens')
      .update({ is_active: false })
      .eq('user_id', userId);
    
    throw new Error('Invalid Whoop token. Please reconnect your Whoop account.');
  }

  // Используем новую функцию refreshTokenIfNeeded
  const accessToken = await refreshTokenIfNeeded(supabase, userId, whoopClientId, whoopClientSecret);

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
      // Группируем циклы по дате и берём последний для каждой даты
      const cyclesByDate = new Map<string, any>();
      
      for (const cycle of cyclesData.records) {
        let cycleDate: string;
        try {
          const endDate = new Date(cycle.end);
          if (endDate.getFullYear() < 2020) {
            cycleDate = new Date(cycle.start).toISOString().split('T')[0];
            console.log(`⚠️ Invalid end date for cycle ${cycle.id}, using start date: ${cycleDate}`);
          } else {
            cycleDate = endDate.toISOString().split('T')[0];
          }
        } catch (error) {
          console.error(`Failed to parse cycle date for ${cycle.id}:`, error);
          cycleDate = new Date(cycle.start).toISOString().split('T')[0];
        }
        
        // Берём цикл с максимальным ID для каждой даты (последний)
        const existing = cyclesByDate.get(cycleDate);
        if (!existing || cycle.id > existing.id) {
          cyclesByDate.set(cycleDate, { ...cycle, cycleDate });
        }
      }
      
      console.log(`Processing ${cyclesByDate.size} unique dates from ${cyclesData.records.length} cycles`);
      
      // Обрабатываем только последний цикл для каждой даты
      for (const [cycleDate, cycle] of cyclesByDate) {
        console.log(`Processing latest cycle ${cycle.id} for date: ${cycleDate}`);
        
        const startLocal = toLocalDateStr(cycle.start);
        const endLocal = cycle.end ? toLocalDateStr(cycle.end) : null;
        
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
              calibrating: recoveryData.user_calibrating,
              endLocal
            });
            
            // Recovery Score измеряется за ночь и применяется к дате пробуждения
            if (recoveryData.score_state === 'SCORED' && recoveryData.score?.recovery_score !== undefined && endLocal) {
              const metricId = await getOrCreateMetric(
                supabase,
                userId,
                'Recovery Score',
                'recovery',
                '%',
                'whoop'
              );

              const { error: recoveryError } = await supabase.from('metric_values').upsert({
                user_id: userId,
                metric_id: metricId,
                value: recoveryData.score.recovery_score,
                measurement_date: endLocal, // Используем локальную дату окончания цикла
                external_id: `whoop_recovery_${cycle.id}`,
                source_data: { 
                  cycle_id: cycle.id, 
                  raw: recoveryData.score,
                  user_calibrating: recoveryData.user_calibrating 
                },
              }, { onConflict: 'user_id,metric_id,external_id' });
              
              if (recoveryError) {
                console.error(`❌ Failed to save Recovery for ${endLocal}:`, recoveryError);
              } else {
                console.log(`✅ Saved Recovery ${recoveryData.score.recovery_score}% for ${endLocal}`);
              }
            } else {
              console.log(`❌ Recovery not scored for cycle ${cycle.id}, state: ${recoveryData.score_state}`);
            }
          } else {
            console.error(`Failed to fetch recovery for cycle ${cycle.id}: ${recoveryResponse.status}`);
          }
        } catch (error) {
          console.error(`Failed to fetch recovery for cycle ${cycle.id}:`, error);
        }

        // Day Strain (общая дневная нагрузка за цикл)
        // Закрытый цикл: используем startLocal (день, к которому относится strain)
        // Активный цикл: используем todayLocalStr() для отображения текущего прогресса
        if (cycle.score?.strain !== undefined) {
          const isClosed = !!endLocal && new Date(cycle.end) <= new Date();
          const targetDate = isClosed ? startLocal : todayLocalStr();
          
          console.log(`Saving Day Strain ${cycle.score.strain} for ${targetDate} (cycle ${isClosed ? 'closed' : 'active'})`);
          
          const metricId = await getOrCreateMetric(
            supabase,
            userId,
            'Day Strain',
            'recovery',
            'strain',
            'whoop'
          );

          const { error: strainError } = await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: metricId,
            value: cycle.score.strain,
            measurement_date: targetDate,
            external_id: `whoop_strain_${cycle.id}`,
            source_data: { 
              cycle_id: cycle.id, 
              raw: cycle.score,
              is_active: !isClosed
            },
           }, { onConflict: 'user_id,metric_id,external_id' });
          
          if (strainError) {
            console.error(`❌ Failed to save Day Strain for ${targetDate}:`, strainError);
          } else {
            console.log(`✅ Saved Day Strain ${cycle.score.strain} for ${targetDate}`);
            
            // Очистка дубликатов: оставляем только самую новую запись с правильной датой
            const { data: duplicates } = await supabase
              .from('metric_values')
              .select('id, measurement_date, created_at')
              .eq('user_id', userId)
              .eq('metric_id', metricId)
              .eq('external_id', `whoop_strain_${cycle.id}`)
              .order('created_at', { ascending: false });
            
            if (duplicates && duplicates.length > 1) {
              const keepId = duplicates[0].id;
              const deleteIds = duplicates.slice(1).map(d => d.id);
              console.log(`🧹 Cleaning up ${deleteIds.length} duplicate Day Strain records for cycle ${cycle.id}`);
              
              await supabase
                .from('metric_values')
                .delete()
                .in('id', deleteIds);
            }
          }
        } else {
          console.log(`❌ No strain data for cycle ${cycle.id} (${cycleDate}), cycle.score:`, cycle.score);
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
          const workoutDate = toLocalDateStr(workout.start);
          const metricId = await getOrCreateMetric(
            supabase,
            userId,
            'Workout Strain',
            'workout',
            'score',
            'whoop'
          );

          const { error: workoutStrainError } = await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: metricId,
            value: workout.score.strain,
            measurement_date: workoutDate,
            external_id: `whoop_workout_strain_${workout.id}`,
            source_data: { workout_id: workout.id, raw: workout.score },
           }, { onConflict: 'user_id,metric_id,external_id' });
          
          if (workoutStrainError) {
            console.error(`❌ Failed to save Workout Strain for ${workoutDate}:`, workoutStrainError);
          }
        }

        // Сохраняем Max Heart Rate в метрики
        if (workout.score?.max_heart_rate !== undefined) {
          const workoutDate = toLocalDateStr(workout.start);
          const metricId = await getOrCreateMetric(
            supabase,
            userId,
            'Max Heart Rate',
            'heart_rate',
            'bpm',
            'whoop'
          );

          const { error: maxHrError } = await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: metricId,
            value: workout.score.max_heart_rate,
            measurement_date: workoutDate,
            external_id: `whoop_max_hr_${workout.id}`,
            source_data: { workout_id: workout.id, raw: workout.score },
           }, { onConflict: 'user_id,metric_id,external_id' });
          
          if (maxHrError) {
            console.error(`❌ Failed to save Max Heart Rate for ${workoutDate}:`, maxHrError);
          }
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
        const sleepDate = toLocalDateStr(sleep.end);
        
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

          const { error: sleepPerfError } = await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: metricId,
            value: sleep.score.sleep_performance_percentage,
            measurement_date: sleepDate,
            external_id: `whoop_sleep_perf_${sleep.id}`,
            source_data: { sleep_id: sleep.id, raw: sleep },
           }, { onConflict: 'user_id,metric_id,external_id' });
          
          if (sleepPerfError) {
            console.error(`❌ Failed to save Sleep Performance for ${sleepDate}:`, sleepPerfError);
          }
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

          const { error: sleepEffError } = await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: metricId,
            value: sleep.score.sleep_efficiency_percentage,
            measurement_date: sleepDate,
            external_id: `whoop_sleep_eff_${sleep.id}`,
            source_data: { sleep_id: sleep.id, raw: sleep },
           }, { onConflict: 'user_id,metric_id,external_id' });
          
          if (sleepEffError) {
            console.error(`❌ Failed to save Sleep Efficiency for ${sleepDate}:`, sleepEffError);
          }
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

          const { error: sleepDurError } = await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: metricId,
            value: hours,
            measurement_date: sleepDate,
            external_id: `whoop_sleep_dur_${sleep.id}`,
            source_data: { sleep_id: sleep.id, raw: sleep },
          }, { onConflict: 'user_id,metric_id,external_id' });
          
          if (sleepDurError) {
            console.error(`❌ Failed to save Sleep Duration for ${sleepDate}:`, sleepDurError);
          }
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
