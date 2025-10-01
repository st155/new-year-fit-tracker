import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

// Функция для обновления токена
async function refreshWhoopToken(refreshToken: string) {
  const clientId = Deno.env.get('WHOOP_CLIENT_ID');
  const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET');
  
  const response = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId!,
      client_secret: clientSecret!,
    }).toString(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.statusText} - ${errorText}`);
  }
  
  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Whoop token refresh background task...');
    
    const now = new Date();
    // Проверяем токены, которые истекают в течение следующего часа
    const expiryThreshold = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Получаем все токены, которые скоро истекут
    const { data: expiringTokens, error: fetchError } = await supabase
      .from('whoop_tokens')
      .select('id, user_id, refresh_token, expires_at')
      .lt('expires_at', expiryThreshold.toISOString())
      .order('expires_at', { ascending: true });
    
    if (fetchError) {
      console.error('Error fetching expiring tokens:', fetchError);
      throw new Error('Failed to fetch expiring tokens');
    }
    
    if (!expiringTokens || expiringTokens.length === 0) {
      console.log('No tokens need refreshing at this time');
      return new Response(
        JSON.stringify({ 
          message: 'No tokens need refreshing',
          checked_at: now.toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log(`Found ${expiringTokens.length} token(s) that need refreshing`);
    
    const results = {
      total: expiringTokens.length,
      refreshed: 0,
      failed: 0,
      errors: [] as Array<{ user_id: string; error: string }>
    };
    
    // Обновляем каждый токен
    for (const token of expiringTokens) {
      try {
        console.log(`Refreshing token for user ${token.user_id} (expires: ${token.expires_at})`);
        
        const refreshResult = await refreshWhoopToken(token.refresh_token);
        
        // Вычисляем новое время истечения
        const newExpiresAt = new Date(now.getTime() + refreshResult.expires_in * 1000);
        
        // Обновляем токен в базе данных
        const { error: updateError } = await supabase
          .from('whoop_tokens')
          .update({
            access_token: refreshResult.access_token,
            refresh_token: refreshResult.refresh_token || token.refresh_token,
            expires_at: newExpiresAt.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', token.id);
        
        if (updateError) {
          console.error(`Failed to update token for user ${token.user_id}:`, updateError);
          results.failed++;
          results.errors.push({
            user_id: token.user_id,
            error: `Database update failed: ${updateError.message}`
          });
        } else {
          console.log(`Successfully refreshed token for user ${token.user_id}, new expiry: ${newExpiresAt.toISOString()}`);
          results.refreshed++;
        }
      } catch (error: any) {
        console.error(`Error refreshing token for user ${token.user_id}:`, error);
        results.failed++;
        results.errors.push({
          user_id: token.user_id,
          error: error?.message || 'Unknown error'
        });
      }
    }
    
    console.log('Token refresh task completed:', results);
    
    return new Response(
      JSON.stringify({
        message: 'Token refresh task completed',
        results,
        checked_at: now.toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('Token refresh task error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Token refresh task failed',
        message: error?.message || 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
