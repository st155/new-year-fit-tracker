import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user is authenticated and is a trainer
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: trainerCheck } = await serviceClient
      .from('trainer_clients')
      .select('trainer_id')
      .eq('trainer_id', user.id)
      .limit(1);

    if (!trainerCheck || trainerCheck.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Trainer role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { terra_user_id, days = 30 } = await req.json();

    if (!terra_user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing terra_user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TERRA_API_KEY = Deno.env.get('TERRA_API_KEY');
    const TERRA_DEV_ID = Deno.env.get('TERRA_DEV_ID');

    if (!TERRA_API_KEY || !TERRA_DEV_ID) {
      console.error('❌ Missing Terra credentials');
      return new Response(
        JSON.stringify({ error: 'Terra API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.min(days, 90)); // Max 90 days

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`📡 Requesting historical data for ${terra_user_id} from ${startDateStr} to ${endDateStr}`);

    // Request data for all types
    const dataTypes = ['body', 'daily', 'activity', 'sleep'];
    const results: Record<string, { success: boolean; message: string }> = {};

    for (const dataType of dataTypes) {
      try {
        const url = `https://api.tryterra.co/v2/${dataType}?user_id=${terra_user_id}&start_date=${startDateStr}&end_date=${endDateStr}&to_webhook=true&with_samples=false`;
        
        console.log(`📤 Requesting ${dataType} data...`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'dev-id': TERRA_DEV_ID,
            'x-api-key': TERRA_API_KEY,
          },
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log(`✅ ${dataType} request successful:`, data);
          results[dataType] = { success: true, message: data.message || 'Data requested' };
        } else {
          console.error(`❌ ${dataType} request failed:`, data);
          results[dataType] = { success: false, message: data.message || data.error || 'Request failed' };
        }
      } catch (error) {
        console.error(`❌ Error requesting ${dataType}:`, error);
        results[dataType] = { success: false, message: error.message };
      }
    }

    // Update last_sync_date on the token
    await serviceClient
      .from('terra_tokens')
      .update({ last_sync_date: new Date().toISOString() })
      .eq('terra_user_id', terra_user_id);

    const successCount = Object.values(results).filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Requested ${successCount}/${dataTypes.length} data types`,
        results,
        date_range: { start: startDateStr, end: endDateStr }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
