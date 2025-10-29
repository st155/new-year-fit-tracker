import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const terraApiKey = Deno.env.get('TERRA_API_KEY');
    const terraDevId = Deno.env.get('TERRA_DEV_ID');

    if (!terraApiKey || !terraDevId) {
      throw new Error('Terra API credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active Terra tokens for providers that need daily sync
    const { data: tokens, error: tokensError } = await supabase
      .from('terra_tokens')
      .select('user_id, provider, terra_user_id')
      .eq('is_active', true)
      .in('provider', ['GARMIN', 'ULTRAHUMAN', 'WHOOP']);

    if (tokensError) {
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log('No active Terra tokens found for daily sync');
      return new Response(
        JSON.stringify({ message: 'No active tokens found', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${tokens.length} active tokens to sync`);

    // Sync daily data for today
    const today = new Date().toISOString().split('T')[0];
    const syncResults = [];

    for (const token of tokens) {
      try {
        console.log(`Syncing daily data for user ${token.user_id}, provider ${token.provider}`);
        
        const terraResponse = await fetch(
          `https://api.tryterra.co/v2/daily?user_id=${token.terra_user_id}&start_date=${today}&end_date=${today}&to_webhook=true`,
          {
            method: 'GET',
            headers: {
              'dev-id': terraDevId,
              'x-api-key': terraApiKey,
            },
          }
        );

        if (terraResponse.ok) {
          const result = await terraResponse.json();
          syncResults.push({
            user_id: token.user_id,
            provider: token.provider,
            success: true,
            result,
          });
          console.log(`✅ Successfully synced ${token.provider} for user ${token.user_id}`);
        } else {
          const errorText = await terraResponse.text();
          console.error(`❌ Failed to sync ${token.provider} for user ${token.user_id}:`, errorText);
          syncResults.push({
            user_id: token.user_id,
            provider: token.provider,
            success: false,
            error: errorText,
          });
        }
      } catch (error) {
        console.error(`❌ Error syncing ${token.provider} for user ${token.user_id}:`, error);
        syncResults.push({
          user_id: token.user_id,
          provider: token.provider,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = syncResults.filter(r => r.success).length;
    const failCount = syncResults.filter(r => !r.success).length;

    console.log(`Scheduled sync completed: ${successCount} successful, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${successCount} providers successfully`,
        total: tokens.length,
        successful: successCount,
        failed: failCount,
        results: syncResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scheduled-terra-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
