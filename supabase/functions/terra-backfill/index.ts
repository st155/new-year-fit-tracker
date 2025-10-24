import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const terraApiKey = Deno.env.get('TERRA_API_KEY')!;
    const terraDevId = Deno.env.get('TERRA_DEV_ID')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { userId, provider, terraUserId, startDaysAgo = 30 } = body;

    console.log('🔄 Starting backfill for:', { userId, provider, terraUserId, startDaysAgo });

    // Create backfill job
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - startDaysAgo);
    const start = startDate.toISOString().split('T')[0];

    const totalDays = Math.ceil((new Date(endDate).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));

    const { data: job, error: jobError } = await supabase
      .from('terra_backfill_jobs')
      .upsert({
        user_id: userId,
        provider,
        start_date: start,
        end_date: endDate,
        status: 'processing',
        total_days: totalDays,
        processed_days: 0,
        progress_percentage: 0,
      }, { onConflict: 'user_id,provider,start_date,end_date' })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Error creating backfill job:', jobError);
      throw new Error('Failed to create backfill job');
    }

    console.log('✅ Backfill job created:', job.id);

    // Split into 7-day chunks to avoid timeouts
    const chunkSize = 7;
    let processedDays = 0;
    const endpoints = [
      { type: 'daily', url: 'https://api.tryterra.co/v2/daily' },
      { type: 'sleep', url: 'https://api.tryterra.co/v2/sleep' },
      { type: 'activity', url: 'https://api.tryterra.co/v2/activity' },
      { type: 'body', url: 'https://api.tryterra.co/v2/body' },
    ];

    for (let i = 0; i < totalDays; i += chunkSize) {
      const chunkStart = new Date(start);
      chunkStart.setDate(chunkStart.getDate() + i);
      const chunkEnd = new Date(chunkStart);
      chunkEnd.setDate(chunkEnd.getDate() + Math.min(chunkSize, totalDays - i) - 1);

      const chunkStartStr = chunkStart.toISOString().split('T')[0];
      const chunkEndStr = chunkEnd.toISOString().split('T')[0];

      console.log(`📅 Processing chunk: ${chunkStartStr} to ${chunkEndStr}`);

      // Update job progress
      await supabase
        .from('terra_backfill_jobs')
        .update({
          date_being_processed: chunkStartStr,
          processed_days: processedDays,
          progress_percentage: Math.floor((processedDays / totalDays) * 100),
        })
        .eq('id', job.id);

      // Fetch data for this chunk
      for (const endpoint of endpoints) {
        const url = `${endpoint.url}?user_id=${terraUserId}&start_date=${chunkStartStr}&end_date=${chunkEndStr}`;
        
        console.log(`📡 Fetching ${endpoint.type} from ${chunkStartStr} to ${chunkEndStr}`);

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'dev-id': terraDevId,
              'x-api-key': terraApiKey,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
              console.log(`✅ ${endpoint.type}: ${data.data.length} records for this chunk`);
              
              // Process data immediately using terraform-style webhook processing
              // (We'll call the existing processTerraData from webhook-terra)
              await supabase.functions.invoke('webhook-terra', {
                body: {
                  type: endpoint.type,
                  user: { user_id: terraUserId, provider },
                  data: data.data,
                  _internal_backfill: true, // Flag to skip signature verification
                },
                headers: {
                  'terra-signature': 'backfill-bypass',
                  Authorization: `Bearer ${supabaseKey}`,
                },
              });
            }
          } else {
            console.warn(`⚠️ ${endpoint.type} request failed:`, response.status);
          }
        } catch (error) {
          console.error(`❌ Error fetching ${endpoint.type}:`, error);
        }
      }

      processedDays += Math.min(chunkSize, totalDays - i);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark job as completed
    await supabase
      .from('terra_backfill_jobs')
      .update({
        status: 'completed',
        processed_days: totalDays,
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    console.log('✅ Backfill completed for:', { userId, provider });

    return new Response(
      JSON.stringify({ success: true, jobId: job.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Backfill error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
