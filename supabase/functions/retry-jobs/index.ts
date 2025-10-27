import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let job_type = 'webhook_processing';
  try {
    const body = await req.text();
    if (body) {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.job_type === 'string') {
        job_type = parsed.job_type;
      }
    }
  } catch (e) {
    // No body or invalid JSON, use default
    console.log('Using default job_type:', job_type);
  }

  // First, select failed jobs that can be retried
  const { data: failedJobs, error: selectError } = await supabase
    .from('background_jobs')
    .select('id, max_attempts')
    .eq('status', 'failed')
    .eq('type', job_type);

  if (selectError) {
    return new Response(
      JSON.stringify({ error: selectError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!failedJobs || failedJobs.length === 0) {
    return new Response(
      JSON.stringify({ 
        success: true, 
        retried_count: 0,
        message: 'No failed jobs to retry' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Filter jobs that haven't exceeded max attempts
  const jobsToRetry = failedJobs.filter(job => job.max_attempts > 0);
  const jobIds = jobsToRetry.map(job => job.id);

  if (jobIds.length === 0) {
    return new Response(
      JSON.stringify({ 
        success: true, 
        retried_count: 0,
        message: 'All failed jobs have exceeded max attempts' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Reset failed jobs to pending (schedule immediately)
  const { data, error } = await supabase
    .from('background_jobs')
    .update({
      status: 'pending',
      attempts: 0,
      error: null,
      started_at: null,
      scheduled_at: new Date().toISOString(),
    })
    .in('id', jobIds)
    .select('id');

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      retried_count: data?.length || 0,
      message: `Retried ${data?.length || 0} failed jobs` 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
