import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const terraApiKey = Deno.env.get('TERRA_API_KEY')!;
  const terraDevId = Deno.env.get('TERRA_DEV_ID')!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { daysBack = 28 } = await req.json().catch(() => ({}));

    console.log(`🚀 Starting WHOOP backfill for all active users, ${daysBack} days back`);

    // Get all active WHOOP tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('terra_tokens')
      .select('user_id, terra_user_id, provider')
      .eq('provider', 'WHOOP')
      .eq('is_active', true);

    if (tokensError) {
      console.error('❌ Error fetching tokens:', tokensError);
      throw tokensError;
    }

    console.log(`📋 Found ${tokens?.length || 0} active WHOOP users`);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active WHOOP users found',
        users_processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

    const results: Array<{ userId: string; terraUserId: string; success: boolean; error?: string }> = [];
    const dataTypes = ['body', 'daily', 'activity', 'sleep'];

    for (const token of tokens) {
      console.log(`\n👤 Processing user ${token.user_id} (Terra: ${token.terra_user_id})`);
      
      let userSuccess = true;
      const errors: string[] = [];

      for (const dataType of dataTypes) {
        try {
          const url = `https://api.tryterra.co/v2/${dataType}?user_id=${token.terra_user_id}&start_date=${startDateStr}&end_date=${endDateStr}&to_webhook=true`;
          
          console.log(`  📡 Requesting ${dataType} data...`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'dev-id': terraDevId,
              'x-api-key': terraApiKey,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`  ❌ ${dataType} failed: ${response.status} - ${errorText}`);
            errors.push(`${dataType}: ${response.status}`);
            userSuccess = false;
          } else {
            const result = await response.json();
            console.log(`  ✅ ${dataType} request sent successfully`);
          }

          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (e: any) {
          console.error(`  ❌ ${dataType} error:`, e.message);
          errors.push(`${dataType}: ${e.message}`);
          userSuccess = false;
        }
      }

      results.push({
        userId: token.user_id,
        terraUserId: token.terra_user_id,
        success: userSuccess,
        error: errors.length > 0 ? errors.join(', ') : undefined,
      });

      // Delay between users
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`\n📊 Backfill complete: ${successCount} successful, ${failCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      message: `WHOOP backfill triggered for ${tokens.length} users`,
      users_processed: tokens.length,
      successful: successCount,
      failed: failCount,
      date_range: { start: startDateStr, end: endDateStr },
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Backfill error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
