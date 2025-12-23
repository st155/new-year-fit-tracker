import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Create service client for admin operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`👤 User authenticated: ${user.id}`);

    // Check if user is a trainer (admin)
    const { data: trainerCheck, error: trainerError } = await serviceClient
      .from('trainer_clients')
      .select('trainer_id')
      .eq('trainer_id', user.id)
      .limit(1);

    if (trainerError) {
      console.error('❌ Trainer check error:', trainerError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isTrainer = trainerCheck && trainerCheck.length > 0;
    
    if (!isTrainer) {
      console.warn(`⚠️ User ${user.id} is not a trainer`);
      return new Response(
        JSON.stringify({ error: 'Access denied. Trainer role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Trainer access verified');

    const body = await req.json();
    const { action, data } = body;

    console.log(`📋 Action: ${action}`, data);

    switch (action) {
      case 'list': {
        // Get all terra_tokens with user profile info
        const { data: tokens, error: listError } = await serviceClient
          .from('terra_tokens')
          .select(`
            id,
            user_id,
            provider,
            terra_user_id,
            is_active,
            last_sync_date,
            created_at,
            updated_at,
            metadata
          `)
          .order('created_at', { ascending: false });

        if (listError) {
          console.error('❌ List error:', listError);
          return new Response(
            JSON.stringify({ error: 'Failed to list tokens' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get profiles for all user_ids
        const userIds = tokens?.map(t => t.user_id) || [];
        const { data: profiles } = await serviceClient
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        // Get last webhook date for each terra_user_id from unified_metrics
        const terraUserIds = tokens?.filter(t => t.terra_user_id).map(t => t.terra_user_id) || [];
        
        // Query unified_metrics to find last data date per user
        const lastDataMap = new Map<string, { last_date: string; days_since: number }>();
        
        if (terraUserIds.length > 0) {
          // Get last measurement date per user from unified_metrics
          const { data: lastMetrics } = await serviceClient
            .from('unified_metrics')
            .select('user_id, measurement_date')
            .in('user_id', userIds)
            .order('measurement_date', { ascending: false });

          if (lastMetrics) {
            const userLastDateMap = new Map<string, string>();
            for (const metric of lastMetrics) {
              if (!userLastDateMap.has(metric.user_id)) {
                userLastDateMap.set(metric.user_id, metric.measurement_date);
              }
            }
            
            const now = new Date();
            userLastDateMap.forEach((lastDate, userId) => {
              const daysSince = Math.floor((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
              lastDataMap.set(userId, { last_date: lastDate, days_since: daysSince });
            });
          }
        }

        const tokensWithProfiles = tokens?.map(token => {
          const lastData = lastDataMap.get(token.user_id);
          return {
            ...token,
            profile: profilesMap.get(token.user_id) || null,
            last_webhook_date: lastData?.last_date || null,
            days_since_webhook: lastData?.days_since ?? null,
            is_dead: token.is_active && lastData ? lastData.days_since > 7 : false
          };
        }) || [];

        console.log(`✅ Listed ${tokensWithProfiles.length} tokens`);

        return new Response(
          JSON.stringify({ tokens: tokensWithProfiles }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list_users': {
        // Get all users for the search dropdown
        const { data: profiles, error: profilesError } = await serviceClient
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .order('full_name', { ascending: true });

        if (profilesError) {
          console.error('❌ List users error:', profilesError);
          return new Response(
            JSON.stringify({ error: 'Failed to list users' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`✅ Listed ${profiles?.length || 0} users`);

        return new Response(
          JSON.stringify({ users: profiles || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        const { user_id, terra_user_id, provider } = data;

        if (!user_id || !terra_user_id || !provider) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: user_id, terra_user_id, provider' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if token already exists for this user+provider
        const { data: existing } = await serviceClient
          .from('terra_tokens')
          .select('id')
          .eq('user_id', user_id)
          .eq('provider', provider)
          .maybeSingle();

        if (existing) {
          return new Response(
            JSON.stringify({ error: `Token already exists for this user and provider. Use update instead.` }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: newToken, error: createError } = await serviceClient
          .from('terra_tokens')
          .insert({
            user_id,
            terra_user_id,
            provider: provider.toUpperCase(),
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Create error:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create token', details: createError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`✅ Created token for user ${user_id}`);

        return new Response(
          JSON.stringify({ success: true, token: newToken }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const { id, terra_user_id, provider, is_active } = data;

        if (!id) {
          return new Response(
            JSON.stringify({ error: 'Missing token id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString()
        };

        if (terra_user_id !== undefined) updateData.terra_user_id = terra_user_id;
        if (provider !== undefined) updateData.provider = provider.toUpperCase();
        if (is_active !== undefined) updateData.is_active = is_active;

        const { data: updatedToken, error: updateError } = await serviceClient
          .from('terra_tokens')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update token', details: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`✅ Updated token ${id}`);

        return new Response(
          JSON.stringify({ success: true, token: updatedToken }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const { id } = data;

        if (!id) {
          return new Response(
            JSON.stringify({ error: 'Missing token id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: deleteError } = await serviceClient
          .from('terra_tokens')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('❌ Delete error:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Failed to delete token', details: deleteError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`✅ Deleted token ${id}`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-terra-users': {
        // Get all Terra users for a reference_id from Terra API
        const { targetUserId } = data;

        if (!targetUserId) {
          return new Response(
            JSON.stringify({ error: 'Missing targetUserId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const terraApiKey = Deno.env.get('TERRA_API_KEY');
        const terraDevId = Deno.env.get('TERRA_DEV_ID');

        if (!terraApiKey || !terraDevId) {
          return new Response(
            JSON.stringify({ error: 'Terra API not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`🔍 Fetching Terra users for reference_id: ${targetUserId}`);

        const terraResponse = await fetch(
          `https://api.tryterra.co/v2/userInfo?reference_id=${targetUserId}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'dev-id': terraDevId,
              'x-api-key': terraApiKey,
            }
          }
        );

        if (!terraResponse.ok) {
          const errorText = await terraResponse.text();
          console.error('❌ Terra API error:', terraResponse.status, errorText);
          return new Response(
            JSON.stringify({ error: 'Terra API error', details: errorText }),
            { status: terraResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const terraData = await terraResponse.json();
        console.log(`✅ Found ${terraData.users?.length || 0} Terra users for reference_id: ${targetUserId}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            users: terraData.users || [],
            reference_id: targetUserId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'deauth-user': {
        // Deauthenticate a specific Terra user
        const { terraUserId, provider } = data;

        if (!terraUserId) {
          return new Response(
            JSON.stringify({ error: 'Missing terraUserId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const terraApiKey = Deno.env.get('TERRA_API_KEY');
        const terraDevId = Deno.env.get('TERRA_DEV_ID');

        if (!terraApiKey || !terraDevId) {
          return new Response(
            JSON.stringify({ error: 'Terra API not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`🔌 Deauthenticating Terra user: ${terraUserId}`);

        const terraResponse = await fetch(
          `https://api.tryterra.co/v2/auth/deauthenticateUser?user_id=${terraUserId}`,
          {
            method: 'DELETE',
            headers: {
              'Accept': 'application/json',
              'dev-id': terraDevId,
              'x-api-key': terraApiKey,
            }
          }
        );

        if (!terraResponse.ok) {
          const errorText = await terraResponse.text();
          console.error('❌ Terra deauth error:', terraResponse.status, errorText);
          return new Response(
            JSON.stringify({ error: 'Terra deauth error', details: errorText }),
            { status: terraResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`✅ Deauthenticated Terra user: ${terraUserId}`);

        // Also delete from local terra_tokens if exists
        const { error: deleteError } = await serviceClient
          .from('terra_tokens')
          .delete()
          .eq('terra_user_id', terraUserId);

        if (deleteError) {
          console.warn('⚠️ Could not delete local token:', deleteError);
        }

        return new Response(
          JSON.stringify({ success: true, terraUserId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'deauth-all': {
        // Deauthenticate all Terra connections for a user by reference_id
        const { targetUserId, providerFilter } = data;

        if (!targetUserId) {
          return new Response(
            JSON.stringify({ error: 'Missing targetUserId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const terraApiKey = Deno.env.get('TERRA_API_KEY');
        const terraDevId = Deno.env.get('TERRA_DEV_ID');

        if (!terraApiKey || !terraDevId) {
          return new Response(
            JSON.stringify({ error: 'Terra API not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`🔄 Deauth all Terra users for reference_id: ${targetUserId}, filter: ${providerFilter || 'ALL'}`);

        // 1. Get all Terra users for this reference_id
        const usersResponse = await fetch(
          `https://api.tryterra.co/v2/userInfo?reference_id=${targetUserId}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'dev-id': terraDevId,
              'x-api-key': terraApiKey,
            }
          }
        );

        if (!usersResponse.ok) {
          const errorText = await usersResponse.text();
          console.error('❌ Terra API error:', usersResponse.status, errorText);
          return new Response(
            JSON.stringify({ error: 'Failed to get Terra users', details: errorText }),
            { status: usersResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const usersData = await usersResponse.json();
        const users = usersData.users || [];
        
        console.log(`📋 Found ${users.length} Terra users to potentially deauth`);

        // 2. Deauthenticate each matching user
        const results: Array<{ terraUserId: string; provider: string; success: boolean; error?: string }> = [];
        
        for (const terraUser of users) {
          // Filter by provider if specified
          if (providerFilter && terraUser.provider?.toUpperCase() !== providerFilter.toUpperCase()) {
            console.log(`⏭️ Skipping ${terraUser.provider} (filter: ${providerFilter})`);
            continue;
          }

          try {
            const deauthResponse = await fetch(
              `https://api.tryterra.co/v2/auth/deauthenticateUser?user_id=${terraUser.user_id}`,
              {
                method: 'DELETE',
                headers: {
                  'Accept': 'application/json',
                  'dev-id': terraDevId,
                  'x-api-key': terraApiKey,
                }
              }
            );

            if (deauthResponse.ok) {
              console.log(`✅ Deauthenticated: ${terraUser.provider} (${terraUser.user_id})`);
              results.push({ terraUserId: terraUser.user_id, provider: terraUser.provider, success: true });
            } else {
              const errorText = await deauthResponse.text();
              console.error(`❌ Failed to deauth ${terraUser.provider}:`, errorText);
              results.push({ terraUserId: terraUser.user_id, provider: terraUser.provider, success: false, error: errorText });
            }
          } catch (err) {
            console.error(`❌ Error deauthing ${terraUser.provider}:`, err);
            results.push({ terraUserId: terraUser.user_id, provider: terraUser.provider, success: false, error: String(err) });
          }
        }

        // 3. Delete local tokens
        let deleteQuery = serviceClient
          .from('terra_tokens')
          .delete()
          .eq('user_id', targetUserId);
        
        if (providerFilter) {
          deleteQuery = deleteQuery.eq('provider', providerFilter.toUpperCase());
        }

        const { error: deleteError, count: deletedCount } = await deleteQuery;

        if (deleteError) {
          console.warn('⚠️ Error deleting local tokens:', deleteError);
        } else {
          console.log(`🗑️ Deleted ${deletedCount || 0} local tokens`);
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ Deauth complete: ${successCount}/${results.length} successful`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            deauthenticated: successCount,
            total: results.length,
            results,
            localTokensDeleted: deletedCount || 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
