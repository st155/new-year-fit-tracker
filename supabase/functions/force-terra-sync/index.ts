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
    const requestStart = Date.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const terraApiKey = Deno.env.get('TERRA_API_KEY');
    const terraDevId = Deno.env.get('TERRA_DEV_ID');

    if (!terraApiKey || !terraDevId) {
      console.error('❌ [Force Sync] Terra API credentials not configured');
      throw new Error('Terra API credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { provider, dataType = 'body' } = await req.json();
    
    console.log('🔄 [Force Sync] Request received:', {
      provider,
      dataType,
      timestamp: new Date().toISOString()
    });

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ [Force Sync] No authorization header');
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('❌ [Force Sync] Invalid user:', userError?.message);
      throw new Error('Invalid user');
    }
    
    console.log('✅ [Force Sync] User authenticated:', {
      userId: user.id,
      email: user.email
    });

    // Get Terra user ID for this provider
    console.log('🔍 [Force Sync] Querying terra_tokens:', {
      userId: user.id,
      provider: provider.toUpperCase()
    });
    
    const { data: token, error: tokenError } = await supabase
      .from('terra_tokens')
      .select('terra_user_id')
      .eq('user_id', user.id)
      .eq('provider', provider.toUpperCase())
      .eq('is_active', true)
      .single();

    if (tokenError || !token) {
      console.error('❌ [Force Sync] No active token found:', {
        provider,
        userId: user.id,
        error: tokenError?.message
      });
      throw new Error(`No active ${provider} connection found`);
    }
    
    console.log('✅ [Force Sync] Token found:', {
      terraUserId: token.terra_user_id,
      provider
    });

    // Calculate date range based on data type
    const endDate = new Date();
    const startDate = new Date();
    
    if (dataType === 'daily') {
      startDate.setDate(startDate.getDate() - 1); // Yesterday
    } else if (dataType === 'activity') {
      startDate.setDate(startDate.getDate() - 14); // Last 14 days for workouts
    } else {
      startDate.setDate(startDate.getDate() - 7); // Last 7 days for body data
    }

    // Determine API endpoint based on data type
    const endpoint = dataType === 'daily' ? 'daily' : dataType === 'activity' ? 'activity' : 'body';
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log('📅 [Force Sync] Date range calculated:', {
      dataType,
      endpoint,
      startDate: startDateStr,
      endDate: endDateStr,
      daysRequested: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    });
    
    // Call Terra API to get historical data
    // Note: Terra automatically sends webhooks when data changes
    // This fetches historical data and triggers webhook processing
    const terraUrl = `https://api.tryterra.co/v2/${endpoint}?user_id=${token.terra_user_id}&start_date=${startDateStr}&end_date=${endDateStr}&to_webhook=true`;
    
    console.log('🌍 [Force Sync] Calling Terra API:', {
      url: terraUrl,
      method: 'GET',
      endpoint,
      terraUserId: token.terra_user_id,
      toWebhook: true
    });
    
    const terraApiStart = Date.now();
    const terraResponse = await fetch(terraUrl, {
      method: 'GET',
      headers: {
        'dev-id': terraDevId,
        'x-api-key': terraApiKey,
      },
    });
    
    const terraApiDuration = Date.now() - terraApiStart;

    console.log('📡 [Force Sync] Terra API response:', {
      status: terraResponse.status,
      statusText: terraResponse.statusText,
      duration: `${terraApiDuration}ms`,
      headers: Object.fromEntries(terraResponse.headers.entries())
    });

    if (!terraResponse.ok) {
      const errorText = await terraResponse.text();
      console.error('❌ [Force Sync] Terra API error:', {
        status: terraResponse.status,
        statusText: terraResponse.statusText,
        errorBody: errorText,
        url: terraUrl
      });
      throw new Error(`Terra API error: ${terraResponse.status} - ${errorText}`);
    }

    const result = await terraResponse.json();
    
    console.log('✅ [Force Sync] Terra API success:', {
      status: result.status,
      dataReceived: !!result.data,
      dataCount: Array.isArray(result.data) ? result.data.length : 'N/A',
      webhookTriggered: result.webhook_triggered || 'unknown',
      resultPreview: JSON.stringify(result).substring(0, 200)
    });

    const totalDuration = Date.now() - requestStart;
    console.log('🎉 [Force Sync] Request completed:', {
      userId: user.id,
      provider,
      dataType,
      totalDuration: `${totalDuration}ms`,
      success: true
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sync initiated for ${provider} (${dataType})`,
        terraResult: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 [Force Sync] Fatal error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
