import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whoop API endpoints
const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer';
const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || (await req.json().catch(() => ({})))?.action;

    console.log(`Whoop integration request: ${action}`);

    switch (action) {
      case 'auth':
        return await handleAuth();
      case 'callback':
        return await handleCallback(req);
      case 'check-status':
        return await handleCheckStatus(req);
      case 'sync':
        return await handleSync(req);
      case 'disconnect':
        return await handleDisconnect(req);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Whoop integration error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Инициируем OAuth процесс
async function handleAuth() {
  const clientId = Deno.env.get('WHOOP_CLIENT_ID');
  const redirectUri = `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/functions/v1/whoop-integration?action=callback`;
  
  if (!clientId) {
    throw new Error('WHOOP_CLIENT_ID not configured');
  }

  const state = crypto.randomUUID();
  const scope = 'read:recovery read:sleep read:workout read:profile read:body_measurement';
  
  const authUrl = `${WHOOP_AUTH_URL}?` +
    `response_type=code&` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `state=${state}`;

  console.log('Generated auth URL:', authUrl);

  return new Response(
    JSON.stringify({ 
      authUrl,
      state 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Обрабатываем callback от Whoop
async function handleCallback(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('Whoop OAuth error:', error);
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Whoop Authorization Error</title>
        </head>
        <body>
          <script>
            window.opener?.postMessage({
              type: 'whoop-auth-error',
              error: '${error}'
            }, window.location.origin);
            window.close();
          </script>
        </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }

  if (!code || !state) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Whoop Authorization Error</title>
        </head>
        <body>
          <script>
            window.opener?.postMessage({
              type: 'whoop-auth-error',
              error: 'Missing authorization code or state'
            }, window.location.origin);
            window.close();
          </script>
        </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    // Получаем токены
    const tokens = await exchangeCodeForTokens(code);
    console.log('Received tokens from Whoop');

    // Получаем информацию о пользователе из Whoop
    const userInfo = await fetchWhoopUserInfo(tokens.access_token);
    console.log('Received user info:', userInfo);

    // Возвращаем HTML с сообщением об успехе
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Whoop Authorization Success</title>
        </head>
        <body>
          <script>
            // Сохраняем токены в localStorage для временного хранения
            localStorage.setItem('whoop_temp_tokens', JSON.stringify({
              access_token: '${tokens.access_token}',
              refresh_token: '${tokens.refresh_token}',
              expires_in: ${tokens.expires_in}
            }));
            
            window.opener?.postMessage({
              type: 'whoop-auth-success',
              data: ${JSON.stringify(userInfo)}
            }, window.location.origin);
            window.close();
          </script>
        </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });

  } catch (error) {
    console.error('Callback processing error:', error);
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Whoop Authorization Error</title>
        </head>
        <body>
          <script>
            window.opener?.postMessage({
              type: 'whoop-auth-error',
              error: '${error.message}'
            }, window.location.origin);
            window.close();
          </script>
        </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
}

// Проверяем статус подключения
async function handleCheckStatus(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new Error('No authorization header provided');
  }

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  
  if (userError || !user) {
    throw new Error('Invalid user token');
  }

  // Проверяем наличие токенов
  const { data: tokenData, error: tokenError } = await supabase
    .from('whoop_tokens')
    .select('id, expires_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (tokenError) {
    console.error('Error checking tokens:', tokenError);
    throw new Error('Failed to check connection status');
  }

  const isConnected = tokenData && new Date(tokenData.expires_at) > new Date();

  return new Response(
    JSON.stringify({ 
      isConnected: !!isConnected,
      lastSync: tokenData?.updated_at || null
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Синхронизируем данные с Whoop
async function handleSync(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new Error('No authorization header provided');
  }

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  
  if (userError || !user) {
    throw new Error('Invalid user token');
  }

  // Сначала проверяем, есть ли временные токены в запросе
  const body = await req.json().catch(() => ({}));
  let accessToken = body.tempTokens?.access_token;
  let refreshToken = body.tempTokens?.refresh_token;
  let expiresIn = body.tempTokens?.expires_in;

  if (accessToken && refreshToken) {
    // Сохраняем токены в базу данных
    const { error: saveError } = await supabase
      .from('whoop_tokens')
      .upsert({
        user_id: user.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString()
      });

    if (saveError) {
      console.error('Error saving tokens:', saveError);
      throw new Error('Failed to save tokens');
    }
  } else {
    // Получаем токены из базы данных
    const { data: tokenData, error: tokenError } = await supabase
      .from('whoop_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      throw new Error('No Whoop connection found');
    }

    // Проверяем срок действия токена
    if (new Date(tokenData.expires_at) <= new Date()) {
      throw new Error('Whoop token expired');
    }

    accessToken = tokenData.access_token;
  }

  // Синхронизируем данные
  const syncResult = await syncWhoopData(user.id, accessToken);

  return new Response(
    JSON.stringify({ 
      success: true,
      message: 'Data synchronized successfully',
      syncResult 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Отключаем Whoop
async function handleDisconnect(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new Error('No authorization header provided');
  }

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  
  if (userError || !user) {
    throw new Error('Invalid user token');
  }

  // Удаляем токены
  const { error: deleteError } = await supabase
    .from('whoop_tokens')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Error disconnecting Whoop:', deleteError);
    throw new Error('Failed to disconnect Whoop');
  }

  await logWhoopEvent(user.id, 'whoop_disconnected', 'Whoop disconnected', {});

  return new Response(
    JSON.stringify({ 
      success: true,
      message: 'Whoop disconnected successfully' 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Обмениваем код на токены
async function exchangeCodeForTokens(code: string) {
  const clientId = Deno.env.get('WHOOP_CLIENT_ID');
  const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET');
  const redirectUri = `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/functions/v1/whoop-integration?action=callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Whoop credentials not configured');
  }

  const response = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token exchange failed:', errorText);
    throw new Error('Failed to exchange code for tokens');
  }

  return await response.json();
}

// Получаем информацию о пользователе
async function fetchWhoopUserInfo(accessToken: string) {
  const response = await fetch(`${WHOOP_API_BASE}/v1/user/profile/basic`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  return await response.json();
}

// Синхронизируем данные с Whoop
async function syncWhoopData(userId: string, accessToken: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const startDate = thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = now.toISOString().split('T')[0];

  console.log(`Syncing Whoop data for user ${userId} from ${startDate} to ${endDate}`);

  try {
    // Синхронизируем recovery данные
    const recoveryData = await fetchWhoopData(accessToken, 'v1/cycle', {
      start: startDate,
      end: endDate,
    });

    // Синхронизируем sleep данные
    const sleepData = await fetchWhoopData(accessToken, 'v1/activity/sleep', {
      start: startDate,
      end: endDate,
    });

    // Синхронизируем workout данные
    const workoutData = await fetchWhoopData(accessToken, 'v1/activity/workout', {
      start: startDate,
      end: endDate,
    });

    // Сохраняем данные в базу
    let savedRecords = 0;
    
    if (recoveryData?.records) {
      savedRecords += await saveRecoveryData(userId, recoveryData.records);
    }
    
    if (sleepData?.records) {
      savedRecords += await saveSleepData(userId, sleepData.records);
    }
    
    if (workoutData?.records) {
      savedRecords += await saveWorkoutData(userId, workoutData.records);
    }

    await logWhoopEvent(userId, 'whoop_sync_complete', 'Whoop data synchronized', {
      recoveryRecords: recoveryData?.records?.length || 0,
      sleepRecords: sleepData?.records?.length || 0,
      workoutRecords: workoutData?.records?.length || 0,
      totalSaved: savedRecords
    });

    return {
      recoveryRecords: recoveryData?.records?.length || 0,
      sleepRecords: sleepData?.records?.length || 0,
      workoutRecords: workoutData?.records?.length || 0,
      totalSaved: savedRecords
    };

  } catch (error) {
    await logWhoopEvent(userId, 'whoop_sync_error', 'Whoop sync failed', { error: error.message });
    throw error;
  }
}

// Универсальная функция для запросов к Whoop API
async function fetchWhoopData(accessToken: string, endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${WHOOP_API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Whoop API error for ${endpoint}:`, errorText);
    throw new Error(`Failed to fetch ${endpoint}`);
  }

  return await response.json();
}

// Сохраняем recovery данные
async function saveRecoveryData(userId: string, records: any[]) {
  let savedCount = 0;

  for (const record of records) {
    if (!record.score || !record.cycle_id) continue;

    const metricId = await getOrCreateMetric(userId, 'Recovery Score', 'recovery', '%', 'whoop');
    
    const { error } = await supabase
      .from('metric_values')
      .upsert({
        user_id: userId,
        metric_id: metricId,
        value: record.score.recovery_score,
        measurement_date: record.cycle_id.split('T')[0],
        external_id: record.cycle_id,
        source_data: record,
      });

    if (!error) savedCount++;
  }

  return savedCount;
}

// Сохраняем sleep данные
async function saveSleepData(userId: string, records: any[]) {
  let savedCount = 0;

  for (const record of records) {
    if (!record.score || !record.id) continue;

    // Sleep efficiency
    if (record.score.sleep_efficiency_percentage) {
      const metricId = await getOrCreateMetric(userId, 'Sleep Efficiency', 'sleep', '%', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: record.score.sleep_efficiency_percentage,
          measurement_date: record.created_at.split('T')[0],
          external_id: record.id,
          source_data: record,
        });

      if (!error) savedCount++;
    }

    // Sleep duration
    if (record.sleep_performance_percentage) {
      const metricId = await getOrCreateMetric(userId, 'Sleep Performance', 'sleep', '%', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: record.sleep_performance_percentage,
          measurement_date: record.created_at.split('T')[0],
          external_id: `${record.id}_performance`,
          source_data: record,
        });

      if (!error) savedCount++;
    }
  }

  return savedCount;
}

// Сохраняем workout данные
async function saveWorkoutData(userId: string, records: any[]) {
  let savedCount = 0;

  for (const record of records) {
    if (!record.score || !record.id) continue;

    // Strain
    if (record.score.strain) {
      const metricId = await getOrCreateMetric(userId, 'Workout Strain', 'workout', 'strain', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: record.score.strain,
          measurement_date: record.created_at.split('T')[0],
          external_id: record.id,
          source_data: record,
          notes: record.sport_name || null,
        });

      if (!error) savedCount++;
    }

    // Average heart rate
    if (record.score.average_heart_rate) {
      const metricId = await getOrCreateMetric(userId, 'Average Heart Rate', 'workout', 'bpm', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: record.score.average_heart_rate,
          measurement_date: record.created_at.split('T')[0],
          external_id: `${record.id}_hr`,
          source_data: record,
          notes: record.sport_name || null,
        });

      if (!error) savedCount++;
    }
  }

  return savedCount;
}

// Получаем или создаем метрику
async function getOrCreateMetric(userId: string, metricName: string, category: string, unit: string, source: string) {
  const { data, error } = await supabase.rpc('create_or_get_metric', {
    p_user_id: userId,
    p_metric_name: metricName,
    p_metric_category: category,
    p_unit: unit,
    p_source: source
  });

  if (error) {
    throw new Error(`Failed to create/get metric: ${error.message}`);
  }

  return data;
}

// Логируем события Whoop
async function logWhoopEvent(userId: string, eventType: string, message: string, details: any) {
  try {
    await supabase
      .from('error_logs')
      .insert({
        user_id: userId,
        error_type: eventType,
        error_message: message,
        error_details: JSON.stringify(details),
        source: 'whoop',
        user_agent: 'Supabase Edge Function',
        url: 'whoop-integration'
      });
  } catch (error) {
    console.error('Failed to log Whoop event:', error);
  }
}