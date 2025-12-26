import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const REDIRECT_URI = 'https://elite10.club/whoop-callback';

const SCOPES = [
  'offline',
  'read:recovery',
  'read:cycles',
  'read:sleep',
  'read:workout',
  'read:profile',
  'read:body_measurement'
].join(' ');

// Whitelist of users who can use direct Whoop integration
const WHOOP_DIRECT_USERS = [
  'b9fc3f8b-e7bf-44f9-a591-cec47f9c93ae', // Alexey Gubarev
  'f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', // Anton  
  '932aab9d-a104-4ba2-885f-2dfdc5dd5df2', // Pavel Radaev
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is whitelisted
    if (!WHOOP_DIRECT_USERS.includes(user.id)) {
      throw new Error('Direct Whoop integration is not available for this user. Please use Terra integration.');
    }

    const { action, code, state } = await req.json();
    const clientId = Deno.env.get('WHOOP_CLIENT_ID');
    const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Whoop credentials not configured');
    }

    console.log(`🔐 [whoop-auth] Action: ${action}, User: ${user.id}`);

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (action === 'get-auth-url') {
      // Generate state token
      const stateToken = crypto.randomUUID();
      
      // Store state in database for verification
      await serviceClient
        .from('whoop_tokens')
        .upsert({
          user_id: user.id,
          oauth_state: stateToken,
          is_active: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      const authUrl = new URL(WHOOP_AUTH_URL);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('state', stateToken);

      console.log(`✅ [whoop-auth] Generated auth URL for user ${user.id}`);

      return new Response(
        JSON.stringify({ url: authUrl.toString(), state: stateToken }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'exchange-token') {
      if (!code) {
        throw new Error('Missing authorization code');
      }

      // Verify state if provided
      if (state) {
        const { data: tokenData } = await serviceClient
          .from('whoop_tokens')
          .select('oauth_state')
          .eq('user_id', user.id)
          .single();

        if (tokenData?.oauth_state !== state) {
          console.warn(`⚠️ [whoop-auth] State mismatch for user ${user.id}`);
        }
      }

      console.log(`🔄 [whoop-auth] Exchanging code for tokens...`);

      // Exchange code for tokens
      const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error(`❌ [whoop-auth] Token exchange failed:`, errorText);
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokens = await tokenResponse.json();
      console.log(`✅ [whoop-auth] Got tokens, expires_in: ${tokens.expires_in}s`);

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

      return new Response(
        JSON.stringify({ 
          success: true, 
          whoop_user_id: whoopUserId,
          expires_at: expiresAt
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
        .select('is_active, expires_at, whoop_user_id, last_sync_at, created_at')
        .eq('user_id', user.id)
        .single();

      const isExpired = tokenData?.expires_at && new Date(tokenData.expires_at) < new Date();

      return new Response(
        JSON.stringify({
          connected: tokenData?.is_active && !isExpired,
          whoop_user_id: tokenData?.whoop_user_id,
          expires_at: tokenData?.expires_at,
          is_expired: isExpired,
          last_sync_at: tokenData?.last_sync_at,
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
