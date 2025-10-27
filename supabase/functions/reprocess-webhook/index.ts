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

    // Create a job in background_jobs for job-worker to process
    // Pass the full webhook payload structure that job-worker expects
    const { data: job, error: jobError } = await supabase
      .from('background_jobs')
      .insert({
        type: 'webhook_processing',
        payload: {
          webhookId: webhook.id,
          payload: webhook.payload // Pass the full Terra webhook payload
        },
        status: 'pending'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to enqueue job: ' + jobError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Webhook ${webhookId} marked for reprocessing, job ${job.id} created`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook queued for reprocessing',
        webhook,
        jobId: job.id
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
