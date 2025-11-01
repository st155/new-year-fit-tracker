import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { withErrorHandling } from '../_shared/error-handling.ts';
import { Logger } from '../_shared/monitoring.ts';

const logger = new Logger('retry-stuck-webhooks');

Deno.serve(
  withErrorHandling(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    logger.info('Starting stuck webhook retry process');

    // Call the database function to retry stuck webhooks
    const { data, error } = await supabase.rpc('retry_stuck_terra_webhooks', {
      stuck_threshold_minutes: 60
    });

    if (error) {
      logger.error('Failed to retry stuck webhooks', { error: error.message });
      throw error;
    }

    const result = data as any;
    logger.info('Stuck webhook retry completed', {
      retried: result?.retried_count || 0,
      failed: result?.failed_count || 0
    });

    // Trigger job-worker to process the retried webhooks
    try {
      await supabase.functions.invoke('job-worker');
      logger.info('Job worker triggered successfully');
    } catch (e) {
      logger.warn('Failed to trigger job-worker', {
        error: e instanceof Error ? e.message : String(e)
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        retried: result?.retried_count || 0,
        failed: result?.failed_count || 0,
        message: 'Stuck webhooks retry process completed'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  })
);
