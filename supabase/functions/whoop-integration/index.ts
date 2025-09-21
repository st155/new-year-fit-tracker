import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whoop API endpoints
const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v2';
const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case 'auth':
        return handleAuth(req);
      
      case 'callback':
        return handleCallback(req, supabase);
      
      case 'sync':
        return handleSync(req, supabase);
      
      case 'get-data':
        return handleGetData(req, supabase);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Error in whoop-integration function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Инициировать OAuth авторизацию с Whoop
async function handleAuth(req: Request) {
  const { userId, redirectUri } = await req.json();
  
  if (!userId || !redirectUri) {
    return new Response(JSON.stringify({ error: 'Missing userId or redirectUri' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Генерируем state для защиты от CSRF
  const state = crypto.randomUUID();
  
  const clientId = Deno.env.get('WHOOP_CLIENT_ID');
  
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'Whoop Client ID not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const authUrl = new URL(WHOOP_AUTH_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'read:cycles read:recovery read:sleep read:workout read:profile');
  authUrl.searchParams.set('state', `${state}-${userId}`);

  return new Response(JSON.stringify({ 
    authUrl: authUrl.toString(),
    state 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Обработать callback от Whoop OAuth
async function handleCallback(req: Request, supabase: any) {
  const { code, state, error } = await req.json();
  
  if (error) {
    return new Response(JSON.stringify({ error: `OAuth error: ${error}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!code || !state) {
    return new Response(JSON.stringify({ error: 'Missing code or state' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Извлекаем userId из state
  const [stateToken, userId] = state.split('-');
  
  try {
    const clientId = Deno.env.get('WHOOP_CLIENT_ID');
    const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error('Whoop credentials not configured');
    }
    
    // Обменяем код на токен доступа
    const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${new URL(req.url).origin}/whoop-callback`
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${await tokenResponse.text()}`);
    }

    const tokenData = await tokenResponse.json();
    
    // Сохраняем токены в базе данных
    const { error: saveError } = await supabase
      .from('whoop_tokens')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        created_at: new Date().toISOString()
      });

    if (saveError) {
      throw new Error(`Failed to save tokens: ${saveError.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Whoop account connected successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Callback error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to complete authorization', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Синхронизировать данные из Whoop
async function handleSync(req: Request, supabase: any) {
  const { userId } = await req.json();
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Missing userId' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Получаем токен пользователя
    const { data: tokenData, error: tokenError } = await supabase
      .from('whoop_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: 'User not connected to Whoop' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Проверяем, не истек ли токен
    if (new Date(tokenData.expires_at) < new Date()) {
      // TODO: Реализовать refresh token logic
      return new Response(JSON.stringify({ error: 'Token expired, re-authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Получаем данные из Whoop API
    const syncResults = await syncWhoopData(tokenData.access_token, userId, supabase);

    return new Response(JSON.stringify({ 
      success: true, 
      syncResults,
      message: 'Data synchronized successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to sync data', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Получить актуальные данные пользователя
async function handleGetData(req: Request, supabase: any) {
  const { userId } = await req.json();
  
  // Получаем синхронизированные данные из нашей базы
  const { data: measurements, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('user_id', userId)
    .eq('source', 'whoop')
    .order('measurement_date', { ascending: false })
    .limit(30);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    data: measurements 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Синхронизация данных из Whoop API
async function syncWhoopData(accessToken: string, userId: string, supabase: any) {
  const results = {
    recovery: 0,
    sleep: 0,
    workouts: 0,
    cycles: 0
  };

  try {
    // Получаем данные за последние 7 дней
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Синхронизируем Recovery данные
    const recoveryData = await fetchWhoopData(accessToken, 'recovery', { start: startDate, end: endDate });
    for (const recovery of recoveryData.records || []) {
      await saveRecoveryData(recovery, userId, supabase);
      results.recovery++;
    }

    // Синхронизируем Sleep данные
    const sleepData = await fetchWhoopData(accessToken, 'sleep', { start: startDate, end: endDate });
    for (const sleep of sleepData.records || []) {
      await saveSleepData(sleep, userId, supabase);
      results.sleep++;
    }

    // Синхронизируем Workout данные
    const workoutData = await fetchWhoopData(accessToken, 'workout', { start: startDate, end: endDate });
    for (const workout of workoutData.records || []) {
      await saveWorkoutData(workout, userId, supabase);
      results.workouts++;
    }

  } catch (error) {
    console.error('Sync data error:', error);
    throw error;
  }

  return results;
}

// Универсальная функция для запросов к Whoop API
async function fetchWhoopData(accessToken: string, endpoint: string, params: any = {}) {
  const url = new URL(`${WHOOP_API_BASE}/${endpoint}`);
  
  Object.keys(params).forEach(key => {
    if (params[key]) url.searchParams.set(key, params[key]);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Whoop API error: ${response.status} ${await response.text()}`);
  }

  return await response.json();
}

// Сохранение данных Recovery
async function saveRecoveryData(recovery: any, userId: string, supabase: any) {
  const { error } = await supabase
    .from('measurements')
    .upsert({
      user_id: userId,
      value: recovery.score.recovery_score,
      unit: '%',
      measurement_date: recovery.created_at.split('T')[0],
      notes: `Whoop Recovery Score. HRV: ${recovery.score.hrv_rmssd_milli}ms, RHR: ${recovery.score.resting_heart_rate}bpm`,
      source: 'whoop',
      whoop_id: recovery.id
    }, { onConflict: 'user_id,whoop_id' });

  if (error) {
    console.error('Error saving recovery data:', error);
  }
}

// Сохранение данных Sleep
async function saveSleepData(sleep: any, userId: string, supabase: any) {
  const { error } = await supabase
    .from('measurements')
    .upsert({
      user_id: userId,
      value: sleep.score.stage_summary.total_in_bed_time_milli / (1000 * 60), // Convert to minutes
      unit: 'min',
      measurement_date: sleep.created_at.split('T')[0],
      notes: `Whoop Sleep. Score: ${sleep.score.sleep_performance_percentage}%, Efficiency: ${sleep.score.sleep_efficiency_percentage}%`,
      source: 'whoop',
      whoop_id: sleep.id
    }, { onConflict: 'user_id,whoop_id' });

  if (error) {
    console.error('Error saving sleep data:', error);
  }
}

// Сохранение данных Workout
async function saveWorkoutData(workout: any, userId: string, supabase: any) {
  const { error } = await supabase
    .from('measurements')
    .upsert({
      user_id: userId,
      value: workout.score.strain,
      unit: 'strain',
      measurement_date: workout.created_at.split('T')[0],
      notes: `Whoop Workout: ${workout.sport_id}. Avg HR: ${workout.score.average_heart_rate}bpm, Max HR: ${workout.score.max_heart_rate}bpm`,
      source: 'whoop',
      whoop_id: workout.id
    }, { onConflict: 'user_id,whoop_id' });

  if (error) {
    console.error('Error saving workout data:', error);
  }
}