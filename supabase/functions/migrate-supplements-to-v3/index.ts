import { createServiceClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();

    console.log('[MIGRATE-V3] Starting migration from old schema to BioStack V3.0');

    // Step 1: Migrate protocols + protocol_items -> user_stack
    const { data: protocols, error: protocolsError } = await supabase
      .from('protocols')
      .select(`
        *,
        protocol_items (*)
      `);

    if (protocolsError) {
      console.error('[MIGRATE-V3] Error fetching protocols:', protocolsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch protocols' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let migratedStacks = 0;
    let migratedLogs = 0;

    for (const protocol of protocols || []) {
      for (const item of protocol.protocol_items || []) {
        // Determine intake_times based on old time_of_day field
        const intake_times = [];
        if (item.time_of_day?.toLowerCase().includes('morning')) intake_times.push('morning');
        if (item.time_of_day?.toLowerCase().includes('afternoon')) intake_times.push('afternoon');
        if (item.time_of_day?.toLowerCase().includes('evening')) intake_times.push('evening');
        if (intake_times.length === 0) intake_times.push('morning'); // Default

        const { error: insertError } = await supabase
          .from('user_stack')
          .insert({
            user_id: protocol.user_id,
            product_id: item.supplement_id,
            stack_name: protocol.protocol_name || 'Imported Protocol',
            is_active: protocol.is_active ?? true,
            schedule_type: item.frequency === 'daily' ? 'daily' : 'as_needed',
            intake_times,
            notes: item.notes,
            position: item.position || 0,
          });

        if (insertError) {
          console.error('[MIGRATE-V3] Error inserting stack item:', insertError);
        } else {
          migratedStacks++;
        }
      }
    }

    // Step 2: Migrate supplement_logs -> intake_logs
    const { data: oldLogs, error: logsError } = await supabase
      .from('supplement_logs')
      .select('*')
      .order('logged_at', { ascending: false })
      .limit(1000); // Migrate last 1000 logs

    if (!logsError && oldLogs) {
      for (const log of oldLogs) {
        // Try to find matching stack_item_id
        const { data: stackItem } = await supabase
          .from('user_stack')
          .select('id')
          .eq('user_id', log.user_id)
          .eq('product_id', log.supplement_id)
          .limit(1)
          .single();

        const { error: logInsertError } = await supabase
          .from('intake_logs')
          .insert({
            user_id: log.user_id,
            stack_item_id: stackItem?.id,
            taken_at: log.logged_at,
            servings_taken: log.servings || 1,
            notes: log.notes,
          });

        if (logInsertError) {
          console.error('[MIGRATE-V3] Error inserting intake log:', logInsertError);
        } else {
          migratedLogs++;
        }
      }
    }

    console.log('[MIGRATE-V3] Migration complete');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration to BioStack V3.0 completed',
        migratedStacks,
        migratedLogs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[MIGRATE-V3] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
