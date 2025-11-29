import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all unique products from user's stack
    const { data: stackItems, error: stackError } = await supabaseClient
      .from('user_stack')
      .select('product_id')
      .eq('user_id', user.id);

    if (stackError) throw stackError;

    // Get all unique products from user's protocol items
    const { data: protocolItems, error: protocolError } = await supabaseClient
      .from('protocol_items')
      .select('product_id, protocols!inner(user_id)')
      .eq('protocols.user_id', user.id);

    if (protocolError) throw protocolError;

    const stackProductIds = [...new Set(stackItems?.map(item => item.product_id) || [])];
    const protocolProductIds = [...new Set(protocolItems?.map(item => item.product_id) || [])];
    
    // Combine and dedupe all product IDs
    const allProductIds = [...new Set([...stackProductIds, ...protocolProductIds])];
    
    let addedCount = 0;
    let skippedCount = 0;

    // For each product, check if it exists in library
    for (const productId of allProductIds) {
      const { data: existing } = await supabaseClient
        .from('user_supplement_library')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (!existing) {
        // Determine source based on where product came from
        const isFromProtocol = protocolProductIds.includes(productId);
        const source = isFromProtocol ? 'protocol' : 'manual';
        
        // Add to library
        const { error: insertError } = await supabaseClient
          .from('user_supplement_library')
          .insert({
            user_id: user.id,
            product_id: productId,
            scan_count: 0,
            source: source,
          });

        if (insertError) {
          console.error(`Failed to add product ${productId}:`, insertError);
        } else {
          addedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        addedCount,
        skippedCount,
        totalProcessed: allProductIds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
