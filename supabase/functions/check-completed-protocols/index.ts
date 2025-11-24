import { createServiceClient } from '../_shared/supabase-client.ts';
import { Logger } from '../_shared/monitoring.ts';

const logger = new Logger('check-completed-protocols');

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.info('Starting protocol completion check');
    const supabase = createServiceClient();

    // Find completed protocols that need retest alerts (completed by trigger or manually)
    const { data: completedProtocols, error: queryError } = await supabase
      .from('user_stack')
      .select(`
        id, 
        user_id, 
        product_id, 
        planned_end_date, 
        end_action, 
        supplement_products(name),
        protocol_lifecycle_alerts(id)
      `)
      .eq('status', 'completed')
      .eq('end_action', 'prompt_retest')
      .not('planned_end_date', 'is', null);

    if (queryError) {
      logger.error('Failed to query completed protocols', { error: queryError });
      throw queryError;
    }

    logger.info(`Found ${completedProtocols?.length || 0} completed protocols to check`);

    let alertsCreated = 0;

    for (const protocol of completedProtocols || []) {
      // Skip protocols that already have alerts
      if (protocol.protocol_lifecycle_alerts && protocol.protocol_lifecycle_alerts.length > 0) {
        logger.info('Protocol already has alert, skipping', { protocolId: protocol.id });
        continue;
      }

      // Create lifecycle alert for completed protocol
      if (protocol.end_action === 'prompt_retest') {
        const { error: alertError } = await supabase
          .from('protocol_lifecycle_alerts')
          .insert({
            user_id: protocol.user_id,
            protocol_id: protocol.id,
            alert_type: 'retest_prompt',
            message: `Your ${protocol.supplement_products?.name || 'supplement'} protocol has completed. Consider scheduling a re-test to measure progress.`,
            is_read: false,
          });

        if (alertError) {
          logger.error('Failed to create lifecycle alert', { 
            protocolId: protocol.id, 
            error: alertError 
          });
        } else {
          alertsCreated++;
        }
      }
    }

    logger.info('Protocol completion check finished', { 
      alertsCreated 
    });

    return new Response(
      JSON.stringify({
        success: true,
        alerts_created: alertsCreated,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    logger.error('Protocol completion check failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
