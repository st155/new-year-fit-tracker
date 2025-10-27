import { createServiceClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookId } = await req.json();
    
    if (!webhookId) {
      return new Response(
        JSON.stringify({ error: 'webhookId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServiceClient();

    // Mark webhook as pending for reprocessing
    const { data: webhook, error: updateError } = await supabase
      .from('terra_webhooks_raw')
      .update({ 
        status: 'pending',
        processed_at: null 
      })
      .eq('id', webhookId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update webhook:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Webhook ${webhookId} marked for reprocessing`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook marked for reprocessing',
        webhook 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
