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
    const { provider } = await req.json();

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user');
    }

    // Get Terra user ID for this provider
    const { data: token, error: tokenError } = await supabase
      .from('terra_tokens')
      .select('terra_user_id')
      .eq('user_id', user.id)
      .eq('provider', provider.toUpperCase())
      .eq('is_active', true)
      .single();

    if (tokenError || !token) {
      throw new Error(`No active ${provider} connection found`);
    }

    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Call Terra API to request data sync
    const terraResponse = await fetch(`https://api.tryterra.co/v2/user/${token.terra_user_id}/sync`, {
      method: 'POST',
      headers: {
        'dev-id': terraDevId,
        'x-api-key': terraApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        to_webhook: true,
        resources: ['daily', 'sleep', 'activity', 'body'],
      }),
    });

    if (!terraResponse.ok) {
      const errorText = await terraResponse.text();
      console.error('Terra API error:', errorText);
      throw new Error(`Terra API error: ${terraResponse.status}`);
    }

    const result = await terraResponse.json();

    console.log('Force sync initiated for user:', user.id, 'provider:', provider);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sync initiated for ${provider}`,
        terraResult: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in force-terra-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
