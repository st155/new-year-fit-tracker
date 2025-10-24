import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled sync for all Terra connected users...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all users with active Terra connections (any provider)
    const { data: terraUsers, error: terraError } = await supabase
      .from('terra_tokens')
      .select('user_id')
      .eq('is_active', true);

    let terraCount = 0;

    if (terraError) {
      console.error('Error fetching Terra users:', terraError);
    } else {
      terraCount = terraUsers?.length || 0;
      console.log(`Found ${terraCount} Terra users to sync`);
      
      // Sync Terra data for each user
      for (const user of terraUsers || []) {
        try {
          console.log(`Syncing Terra data for user: ${user.user_id}`);
          
          const { data, error } = await supabase.functions.invoke('terra-integration', {
            body: {
              action: 'sync-data',
              userId: user.user_id  // ✅ Передаём userId для cron-режима
            }
          });
          
          if (error) {
            console.error(`Error syncing Terra for user ${user.user_id}:`, error);
          } else {
            console.log(`Successfully synced Terra data for user ${user.user_id}`);
          }
        } catch (error) {
          console.error(`Failed to sync Terra for user ${user.user_id}:`, error);
        }
      }
    }

    console.log(`Scheduled sync completed. Terra: ${terraCount} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${terraCount} Terra users`,
        terraUsers: terraCount,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('Scheduled sync error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Scheduled sync failed', 
        details: error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})