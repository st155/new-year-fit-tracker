import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { withErrorHandling, EdgeFunctionError, ErrorCode } from '../_shared/error-handling.ts';
import { Logger } from '../_shared/monitoring.ts';

const logger = new Logger('recalculate-confidence');

Deno.serve(
  withErrorHandling(async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new EdgeFunctionError(
        ErrorCode.UNAUTHORIZED,
        'Authorization header required',
        401
      );
    }

    // Get user from auth
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new EdgeFunctionError(
        ErrorCode.UNAUTHORIZED,
        'Invalid authorization token',
        401
      );
    }

    const { user_id, metric_name } = await req.json();

    logger.info('Recalculate confidence request', {
      requestedBy: user.id,
      targetUser: user_id,
      metricName: metric_name,
    });

    // Check permissions: user can recalculate their own, or trainer can for clients
    if (user.id !== user_id) {
      const { data: isTrainer } = await supabase
        .from('trainer_clients')
        .select('id')
        .eq('trainer_id', user.id)
        .eq('client_id', user_id)
        .eq('active', true)
        .maybeSingle();

      if (!isTrainer) {
        throw new EdgeFunctionError(
          ErrorCode.FORBIDDEN,
          'No permission to recalculate confidence for this user',
          403
        );
      }
    }

    // Enqueue confidence calculation job(s)
    const jobsToEnqueue: any[] = [];

    if (metric_name) {
      // Specific metric
      jobsToEnqueue.push({
        type: 'confidence_calculation',
        payload: {
          user_id,
          metric_name,
        },
        status: 'pending',
      });
    } else {
      // All metrics for user
      const { data: metrics } = await supabase
        .from('user_metrics')
        .select('metric_name')
        .eq('user_id', user_id);

      const uniqueMetrics = [...new Set(metrics?.map(m => m.metric_name) || [])];

      jobsToEnqueue.push(
        ...uniqueMetrics.map(name => ({
          type: 'confidence_calculation',
          payload: {
            user_id,
            metric_name: name,
          },
          status: 'pending',
        }))
      );
    }

    // Insert jobs
    const { data: jobs, error: jobError } = await supabase
      .from('background_jobs')
      .insert(jobsToEnqueue)
      .select('id');

    if (jobError) throw jobError;

    logger.info('Confidence recalculation jobs enqueued', {
      count: jobs?.length || 0,
      user_id,
      metric_name,
    });

    return new Response(
      JSON.stringify({
        success: true,
        jobs_enqueued: jobs?.length || 0,
        job_ids: jobs?.map(j => j.id) || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  })
);
