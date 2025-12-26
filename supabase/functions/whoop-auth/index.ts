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

// State is valid for 15 minutes
const STATE_VALIDITY_MINUTES = 15;

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

// Actions that require JWT authentication
const PROTECTED_ACTIONS = ['get-auth-url', 'status', 'refresh-token', 'disconnect'];

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
    const body = await req.json();
    const { action, code, state, redirect_uri: requestedRedirectUri } = body;
    
    log('info', 'Request received', { action });

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const clientId = Deno.env.get('WHOOP_CLIENT_ID');
    const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      log('error', 'Whoop credentials not configured');
      throw new Error('Whoop credentials not configured');
    }

    const redirectUri = getValidatedRedirectUri(requestedRedirectUri);

    // For protected actions, require JWT
    let user: { id: string; email?: string } | null = null;
    
    if (PROTECTED_ACTIONS.includes(action)) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        log('warn', 'No authorization header for protected action', { action });
        // For status action, return graceful response instead of error
        if (action === 'status') {
          return new Response(
            JSON.stringify({ connected: false, reason: 'no_session' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error('Missing authorization header');
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        log('warn', 'Invalid session', { auth_error: authError?.message, action });
        // For status action, return graceful response
        if (action === 'status') {
          return new Response(
            JSON.stringify({ connected: false, reason: 'invalid_session' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error('Unauthorized');
      }
      user = authUser;
      log('info', 'Authenticated user', { user_id: user.id });
    }

    // ============================================================
    // ACTION: get-auth-url
    // ============================================================
    if (action === 'get-auth-url') {
      if (!user) throw new Error('User required');
      
      // Check if we have a fresh state already in whoop_oauth_states (idempotent)
      const { data: existingState, error: existingError } = await serviceClient
        .from('whoop_oauth_states')
        .select('state, created_at, redirect_uri')
        .eq('user_id', user.id)
        .is('consumed_at', null)
        .gte('created_at', new Date(Date.now() - STATE_VALIDITY_MINUTES * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        log('warn', 'Error checking existing state', { error: existingError.message });
      }

      let stateToken: string;
      let isReused = false;

      if (existingState && existingState.redirect_uri === redirectUri) {
        // Reuse existing fresh state
        stateToken = existingState.state;
        isReused = true;
        log('info', 'Reusing existing fresh state', {
          state_prefix: stateToken.substring(0, 12),
          state_suffix: stateToken.slice(-8),
          state_length: stateToken.length,
          created_at: existingState.created_at,
        });
      } else {
        // Generate new state (just UUID, user_id stored in table)
        stateToken = crypto.randomUUID();
        
        // Insert into whoop_oauth_states
        const { error: insertError } = await serviceClient
          .from('whoop_oauth_states')
          .insert({
            state: stateToken,
            user_id: user.id,
            redirect_uri: redirectUri,
          });

        if (insertError) {
          log('error', 'Failed to insert oauth state', {
            error_code: insertError.code,
            error_message: insertError.message,
            error_details: insertError.details,
          });
          throw new Error(`Failed to create OAuth state: ${insertError.message}`);
        }

        log('info', 'Created new oauth state', {
          state_prefix: stateToken.substring(0, 12),
          state_suffix: stateToken.slice(-8),
          state_length: stateToken.length,
          redirect_uri: redirectUri,
        });
      }

      const authUrl = new URL(WHOOP_AUTH_URL);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('state', stateToken);

      log('info', 'Generated auth URL', {
        state_prefix: stateToken.substring(0, 12),
        state_reused: isReused,
        redirect_uri: redirectUri,
      });

      return new Response(
        JSON.stringify({ 
          url: authUrl.toString(), 
          state: stateToken,
          _debug: {
            redirect_uri: redirectUri,
            client_id_preview: clientId.substring(0, 8) + '...',
            scopes: SCOPES,
            user_email: user.email,
            state_reused: isReused,
            state_prefix: stateToken.substring(0, 12),
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // ACTION: exchange-token
    // ============================================================
    if (action === 'exchange-token') {
      if (!code) {
        log('error', 'Missing authorization code');
        throw new Error('Missing authorization code');
      }

      if (!state) {
        log('error', 'Missing state token');
        throw new Error('Missing state token');
      }

      log('info', 'Exchange token request received', {
        state_prefix: state.substring(0, 12),
        state_suffix: state.slice(-8),
        state_length: state.length,
        code_length: code.length,
      });

      // Validate state from whoop_oauth_states table
      const { data: stateRecord, error: stateError } = await serviceClient
        .from('whoop_oauth_states')
        .select('user_id, redirect_uri, created_at, consumed_at')
        .eq('state', state)
        .maybeSingle();

      if (stateError) {
        log('error', 'Error fetching state record', { error: stateError.message });
        throw new Error('State validation failed - database error');
      }

      if (!stateRecord) {
        log('error', 'State not found in database', {
          received_state_prefix: state.substring(0, 12),
          received_state_suffix: state.slice(-8),
        });
        throw new Error('Invalid state - not found');
      }

      // Check if already consumed
      if (stateRecord.consumed_at) {
        log('error', 'State already consumed', { consumed_at: stateRecord.consumed_at });
        throw new Error('State already used');
      }

      // Check if state is expired
      const stateAge = Date.now() - new Date(stateRecord.created_at).getTime();
      const maxAge = STATE_VALIDITY_MINUTES * 60 * 1000;
      if (stateAge > maxAge) {
        log('error', 'State expired', {
          created_at: stateRecord.created_at,
          age_minutes: Math.round(stateAge / 60000),
        });
        throw new Error('State expired');
      }

      const userId = stateRecord.user_id;
      const storedRedirectUri = stateRecord.redirect_uri;

      log('info', 'State validated successfully', {
        user_id: userId,
        state_age_seconds: Math.round(stateAge / 1000),
      });

      // Mark state as consumed (atomically)
      const { error: consumeError } = await serviceClient
        .from('whoop_oauth_states')
        .update({ consumed_at: new Date().toISOString() })
        .eq('state', state)
        .is('consumed_at', null);

      if (consumeError) {
        log('warn', 'Failed to mark state as consumed', { error: consumeError.message });
        // Continue anyway - the main validation passed
      }

      // Exchange code for tokens
      log('info', 'Calling Whoop token endpoint', { redirect_uri: storedRedirectUri });
      const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: storedRedirectUri,
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
        log('info', 'Got Whoop user profile', { whoop_user_id: whoopUserId });
      } else {
        log('warn', 'Could not fetch Whoop profile', { status: profileResponse.status });
      }

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Store tokens - use userId from state record
      const { error: upsertError } = await serviceClient
        .from('whoop_tokens')
        .upsert({
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          whoop_user_id: whoopUserId || 'unknown',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) {
        log('error', 'Failed to store tokens', { 
          error_code: upsertError.code,
          error_message: upsertError.message,
          error_details: upsertError.details,
        });
        throw new Error(`Failed to store tokens: ${upsertError.message}`);
      }

      log('info', 'Tokens stored successfully', { user_id: userId });

      // Deactivate Terra WHOOP token to prevent duplicate data
      const { data: terraToken, error: terraError } = await serviceClient
        .from('terra_tokens')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .ilike('provider', 'whoop')
        .select('id');

      if (terraToken && terraToken.length > 0) {
        log('info', 'Deactivated Terra WHOOP token for seamless transition');
      } else if (terraError) {
        log('warn', 'Could not deactivate Terra token', { error: terraError.message });
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

    // ============================================================
    // ACTION: refresh-token
    // ============================================================
    if (action === 'refresh-token') {
      if (!user) throw new Error('User required');
      
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

      log('info', 'Refreshing token', { user_id: user.id });

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
        log('error', 'Token refresh failed', { error: errorText });
        
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

      log('info', 'Token refreshed successfully');

      return new Response(
        JSON.stringify({ success: true, expires_at: expiresAt }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // ACTION: disconnect
    // ============================================================
    if (action === 'disconnect') {
      if (!user) throw new Error('User required');
      
      log('info', 'Disconnecting Whoop', { user_id: user.id });

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

    // ============================================================
    // ACTION: status
    // ============================================================
    if (action === 'status') {
      if (!user) throw new Error('User required');
      
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
    log('error', 'Request failed', { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
