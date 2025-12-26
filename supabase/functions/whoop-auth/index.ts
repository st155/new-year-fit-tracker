import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const DEFAULT_REDIRECT_URI = 'https://elite10.club/auth/whoop/oauth2';

// Allowed origins for redirect URIs
const ALLOWED_ORIGINS = [
  'https://elite10.club',
  'https://1eef6188-774b-4d2c-ab12-3f76f54542b1.lovableproject.com',
];

// Helper to validate and get redirect URI
function getValidatedRedirectUri(requestedUri?: string): string {
  if (!requestedUri) return DEFAULT_REDIRECT_URI;
  
  const isAllowed = ALLOWED_ORIGINS.some(origin => requestedUri.startsWith(origin));
  if (isAllowed) {
    // Ensure it ends with the correct path
    const url = new URL(requestedUri);
    return `${url.origin}/auth/whoop/oauth2`;
  }
  
  console.warn(`⚠️ [whoop-auth] Invalid redirect URI requested: ${requestedUri}, using default`);
  return DEFAULT_REDIRECT_URI;
}

const SCOPES = [
  'offline',
  'read:recovery',
  'read:cycles',
  'read:sleep',
  'read:workout',
  'read:profile',
  'read:body_measurement'
].join(' ');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  
  const log = (level: string, message: string, data?: Record<string, unknown>) => {
    const elapsed = Date.now() - startTime;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      request_id: requestId,
      level,
      message,
      elapsed_ms: elapsed,
      ...data,
    }));
  };

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      log('error', 'Missing authorization header');
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      log('error', 'Unauthorized', { auth_error: authError?.message });
      throw new Error('Unauthorized');
    }

    const { action, code, state, redirect_uri: requestedRedirectUri } = await req.json();
    const redirectUri = getValidatedRedirectUri(requestedRedirectUri);
    const clientId = Deno.env.get('WHOOP_CLIENT_ID');
    const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      log('error', 'Whoop credentials not configured');
      throw new Error('Whoop credentials not configured');
    }

    log('info', 'Request received', { 
      action, 
      user_id: user.id,
      user_email: user.email,
      redirect_uri: redirectUri,
      requested_redirect_uri: requestedRedirectUri || 'none',
    });

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (action === 'get-auth-url') {
      const stateToken = crypto.randomUUID();

      const authUrl = new URL(WHOOP_AUTH_URL);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('state', stateToken);

      log('info', 'Generated auth URL', {
        state_token: stateToken,
        redirect_uri: redirectUri,
        client_id_preview: clientId.substring(0, 8) + '...',
        scopes: SCOPES,
        auth_url_length: authUrl.toString().length,
      });

      return new Response(
        JSON.stringify({ 
          url: authUrl.toString(), 
          state: stateToken,
          _debug: {
            redirect_uri: redirectUri,
            client_id_preview: clientId.substring(0, 8) + '...',
            scopes: SCOPES,
            user_email: user.email
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'exchange-token') {
      if (!code) {
        log('error', 'Missing authorization code');
        throw new Error('Missing authorization code');
      }

      log('info', 'Starting token exchange', {
        code_preview: code.substring(0, 10) + '...',
        has_state: !!state,
        redirect_uri: redirectUri,
      });

      // Verify state if provided
      if (state) {
        const { data: tokenData } = await serviceClient
          .from('whoop_tokens')
          .select('oauth_state')
          .eq('user_id', user.id)
          .single();

        if (tokenData?.oauth_state !== state) {
          log('warn', 'State mismatch', { expected: tokenData?.oauth_state, received: state });
        }
      }

      // Exchange code for tokens
      log('info', 'Calling Whoop token endpoint');
      const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        log('error', 'Token exchange failed', {
          status: tokenResponse.status,
          status_text: tokenResponse.statusText,
          error_body: errorText,
        });
        throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
      }

      const tokens = await tokenResponse.json();
      log('info', 'Token exchange successful', {
        expires_in: tokens.expires_in,
        has_refresh_token: !!tokens.refresh_token,
        token_type: tokens.token_type,
      });

      // Get user profile from Whoop
      const profileResponse = await fetch('https://api.prod.whoop.com/developer/v1/user/profile/basic', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      let whoopUserId = null;
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        whoopUserId = profile.user_id?.toString();
        console.log(`📋 [whoop-auth] Whoop user ID: ${whoopUserId}`);
      }

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Store tokens
      const { error: upsertError } = await serviceClient
        .from('whoop_tokens')
        .upsert({
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          whoop_user_id: whoopUserId,
          is_active: true,
          oauth_state: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error(`❌ [whoop-auth] Failed to store tokens:`, upsertError);
        throw new Error('Failed to store tokens');
      }

      console.log(`✅ [whoop-auth] Tokens stored successfully for user ${user.id}`);

      // Deactivate Terra WHOOP token to prevent duplicate data
      // This ensures seamless transition from Terra to direct integration
      const { data: terraToken, error: terraError } = await serviceClient
        .from('terra_tokens')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .ilike('provider', 'whoop')
        .select('id');

      if (terraToken && terraToken.length > 0) {
        console.log(`🔄 [whoop-auth] Deactivated Terra WHOOP token for seamless transition`);
      } else if (terraError) {
        console.warn(`⚠️ [whoop-auth] Could not deactivate Terra token:`, terraError.message);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          whoop_user_id: whoopUserId,
          expires_at: expiresAt,
          terra_deactivated: (terraToken?.length || 0) > 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refresh-token') {
      // Get current refresh token
      const { data: tokenData, error: fetchError } = await serviceClient
        .from('whoop_tokens')
        .select('refresh_token')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (fetchError || !tokenData?.refresh_token) {
        throw new Error('No active Whoop connection found');
      }

      console.log(`🔄 [whoop-auth] Refreshing token for user ${user.id}...`);

      const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error(`❌ [whoop-auth] Token refresh failed:`, errorText);
        
        // Mark token as inactive
        await serviceClient
          .from('whoop_tokens')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
          
        throw new Error('Token refresh failed - please reconnect');
      }

      const tokens = await tokenResponse.json();
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Update tokens
      await serviceClient
        .from('whoop_tokens')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || tokenData.refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      console.log(`✅ [whoop-auth] Token refreshed successfully`);

      return new Response(
        JSON.stringify({ success: true, expires_at: expiresAt }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect') {
      console.log(`🔌 [whoop-auth] Disconnecting Whoop for user ${user.id}`);

      await serviceClient
        .from('whoop_tokens')
        .update({ 
          is_active: false, 
          access_token: null,
          refresh_token: null,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      const { data: tokenData } = await serviceClient
        .from('whoop_tokens')
        .select('is_active, expires_at, whoop_user_id, last_sync_at, last_sync_date, created_at')
        .eq('user_id', user.id)
        .single();

      const isExpired = tokenData?.expires_at && new Date(tokenData.expires_at) < new Date();

      // Use last_sync_at if available, otherwise fall back to last_sync_date
      const lastSyncAt = tokenData?.last_sync_at || tokenData?.last_sync_date;

      return new Response(
        JSON.stringify({
          connected: tokenData?.is_active && !isExpired,
          whoop_user_id: tokenData?.whoop_user_id,
          expires_at: tokenData?.expires_at,
          is_expired: isExpired,
          last_sync_at: lastSyncAt,
          connected_at: tokenData?.created_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: any) {
    console.error(`❌ [whoop-auth] Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
