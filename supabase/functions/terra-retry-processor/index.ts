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

    console.log('🔄 Starting retry processor...');

    // 1. Process failed webhook processing (retry with exponential backoff)
    const { data: failedWebhooks, error: failedError } = await supabase
      .from('failed_webhook_processing')
      .select('*')
      .or(`status.eq.pending,and(status.eq.retrying,next_retry_at.lt.${new Date().toISOString()})`)
      .lt('retry_count', 5)
      .limit(10);

    if (failedError) {
      console.error('❌ Error fetching failed webhooks:', failedError);
    } else if (failedWebhooks && failedWebhooks.length > 0) {
      console.log(`📋 Found ${failedWebhooks.length} failed webhooks to retry`);

      for (const webhook of failedWebhooks) {
        try {
          console.log(`🔄 Retrying webhook ${webhook.id} (attempt ${webhook.retry_count + 1})`);

          // Update status
          await supabase
            .from('failed_webhook_processing')
            .update({
              status: 'retrying',
              last_retry_at: new Date().toISOString(),
              retry_count: webhook.retry_count + 1,
            })
            .eq('id', webhook.id);

          // Attempt to reprocess
          const { error: processError } = await supabase.functions.invoke('webhook-terra', {
            body: webhook.payload,
            headers: {
              'terra-signature': 'retry-bypass',
              Authorization: `Bearer ${supabaseKey}`,
            },
          });

          if (processError) {
            // Calculate next retry time with exponential backoff
            const nextRetry = new Date();
            nextRetry.setMinutes(nextRetry.getMinutes() + Math.pow(2, webhook.retry_count + 1));

            const newStatus = webhook.retry_count + 1 >= 5 ? 'failed_permanently' : 'pending';

            await supabase
              .from('failed_webhook_processing')
              .update({
                status: newStatus,
                next_retry_at: newStatus === 'pending' ? nextRetry.toISOString() : null,
                error_message: processError.message,
              })
              .eq('id', webhook.id);

            console.warn(`⚠️ Retry failed for webhook ${webhook.id}:`, processError.message);
          } else {
            // Success - remove from retry queue
            await supabase
              .from('failed_webhook_processing')
              .delete()
              .eq('id', webhook.id);

            console.log(`✅ Successfully retried webhook ${webhook.id}`);
          }
        } catch (error) {
          console.error(`❌ Error retrying webhook ${webhook.id}:`, error);
        }

        // Small delay between retries
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 2. Process webhook retry queue (missing data requests)
    const { data: retryQueue, error: queueError } = await supabase
      .from('webhook_retry_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', 3)
      .limit(10);

    if (queueError) {
      console.error('❌ Error fetching retry queue:', queueError);
    } else if (retryQueue && retryQueue.length > 0) {
      console.log(`📋 Found ${retryQueue.length} missing data requests`);

      for (const item of retryQueue) {
        try {
          console.log(`🔄 Requesting missing ${item.data_type} data for ${item.missing_date}`);

          // Update status
          await supabase
            .from('webhook_retry_queue')
            .update({
              status: 'processing',
              last_retry_at: new Date().toISOString(),
              retry_count: item.retry_count + 1,
            })
            .eq('id', item.id);

          // Get terra_user_id
          const { data: token } = await supabase
            .from('terra_tokens')
            .select('terra_user_id')
            .eq('user_id', item.user_id)
            .eq('provider', item.provider)
            .eq('is_active', true)
            .single();

          if (!token) {
            await supabase
              .from('webhook_retry_queue')
              .update({ status: 'failed', error_message: 'User token not found' })
              .eq('id', item.id);
            continue;
          }

          // Request data from Terra API
          const endpointMap: { [key: string]: string } = {
            'daily': 'https://api.tryterra.co/v2/daily',
            'sleep': 'https://api.tryterra.co/v2/sleep',
            'activity': 'https://api.tryterra.co/v2/activity',
            'body': 'https://api.tryterra.co/v2/body',
          };

          const url = `${endpointMap[item.data_type]}?user_id=${token.terra_user_id}&start_date=${item.missing_date}&end_date=${item.missing_date}`;

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
              // Process the data
              await supabase.functions.invoke('webhook-terra', {
                body: {
                  type: item.data_type,
                  user: { user_id: token.terra_user_id, provider: item.provider },
                  data: data.data,
                  _internal_backfill: true,
                },
                headers: {
                  'terra-signature': 'retry-bypass',
                  Authorization: `Bearer ${supabaseKey}`,
                },
              });

              // Mark as completed
              await supabase
                .from('webhook_retry_queue')
                .update({ status: 'completed' })
                .eq('id', item.id);

              console.log(`✅ Successfully retrieved missing ${item.data_type} for ${item.missing_date}`);
            } else {
              // No data available for this date
              await supabase
                .from('webhook_retry_queue')
                .update({ 
                  status: 'completed',
                  error_message: 'No data available from Terra API for this date'
                })
                .eq('id', item.id);
            }
          } else {
            const error = await response.text();
            await supabase
              .from('webhook_retry_queue')
              .update({ 
                status: item.retry_count + 1 >= 3 ? 'failed' : 'pending',
                error_message: `Terra API error: ${response.status} - ${error}`
              })
              .eq('id', item.id);
          }
        } catch (error: any) {
          console.error(`❌ Error processing retry item ${item.id}:`, error);
          await supabase
            .from('webhook_retry_queue')
            .update({ 
              status: 'failed',
              error_message: error.message
            })
            .eq('id', item.id);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('✅ Retry processor completed');

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: {
          failedWebhooks: failedWebhooks?.length || 0,
          retryQueue: retryQueue?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Retry processor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
