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

  // Reset stuck "processing" jobs to pending
  const { data, error } = await supabase
    .from('background_jobs')
    .update({
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      started_at: null,
    })
    .eq('status', 'processing')
    .select('id, type');

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      reset_count: data?.length || 0,
      jobs: data || []
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
