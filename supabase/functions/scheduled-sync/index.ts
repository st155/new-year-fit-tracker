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
    console.log('Starting scheduled sync for all connected users...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Whoop is now integrated via Terra. Direct Whoop sync is disabled.
    const { data: terraWhoopUsers, error: terraWhoopError } = await supabase
      .from('terra_tokens')
      .select('user_id')
      .eq('provider', 'WHOOP');

    if (terraWhoopError) {
      console.error('Error fetching Terra WHOOP users:', terraWhoopError);
    } else {
      console.log(`Terra WHOOP connections found: ${terraWhoopUsers?.length || 0}. Direct Whoop sync skipped.`);
    }

    // Get all users with Withings connections
    const { data: withingsUsers, error: withingsError } = await supabase
      .from('withings_tokens')
      .select('user_id')
      .not('access_token', 'is', null)

    if (withingsError) {
      console.error('Error fetching Withings users:', withingsError)
    } else {
      console.log(`Found ${withingsUsers?.length || 0} Withings users to sync`)
      
      // Sync Withings data for each user
      for (const user of withingsUsers || []) {
        try {
          console.log(`Syncing Withings data for user: ${user.user_id}`)
          
          const { data, error } = await supabase.functions.invoke('withings-integration', {
            body: {
              action: 'sync-data',
              userId: user.user_id
            }
          })
          
          if (error) {
            console.error(`Error syncing Withings for user ${user.user_id}:`, error)
          } else {
            console.log(`Successfully synced Withings data for user ${user.user_id}`)
          }
        } catch (error) {
          console.error(`Failed to sync Withings for user ${user.user_id}:`, error)
        }
      }
    }

    const totalUsers = (terraWhoopUsers?.length || 0) + (withingsUsers?.length || 0)
    console.log(`Scheduled sync completed. Processed ${totalUsers} user connections.`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sync completed for ${totalUsers} user connections`,
        whoopUsers: terraWhoopUsers?.length || 0,
        withingsUsers: withingsUsers?.length || 0,
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