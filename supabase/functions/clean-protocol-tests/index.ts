import { createServiceClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    console.log('🧹 Cleaning up test data for user:', userId);

    // Delete test protocols (cascades to alerts)
    const { data: deletedProtocols, error: deleteError } = await supabase
      .from('user_stack')
      .delete()
      .eq('user_id', userId)
      .like('stack_name', '🧪%')
      .select();

    if (deleteError) {
      console.error('❌ Error deleting protocols:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Deleted ${deletedProtocols.length} test protocols`);

    return new Response(
      JSON.stringify({
        success: true,
        message: '🧹 Test data cleaned up successfully',
        deleted_count: deletedProtocols.length,
        deleted_protocols: deletedProtocols.map(p => p.stack_name)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
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
