import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const startTime = Date.now();
    const checks: Record<string, any> = {};

    // 1. Database connectivity check
    try {
      const { error: dbError } = await supabase
        .from('background_jobs')
        .select('id')
        .limit(1);
      
      checks.database = dbError ? 'error' : 'ok';
      checks.database_latency_ms = Date.now() - startTime;
    } catch (error) {
      checks.database = 'error';
      checks.database_error = error.message;
    }

    // 2. Job queue health
    try {
      const { data: jobStats } = await supabase
        .from('background_jobs')
        .select('status')
        .in('status', ['pending', 'processing', 'failed']);
      
      const pending = jobStats?.filter(j => j.status === 'pending').length || 0;
      const processing = jobStats?.filter(j => j.status === 'processing').length || 0;
      const failed = jobStats?.filter(j => j.status === 'failed').length || 0;
      
      checks.jobWorker = failed > 100 ? 'degraded' : 'ok';
      checks.pendingJobs = pending;
      checks.processingJobs = processing;
      checks.failedJobs = failed;
    } catch (error) {
      checks.jobWorker = 'error';
    }

    // 3. Confidence cache status
    try {
      const { data: cacheStats } = await supabase.rpc('get_monitoring_dashboard_data');
      
      const confidence = cacheStats?.confidence || {};
      checks.cacheHitRate = confidence.total_metrics > 0 
        ? ((confidence.total_metrics - (confidence.poor || 0)) / confidence.total_metrics * 100).toFixed(1)
        : 0;
      checks.avgConfidence = confidence.avg_confidence?.toFixed(1) || 0;
    } catch (error) {
      checks.confidenceCache = 'error';
    }

    // 4. Webhook processing
    try {
      const { data: webhooks } = await supabase
        .from('terra_webhooks_raw')
        .select('status')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString());
      
      const total = webhooks?.length || 0;
      const completed = webhooks?.filter(w => w.status === 'completed').length || 0;
      const successRate = total > 0 ? (completed / total * 100).toFixed(1) : 100;
      
      checks.webhookSuccessRate = successRate;
      checks.webhookStatus = parseFloat(successRate) < 80 ? 'degraded' : 'ok';
    } catch (error) {
      checks.webhookStatus = 'error';
    }

    // Overall status
    const hasError = Object.values(checks).some(v => v === 'error');
    const isDegraded = Object.values(checks).some(v => v === 'degraded');
    const overallStatus = hasError ? 'unhealthy' : isDegraded ? 'degraded' : 'healthy';

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Deno.env.get('DENO_DEPLOYMENT_ID') ? 'active' : 'local',
      checks,
      version: '1.0.0',
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    return new Response(
      JSON.stringify(response, null, 2),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
