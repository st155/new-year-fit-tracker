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
    // Read body ONCE to avoid stream consumption issues
    const parsedBody = await req.clone().json().catch(() => ({}));
    const action = url.searchParams.get('action') || parsedBody?.action;

    console.log(`Whoop integration request: ${action}`);

    switch (action) {
      case 'auth':
        return await handleAuth(req);
      case 'callback':
        return await handleCallback(req);
      case 'check-status':
        return await handleCheckStatus(req);
      case 'sync':
        return await handleSync(req, parsedBody);
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
        message: error.message,
        details: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Инициируем OAuth процесс
async function handleAuth(req: Request) {
  const clientId = Deno.env.get('WHOOP_CLIENT_ID');
  const redirectUri = `https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-integration?action=callback`;
  
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'WHOOP_CLIENT_ID not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Авторизованный пользователь для привязки state -> user
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authorization required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const state = crypto.randomUUID();
  await supabase
    .from('whoop_oauth_states')
    .insert({ state, user_id: user.id });

  const scope = 'read:recovery read:sleep read:workout read:profile read:body_measurement';
  const authUrl = `${WHOOP_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

  console.log('Generated auth URL:', authUrl);

  return new Response(JSON.stringify({ authUrl, state }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// Обрабатываем callback от Whoop
async function handleCallback(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  console.log('Callback received:', { code: !!code, state: !!state, error });

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
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }

  if (!code || !state) {
    console.error('Missing code or state:', { code: !!code, state: !!state });
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
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    // Найдём пользователя по state
    const { data: mapping } = await supabase
      .from('whoop_oauth_states')
      .select('user_id')
      .eq('state', state)
      .maybeSingle();

    if (!mapping?.user_id) {
      console.error('No mapping found for state');
      const redirectUrl = `https://1eef6188-774b-4d2c-ab12-3f76f54542b1.lovableproject.com/whoop-callback?error=no_state`;
      return new Response(null, { status: 302, headers: { Location: redirectUrl, ...corsHeaders } });
    }

    // Обмениваем код на токены и сохраняем к пользователю
    const tokens = await exchangeCodeForTokens(code);
    const expiresIn = tokens.expires_in || 3600;
    const { error: saveError } = await supabase
      .from('whoop_tokens')
      .upsert({
        user_id: mapping.user_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString()
      });
    if (saveError) {
      console.error('Error saving tokens in callback:', saveError);
    }

    // Очистим state
    await supabase.from('whoop_oauth_states').delete().eq('state', state);

    const redirectUrl = `https://1eef6188-774b-4d2c-ab12-3f76f54542b1.lovableproject.com/whoop-callback?connected=1`;
    return new Response(null, { status: 302, headers: { Location: redirectUrl, ...corsHeaders } });

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
            }, '*');
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
  console.log('Check status - Auth header present:', !!authHeader);
  
  if (!authHeader) {
    console.error('Missing authorization header for check-status');
    return new Response(
      JSON.stringify({ 
        error: 'Authorization required',
        message: 'No authorization header provided' 
      }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  
  if (userError || !user) {
    console.error('Invalid user token:', userError?.message);
    return new Response(
      JSON.stringify({ 
        error: 'Invalid token',
        message: userError?.message || 'Invalid user token' 
      }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
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
async function handleSync(req: Request, body: any = {}) {
  const authHeader = req.headers.get('authorization');
  console.log('Sync request - Auth header present:', !!authHeader);
  
  if (!authHeader) {
    console.error('Missing authorization header for sync');
    return new Response(
      JSON.stringify({ 
        error: 'Authorization required',
        message: 'No authorization header provided' 
      }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  
  if (userError || !user) {
    console.error('Invalid user token:', userError?.message);
    return new Response(
      JSON.stringify({ 
        error: 'Invalid token',
        message: userError?.message || 'Invalid user token' 
      }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Сначала проверяем, есть ли временные токены или код авторизации в запросе
  // body был прочитан выше на входе в функцию
  let accessToken: string | undefined;
  let refreshToken: string | null | undefined;
  let expiresIn: number | undefined;

  console.log('Sync request body:', { hasCode: !!body?.code, hasTempTokens: !!body?.tempTokens, userId: user.id });

  if (body?.code) {
    console.log('Processing authorization code for sync');
    try {
      // Обмениваем код на токены здесь (не в callback), чтобы избежать invalid_grant
      const tokens = await exchangeCodeForTokens(body.code);
      console.log('Successfully exchanged code for tokens');
      
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token || null;
      expiresIn = tokens.expires_in || 3600;

      const { error: saveError } = await supabase
        .from('whoop_tokens')
        .upsert({
          user_id: user.id,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: new Date(Date.now() + (expiresIn ?? 3600) * 1000).toISOString(),
          updated_at: new Date().toISOString()
        });

      if (saveError) {
        console.error('Error saving tokens (code flow):', saveError);
        throw new Error('Failed to save tokens');
      }
      
      console.log('Tokens saved successfully to database');
    } catch (error: any) {
      console.error('Failed to process authorization code:', error?.message);
      // Если код уже использован/просрочен, попробуем использовать уже сохраненные токены
      if (String(error?.message || '').includes('expired') || String(error?.message || '').includes('already been used')) {
        const { data: existing, error: tokenErr } = await supabase
          .from('whoop_tokens')
          .select('access_token, refresh_token, expires_at')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!tokenErr && existing && new Date(existing.expires_at) > new Date()) {
          console.log('Using existing valid tokens after invalid_grant');
          accessToken = existing.access_token;
        } else {
          throw new Error(`Authorization failed and no valid tokens found: ${error.message}`);
        }
      } else {
        throw new Error(`Authorization failed: ${error.message}`);
      }
    }
  } else if (body?.tempTokens?.access_token) {
    console.log('Processing temporary tokens for sync');
    accessToken = body.tempTokens.access_token;
    refreshToken = body.tempTokens.refresh_token || null;
    expiresIn = body.tempTokens.expires_in || 3600;

    const { error: saveError } = await supabase
      .from('whoop_tokens')
      .upsert({
        user_id: user.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + (expiresIn ?? 3600) * 1000).toISOString(),
        updated_at: new Date().toISOString()
      });

    if (saveError) {
      console.error('Error saving tokens (temp flow):', saveError);
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
  console.log('Disconnect - Auth header present:', !!authHeader);
  
  if (!authHeader) {
    console.error('Missing authorization header for disconnect');
    return new Response(
      JSON.stringify({ 
        error: 'Authorization required',
        message: 'No authorization header provided' 
      }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  
  if (userError || !user) {
    console.error('Invalid user token:', userError?.message);
    return new Response(
      JSON.stringify({ 
        error: 'Invalid token',
        message: userError?.message || 'Invalid user token' 
      }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
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

  console.log('Exchanging code for tokens', {
    codeLength: code?.length || 0,
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    redirectUri
  });

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

  console.log('Token exchange response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token exchange failed:', errorText);
    
    // Более детальная обработка ошибок
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.error === 'invalid_grant') {
        throw new Error('Authorization code has expired or already been used. Please try connecting again.');
      }
      if (errorData.error) {
        throw new Error(`Whoop error: ${errorData.error}`);
      }
    } catch (parseError) {
      // Если не удалось парсить JSON, используем оригинальную ошибку
    }
    
    throw new Error(`Failed to exchange code for tokens (status ${response.status})`);
  }

  const json = await response.json();
  console.log('Token exchange succeeded. Has access_token:', !!json.access_token, 'Has refresh_token:', !!json.refresh_token);
  return json;
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