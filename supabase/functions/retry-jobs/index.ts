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

  const { job_type = 'webhook_processing' } = await req.json();

  // Reset failed jobs to pending
  const { data, error } = await supabase
    .from('background_jobs')
    .update({
      status: 'pending',
      attempts: 0,
      error: null,
      started_at: null,
      scheduled_at: new Date().toISOString(),
    })
    .eq('status', 'failed')
    .eq('type', job_type)
    .lt('attempts', supabase.from('background_jobs').select('max_attempts'))
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
