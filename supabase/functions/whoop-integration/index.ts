import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whoop API v2.0 endpoints
const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v2';
const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);
const ENABLE_VO2MAX = false;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let code: string | null = null;
    let state: string | null = null;
    let action: string | null = null;
    
    // Для POST запросов читаем body, для GET - параметры URL
    if (req.method === 'POST') {
      const parsedBody = await req.json().catch(() => ({}));
      action = parsedBody.action;
      code = parsedBody.code;
      state = parsedBody.state;
    } else {
      action = url.searchParams.get('action');
      code = url.searchParams.get('code');
      state = url.searchParams.get('state');
    }
    
    const error = url.searchParams.get('error');

    console.log(`Whoop integration request: ${action}`);

    // Если есть code параметр, то это callback от Whoop
    if (code || error) {
      return await handleCallback(req);
    }

    switch (action) {
      case 'auth':
        return await handleAuth(req);
      case 'callback':
        return await handleCallback(req);
      case 'check-status':
        return await handleCheckStatus(req);
      case 'sync':
        const parsedBody = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
        return await handleSync(req, parsedBody);
      case 'disconnect':
        return await handleDisconnect(req);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Whoop integration error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
        details: error?.stack || 'No stack trace available'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Инициируем OAuth процесс
async function handleAuth(req: Request) {
  const clientId = Deno.env.get('WHOOP_CLIENT_ID');
  // Accept both primary and www subdomain for safety
  const redirectUri = `https://elite10.club/whoop-callback`;
  
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

  // Генерируем UUID для state
  const state = crypto.randomUUID();
  await supabase
    .from('whoop_oauth_states')
    .insert({ state, user_id: user.id });

  const scope = 'offline read:recovery read:sleep read:workout read:profile';
  const authUrl = `${WHOOP_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

  console.log('Generated auth URL:', authUrl);

  return new Response(JSON.stringify({ authUrl, state }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// Обрабатываем callback от Whoop
async function handleCallback(req: Request) {
  const url = new URL(req.url);
  const isJson = (req.headers.get('content-type') || '').includes('application/json');
  const body = await req.clone().json().catch(() => ({} as any));

  const code = url.searchParams.get('code') || body?.code || undefined;
  const state = url.searchParams.get('state') || body?.state || undefined;
  const error = url.searchParams.get('error') || body?.error || undefined;

  console.log('Callback received:', { code: !!code, state: !!state, error, isJson });

  if (error) {
    console.error('Whoop OAuth error:', error);
    if (isJson) {
      return new Response(JSON.stringify({ error }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
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
    if (isJson) {
      return new Response(JSON.stringify({ error: 'missing_code_or_state' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
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
    console.log('Starting token exchange process with code:', code?.substring(0, 10) + '...');
    
    // Найдём пользователя по state
    const { data: mapping, error: mappingError } = await supabase
      .from('whoop_oauth_states')
      .select('user_id')
      .eq('state', state)
      .maybeSingle();

    console.log('State mapping lookup result:', { mapping, mappingError });

    if (mappingError) {
      console.error('Database error during state lookup:', mappingError);
      throw new Error(`State lookup failed: ${mappingError.message}`);
    }

    if (!mapping?.user_id) {
      console.error('No mapping found for state:', state);
      if (isJson) {
        return new Response(JSON.stringify({ error: 'no_state' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const redirectUrl = `https://elite10.club/whoop-callback?error=no_state`;
      return new Response(null, { status: 302, headers: { Location: redirectUrl, ...corsHeaders } });
    }

    console.log('Found user mapping, proceeding with token exchange for user:', mapping.user_id);
    
    // Обмениваем код на токены и сохраняем к пользователю
    const tokens = await exchangeCodeForTokens(code);
    console.log('Token exchange successful, saving to database...');
    
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
      throw new Error(`Failed to save tokens: ${saveError.message}`);
    }
    
    console.log('Tokens saved successfully to database');

    // Сразу синхронизируем данные с новыми токенами
    let syncResult = null;
    try {
      console.log('Starting immediate data sync after token exchange...');
      syncResult = await syncWhoopData(mapping.user_id, tokens.access_token);
      console.log('Sync completed successfully:', syncResult);
    } catch (syncError: any) {
      console.error('Sync error during callback (non-critical):', syncError?.message);
      // Не прерываем процесс при ошибке синхронизации
    }

    // Очистим state
    const { error: cleanupError } = await supabase.from('whoop_oauth_states').delete().eq('state', state);
    if (cleanupError) {
      console.error('Error cleaning up state:', cleanupError);
    }

    console.log('Callback process completed successfully');
    
    if (isJson) {
      return new Response(JSON.stringify({ 
        connected: true,
        syncResult: syncResult || { message: 'Sync will be attempted later' }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const redirectUrl = `https://elite10.club/whoop-callback?connected=1${syncResult ? '&synced=1' : ''}`;
    return new Response(null, { status: 302, headers: { Location: redirectUrl, ...corsHeaders } });

  } catch (error: any) {
    console.error('Callback processing error:', error?.message || error);
    const isJson = (req.headers.get('content-type') || '').includes('application/json');
    if (isJson) {
      return new Response(JSON.stringify({ error: error?.message || 'callback_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
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
              error: '${error?.message || 'Unknown error'}'
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

  // Проверяем наличие токенов - получаем все записи и используем самую свежую
  const { data: allTokens, error: tokenError } = await supabase
    .from('whoop_tokens')
    .select('id, expires_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (tokenError) {
    console.error('Error checking tokens:', tokenError);
    throw new Error('Failed to check connection status');
  }

  // Если есть несколько токенов, удаляем старые и оставляем только самый новый
  if (allTokens && allTokens.length > 1) {
    console.log(`Found ${allTokens.length} token records, cleaning up duplicates`);
    const latestToken = allTokens[0];
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

  const tokenData = allTokens && allTokens.length > 0 ? allTokens[0] : null;

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
        const { data: existingTokens, error: tokenErr } = await supabase
          .from('whoop_tokens')
          .select('access_token, refresh_token, expires_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
          
        const existing = existingTokens && existingTokens.length > 0 ? existingTokens[0] : null;
        
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
    // Получаем токены из базы данных - используем самый свежий токен
    const { data: allTokens, error: tokenError } = await supabase
      .from('whoop_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (tokenError) {
      console.error('Error fetching tokens:', tokenError);
      throw new Error('Failed to fetch Whoop tokens');
    }

    // Если есть несколько токенов, используем самый свежий и удаляем остальные
    if (!allTokens || allTokens.length === 0) {
      throw new Error('No Whoop connection found');
    }

    const tokenData = allTokens[0];
    
    // Очищаем дублированные токены если есть
    if (allTokens.length > 1) {
      console.log(`Found ${allTokens.length} token records during sync, will cleanup later`);
    }

    // Проверяем срок действия токена
    if (new Date(tokenData.expires_at) <= new Date()) {
      console.log('Access token expired, attempting refresh...');
      try {
        accessToken = await refreshWhoopToken(user.id);
        console.log('Token refreshed successfully');
      } catch (e: any) {
        console.error('Whoop token refresh failed:', e);
        return new Response(
          JSON.stringify({ 
            error: 'token_refresh_failed',
            message: 'Whoop token expired and refresh failed. Please reconnect your Whoop account.',
            details: e.message
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      accessToken = tokenData.access_token;
    }
  }

  // Синхронизируем данные
  const syncResult = await syncWhoopData(user.id, accessToken!);

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
  const redirectUri = `https://elite10.club/whoop-callback`;

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
    console.error('Token exchange failed - Status:', response.status, 'Response:', errorText);
    
    // Более детальная обработка ошибок
    try {
      const errorData = JSON.parse(errorText);
      console.error('Parsed error data:', errorData);
      if (errorData.error === 'invalid_grant') {
        throw new Error('Authorization code has expired or already been used. Please try connecting again.');
      }
      if (errorData.error) {
        throw new Error(`Whoop error: ${errorData.error} - ${errorData.error_description || ''}`);
      }
    } catch (parseError) {
      console.error('Could not parse error response as JSON:', parseError);
      // Если не удалось парсить JSON, используем оригинальную ошибку
    }
    
    throw new Error(`Failed to exchange code for tokens (status ${response.status})`);
  }

  const json = await response.json();
  console.log('Token exchange succeeded. Has access_token:', !!json.access_token, 'Has refresh_token:', !!json.refresh_token);
  return json;
}

// Refresh Whoop token using refresh_token
async function refreshWhoopToken(userId: string): Promise<string> {
  const clientId = Deno.env.get('WHOOP_CLIENT_ID');
  const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Whoop credentials not configured');

  // Get latest refresh token from DB
  const { data: tokens, error } = await supabase
    .from('whoop_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const refreshToken = tokens?.refresh_token;
  if (!refreshToken) throw new Error('No refresh token available');

  const resp = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Failed to refresh Whoop token: ${txt}`);
  }

  const json = await resp.json();
  await supabase
    .from('whoop_tokens')
    .upsert({
      user_id: userId,
      access_token: json.access_token,
      refresh_token: json.refresh_token || refreshToken,
      expires_at: new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

  return json.access_token as string;
}

// Получаем информацию о пользователе
async function fetchWhoopUserInfo(accessToken: string) {
  const response = await fetch(`${WHOOP_API_BASE}/user/profile/basic`, {
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
  
  const startDate = thirtyDaysAgo.toISOString();
  const endDate = now.toISOString();

  console.log(`Syncing Whoop data for user ${userId} from ${startDate} to ${endDate}`);

  try {
    // Синхронизируем recovery данные
    const recoveryData = await fetchWhoopData(accessToken, 'recovery', {
      start: startDate,
      end: endDate,
    });

    // Синхронизируем sleep данные
    const sleepData = await fetchWhoopData(accessToken, 'activity/sleep', {
      start: startDate,
      end: endDate,
    });

    // Синхронизируем workout данные
    const workoutData = await fetchWhoopData(accessToken, 'activity/workout', {
      start: startDate,
      end: endDate,
    });

    // Пытаемся синхронизировать body measurement данные (опционально)
    let bodyData = null;
    try {
      bodyData = await fetchWhoopData(accessToken, 'user/measurement/body', {});
      console.log('Body measurement data received:', JSON.stringify(bodyData, null, 2));
    } catch (error: any) {
      console.log('Body measurement endpoint not available:', error.message);
      // Продолжаем без body measurement данных
    }

    // Пытаемся получить данные циклов для VO2Max (могут содержать cardio data)
    let cycleData = null;
    if (ENABLE_VO2MAX) {
      try {
        cycleData = await fetchWhoopData(accessToken, 'cycle', {
          start: startDate,
          end: endDate,
        });
        console.log('Cycle data received:', JSON.stringify(cycleData?.records?.slice(0,2), null, 2));
      } catch (error: any) {
        console.log('Cycle endpoint error:', error.message);
      }
    } else {
      console.log('VO2Max sync disabled by feature flag');
    }

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

    if (bodyData) {
      savedRecords += await saveBodyData(userId, [bodyData]);
    }

    if (ENABLE_VO2MAX && cycleData?.records) {
      savedRecords += await saveCycleData(userId, cycleData.records);
    }

    await logWhoopEvent(userId, 'whoop_sync_complete', 'Whoop data synchronized', {
      recoveryRecords: recoveryData?.records?.length || 0,
      sleepRecords: sleepData?.records?.length || 0,
      workoutRecords: workoutData?.records?.length || 0,
      bodyRecords: bodyData ? 1 : 0,
      cycleRecords: cycleData?.records?.length || 0,
      totalSaved: savedRecords
    });

    return {
      recoveryRecords: recoveryData?.records?.length || 0,
      sleepRecords: sleepData?.records?.length || 0,
      workoutRecords: workoutData?.records?.length || 0,
      bodyRecords: bodyData ? 1 : 0,
      cycleRecords: cycleData?.records?.length || 0,
      totalSaved: savedRecords
    };

  } catch (error: any) {
    await logWhoopEvent(userId, 'whoop_sync_error', 'Whoop sync failed', { error: error?.message || 'Unknown error' });
    throw error;
  }
}

// Универсальная функция для запросов к Whoop API v2
async function fetchWhoopData(accessToken: string, endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${WHOOP_API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  console.log(`Fetching Whoop v2 data from: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Whoop API v2 error for ${endpoint} (${response.status}):`, errorText);
    throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log(`Whoop v2 ${endpoint} response:`, { recordsCount: result?.records?.length || 0 });
  return result;
}

// Сохраняем recovery данные (API v2)
async function saveRecoveryData(userId: string, records: any[]) {
  let savedCount = 0;

  for (const record of records) {
    // API v2 structure: record.score.recovery_score, record.cycle_id
    if (!record.score?.recovery_score || !record.cycle_id) continue;

    const metricId = await getOrCreateMetric(userId, 'Recovery Score', 'recovery', '%', 'whoop');
    
    const { error } = await supabase
      .from('metric_values')
      .upsert({
        user_id: userId,
        metric_id: metricId,
        value: record.score.recovery_score,
        measurement_date: (record.created_at || '').split('T')[0],
        external_id: record.cycle_id,
        source_data: record,
      }, {
        onConflict: 'metric_id,measurement_date,external_id'
      });

    if (!error) savedCount++;
    else console.error('Error saving recovery data:', error);
  }

  console.log(`Saved ${savedCount} recovery records`);
  return savedCount;
}

// Сохраняем sleep данные (API v2)
async function saveSleepData(userId: string, records: any[]) {
  let savedCount = 0;

  for (const record of records) {
    if (!record.score || !record.id) continue;

    // Sleep efficiency - API v2 structure
    if (record.score.sleep_efficiency_percentage !== undefined) {
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
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving sleep efficiency:', error);
    }

    // Sleep performance score - API v2
    if (record.score.sleep_performance_percentage !== undefined) {
      const metricId = await getOrCreateMetric(userId, 'Sleep Performance', 'sleep', '%', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: record.score.sleep_performance_percentage,
          measurement_date: record.created_at.split('T')[0],
          external_id: `${record.id}_performance`,
          source_data: record,
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving sleep performance:', error);
    }

    // Sleep need fulfillment - API v2
    if (record.score.sleep_need_percentage !== undefined) {
      const metricId = await getOrCreateMetric(userId, 'Sleep Need Fulfillment', 'sleep', '%', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: record.score.sleep_need_percentage,
          measurement_date: record.created_at.split('T')[0],
          external_id: `${record.id}_need`,
          source_data: record,
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving sleep need:', error);
    }
  }

  console.log(`Saved ${savedCount} sleep records`);
  return savedCount;
}

// Сохраняем workout данные (API v2)
async function saveWorkoutData(userId: string, records: any[]) {
  let savedCount = 0;

  for (const record of records) {
    if (!record.score || !record.id) continue;

    // Strain - API v2 structure
    if (record.score.strain !== undefined) {
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
          notes: record.sport_name || record.sport?.name || null,
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving workout strain:', error);
    }

    // Average heart rate - API v2
    if (record.score.average_heart_rate !== undefined) {
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
          notes: record.sport_name || record.sport?.name || null,
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving workout heart rate:', error);
    }

    // Max heart rate - API v2
    if (record.score.max_heart_rate !== undefined) {
      const metricId = await getOrCreateMetric(userId, 'Max Heart Rate', 'workout', 'bpm', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: record.score.max_heart_rate,
          measurement_date: record.created_at.split('T')[0],
          external_id: `${record.id}_max_hr`,
          source_data: record,
          notes: record.sport_name || record.sport?.name || null,
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving max heart rate:', error);
    }

    // Calories - API v2
    if (record.score.kilojoule !== undefined) {
      const calories = Math.round(record.score.kilojoule / 4.184); // Convert kJ to calories
      const metricId = await getOrCreateMetric(userId, 'Workout Calories', 'workout', 'kcal', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: calories,
          measurement_date: record.created_at.split('T')[0],
          external_id: `${record.id}_calories`,
          source_data: record,
          notes: record.sport_name || record.sport?.name || null,
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving workout calories:', error);
    }
  }

  console.log(`Saved ${savedCount} workout records`);
  return savedCount;
}

// Сохраняем body measurement данные (рост, вес, максимальный пульс)
async function saveBodyData(userId: string, records: any[]) {
  let savedCount = 0;

  for (const record of records) {
    if (!record) continue;

    console.log('Processing body measurement record:', JSON.stringify(record, null, 2));

    // Рост
    if (record.height_meter !== undefined) {
      const metricId = await getOrCreateMetric(userId, 'Рост', 'body', 'м', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: record.height_meter,
          measurement_date: new Date().toISOString().split('T')[0],
          external_id: `whoop_height`,
          source_data: record,
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving height:', error);
    }

    // Вес
    if (record.weight_kilogram !== undefined) {
      const metricId = await getOrCreateMetric(userId, 'Вес', 'body', 'кг', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: record.weight_kilogram,
          measurement_date: new Date().toISOString().split('T')[0],
          external_id: `whoop_weight`,
          source_data: record,
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving weight:', error);
    }

    // Максимальный пульс
    if (record.max_heart_rate !== undefined) {
      const metricId = await getOrCreateMetric(userId, 'Максимальный пульс', 'cardio', 'bpm', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: record.max_heart_rate,
          measurement_date: new Date().toISOString().split('T')[0],
          external_id: `whoop_max_hr`,
          source_data: record,
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving max heart rate:', error);
    }

    // Height (рост)
    if (record.measurement_data?.height_meter !== undefined) {
      const heightCm = record.measurement_data.height_meter * 100;
      const metricId = await getOrCreateMetric(userId, 'Height', 'body', 'см', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: heightCm,
          measurement_date: record.created_at.split('T')[0],
          external_id: `${record.id}_height`,
          source_data: record,
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving height:', error);
    }

    // Weight (вес)
    if (record.measurement_data?.weight_kilogram !== undefined) {
      const metricId = await getOrCreateMetric(userId, 'Weight', 'body', 'кг', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: record.measurement_data.weight_kilogram,
          measurement_date: record.created_at.split('T')[0],
          external_id: `${record.id}_weight`,
          source_data: record,
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving weight:', error);
    }
  }

  console.log(`Saved ${savedCount} body measurement records`);
  return savedCount;
}

// Сохраняем данные циклов (могут содержать VO2Max или другие кардио-метрики)
async function saveCycleData(userId: string, records: any[]) {
  let savedCount = 0;

  for (const record of records) {
    if (!record || !record.id) continue;

    console.log('Processing cycle record:', JSON.stringify(record, null, 2));

    // Проверяем есть ли кардио данные в цикле
    if (record.score && record.score.vo2_max !== undefined) {
      const metricId = await getOrCreateMetric(userId, 'VO2Max', 'cardio', 'мл/кг/мин', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: record.score.vo2_max,
          measurement_date: record.start.split('T')[0],
          external_id: `${record.id}_vo2max`,
          source_data: record,
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving VO2Max from cycle:', error);
    }

    // Проверяем другие возможные метрики в циклах
    if (record.metrics && record.metrics.vo2_max !== undefined) {
      const metricId = await getOrCreateMetric(userId, 'VO2Max', 'cardio', 'мл/кг/мин', 'whoop');
      
      const { error } = await supabase
        .from('metric_values')
        .upsert({
          user_id: userId,
          metric_id: metricId,
          value: record.metrics.vo2_max,
          measurement_date: record.start.split('T')[0],
          external_id: `${record.id}_vo2max_metrics`,
          source_data: record,
        }, {
          onConflict: 'metric_id,measurement_date,external_id'
        });

      if (!error) savedCount++;
      else console.error('Error saving VO2Max from cycle metrics:', error);
    }
  }

  console.log(`Saved ${savedCount} cycle records`);
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