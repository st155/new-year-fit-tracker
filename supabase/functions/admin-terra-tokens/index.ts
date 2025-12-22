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

        const tokensWithProfiles = tokens?.map(token => ({
          ...token,
          profile: profilesMap.get(token.user_id) || null
        })) || [];

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
