import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.text();
    console.log('Withings webhook received:', body);

    // Withings sends notifications in this format:
    // userid=XXX&appli=YYY&startdate=ZZZ&enddate=AAA
    const params = new URLSearchParams(body);
    const userId = params.get('userid');
    const appli = params.get('appli');
    const startdate = params.get('startdate');
    const enddate = params.get('enddate');

    console.log('Webhook params:', { userId, appli, startdate, enddate });

    if (!userId || !appli) {
      return new Response('Missing required parameters', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Find our internal user_id
    const { data: tokens, error: tokenError } = await supabase
      .from('withings_tokens')
      .select('user_id, access_token')
      .limit(1);

    if (tokenError || !tokens || tokens.length === 0) {
      console.error('No Withings tokens found');
      return new Response('No user found', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    const { user_id: internalUserId, access_token } = tokens[0];
    console.log('Found user:', internalUserId);

    // Trigger sync based on notification type
    // appli values: 1=weight, 4=activity, 16=sleep, 44=workouts
    let syncAction = '';
    switch (appli) {
      case '1':
        syncAction = 'measurements';
        break;
      case '4':
        syncAction = 'activity';
        break;
      case '16':
        syncAction = 'sleep';
        break;
      case '44':
        syncAction = 'workouts';
        break;
      default:
        console.log('Unknown appli type:', appli);
    }

    if (syncAction) {
      console.log(`Triggering ${syncAction} sync for user ${internalUserId}`);
      
      // Call withings-integration to sync specific data
      const syncResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/withings-integration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            action: 'sync-data',
            userId: internalUserId
          })
        }
      );

      const syncResult = await syncResponse.json();
      console.log('Sync result:', syncResult);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
