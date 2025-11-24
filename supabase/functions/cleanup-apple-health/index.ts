import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createServiceClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`Cleaning up Apple Health data for user: ${userId}`);

    // Delete all Apple Health metrics (supports APPLE, apple, apple_health)
    const { error: metricsError, count: metricsCount } = await supabase
      .from('unified_metrics')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .in('source', ['APPLE', 'apple', 'apple_health']);

    if (metricsError) {
      console.error('Error deleting metrics:', metricsError);
      throw metricsError;
    }

    console.log(`Deleted ${metricsCount} Apple Health metrics`);

    // Deactivate Apple Health connection in terra_tokens
    const { error: tokenError } = await supabase
      .from('terra_tokens')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('provider', 'APPLE');

    if (tokenError) {
      console.error('Error deactivating token:', tokenError);
      throw tokenError;
    }

    console.log('Apple Health connection deactivated');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Apple Health data cleaned up successfully',
        deletedMetrics: metricsCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
